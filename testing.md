# 🏭 SmartFactory AI-ERP: Interview Demonstration & Testing Protocol
This document serves as your **live demonstration script and testing protocol** when showing **SmartFactory AI-ERP** to the interview board at **Synergies Sourcing Bangladesh Ltd.** 

It provides step-by-step instructions to test and verify every module, copy-paste sample inputs, check backend REST APIs, and explain the direct business impact to merchandisers and directors.

---

## 🚀 Quick Start: Launching the Platform

Ensure all services are running before the interview begins:

### 1. Start Ollama (Local AI LLM)
Ensure Ollama is running in the background. In a terminal, run:
```bash
ollama run openchat
```
Verify the model is downloaded and active:
```bash
ollama list
# Expected: openchat:latest
```

### 2. Start the FastAPI Backend
Open a terminal, navigate to the backend directory, activate your virtual environment, and run:
```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Verify connection by opening [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

### 3. Start the React Frontend
Open another terminal, navigate to the frontend directory, and run:
```bash
cd frontend
npm run dev
```
Open the application at [http://localhost:5173](http://localhost:5173).

---

## 🛠 Database Reset (How to Start Fresh)
If you want to clear your changes and reset the database to its pristine pre-seeded state during or before the interview:
1. Stop the backend server (`Ctrl + C` in backend terminal).
2. Delete the database file `backend/apparel_erp.db`.
3. Restart the backend server. The database and seed records will be auto-created and populated.

---

# 📋 Module-by-Module Demonstration Protocol

---

### 1. 📊 Dashboard Module
The central mission control for merchandisers, summarizing active orders, material stocks, risk warnings, and recent quality control verdicts.

*   **How to Test in UI**:
    1. Navigate to the **Dashboard** tab on the left sidebar.
    2. Check the **Key Metrics Summary cards**: *Active Purchase Orders*, *Material Stocks*, *Warehouse Capacity*, and *QC Pass Rate*.
    3. Observe the **High Risk Disruption Alerts** box on the sidebar and in the dashboard. These are pulled live from PO records with delay probabilities $> 70\%$.
    4. Click the **🔄 Refresh Ledger** button in the top header and verify that the stats refresh instantly without reloading the browser.
*   **API Verification (cURL)**:
    ```bash
    curl -X GET http://localhost:8000/api/reports/executive-summary
    ```
*   **Business Narrative**:
    > *"Traditional ERPs show tables of numbers. SmartFactory's Dashboard acts as a cognitive co-pilot. It instantly flags POs at risk and low-stock alerts, so a merchandiser knows exactly where their attention is required within 5 seconds of opening the app."*

---

### 2. 📦 Order Management Module
Handles the lifecycle of buyer Purchase Orders (POs) from registration to production planning and final QC checks.

*   **How to Test in UI**:
    1. Click **Order Management** on the sidebar. You will see pre-seeded orders from **Zara**, **Levi's**, and **H&M**.
    2. Fill out the **Register New Purchase Order** form:
        *   **Order ID**: `PO-7701`
        *   **Buyer**: Select `Zara International` (ZARA)
        *   **Garment Type**: `Slim Fit Denim Jeans`
        *   **Quantity**: `1500.0`
        *   **Unit**: `pcs`
    3. Click **⚡ Register Purchase Order**.
    4. Verify that `PO-7701` appears in the orders grid with a status of `Pending`, and its risk level is calculated dynamically.
*   **API Verification (cURL)**:
    *   *Create PO:*
        ```bash
        curl -X POST http://localhost:8000/api/orders \
          -H "Content-Type: application/json" \
          -d '{"order_id":"PO-7701","buyer_id":"ZARA","buyer_name":"Zara International","item":"Slim Fit Denim Jeans","quantity":1500.0,"unit":"pcs","status":"Pending"}'
        ```
    *   *List POs:*
        ```bash
        curl -X GET http://localhost:8000/api/orders
        ```
*   **Business Narrative**:
    > *"This module links buyer specifications to real-time status tracking. When quality control passes or logistics risks escalate, the order status updates dynamically, maintaining a single, consistent source of truth across departments."*

---

### 3. 📝 AI Tech Pack Assistant Module
Automates the highly manual task of reading buyer design packages (Tech Packs) and entering Bill of Materials (BOM) data.

*   **How to Test in UI**:
    1. Navigate to **AI Tech Pack Assistant** on the sidebar.
    2. Copy and paste the following unstructured email specification into the input text box:
        ```text
        TECH PACK SPECIFICATION SHEET
        Style Reference: PO-8809
        Buyer Reference: LEVIS
        Sourcing Contact: procurement@levis.com
        Garment Type: Classic Stretch Denim Jacket
        Quantity Ordered: 2000.0 pcs

        BILL OF MATERIALS (BOM) DETAILS:
        - denim fabric: 4000.0 meters
        - brass buttons: 20000.0 pieces
        - zippers: 2000.0 pieces
        - polyester thread: 120.0 spools

        Special Instructions: Triple needle chain stitch on side seams. Wash: Medium enzyme wash.
        ```
    3. Click **⚡ Ingest & Parse Tech Pack**.
    4. **Observe the AI output**:
        *   The left panel shows the parsed structured JSON (Order ID, Buyer, Quantities, and BOM List).
        *   The right panel generates an automated **Supplier RFQ email** matching the extracted BOM items with standard terms (FOB Chittagong, payment terms, and delivery schedules).
    5. Navigate to **Order Management** and verify `PO-8809` has been registered in the database automatically.
    6. Navigate to **Inventory & Safety** and verify that the safety stock levels for denim, brass buttons, zippers, and polyester thread have adjusted.
*   **API Verification (cURL)**:
    ```bash
    curl -X POST http://localhost:8000/api/ai/techpack-to-bom \
      -H "Content-Type: application/json" \
      -d '{"text":"Style PO-8809. Buyer: LEVIS. Item: Denim Jacket. Qty: 2000 pcs. BOM: denim fabric 4000 meters, zippers 2000 pieces."}'
    ```
*   **Business Narrative**:
    > *"Instead of a merchandiser spending 2 hours manually reading PDFs and copying material lists item-by-item into a database, the local LLM parses the data, updates inventory, and drafts supplier emails in under 20 seconds. This is a 95% boost in human workflow speed."*

---

### 4. 🛒 Procurement Module
Manages supplier interactions, automates Request for Quotation (RFQ) emails, and analyzes supplier performance metrics.

*   **How to Test in UI**:
    1. Navigate to the **Procurement** tab on the sidebar.
    2. Examine the **Registered Suppliers Directory** (Textile Synergy, Global Trim, ThreadKing).
    3. In the **AI RFQ Generator** section:
        *   Check that the BOM list is automatically loaded or ready.
        *   Select a supplier from the dropdown (e.g., `Global Trim Solutions`).
        *   Click **Draft AI RFQ Email**.
        *   Verify that a customized formal email is compiled instantly.
    4. Check the **Vendor Performance & Risk Analysis** grid. Notice that each supplier has a **Performance Grade (A/B/C)**, a **Risk Score**, and an **AI Risk Assessment Reason** determined by past delivery data and quality logs.
*   **API Verification (cURL)**:
    ```bash
    curl -X GET http://localhost:8000/api/procurement/vendor-performance
    ```
*   **Business Narrative**:
    > *"Sourcing managers need to evaluate supplier reliability, not just prices. The Procurement module uses historical QC data to dynamically grade suppliers and highlights potential risks before orders are placed."*

---

### 5. 🧵 Inventory & Safety Module
Ensures the factory never runs out of critical raw materials (safety stock) and tracks live inventory ledgers.

*   **How to Test in UI**:
    1. Navigate to **Inventory & Safety** on the sidebar.
    2. Examine the **Live Warehouse Ledger** containing pre-seeded fabric, thread, buttons, and zippers.
    3. Identify low-stock items highlighted with a yellow alert badge (any item with stock below the safety stock threshold of `500.0` units).
    4. Scroll to the **Warehouse AI Forecast & Chat** section:
        *   Ask the chatbot: `"Which materials are running dangerously low and need reordering?"`
        *   Click **Send**.
        *   Verify the AI reads the active inventory database state, highlights low items, and suggests purchase quantities.
*   **API Verification (cURL)**:
    *   *Check Dashboard Metrics:*
        ```bash
        curl -X GET http://localhost:8000/api/inventory/dashboard
        ```
    *   *Chat with Inventory Assistant:*
        ```bash
        curl -X POST http://localhost:8000/api/inventory/chat \
          -H "Content-Type: application/json" \
          -d '{"message":"Do we have enough denim fabric for a 3000 pcs order?"}'
        ```
*   **Business Narrative**:
    > *"Running out of thread or buttons halts the entire production line. By coupling our live database with a local inventory forecaster, merchandisers get proactive alerts and can chat with the warehouse system to ask complex questions in plain English."*

---

### 6. 🏗 Production Line Module
Tracks active garment manufacturing batches through successive production phases (Cutting, Sewing, Finishing).

*   **How to Test in UI**:
    1. Navigate to the **Production Line** tab on the sidebar.
    2. Look at the active tracking grid showing production orders linked to `PO-9901`, `PO-9902`, and `PO-9903`.
    3. **Simulate a status update**:
        *   Find `PO-9902` (currently `In Progress` at 45%).
        *   Change status to `Completed`, update progress to `100.0%`, and adjust risk score to `5.0%`.
        *   Click **Update Production Status**.
        *   Observe the progress bar update to 100% (green) and the average production progress indicator shift.
    4. Review the **AI Operational Advice** box generating advice based on active lines.
*   **API Verification (cURL)**:
    ```bash
    curl -X PUT http://localhost:8000/api/production/orders/2/status \
      -H "Content-Type: application/json" \
      -d '{"status":"Completed","progress_pct":100.0,"risk_score":5.0}'
    ```
*   **Business Narrative**:
    > *"This provides real-time visibility into the sewing floor. Instead of manual spreadsheets, the system tracks batch completion percentages and feeds this data directly back to the client’s order record."*

---

### 7. 🚢 Logistics Tracking Module
Tracks shipping logs, port locations, carrier details, and uses AI to simulate and mitigate supply chain disruptions.

*   **How to Test in UI**:
    1. Click **Logistics Tracking** on the sidebar.
    2. Review the active shipments (origins, destinations, carriers, and ETA dates).
    3. Scroll to the **AI Supply Chain Disruption Simulator**:
        *   Select a Purchase Order (e.g., `PO-9903` for H&M Group).
        *   In the **Describe Disruption Event** box, paste:
            ```text
            Severe port congestion and union worker strike at Chittagong Port, stalling container loading operations for 10 days.
            ```
        *   Click **⚡ Run Disruption Simulator**.
    4. **Review the AI Mitigation Report**:
        *   Notice the updated delay probability and risk level.
        *   Examine the AI's step-by-step mitigation plan recommending specific actions like air freight options, factory buffer stock activation, or port rerouting (e.g., Mongla Port).
*   **API Verification (cURL)**:
    ```bash
    curl -X POST http://localhost:8000/api/logistics/analyze \
      -H "Content-Type: application/json" \
      -d '{"order_id":"PO-9903","disruption_vector":"Strike at Chittagong Port"}'
    ```
*   **Business Narrative**:
    > *"Logistics managers usually react after a shipment is delayed. The Disruption Simulator lets us enter risk events beforehand, predicts delay probabilities, and generates active backup plans, ensuring we avoid heavy air-freight penalties."*

---

### 8. 🔍 Quality Control (YOLO) Module
The core machine learning module combining deep learning (YOLO12/YOLOv8) and classical computer vision (OpenCV) to scan fabric for defects.

*   **How to Test in UI**:
    1. Navigate to **Quality Control (YOLO)** on the sidebar.
    2. **Prepare a fabric test image**:
        *   You can upload any fabric picture. If you don't have one on your PC, download a fabric texture image or search for "fabric stain/hole" online.
    3. In the upload card:
        *   Select an Order ID (e.g., `PO-9902`).
        *   Upload the fabric image.
        *   Click **⚡ Launch Fabric Scan**.
    4. **Analyze the visual results**:
        *   **Annotated Image Display**: View the fabric image with bounding boxes drawn over detected anomalies:
            *   🔴 **Critical Defect** (confidence $\ge 60\%$): Reject fabric roll immediately.
            *   🟡 **Minor Defect** (confidence $30\% - 60\%$): Flag for manual inspection.
            *   ⚪ **Noise/Acceptable** (confidence $< 30\%$): Approved.
        *   **Compliance Report**: Read the compiled text report detailing detection stats, severity classes, and recommended corrective actions.
    5. Navigate to **QC Audit Logs** at the bottom of the page to verify that the scan has been logged to the database.
*   **API Verification (cURL)**:
    *(Requires a local image file named `test_fabric.jpg`)*
    ```bash
    curl -X POST http://localhost:8000/api/qc/analyze \
      -F "order_id=PO-9902" \
      -F "file=@test_fabric.jpg"
    ```
*   **Business Narrative**:
    > *"Human inspection suffers from eye fatigue after hours of scanning. Our dual-engine pipeline uses a local YOLO neural network for object-class recognition alongside four OpenCV passes (blob size, bright spots, edge density, and texture variance) to detect defects with 100% consistency."*

---

### 9. 📈 Reports & SQL Agent Module
Translates natural language questions into safe database SQL statements and runs them on the live SQLite database.

*   **How to Test in UI**:
    1. Navigate to **Reports & SQL Agent** on the sidebar.
    2. Toggle between **Executive Summary** (collates general statistics using local LLM context) and **NL Database Query Agent**.
    3. In the **NL Database Query Agent** input box, paste:
        ```text
        Which supplier has the highest risk score and what is their performance grade?
        ```
    4. Click **🔍 Execute Query**.
    5. **Observe the result sections**:
        *   **AI Agent Interpretation**: A narrative explanation of the database response.
        *   **Results Grid**: The table containing the raw columns matching the query.
        *   **Generated SQL**: The exact SQLite SELECT command generated by the model (e.g., `SELECT name, risk_score, grade FROM suppliers ORDER BY risk_score DESC LIMIT 1;`).
    6. Test other queries:
        *   `Show all purchase orders that are in Pending status`
        *   `List inventory items where quantity is less than 600`
    7. Click **📥 Export CSV** and check that the browser downloads a CSV sheet containing the table data.
*   **API Verification (cURL)**:
    ```bash
    curl -X GET "http://localhost:8000/api/reports/nl-query?query=Show+all+pending+orders"
    ```
*   **Business Narrative**:
    > *"Business directors want answers, but they don't know SQL. The SQL Agent allows directors to ask 'Which orders are delayed?' in plain English. The AI writes the code, runs it securely, explains the result, and lets them export the data to Excel."*

---

### 10. 🤖 AI Assistant Module
A general chatbot that helps merchandisers with company policies, compliance checklists, or sourcing questions.

*   **How to Test in UI**:
    1. Navigate to **AI Assistant** on the sidebar.
    2. Under **Injected Database Context**, select `All Database Tables` or specific scopes (e.g., `orders`, `inventory`).
    3. In the chat box, type:
        ```text
        Based on our active orders and inventory, do we have enough brass buttons to fulfill PO-9901?
        ```
    4. Click **Send Message**.
    5. Verify the chatbot replies by referencing the actual database entries injected into its prompt context.
*   **API Verification (cURL)**:
    ```bash
    curl -X POST http://localhost:8000/api/assistant/chat \
      -H "Content-Type: application/json" \
      -d '{"message":"What is the status of PO-9903?","context_type":"orders"}'
    ```
*   **Business Narrative**:
    > *"Merchandisers can talk directly to their database. They don't have to look up tables manually. They can ask the assistant to check stock requirements for specific buyers, creating a conversational workflow."*

---

### 11. 📚 Knowledge Base (RAG) Module
Upload buyer compliance guidelines or operations manuals and query them locally using Retrieval-Augmented Generation (RAG).

*   **How to Test in UI**:
    1. Navigate to **Knowledge Base (RAG)** on the sidebar.
    2. Create a dummy text file named `compliance_rules.txt` containing the following text:
        ```text
        SYNERGIES COMPLIANCE RULES:
        1. All shipments to H&M Group must arrive at London Port within 25 days of PO approval.
        2. Fabric inspection must adhere to the 4-Point System (ASTM D5430).
        3. Payment terms for Textile Synergy Ltd are strictly 30% advance deposit and 70% letter of credit (L/C) at sight.
        ```
    3. Click **Choose contract, invoice, or tech pack**, select `compliance_rules.txt`, and click **⚡ Index into Knowledge Base**.
    4. Wait for indexing to complete, then check that `compliance_rules.txt` is listed in the **Indexed Documents Library**.
    5. In the **RAG Retrieval Search Agent** chat box, ask:
        ```text
        What is the inspection standard for H&M Group fabric and what are payment terms for Textile Synergy?
        ```
    6. Click **Search**.
    7. Observe that the AI answers accurately and lists `compliance_rules.txt` as the source tag.
*   **API Verification (cURL)**:
    ```bash
    curl -X POST http://localhost:8000/api/assistant/rag/query \
      -H "Content-Type: application/json" \
      -d '{"question":"What are the payment terms for Textile Synergy?"}'
    ```
*   **Business Narrative**:
    > *"Garment houses deal with thousands of pages of brand manuals. RAG lets us search contracts and buyer guidelines instantly. Sourcing teams get accurate compliance answers without manual page-flipping, reducing compliance errors."*

---

## 💡 Top 3 Tips for a Flawless Interview Demo

1.  **Run a dry run**: Open each tab, click buttons, and make sure Ollama is responding before the interview board arrives.
2.  **Highlight the local execution**: Emphasize that **no data is sent to public clouds**. Buying house designs (Tech Packs) are protected local intellectual property.
3.  **Tie every feature to business value**: Relate code functions (like OpenCV edge density or LLM parsers) to merchandiser efficiency, labor savings, and risk avoidance.
