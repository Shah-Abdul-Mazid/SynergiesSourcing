from fastapi import APIRouter, Depends, HTTPException, Body, Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from app.core.database import get_db
from app.schemas.erp_schemas import ProductionOrderOut, ProductionOrderCreate
import app.crud.erp_crud as crud
from app.services.ai_service import AIService

router = APIRouter(prefix="/production", tags=["production"])
ai_service = AIService()

@router.get("/orders", response_model=List[ProductionOrderOut])
async def read_production_orders(db: AsyncIOMotorDatabase = Depends(get_db)):
    """List all production tracking orders."""
    try:
        return await crud.get_all_production_orders(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders", response_model=ProductionOrderOut)
async def create_production_tracking(payload: ProductionOrderCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Create a new production tracking line linked to a PO."""
    try:
        po = await crud.get_purchase_order(db, payload.order_id)
        if not po:
            raise HTTPException(status_code=404, detail="Linked Purchase Order not found")
        
        prod = await crud.create_production_order(db, payload.dict())
        return prod
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/orders/{production_id}/status", response_model=ProductionOrderOut)
async def update_prod_status(
    production_id: int = Path(...),
    status: str = Body(...),
    progress_pct: float = Body(...),
    risk_score: float = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update progress, status, and AI risk of a production tracking line."""
    try:
        prod = await crud.update_production_status(
            db,
            production_id=production_id,
            status=status,
            progress_pct=progress_pct,
            risk_score=risk_score
        )
        if not prod:
            raise HTTPException(status_code=404, detail="Production tracking order not found")
        return prod
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_production_analytics(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Predictive analytics and delay indicators for active lines."""
    try:
        prod_orders = await crud.get_all_production_orders(db)
        
        high_risk_lines = 0
        total_progress = 0.0
        active_count = 0
        
        for p in prod_orders:
            if p.status != "Completed":
                active_count += 1
                total_progress += p.progress_pct
                if p.risk_score > 60.0:
                    high_risk_lines += 1

        avg_progress = (total_progress / active_count) if active_count > 0 else 0.0
        
        orders_list = [{"id": p.production_id, "po": p.order_id, "status": p.status, "progress": p.progress_pct, "risk": p.risk_score} for p in prod_orders]
        ai_recommendation = await ai_service.generate_production_recommendation(orders_list)
        
        return {
            "status": "success",
            "active_production_lines": active_count,
            "high_risk_lines": high_risk_lines,
            "average_progress_pct": avg_progress,
            "ai_operational_advice": ai_recommendation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-recommendation")
async def get_production_recommendation(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Fetch structured AI production suggestions."""
    try:
        prod_orders = await crud.get_all_production_orders(db)
        orders_list = [{"id": p.production_id, "po": p.order_id, "status": p.status, "progress": p.progress_pct, "risk": p.risk_score} for p in prod_orders]
        ai_rec = await ai_service.generate_production_recommendation(orders_list)
        return {
            "status": "success",
            "ai_advice": ai_rec
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
