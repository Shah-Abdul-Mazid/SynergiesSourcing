from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db, engine
import app.crud.erp_crud as crud
from app.services.ai_service import AIService
import json
import re

router = APIRouter(prefix="/reports", tags=["reports"])
ai_service = AIService()

DATABASE_SCHEMA_DESC = """
Table schema for SQL agent:

1. buyers (buyer_id TEXT PK, name TEXT, contact_email TEXT)
2. suppliers (supplier_id TEXT PK, name TEXT, contact_email TEXT)
3. inventory (item TEXT PK, quantity REAL, unit TEXT)
4. purchase_orders (order_id TEXT PK, buyer_id TEXT, buyer_name TEXT, item TEXT, quantity REAL, unit TEXT, status TEXT, risk_level TEXT, delay_probability REAL)
5. bill_of_materials (bom_id INTEGER PK, order_id TEXT, item TEXT, quantity REAL, unit TEXT)
6. qc_logs (log_id INTEGER PK, order_id TEXT, defect_type TEXT, status TEXT, report TEXT)
7. production_orders (production_id INTEGER PK, order_id TEXT, status TEXT, progress_pct REAL, risk_score REAL, notes TEXT)
8. shipments (shipment_id INTEGER PK, order_id TEXT, carrier TEXT, origin TEXT, destination TEXT, status TEXT, eta TEXT, delay_days INTEGER, risk_level TEXT)
"""

@router.get("/executive-summary")
async def get_executive_summary(db: AsyncSession = Depends(get_db)):
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
async def get_procurement_report(db: AsyncSession = Depends(get_db)):
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
async def get_qc_report(db: AsyncSession = Depends(get_db)):
    """Produce analytical summaries and defect trend analysis from QC ledger."""
    try:
        qc_logs = await crud.get_all_qc_logs(db)
        qc_list = [{"log_id": q.log_id, "order": q.order_id, "defects": q.defect_type, "status": q.status} for q in qc_logs]
        
        # Calculate statistics
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
    db: AsyncSession = Depends(get_db)
):
    """
    AI SQL Agent: Safe translation of natural language to SQLite SQL query.
    Validates against modification statements and runs read-only SELECT query.
    """
    try:
        # 1. Ask AI to generate SQL
        sql_query = await ai_service.nl_to_sql(query, DATABASE_SCHEMA_DESC)
        
        # Clean SQL string
        sql_query = sql_query.strip()
        sql_query = re.sub(r"^```sql\n?", "", sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r"\n?```$", "", sql_query).strip()
        
        # 2. Strict Security Check
        clean_upper = sql_query.upper()
        forbidden_keywords = [
            "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", 
            "REPLACE", "TRUNCATE", "GRANT", "REVOKE", "SHUTDOWN"
        ]
        
        # Check starting with select
        if not clean_upper.startswith("SELECT"):
            raise HTTPException(status_code=400, detail=f"Invalid query generated: Must begin with SELECT. Query: {sql_query}")
            
        for keyword in forbidden_keywords:
            if re.search(r"\b" + keyword + r"\b", clean_upper):
                raise HTTPException(status_code=403, detail="Security violation: Query contains write/modify actions.")

        # 3. Execute query
        results = []
        async with engine.connect() as conn:
            exec_res = await conn.execute(text(sql_query))
            keys = exec_res.keys()
            for row in exec_res.fetchall():
                results.append(dict(zip(keys, row)))

        # 4. Generate AI summary of query results
        ai_narrative = await ai_service.generate_report_summary(f"Database Query Output for '{query}'", results)

        return {
            "status": "success",
            "nl_prompt": query,
            "sql_query": sql_query,
            "results": results,
            "ai_summary": ai_narrative
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution failed: {str(e)} for query: {sql_query if 'sql_query' in locals() else 'None'}")
