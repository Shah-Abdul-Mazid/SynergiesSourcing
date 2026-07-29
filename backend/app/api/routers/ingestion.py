from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.schemas.erp_schemas import TechPackIngestRequest, TechPackResponse
from app.services.ai_service import AIService
import app.crud.erp_crud as crud
import logging

router = APIRouter(tags=["sourcing"])
ai_service = AIService()
logger = logging.getLogger("smartfactory.ingestion")

@router.post("/ai/techpack-to-bom", response_model=TechPackResponse)
async def ingest_tech_pack(payload: TechPackIngestRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Module 1: Smart Sourcing Ingestion
    Merchandisers paste unstructured Buyer Tech Packs. The AI parses the specs,
    populates the BOM database, updates inventory stock logs, creates the Purchase Order,
    and auto-drafts vendor RFQs.
    """
    logger.info("Received unstructured Tech Pack for ingestion")
    
    # 1. Parse Tech Pack with AI
    try:
        extracted = await ai_service.parse_tech_pack(payload.text)
    except Exception as e:
        logger.error(f"Failed to parse Tech Pack using AI: {e}")
        raise HTTPException(status_code=422, detail=f"Tech pack analysis failure: {str(e)}")

    order_id = extracted["order_id"]
    buyer_id = extracted["buyer_id"]
    buyer_name = extracted["buyer_name"]
    buyer_email = extracted["buyer_email"]
    item_name = extracted["item"]
    po_qty = extracted["quantity"]
    po_unit = extracted["unit"]
    bom_list = extracted["bom"]

    # 2. Database update transaction block
    try:
        # A. Register or update Buyer
        await crud.get_or_create_buyer(db, buyer_id=buyer_id, name=buyer_name, email=buyer_email)
        
        # B. Check for pre-existing PO (if it exists, overwrite it)
        existing_po = await crud.get_purchase_order(db, order_id)
        if existing_po:
            logger.info(f"Purchase Order {order_id} exists. Cleaning existing BOM items for update...")
            await crud.delete_bom_items_for_order(db, order_id)
            po = await crud.update_po_status(db, order_id=order_id, status="Pending")
        else:
            # Create PO
            po = await crud.create_purchase_order(db, {
                "order_id": order_id,
                "buyer_id": buyer_id,
                "buyer_name": buyer_name,
                "item": item_name,
                "quantity": po_qty,
                "unit": po_unit,
                "status": "Pending",
                "risk_level": "Low",
                "delay_probability": 0.0
            })

        # C. Write BOM lines and atomically update Inventory logs
        inventory_states = []
        for bom_item in bom_list:
            mat_name = bom_item["item"].strip().lower()
            mat_qty = float(bom_item["quantity"])
            mat_unit = bom_item["unit"].strip()

            # Add BOM record
            await crud.add_bom_item(db, order_id=order_id, item_name=mat_name, quantity=mat_qty, unit=mat_unit)

            # Atomically increment materials inventory log
            inv = await crud.update_inventory_stock(db, item_name=mat_name, quantity_add=mat_qty, unit=mat_unit)
            inventory_states.append(inv)

        # D. Run vendor RFQ drafting email generator
        rfq_email = await ai_service.generate_vendor_email(bom_list)

        # Load fully populated PO schema
        po_loaded = await crud.get_purchase_order(db, order_id)
        
        # Format inventory results
        db_inventory_states = []
        for state in inventory_states:
            inv_item = await crud.get_inventory_item(db, state.item)
            if inv_item:
                db_inventory_states.append(inv_item)
            
        logger.info(f"Tech Pack Ingestion completed. PO: {order_id} committed.")
        return {
            "status": "success",
            "extracted_data": extracted,
            "rfq_draft": rfq_email,
            "purchase_order": po_loaded,
            "inventory_state": db_inventory_states
        }

    except Exception as e:
        logger.error(f"Transaction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transactional ERP database error: {str(e)}")
