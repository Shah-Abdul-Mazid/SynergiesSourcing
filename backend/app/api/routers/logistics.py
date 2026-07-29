from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.schemas.erp_schemas import LogisticsDisruptionRequest, LogisticsDisruptionResponse
from app.services.ai_service import AIService
import app.crud.erp_crud as crud
import json
import logging

router = APIRouter(prefix="/logistics", tags=["logistics"])
ai_service = AIService()
logger = logging.getLogger("smartfactory.logistics")

@router.post("/analyze", response_model=LogisticsDisruptionResponse)
async def analyze_logistics_disruption(payload: LogisticsDisruptionRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Module 2: Supply Chain Risk Analytics
    Evaluates line disruption vectors, runs AI-driven supply risk modeling,
    updates risk metrics in the DB, and generates text workaround solutions.
    """
    logger.info(f"Analyzing supply chain disruption for order: {payload.order_id}")
    
    # 1. Fetch order details from database
    po = await crud.get_purchase_order(db, payload.order_id)
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase order '{payload.order_id}' not found.")

    # 2. Query AI Service to perform operations research & draft a workaround plan
    try:
        workaround_plan = await ai_service.generate_supply_chain_analysis(
            order_id=po.order_id,
            item=po.item,
            risk_level=po.risk_level,
            delay_prob=po.delay_probability,
            disruption_vector=payload.disruption_vector
        )
    except Exception as e:
        logger.error(f"AI supply chain analysis execution failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI analytics service connection failure: {str(e)}")

    # 3. Request AI to extract structured risk classification parameters
    extraction_prompt = (
        f"Read this supply chain mitigation analysis:\n"
        f"\"\"\"\n{workaround_plan}\n\"\"\"\n\n"
        f"Determine the updated risk level and delay probability.\n"
        f"Output ONLY a raw JSON object containing these exact fields:\n"
        f"{{\n"
        f"  \"risk_level\": \"Low\" | \"Medium\" | \"High\",\n"
        f"  \"delay_probability\": float (between 0.0 and 1.0)\n"
        f"}}\n"
        f"Do not include markdown tags (such as ```json) or conversational text. Output raw JSON only."
    )
    
    try:
        raw_metrics = await ai_service.run_text_generation(extraction_prompt, "You extract metrics in raw JSON.")
        
        # Clean JSON string
        clean_json = raw_metrics.strip()
        if clean_json.startswith("```"):
            lines = clean_json.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1] == "```":
                lines = lines[:-1]
            clean_json = "\n".join(lines).strip()

        metrics = json.loads(clean_json)
        risk_level = metrics.get("risk_level", po.risk_level)
        delay_probability = float(metrics.get("delay_probability", po.delay_probability))
        
        # Clamp delay probability between 0.0 and 1.0
        delay_probability = max(0.0, min(1.0, delay_probability))
        
        if risk_level not in ["Low", "Medium", "High"]:
            risk_level = "Medium"
            
    except Exception as parse_err:
        logger.warning(f"Unable to parse AI structured risk metrics, using fallbacks: {parse_err}")
        # Default fallback calculation
        risk_level = "High" if "high" in workaround_plan.lower() else ("Medium" if "medium" in workaround_plan.lower() else "Low")
        delay_probability = 0.75 if risk_level == "High" else (0.45 if risk_level == "Medium" else 0.10)

    # 4. Commit updated risk values into database
    try:
        status_to_set = po.status
        if risk_level == "High":
            status_to_set = "Risk Warning"
        elif po.status == "Risk Warning":
            status_to_set = "Processing"
            
        po = await crud.update_po_status(
            db,
            order_id=po.order_id,
            status=status_to_set,
            risk_level=risk_level,
            delay_probability=delay_probability
        )
        logger.info(f"Order {po.order_id} updated: Risk={risk_level}, Delay={delay_probability:.2f}")
    except Exception as db_err:
        logger.error(f"Failed to update PO risk status: {db_err}")
        raise HTTPException(status_code=500, detail="Database write failure during risk commit.")

    return {
        "status": "success",
        "order_id": po.order_id,
        "risk_level": po.risk_level,
        "delay_probability": po.delay_probability,
        "workaround_report": workaround_plan
    }
