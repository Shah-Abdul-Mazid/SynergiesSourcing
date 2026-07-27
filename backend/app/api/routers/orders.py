from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.schemas.erp_schemas import PurchaseOrderOut, PurchaseOrderCreate, PurchaseOrderStatusUpdate, InventoryOut
import app.crud.erp_crud as crud

router = APIRouter(tags=["orders_and_inventory"])

@router.get("/orders", response_model=List[PurchaseOrderOut])
async def read_orders(db: AsyncSession = Depends(get_db)):
    """
    Get all purchase orders and their associated BOM lists.
    """
    try:
        orders = await crud.get_all_purchase_orders(db)
        return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failure: {str(e)}")

@router.post("/orders", response_model=PurchaseOrderOut)
async def write_order(order_in: PurchaseOrderCreate, db: AsyncSession = Depends(get_db)):
    """
    Manually create a new purchase order. Automatically instantiates the buyer record if new.
    """
    try:
        existing = await crud.get_purchase_order(db, order_in.order_id)
        if existing:
            raise HTTPException(status_code=400, detail=f"Purchase order '{order_in.order_id}' already exists.")

        # Ensure buyer entity exists in the system
        await crud.get_or_create_buyer(
            db,
            buyer_id=order_in.buyer_id,
            name=order_in.buyer_name,
            email=f"procurement@{order_in.buyer_id.lower().replace(' ', '')}.com"
        )

        po = await crud.create_purchase_order(db, order_in.dict())
        await db.commit()
        await db.refresh(po)
        
        # Reload to get relationships populated (e.g. empty list of bom_items)
        po_loaded = await crud.get_purchase_order(db, po.order_id)
        return po_loaded
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Order creation failure: {str(e)}")

@router.get("/inventory", response_model=List[InventoryOut])
async def read_inventory(db: AsyncSession = Depends(get_db)):
    """
    Get all current material stock inventory counts.
    """
    try:
        inventory = await crud.get_all_inventory(db)
        return inventory
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failure: {str(e)}")


@router.get("/orders/{order_id}", response_model=PurchaseOrderOut)
async def read_order(order_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a single purchase order by its ID.
    """
    po = await crud.get_purchase_order(db, order_id)
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order '{order_id}' not found.")
    return po


@router.patch("/orders/{order_id}/status", response_model=PurchaseOrderOut)
async def update_order_status(
    order_id: str,
    payload: PurchaseOrderStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Manually update the ERP state, risk level, and/or delay probability of a purchase order.
    Valid status values: Pending, Processing, Shipped, QC Passed, QC Failed, Risk Warning, Completed, Cancelled
    """
    VALID_STATUSES = {"Pending", "Processing", "Shipped", "QC Passed", "QC Failed", "Risk Warning", "Completed", "Cancelled"}
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
        )
    if payload.risk_level and payload.risk_level not in {"Low", "Medium", "High"}:
        raise HTTPException(status_code=400, detail="risk_level must be Low, Medium, or High.")

    try:
        po = await crud.update_po_status(
            db,
            order_id=order_id,
            status=payload.status,
            risk_level=payload.risk_level,
            delay_probability=payload.delay_probability
        )
        if not po:
            raise HTTPException(status_code=404, detail=f"Purchase order '{order_id}' not found.")
        await db.commit()
        # Reload to get full relationships
        po_loaded = await crud.get_purchase_order(db, order_id)
        return po_loaded
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Status update failure: {str(e)}")
