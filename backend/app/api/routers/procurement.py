from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.core.database import get_db
from app.schemas.erp_schemas import SupplierOut, SupplierCreate
from app.services.ai_service import AIService
import app.crud.erp_crud as crud
import json
import logging

logger = logging.getLogger("smartfactory.procurement")

router = APIRouter(prefix="/procurement", tags=["procurement"])
ai_service = AIService()

@router.get("/suppliers", response_model=List[SupplierOut])
async def read_suppliers(db: AsyncSession = Depends(get_db)):
    """Get all suppliers."""
    try:
        return await crud.get_all_suppliers(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suppliers", response_model=SupplierOut)
async def create_supplier(supplier_in: SupplierCreate, db: AsyncSession = Depends(get_db)):
    """Create a new supplier profile."""
    try:
        existing = await crud.get_supplier(db, supplier_in.supplier_id)
        if existing:
            raise HTTPException(status_code=400, detail="Supplier already exists")
        supplier = await crud.get_or_create_supplier(
            db,
            supplier_id=supplier_in.supplier_id,
            name=supplier_in.name,
            email=supplier_in.contact_email
        )
        await db.commit()
        await db.refresh(supplier)
        return supplier
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rfq-generate")
async def generate_rfq(
    bom_items: List[Dict[str, Any]] = Body(...),
    supplier_email: str = Body(None)
):
    """Generate AI-optimized RFQ text."""
    try:
        email_text = await ai_service.generate_vendor_email(bom_items)
        return {
            "status": "success",
            "rfq_text": email_text,
            "destination_email": supplier_email or "procurement@global-trims.com"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-recommendations")
async def get_procurement_recommendations(db: AsyncSession = Depends(get_db)):
    """Get AI reorder and supplier recommendations based on active orders and inventory."""
    try:
        inventory = await crud.get_all_inventory(db)
        orders = await crud.get_all_purchase_orders(db)
        
        # Simple heuristic combined with AI forecast
        inv_list = [{"item": i.item, "quantity": i.quantity, "unit": i.unit} for i in inventory]
        forecast_text = await ai_service.generate_inventory_forecast(inv_list)
        
        return {
            "status": "success",
            "recommendations": forecast_text,
            "reorder_alerts": [i.item for i in inventory if i.quantity < 500]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vendor-performance")
async def get_vendor_performance(db: AsyncSession = Depends(get_db)):
    """Fetch all suppliers along with their performance metrics and AI risk evaluation."""
    try:
        suppliers = await crud.get_all_suppliers(db)
        qc_logs = await crud.get_all_qc_logs(db)
        orders = await crud.get_all_purchase_orders(db)
        
        perf_data = []
        for s in suppliers:
            # Gather relevant logs
            order_count = sum(1 for o in orders if o.buyer_id == s.supplier_id or s.supplier_id in o.order_id) # heuristic for links
            defects = [log for log in qc_logs if s.supplier_id in log.report or s.supplier_id in log.order_id]
            
            # Request AI Risk Assessment
            history = [{"order_count": order_count, "defects_logged": len(defects)}]
            try:
                ai_risk_raw = await ai_service.generate_supplier_risk_score(s.name, history)
                ai_risk = json.loads(ai_risk_raw)
            except Exception as exc:
                logger.error(f"Failed to fetch or parse risk score for {s.name}: {exc}")
                ai_risk = {"risk_score": 30, "reasons": "No historical delays logged.", "vendor_perf": "B"}
            
            perf_data.append({
                "supplier_id": s.supplier_id,
                "name": s.name,
                "email": s.contact_email,
                "risk_score": ai_risk.get("risk_score", 30),
                "reasons": ai_risk.get("reasons", "No historical delays logged."),
                "grade": ai_risk.get("vendor_perf", "B")
            })
        return perf_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
