import json
import logging
import random
import re
from typing import Dict, Any, List
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger("smartfactory.ai_service")

# Tokens that identify placeholder/offline credentials only.
# "ollama" is a real local-server key and must NOT be treated as sandbox.
_SANDBOX_KEY_TOKENS = {"dummy", "mock-api-key", "placeholder"}


def _is_sandbox() -> bool:
    """Returns True only when running with placeholder credentials that have no real endpoint."""
    key = settings.OLLAMA_API_KEY.strip().lower()
    return key in _SANDBOX_KEY_TOKENS or key == ""


class AIService:
    def __init__(self):
        self.model_name = settings.OLLAMA_MODEL_NAME

        if _is_sandbox():
            self.client = None
            logger.warning(
                "AIService: SANDBOX mode — no valid API key. "
                "All AI calls will use high-fidelity rule-based simulation."
            )
        else:
            # Works for both OpenAI-hosted and Ollama (OpenAI-compatible) endpoints.
            self.client = AsyncOpenAI(
                api_key=settings.OLLAMA_API_KEY,
                base_url=settings.OLLAMA_API_URL,
            )
            logger.info(
                f"AIService: Live mode → base_url={settings.OLLAMA_API_URL}, "
                f"model={self.model_name}"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # Core LLM primitives
    # ─────────────────────────────────────────────────────────────────────────

    async def run_text_generation(self, prompt: str, system_prompt: str = "") -> str:
        """Generic async text-generation.  Falls back to simulation if client is unavailable."""
        if self.client is None:
            logger.info("Sandbox: run_text_generation → simulated response")
            return self._simulate_text_generation(prompt, system_prompt)

        try:
            logger.info(f"Ollama LLM call → model: {self.model_name}")
            messages: list = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.1,
                stream=False,
                # Disable Qwen3 chain-of-thought to keep responses clean & fast
                extra_body={"think": False},
            )
            content = response.choices[0].message.content or ""
            # Strip residual <think>…</think> blocks just in case
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            logger.info("Ollama text generation completed ✓")
            return content

        except Exception as e:
            logger.error(f"Ollama call failed ({e}); returning simulation fallback")
            return self._simulate_text_generation(prompt, system_prompt)

    async def run_vision_analysis(self, prompt: str, base64_image: str) -> str:
        """
        Vision analysis via multimodal model.
        Ollama's OpenAI-compatible /chat endpoint accepts image_url content blocks.
        Falls back to simulation if the model doesn't support vision.
        """
        if self.client is None:
            logger.info("Sandbox: run_vision_analysis → simulated report")
            return self._simulate_vision_analysis(prompt)

        try:
            logger.info(f"Ollama vision call → model: {self.model_name}")
            if not base64_image.startswith("data:image/"):
                image_url = f"data:image/jpeg;base64,{base64_image}"
            else:
                image_url = base64_image

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ]
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.2,
                stream=False,
                extra_body={"think": False},
            )
            content = response.choices[0].message.content or ""
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            logger.info("Ollama vision analysis completed ✓")
            return content

        except Exception as e:
            logger.warning(
                f"Vision call failed ({e}). "
                "qwen3.6 may not support multimodal. Using text-only fallback report."
            )
            # Fall back to text-only QC report using detection telemetry embedded in prompt
            return await self.run_text_generation(prompt)

    # ─────────────────────────────────────────────────────────────────────────
    # Domain helpers — each calls run_text_generation / run_vision_analysis
    # ─────────────────────────────────────────────────────────────────────────

    async def parse_tech_pack(self, text: str) -> Dict[str, Any]:
        """Parse unstructured Tech Pack → structured JSON BOM/PO specification."""
        if self.client is None:
            return self._simulate_tech_pack_parse(text)

        prompt = (
            "You are a garment-industry ERP parsing engine. "
            "Extract the following fields from the Tech Pack document and return ONLY a raw JSON object "
            "(no markdown fences, no commentary, no extra text):\n\n"
            "Fields:\n"
            "  order_id      — unique PO reference (generate PO-XXXX if missing)\n"
            "  buyer_id      — short uppercase buyer code (ZARA, LEVIS, HM …)\n"
            "  buyer_name    — full buyer company name\n"
            "  buyer_email   — procurement contact email\n"
            "  item          — finished garment description\n"
            "  quantity      — total units ordered (float)\n"
            "  unit          — e.g. pcs, sets\n"
            "  bom           — array of raw materials, each: {item, quantity (float), unit}\n\n"
            "JSON schema (output only this, nothing else):\n"
            '{"order_id":"","buyer_id":"","buyer_name":"","buyer_email":"",'
            '"item":"","quantity":0.0,"unit":"","bom":[{"item":"","quantity":0.0,"unit":""}]}\n\n'
            f"Tech Pack document:\n\"\"\"\n{text}\n\"\"\""
        )

        try:
            raw = await self.run_text_generation(prompt)
            # Strip markdown fences defensively
            clean = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.IGNORECASE)
            clean = re.sub(r"\n?```$", "", clean.strip())
            return json.loads(clean.strip())
        except Exception as e:
            logger.error(f"Tech-pack JSON parse failed ({e}); using rule-based fallback")
            return self._simulate_tech_pack_parse(text)

    async def generate_vendor_email(self, bom_items: List[Dict[str, Any]]) -> str:
        """Draft a professional supplier RFQ email."""
        bom_lines = "\n".join(
            f"  - {b['item']}: {b['quantity']} {b['unit']}" for b in bom_items
        )
        prompt = (
            "Write a professional, formal supplier RFQ (Request for Quotation) email "
            "for the following Bill of Materials:\n\n"
            f"{bom_lines}\n\n"
            "Include: subject line, greeting, itemised table with columns for "
            "Unit Price / Lead Time / MOQ, payment terms, FOB delivery clause, "
            "and a polished sign-off from the SmartFactory Procurement Division."
        )
        return await self.run_text_generation(
            prompt,
            "You are a senior procurement officer at a garment buying house."
        )

    async def generate_supply_chain_analysis(
        self,
        order_id: str,
        item: str,
        risk_level: str,
        delay_prob: float,
        disruption_vector: str,
    ) -> str:
        """AI-driven disruption analysis and mitigation plan."""
        prompt = (
            f"Purchase Order: {order_id}  |  Garment: {item}\n"
            f"Current Risk Level: {risk_level}  |  Delay Probability: {delay_prob:.0%}\n"
            f"Disruption Reported: {disruption_vector}\n\n"
            "Provide a structured operations recovery report with:\n"
            "1. Root cause analysis\n"
            "2. Immediate workarounds (sub-contracting, air freight, buffer stock activation)\n"
            "3. Strategic supplier rerouting recommendations\n"
            "4. Revised risk level (Low/Medium/High) and new estimated delay probability"
        )
        return await self.run_text_generation(
            prompt,
            "You are an expert garment supply-chain risk analyst and operations manager."
        )

    async def generate_qc_report(
        self, detections: List[Dict[str, Any]], image_verdict: str
    ) -> str:
        """Fabric defect compliance report driven by YOLO12 + OpenCV telemetry."""
        if detections:
            det_str = "\n".join(
                f"  - Class: '{d['class']}', Confidence: {d['confidence']:.1%}, BBox: {d['bbox']}"
                for d in detections
            )
        else:
            det_str = "  No defects detected by YOLOv8 scanner."

        prompt = (
            f"YOLOv8 fabric defect scan results:\n{det_str}\n\n"
            "Generate a QA compliance report with:\n"
            "1. Defect anomaly summary\n"
            "2. Severity classification (Critical / Minor / Acceptable)\n"
            "3. Corrective action recommendations\n"
            "4. Final verdict on its own line in exactly this format:\n"
            "   VERDICT: Passed   OR   VERDICT: Failed"
        )
        return await self.run_text_generation(
            prompt,
            "You are a senior Quality Assurance Director in a garment manufacturing facility."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # High-fidelity Simulation Engine (Sandbox / Offline Fallback)
    # ─────────────────────────────────────────────────────────────────────────

    def _simulate_text_generation(self, prompt: str, system_prompt: str = "") -> str:
        p = prompt.lower()

        if "rfq" in p or "request for quote" in p or "request for quotation" in p:
            return (
                "Subject: REQUEST FOR QUOTE – Raw Materials Procurement | SmartFactory AI-ERP\n\n"
                "Dear Valued Supply Partner,\n\n"
                "We are writing to request a formal quotation for the following raw materials "
                "required for our upcoming production cycle:\n\n"
                "┌─────────────────────────┬──────────────┬───────────────┬──────────────────┐\n"
                "│ Material                │ Required Qty │ Unit Price    │ Lead Time (days) │\n"
                "├─────────────────────────┼──────────────┼───────────────┼──────────────────┤\n"
                "│ Denim Fabric (95% Ctn)  │ 2,400 meters │ _________     │ ___________      │\n"
                "│ Brass Buttons (25mm)    │ 12,000 pcs   │ _________     │ ___________      │\n"
                "│ YKK Zippers (16cm)      │ 1,200 pcs    │ _________     │ ___________      │\n"
                "└─────────────────────────┴──────────────┴───────────────┴──────────────────┘\n\n"
                "Payment Terms: 30% TT advance on PO confirmation, 70% against B/L copy.\n"
                "Delivery Incoterms: FOB Chittagong Port.  Validity: 30 days.\n\n"
                "Please send your quotation to procurement@smartfactory.com by end of week.\n\n"
                "Warm Regards,\nSenior Sourcing Director\nSmartFactory AI-ERP Procurement Division"
            )

        if '"risk_level"' in p or "delay_probability" in p or "updated risk level" in p:
            return random.choice([
                '{"risk_level": "Medium", "delay_probability": 0.45}',
                '{"risk_level": "High",   "delay_probability": 0.72}',
                '{"risk_level": "Low",    "delay_probability": 0.12}',
            ])

        if any(k in p for k in ["disruption", "mitigation", "workaround", "root cause"]):
            return (
                "═══ SUPPLY CHAIN OPERATIONS MITIGATION REPORT (SIMULATION) ═══\n\n"
                "1. ROOT CAUSE ANALYSIS\n"
                "   The disruption directly impacts the primary shipping lane and upstream fabric vendors, "
                "creating cascading delays across cutting, sewing, and finishing lines.\n\n"
                "2. IMMEDIATE WORKAROUNDS\n"
                "   ► Activate Tier-2 buffer fabric at Dhaka bonded warehouse (~800m available).\n"
                "   ► Sub-contract yarn-dye processing to partner mill (saves 4 days).\n"
                "   ► Air-freight 20% of critical trims to prevent line stoppages.\n"
                "   ► Run double sewing shifts for 3 days post-material arrival.\n\n"
                "3. STRATEGIC REROUTING\n"
                "   ► Diversify via Port of Mundra (India) as contingency transhipment hub.\n"
                "   ► Onboard 2 additional certified local fabric suppliers.\n"
                "   ► Negotiate 60-day rolling buffer contracts with Tier-1 vendors.\n\n"
                "4. REVISED OUTLOOK\n"
                "   Workarounds reduce estimated delay probability to ~32%, "
                "downgrading classification from High → Medium. Recovery: 7-10 business days."
            )

        return (
            "SmartFactory AI-ERP: Simulation response generated. "
            "Connect Ollama or provide a valid API key for live LLM output."
        )

    def _simulate_vision_analysis(self, prompt: str) -> str:
        return (
            "═══ AI FABRIC QC REPORT (SIMULATION) ═══\n\n"
            "1. DEFECT SUMMARY\n"
            "   YOLOv8 processed the uploaded frame. Detected regions mapped for demonstration.\n\n"
            "2. SEVERITY: Minor — within AQL tolerance for demo dataset.\n\n"
            "3. RECOMMENDATIONS\n"
            "   ► Deploy custom YOLOv8 model trained on garment defect dataset for production.\n"
            "   ► Flag bounding regions with confidence > 0.70 for physical line inspection.\n\n"
            "VERDICT: Passed"
        )

    def _simulate_tech_pack_parse(self, text: str) -> Dict[str, Any]:
        t = text.lower()
        if "zara" in t or "po-9021" in t or "denim jacket" in t:
            return {
                "order_id": "PO-9021", "buyer_id": "ZARA",
                "buyer_name": "Zara International", "buyer_email": "sourcing@zara.com",
                "item": "Heavy Wash Denim Jacket", "quantity": 1200.0, "unit": "pcs",
                "bom": [
                    {"item": "denim fabric",  "quantity": 2400.0,  "unit": "meters"},
                    {"item": "brass buttons", "quantity": 12000.0, "unit": "pieces"},
                    {"item": "zippers",       "quantity": 1200.0,  "unit": "pieces"},
                ],
            }
        if "levi" in t or "po-8045" in t or "slim fit" in t:
            return {
                "order_id": "PO-8045", "buyer_id": "LEVIS",
                "buyer_name": "Levi Strauss & Co.", "buyer_email": "procurement@levis.com",
                "item": "Slim Fit Mens Jeans", "quantity": 2000.0, "unit": "pcs",
                "bom": [
                    {"item": "denim fabric",    "quantity": 3000.0, "unit": "meters"},
                    {"item": "polyester thread","quantity": 120.0,  "unit": "spools"},
                    {"item": "zippers",         "quantity": 2000.0, "unit": "pieces"},
                ],
            }
        po_num = random.randint(7000, 7999)
        return {
            "order_id": f"PO-{po_num}", "buyer_id": "HM",
            "buyer_name": "H&M Group", "buyer_email": "sourcing@hm.com",
            "item": "Classic Polo Shirt", "quantity": 2500.0, "unit": "pcs",
            "bom": [
                {"item": "cotton fabric",    "quantity": 3750.0, "unit": "meters"},
                {"item": "polyester thread", "quantity": 100.0,  "unit": "spools"},
                {"item": "buttons",          "quantity": 12500.0,"unit": "pieces"},
            ],
        }

    async def generate_dashboard_insight(self, orders: List[Dict[str, Any]], inventory: List[Dict[str, Any]], qc_logs: List[Dict[str, Any]]) -> str:
        if self.client is None:
            return self._simulate_dashboard_insight(orders, inventory, qc_logs)
        prompt = (
            f"You are the AI Executive of a Garment ERP. Analyze this current state:\n"
            f"Active orders: {json.dumps(orders)}\n"
            f"Warehouse inventory: {json.dumps(inventory)}\n"
            f"QC logs: {json.dumps(qc_logs)}\n\n"
            f"Provide a concise executive summary, highlighting current operational risks, procurement status, inventory health, and recommendations."
        )
        return await self.run_text_generation(prompt, "You are a concise executive assistant.")

    async def generate_production_recommendation(self, production_orders: List[Dict[str, Any]]) -> str:
        if self.client is None:
            return self._simulate_production_recommendation(production_orders)
        prompt = (
            f"Review these active production orders:\n{json.dumps(production_orders)}\n\n"
            f"Provide delay predictions, risk score evaluations, and actionable recommendations to optimize production scheduling and avoid bottlenecks."
        )
        return await self.run_text_generation(prompt, "You are a production scheduling expert.")

    async def generate_inventory_forecast(self, inventory: List[Dict[str, Any]]) -> str:
        if self.client is None:
            return self._simulate_inventory_forecast(inventory)
        prompt = (
            f"Review this inventory stock:\n{json.dumps(inventory)}\n\n"
            f"Forecast demand, flag items below safety stock levels, and predict when to reorder."
        )
        return await self.run_text_generation(prompt, "You are an inventory planning expert.")

    async def generate_supplier_risk_score(self, supplier_name: str, order_history: List[Dict[str, Any]]) -> str:
        if self.client is None:
            return self._simulate_supplier_risk_score(supplier_name, order_history)
        prompt = (
            "You are a supplier risk evaluation engine. "
            "Compute a numeric risk score (0-100), explain why (reliability, quality, delay rate), and assign a grade (A, B, or C).\n\n"
            "Return ONLY a raw JSON object matching this schema (no markdown fences, no commentary, no extra text):\n"
            '{"risk_score": 30, "reasons": "Description...", "vendor_perf": "B"}\n\n'
            f"Supplier Name: {supplier_name}\n"
            f"Order history / Performance details:\n{json.dumps(order_history)}"
        )
        try:
            raw = await self.run_text_generation(prompt, "You are a vendor compliance auditor.")
            # Strip markdown fences defensively
            clean = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.IGNORECASE)
            clean = re.sub(r"\n?```$", "", clean.strip())
            # Validate JSON format
            parsed = json.loads(clean.strip())
            # Ensure required keys exist with sensible fallbacks
            if not isinstance(parsed, dict):
                raise ValueError("Response is not a JSON object")
            if "risk_score" not in parsed:
                parsed["risk_score"] = 30
            if "reasons" not in parsed:
                parsed["reasons"] = "No historical delays logged."
            if "vendor_perf" not in parsed:
                parsed["vendor_perf"] = "B"
            return json.dumps(parsed)
        except Exception as e:
            logger.error(f"Supplier risk score JSON parse failed ({e}); using simulation fallback")
            return self._simulate_supplier_risk_score(supplier_name, order_history)

    async def generate_report_summary(self, report_type: str, report_data: List[Dict[str, Any]]) -> str:
        if self.client is None:
            return self._simulate_report_summary(report_type, report_data)
        prompt = (
            f"Report Type: {report_type}\n"
            f"Report Data:\n{json.dumps(report_data)}\n\n"
            f"Provide a natural language summary of this report, highlighting key trends, anomalies, and statistics."
        )
        return await self.run_text_generation(prompt, "You are a business intelligence analyst.")

    async def answer_from_documents(self, question: str, document_texts: str) -> str:
        if self.client is None:
            return self._simulate_answer_from_documents(question, document_texts)
        prompt = (
            f"You are a helpful assistant. Use ONLY the following document extracts to answer the user's question. "
            f"If the information is not present in the documents, state that you cannot find the answer in the uploaded files.\n\n"
            f"Document Extracts:\n{document_texts}\n\n"
            f"User Question: {question}"
        )
        return await self.run_text_generation(prompt, "You answer questions strictly using the provided document text.")

    async def nl_to_sql(self, question: str, schema_description: str) -> str:
        if self.client is None:
            return self._simulate_nl_to_sql(question, schema_description)
        prompt = (
            f"Database Schema:\n{schema_description}\n\n"
            f"User Question: {question}\n\n"
            f"Translate the user question into a standard SQL query. "
            f"Output ONLY the raw SQL query. Do not include markdown fences, comments, or extra text."
        )
        return await self.run_text_generation(prompt, "You translate natural language to SQL.")

    async def chat_with_erp(self, message: str, erp_context: Dict[str, Any]) -> str:
        if self.client is None:
            return self._simulate_chat_with_erp(message, erp_context)
        prompt = (
            f"Current ERP Context:\n{json.dumps(erp_context)}\n\n"
            f"User Message: {message}\n\n"
            f"Respond to the user's inquiry helper-style, referencing the context data where applicable."
        )
        return await self.run_text_generation(prompt, "You are an enterprise AI assistant.")

    # ── Simulation Methods for new AI tasks ────────────────────────────────────
    def _simulate_dashboard_insight(self, orders, inventory, qc_logs) -> str:
        return (
            "### AI Executive Insight\n"
            "• **Operational Risk Summary:** Current delay risk is moderate. PO-9903 (Cotton T-Shirt) is flagged as High Risk due to delay probability (78%).\n"
            "• **Procurement Status:** BOM items for active orders are 82% fulfilled. Recommend placing thread and zip replenishment orders immediately.\n"
            "• **Inventory Health:** Score is **85/100**. Safety stock warnings active for: *zippers*.\n"
            "• **Production status:** 3 orders active in line, average progression is 45%.\n"
            "• **Shipments:** 1 shipment in customs, ETA 2 days."
        )

    def _simulate_production_recommendation(self, production_orders) -> str:
        return (
            "### AI Production Recommendations\n"
            "1. **Reschedule Sewing:** Shift PO-9903 sewing tasks to Line 4 to avoid the bottleneck on Line 2.\n"
            "2. **Safety Buffer:** Increase production buffer by 5% to account for fabric pilling defects caught in recent scans.\n"
            "3. **Predictive Alert:** Production order linked to H&M has a high delay probability (68%). Allocate standby mechanics."
        )

    def _simulate_inventory_forecast(self, inventory) -> str:
        return (
            "### AI Demand Forecast & Reorder Prediction\n"
            "• **Zippers:** Current stock (350 pcs) is BELOW safety stock threshold (500 pcs). **Reorder: 1,500 pcs immediately**.\n"
            "• **Polyester Thread:** Demand forecast shows a 25% spike in the next 30 days due to sportswear POs. Reorder in 10 days.\n"
            "• **Cotton Fabric:** Stock level healthy. Current volume (1,200m) is sufficient for next 15 production runs."
        )

    def _simulate_supplier_risk_score(self, supplier_name, order_history) -> str:
        if "synergy" in supplier_name.lower():
            score = 15
            reasons = "Excellent quality pass rate (98%), average lead time deviation < 1 day."
        elif "trim" in supplier_name.lower():
            score = 45
            reasons = "Moderate risk. Late deliveries logged for buttons, but quality remains stable."
        else:
            score = 28
            reasons = "Low-medium risk. Reliable thread delivery; minor packaging issues noted."
        return json.dumps({
            "risk_score": score,
            "reasons": reasons,
            "vendor_perf": "A" if score < 20 else ("B" if score < 50 else "C")
        })

    def _simulate_report_summary(self, report_type, report_data) -> str:
        return (
            f"### AI Report Summary: {report_type}\n"
            f"The report outlines active metrics showing an overall efficiency of 88%. "
            f"Key trends include stable material sourcing schedules, a 94.2% quality inspection pass rate, "
            f"and localized delay risks at the port. Corrective actions have mitigated initial risk peaks."
        )

    def _simulate_answer_from_documents(self, question, document_texts) -> str:
        q = question.lower()
        if "contract" in q or "payment" in q:
            return "Based on the uploaded PO Contract (page 2), the payment terms are agreed as: 30% TT advance on order confirmation, and 70% paid against Bill of Lading copy."
        if "spec" in q or "shrinkage" in q or "gsm" in q:
            return "According to the Tech Pack specifications, fabric weight is 180 GSM, 100% combed cotton, with a maximum allowable shrinkage rate of +/- 3% after washing."
        return "I found references to fabric ordering specs in the uploaded documents, but they do not specifically answer: '" + question + "'. Please refer to Page 3 of the Tech Pack."

    def _simulate_nl_to_sql(self, question, schema_description) -> str:
        q = question.lower()
        if "delayed" in q or "risk" in q:
            return "SELECT * FROM purchase_orders WHERE risk_level = 'High' OR status = 'Risk Warning';"
        if "safety" in q or "low" in q or "inventory" in q:
            return "SELECT * FROM inventory WHERE quantity < 500;"
        if "supplier" in q or "highest" in q:
            return "SELECT * FROM suppliers;"
        if "buyer" in q or "most" in q:
            return "SELECT buyer_name, COUNT(*) as order_count FROM purchase_orders GROUP BY buyer_name ORDER BY order_count DESC;"
        return "SELECT * FROM purchase_orders;"

    def _simulate_chat_with_erp(self, message, erp_context) -> str:
        msg = message.lower()
        if "delayed" in msg or "risk" in msg:
            return "There is currently 1 High Risk order: PO-9903 for H&M Group (Cotton T-Shirt) with a delay probability of 78%. We have flagged this as Risk Warning in the system."
        if "stock" in msg or "inventory" in msg:
            return "Our inventory has 5 items. Cotton Fabric (1,200m) and Denim Fabric (2,500m) are healthy. However, Zippers are low (350 pcs), which is below safety limits."
        return "Hi there! I am your SmartFactory ERP Assistant. I have full context on purchase orders, inventory, and QC logs. How can I help you optimize your buy-house operations today?"
