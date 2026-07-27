from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.core.database import get_db
import app.crud.erp_crud as crud
from app.services.ai_service import AIService

router = APIRouter(prefix="/inventory", tags=["inventory_extended"])
ai_service = AIService()

SAFETY_STOCK_LIMIT = 500.0

@router.get("/dashboard")
async def get_inventory_dashboard(db: AsyncSession = Depends(get_db)):
    """Enhanced dashboard metrics for warehouse stock."""
    try:
        inventory = await crud.get_all_inventory(db)
        items = []
        low_stock_count = 0
        total_qty = 0.0

        for item in inventory:
            is_low = item.quantity < SAFETY_STOCK_LIMIT
            if is_low:
                low_stock_count += 1
            total_qty += item.quantity
            items.append({
                "item": item.item,
                "quantity": item.quantity,
                "unit": item.unit,
                "safety_stock": SAFETY_STOCK_LIMIT,
                "is_low": is_low,
                "percentage_of_limit": min((item.quantity / 10000.0) * 100.0, 100.0)
            })

        # Calculate an inventory health score
        health_score = 100 - (low_stock_count * 15)
        health_score = max(0, min(100, health_score))

        return {
            "status": "success",
            "items": items,
            "total_quantity": total_qty,
            "low_stock_count": low_stock_count,
            "health_score": health_score,
            "warehouse_capacity_pct": min((total_qty / 50000.0) * 100, 100.0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast")
async def get_inventory_forecast(db: AsyncSession = Depends(get_db)):
    """AI-powered demand forecast and safety stock alert recommendations."""
    try:
        inventory = await crud.get_all_inventory(db)
        inv_list = [{"item": i.item, "quantity": i.quantity, "unit": i.unit} for i in inventory]
        forecast_text = await ai_service.generate_inventory_forecast(inv_list)
        return {
            "status": "success",
            "forecast_report": forecast_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_inventory(message: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    """Warehouse AI Chat Assistant specializing in stock logs."""
    try:
        inventory = await crud.get_all_inventory(db)
        inv_list = [{"item": i.item, "quantity": i.quantity, "unit": i.unit} for i in inventory]
        context = {
            "warehouse_inventory": inv_list,
            "system_type": "Warehouse inventory control module"
        }
        response = await ai_service.chat_with_erp(message, context)
        return {
            "status": "success",
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
