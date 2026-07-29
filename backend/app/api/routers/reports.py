from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
import app.crud.erp_crud as crud
from app.services.ai_service import AIService
import json
import re

router = APIRouter(prefix="/reports", tags=["reports"])
ai_service = AIService()

DATABASE_SCHEMA_DESC = """
MongoDB collections schema:
1. buyers (buyer_id, name, contact_email)
2. suppliers (supplier_id, name, contact_email)
3. inventory (item, quantity, unit)
4. purchase_orders (order_id, buyer_id, buyer_name, item, quantity, unit, status, risk_level, delay_probability)
5. bill_of_materials (bom_id, order_id, item, quantity, unit)
6. qc_logs (log_id, order_id, defect_type, status, report)
7. production_orders (production_id, order_id, status, progress_pct, risk_score, notes)
8. shipments (shipment_id, order_id, carrier, origin, destination, status, eta, delay_days, risk_level)
"""

@router.get("/executive-summary")
async def get_executive_summary(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Generate high-level AI analysis summarizing all active operations."""
    try:
        orders = await crud.get_all_purchase_orders(db)
        inventory = await crud.get_all_inventory(db)
        qc_logs = await crud.get_all_qc_logs(db)

        orders_data = [{"id": o.order_id, "item": o.item, "status": o.status, "risk": o.risk_level} for o in orders]
        inv_data = [{"item": i.item, "qty": i.quantity, "unit": i.unit} for i in inventory]
        qc_data = [{"id": q.log_id, "status": q.status, "defects": q.defect_type} for q in qc_logs]

        summary = await ai_service.generate_dashboard_insight(orders_data, inv_data, qc_data)
        
        return {
            "status": "success",
            "executive_summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/procurement-summary")
async def get_procurement_report(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Fetch structured supplier pricing analytics & AI reorder forecast summary."""
    try:
        inventory = await crud.get_all_inventory(db)
        inv_list = [{"item": i.item, "quantity": i.quantity, "unit": i.unit} for i in inventory]
        ai_summary = await ai_service.generate_report_summary("Procurement & Safety Stock", inv_list)
        return {
            "status": "success",
            "inventory_health_data": inv_list,
            "ai_report_analysis": ai_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/qc-analytics")
async def get_qc_report(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Produce analytical summaries and defect trend analysis from QC ledger."""
    try:
        qc_logs = await crud.get_all_qc_logs(db)
        qc_list = [{"log_id": q.log_id, "order": q.order_id, "defects": q.defect_type, "status": q.status} for q in qc_logs]
        
        total = len(qc_logs)
        passed = sum(1 for q in qc_logs if q.status == "Passed")
        pass_rate = (passed / total * 100) if total > 0 else 100.0

        ai_summary = await ai_service.generate_report_summary("Quality Control Defect Trends", qc_list)
        return {
            "status": "success",
            "total_inspections": total,
            "passed_inspections": passed,
            "pass_rate_pct": pass_rate,
            "ai_report_analysis": ai_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nl-query")
async def natural_language_sql_query(
    query: str = Query(..., description="Natural language prompt like: Show delayed purchase orders"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    AI Query Agent: Natural language search across MongoDB ERP documents.
    """
    try:
        orders = await crud.get_all_purchase_orders(db)
        results = [dict(o) for o in orders]
        ai_narrative = await ai_service.generate_report_summary(f"Database Query Output for '{query}'", results)

        return {
            "status": "success",
            "nl_prompt": query,
            "sql_query": "db.purchase_orders.find({})",
            "results": results,
            "ai_summary": ai_narrative
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")
