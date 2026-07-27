# 🏭 SmartFactory AI-ERP
### Synergies Sourcing Bangladesh Ltd. — Software Engineer Capstone Project

> **An end-to-end AI-powered ERP platform** built specifically for garment buying houses. SmartFactory demonstrates every technical skill listed in the Synergies Software Engineer job description — ERP development, AI/ML integration, generative AI, business process automation, API integration, and database management — all running locally with zero cloud dependency.

---

## 🎯 How This Project Maps to the Job Requirements

This platform was built as a direct technical demonstration for the **Software Engineer** role at **Synergies Sourcing Bangladesh Ltd.**

| Job Requirement | Demonstrated In This Project |
|---|---|
| ERP development, customization & system integration | Full FastAPI ERP backend with 5 integrated modules |
| Artificial Intelligence & Machine Learning | YOLO12 neural network fabric defect detection |
| Generative AI & business process automation | Ollama LLM for Tech Pack parsing, RFQ generation, disruption analysis |
| Cloud platforms, APIs, databases & web technologies | REST API, SQLite ORM, React frontend, OpenAI-compatible Ollama client |
| Analyze business processes & implement tech-driven solutions | AI disruption analyzer, automated QC audit trail |
| Develop AI-enabled tools for productivity & decision-making | Vision workbench, risk dashboard, auto-generated compliance reports |
| Integrate third-party applications & ensure seamless data flow | Ollama LLM + YOLO12 + OpenCV all integrated into one FastAPI pipeline |
| Technical documentation & user training | This README + inline API docs at `/docs` |
| Strong programming skills, modern frameworks | Python (FastAPI), JavaScript (React 19, Vite 8), TailwindCSS |
| Analytical & problem-solving skills | Multi-pass OpenCV defect engine with NMS deduplication |

---

## 📋 Table of Contents

1. [Why SmartFactory for Synergies](#-why-smartfactory-for-synergies)
2. [System Architecture](#-system-architecture)
3. [Modules Overview](#-modules-overview)
4. [Tech Stack](#-tech-stack)
5. [Prerequisites](#-prerequisites)
6. [Project Structure](#-project-structure)
7. [Setup & Installation](#-setup--installation)
8. [Running the Application](#-running-the-application)
9. [Environment Configuration](#-environment-configuration)
10. [API Reference](#-api-reference)
11. [Database Schema](#-database-schema)
12. [AI & Vision Engine Details](#-ai--vision-engine-details)
13. [Skills Alignment with Job Description](#-skills-alignment-with-job-description)
14. [Troubleshooting](#-troubleshooting)

---

## 🎯 Why SmartFactory for Synergies

**Synergies Sourcing Bangladesh Ltd.** is a garment buying house coordinating between international fashion brands and local manufacturing facilities in Bangladesh. This creates several operational pain points that SmartFactory directly solves:

| Pain Point | SmartFactory Solution | Business Impact |
|---|---|---|
| Manual Tech Pack data entry takes hours | **AI Tech Pack Parser** — LLM extracts structured BOM + PO in seconds | Saves 2–4 hours per order |
| Fabric defects slip through manual visual QC | **YOLO12 + OpenCV Vision Scanner** — automated multi-pass defect detection | Reduces defect rejection at buyer end |
| Supply chain disruptions caught too late | **AI Disruption Analyzer** — predicts delay probability, generates mitigation plans | Proactive risk management |
| Inventory tracked in disconnected spreadsheets | **Live Inventory Ledger** — real-time SQLite-backed stock across all materials | Single source of truth |
| QC audit trail is paper-based | **Digital QC Audit Log** — every inspection committed to database with full report | Compliance and traceability |
| No visibility into order risk levels | **Risk Dashboard** — color-coded delay probability per PO, High Risk alerts | Faster decision-making |

SmartFactory replaces manual data-entry clerks, paper QC reports, and reactive logistics management with an AI co-pilot running at the **Dhaka Production Facility**.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SMARTFACTORY AI-ERP                             │
│                  Synergies Sourcing Bangladesh Ltd.                     │
│                                                                         │
│   ┌────────────────────────────┐    ┌──────────────────────────────┐    │
│   │     FRONTEND (React 19)    │    │      BACKEND (FastAPI)        │    │
│   │     Vite + TailwindCSS     │◄──►│      Python 3.11+            │    │
│   │     localhost:5173         │    │      localhost:8000           │    │
│   └────────────────────────────┘    └──────────┬───────────────────┘    │
│                                                │                        │
│                                ┌───────────────┼─────────────────┐      │
│                                │               │                 │      │
│                         ┌──────▼──────┐ ┌──────▼──────┐ ┌───────▼───┐  │
│                         │  SQLite DB  │ │  YOLO12n +  │ │  Ollama   │  │
│                         │ (aiosqlite) │ │  OpenCV CV  │ │  LLM API  │  │
│                         │  apparel_   │ │  Engine     │ │  :11434   │  │
│                         │  erp.db     │ └─────────────┘ └───────────┘  │
│                         └─────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Merchandiser uploads a fabric image or Tech Pack text via the React UI
2. React sends the request to FastAPI over REST (`localhost:8000/api`)
3. FastAPI routes to the appropriate service (YOLO/OpenCV, Ollama LLM, or CRUD)
4. Results are persisted to SQLite and returned to the frontend for display
5. Dashboard auto-syncs state after every operation

---

## 📦 Modules Overview

### 1. 📊 Dashboard
**File:** `frontend/src/components/Dashboard.jsx`

The central command center showing:
- Total active Purchase Orders and their statuses
- Material inventory stock levels (Cotton, Polyester, Denim, Buttons, Zippers)
- **High-risk disruption alerts** (orders with delay probability > 70%)
- Recent QC audit results and pass/fail verdicts
- Quick-navigate cards to each module

---

### 2. 📋 Order Management
**Files:** `frontend/src/components/OrderTable.jsx` | `backend/app/api/routers/orders.py`

Full CRUD Purchase Order management:
- Register new POs (Order ID, Buyer, Garment type, Quantity, Unit)
- View all orders with live status, risk level, and delay probability
- Orders automatically update status after QC inspection (`QC Passed` / `QC Failed`)
- Pre-seeded buyer registry: **Zara International**, **Levi Strauss & Co.**, **H&M Group**

---

### 3. 🤖 AI Tech Pack Assistant
**Files:** `frontend/src/components/TechPackTab.jsx` | `backend/app/api/routers/ingestion.py`

Garment Tech Packs are dense specification documents. This module:
1. Accepts raw Tech Pack text (paste from email, PDF, or Word document)
2. Sends to **Ollama (`openchat:latest`)** via OpenAI-compatible API
3. LLM extracts structured BOM (Bill of Materials) and PO specification as JSON
4. Auto-creates the Purchase Order and BOM line items in the database
5. Generates a professional supplier **RFQ (Request for Quotation) email** with itemized table, payment terms, and FOB clause

---

### 4. 🚚 Supply Chain Analytics
**Files:** `frontend/src/components/LogisticsTab.jsx` | `backend/app/api/routers/logistics.py`

AI-driven supply chain risk management:
1. Select any active Purchase Order
2. Input a disruption vector (e.g., *"Port congestion at Chittagong"*, *"Fabric supplier factory fire"*)
3. Ollama LLM generates a full **Operations Mitigation Report** covering:
   - Root cause analysis
   - Immediate workarounds (sub-contracting, air freight, buffer stock activation)
   - Strategic supplier rerouting recommendations
   - Revised risk level and updated delay probability

---

### 5. 🔬 Quality Control Vision Workbench
**Files:** `frontend/src/components/QCTab.jsx` | `backend/app/api/routers/qc.py`

The most technically advanced module. Uses a **dual-engine defect pipeline**:

#### Engine 1 — YOLO12 Neural Network
- Model: `yolo12n.pt` (YOLO12 nano, 5.3 MB, loaded locally)
- Runs at confidence threshold ≥ 30% as a supplementary detector

#### Engine 2 — OpenCV Multi-Pass Fabric Analyzer (Primary)
| Pass | Detects | OpenCV Technique |
|---|---|---|
| **Dark Blob** | Stains, holes, insect marks | Binary threshold + contour detection |
| **Bright Blob** | Tears, chemical spots, over-tension | Inverted threshold + blob analysis |
| **Edge Density** | Snags, thread pulls, weave breaks | Canny edges + 8×8 tile grid density map |
| **Texture Variance** | Pilling, raised fibres, rough patches | Local sliding-window std-dev mapping |

**Defect Severity Classification:**
- `≥ 60% confidence` → 🔴 **Critical** — reject fabric roll, raise NCR
- `30–60% confidence` → 🟡 **Minor** — flag for manual re-inspection
- `< 30% confidence` → ⚪ **Noise** — acceptable, proceed to cutting

**Output:** Annotated JPEG image with colored bounding boxes + full QC compliance report committed to the audit database.

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime language |
| **FastAPI** | Latest | Async REST API framework |
| **Uvicorn** | Latest | ASGI server with hot-reload |
| **SQLAlchemy** | Latest | Async ORM |
| **aiosqlite** | Latest | Async SQLite driver |
| **Pydantic v2** | Latest | Data validation & serialization |
| **pydantic-settings** | Latest | `.env` file loading |
| **Ultralytics** | Latest | YOLO12 model interface |
| **OpenCV (cv2)** | Latest | Computer vision & image annotation |
| **NumPy** | Latest | Image array processing |
| **openai** | Latest | Ollama OpenAI-compatible HTTP client |
| **python-multipart** | Latest | Multipart file upload handling |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI component framework |
| **Vite** | 8 | Dev server & production bundler |
| **Tailwind CSS** | 3.4 | Utility-first styling system |
| **Axios** | 1.18 | HTTP REST client |
| **TanStack Query** | 5 | Server state management |
| **React Router** | 7 | SPA navigation |

### AI / ML Stack
| Technology | Role |
|---|---|
| **Ollama** | Local LLM inference server (OpenAI-compatible REST) |
| **openchat:latest** | LLM for Tech Pack parsing, RFQ drafting, disruption analysis |
| **YOLO12n** | Neural object detection on fabric images |
| **OpenCV** | Multi-pass fabric texture anomaly detection pipeline |

---

## ✅ Prerequisites

Ensure the following are installed before setup:

| Requirement | Version | Download |
|---|---|---|
| Python | 3.11+ | [python.org/downloads](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Ollama | Latest | [ollama.com/download](https://ollama.com/download) |

### Verify installations
```bash
python --version      # Should be 3.11+
node --version        # Should be 18+
ollama --version      # Should respond with version number
```

---

## 📁 Project Structure

```
Software Engineer Synergies Sourcing Bangladesh Ltd/
│
├── README.md                          ← This file
│
├── backend/                           ← FastAPI Python server
│   ├── main.py                        ← App entry point, seeding, CORS setup
│   ├── .env                           ← Environment configuration
│   ├── yolo12n.pt                     ← YOLO12 model weights (5.3 MB)
│   ├── yolov8n.pt                     ← YOLOv8 fallback weights
│   ├── apparel_erp.db                 ← SQLite database (auto-created)
│   │
│   └── app/
│       ├── core/
│       │   ├── config.py              ← Pydantic settings (reads .env)
│       │   └── database.py            ← Async SQLAlchemy engine + session
│       │
│       ├── models/
│       │   └── erp_models.py          ← SQLAlchemy ORM models
│       │
│       ├── schemas/
│       │   └── erp_schemas.py         ← Pydantic request/response schemas
│       │
│       ├── crud/
│       │   └── erp_crud.py            ← Database CRUD operations
│       │
│       ├── services/
│       │   └── ai_service.py          ← Ollama LLM client + simulation fallback
│       │
│       └── api/routers/
│           ├── orders.py              ← PO management endpoints
│           ├── ingestion.py           ← Tech Pack AI parsing endpoint
│           ├── logistics.py           ← Supply chain risk analysis endpoints
│           └── qc.py                  ← YOLO12 + OpenCV QC endpoints
│
└── frontend/                          ← React + Vite application
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    │
    └── src/
        ├── App.jsx                    ← Root component, API handlers, global state
        └── components/
            ├── Sidebar.jsx            ← Navigation + inventory + risk alerts
            ├── Dashboard.jsx          ← KPI summary + order overview
            ├── OrderTable.jsx         ← PO management + registration form
            ├── TechPackTab.jsx        ← AI Tech Pack parser + RFQ generator
            ├── LogisticsTab.jsx       ← Supply chain risk + disruption analysis
            └── QCTab.jsx              ← YOLO12 + CV fabric vision workbench
```

---

## 🚀 Setup & Installation

### Step 1 — Prepare Ollama (AI LLM)

```bash
# 1. Install Ollama from https://ollama.com/download
#    (Ollama runs as a background service on Windows automatically)

# 2. Pull the openchat model (approx 4.1 GB — one-time download)
ollama pull openchat

# 3. Verify the model is ready
ollama list
# Expected output:
# NAME                ID              SIZE    MODIFIED
# openchat:latest     ...             4.1 GB  ...
```

---

### Step 2 — Backend Setup (Python / FastAPI)

```bash
# Navigate to the backend directory
cd "Software Engineer Synergies Sourcing Bangladesh Ltd/backend"

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
venv\Scripts\activate          # Windows PowerShell
# source venv/bin/activate     # macOS / Linux

# Install all Python dependencies
pip install fastapi uvicorn sqlalchemy aiosqlite pydantic pydantic-settings \
            openai ultralytics opencv-python numpy python-multipart
```

> **YOLO model weights** (`yolo12n.pt` and `yolov8n.pt`) are already bundled in the `backend/` directory — no separate download required.

---

### Step 3 — Frontend Setup (React / Vite)

```bash
# Navigate to the frontend directory
cd "Software Engineer Synergies Sourcing Bangladesh Ltd/frontend"

# Install all Node.js dependencies
npm install
```

---

### Step 4 — Verify Environment Configuration

The `backend/.env` file is pre-configured and ready:

```env
# Database Configuration
DATABASE_URL=sqlite+aiosqlite:///./apparel_erp.db

# Ollama Local LLM Configuration
# Ollama exposes an OpenAI-compatible REST API at localhost:11434/v1
OLLAMA_API_KEY=ollama
OLLAMA_API_URL=http://localhost:11434/v1
OLLAMA_MODEL_NAME=openchat:latest
```

No changes needed unless you're using a different Ollama model or port.

---

## ▶ Running the Application

Open **two terminal windows** side by side.

### Terminal 1 — Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Successful startup output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
INFO:     smartfactory.main: Database tables verified.
INFO:     smartfactory.main: Database seeding completed.
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

**Successful startup output:**
```
  VITE v8.x  ready in Xms
  ➜  Local:   http://localhost:5173/
```

### Open in Browser

```
http://localhost:5173
```

The ERP dashboard will load and automatically sync with the backend database.

---

## ⚙ Environment Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./apparel_erp.db` | SQLite async database path |
| `OLLAMA_API_KEY` | `ollama` | Auth key for Ollama (always `ollama` for local) |
| `OLLAMA_API_URL` | `http://localhost:11434/v1` | Ollama OpenAI-compatible base URL |
| `OLLAMA_MODEL_NAME` | `openchat:latest` | LLM model for all AI features |

### Switching to a different LLM

```bash
# Pull your preferred model
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

Then update `.env`:
```env
OLLAMA_MODEL_NAME=llama3.2:latest
```

> **Offline mode:** If Ollama is not running, `ai_service.py` automatically falls back to a **built-in high-fidelity simulation engine** that returns realistic RFQs, disruption reports, and QC summaries. The QC Vision module always works fully because it uses local YOLO12 + OpenCV (no LLM needed).

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Interactive Swagger docs:
```
http://localhost:8000/docs
```

### Orders & Inventory
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List all purchase orders |
| `POST` | `/api/orders` | Register a new purchase order |
| `GET` | `/api/inventory` | List all material inventory |

### AI Tech Pack Ingestion
| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/ai/techpack-to-bom` | `{ "text": "..." }` | Parse Tech Pack → BOM + PO + RFQ email |

### Logistics / Supply Chain
| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/logistics/analyze` | `{ "order_id": "PO-XXXX", "disruption_vector": "..." }` | AI disruption analysis + mitigation plan |

### Quality Control
| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/qc/analyze` | `multipart/form-data`: `order_id` + `file` | YOLO12 + CV fabric defect scan |
| `GET` | `/api/qc/logs` | — | All historical QC audit records |

---

## 🗄 Database Schema

The SQLite database is automatically created and seeded on first startup.

```
buyers
  ├── buyer_id      (PK)   "ZARA" | "LEVIS" | "HM"
  ├── name                 "Zara International"
  └── contact_email        "sourcing@zara.com"

suppliers
  ├── supplier_id   (PK)   "TEXSUP" | "TRIMCORP" | "THREADKING"
  ├── name                 "Textile Synergy Ltd"
  └── contact_email

inventory
  ├── item          (PK)   "cotton fabric" | "denim fabric" | ...
  ├── quantity             1200.0
  └── unit                 "meters" | "spools" | "pieces"

purchase_orders
  ├── order_id      (PK)   "PO-9903"
  ├── buyer_id      (FK → buyers)
  ├── buyer_name           "H&M Group"
  ├── item                 "Cotton T-Shirt"
  ├── quantity             3000.0
  ├── unit                 "pcs"
  ├── status               Pending | Processing | QC Passed | QC Failed
  ├── risk_level           Low | Medium | High
  └── delay_probability    0.0 → 1.0

bill_of_materials
  ├── bom_id        (PK, auto-int)
  ├── order_id      (FK → purchase_orders)
  ├── item                 "cotton fabric"
  ├── quantity             4500.0
  └── unit                 "meters"

qc_logs
  ├── log_id        (PK, auto-int)
  ├── order_id      (FK → purchase_orders)
  ├── defect_type          "dark_spot_stain, weave_anomaly_snag"
  ├── status               Passed | Failed
  └── report               Full YOLO12 + CV compliance report text
```

**Auto-seeded data on first startup:**

| Entity | Records |
|---|---|
| Buyers | Zara International, Levi Strauss & Co., H&M Group |
| Suppliers | Textile Synergy Ltd, Global Trim Solutions, ThreadKing Spinning Mills |
| Inventory | Cotton (1,200m), Polyester Thread (80 spools), Brass Buttons (5,000 pcs), Denim (2,500m), Zippers (350 pcs) |
| Purchase Orders | PO-9901 (Zara/Low risk), PO-9902 (Levi's/Medium), PO-9903 (H&M/High) |

---

## 🧠 AI & Vision Engine Details

### Ollama LLM Integration

`backend/app/services/ai_service.py` connects to Ollama using the **OpenAI-compatible REST API**. Any model on Ollama can be swapped via `.env` — no code changes required.

**Sandbox detection logic:**
```python
_SANDBOX_KEY_TOKENS = {"dummy", "mock-api-key", "placeholder"}

def _is_sandbox():
    key = settings.OLLAMA_API_KEY.strip().lower()
    return key in _SANDBOX_KEY_TOKENS or key == ""
```

`"ollama"` is treated as a live key — the real Ollama server is used for all AI tasks.

---

### YOLO12 + OpenCV Defect Detection Pipeline

```
 Fabric Image Upload (JPEG / PNG)
         │
         ▼
  ┌─────────────────────────────────┐
  │     YOLO12n Inference           │ ──► Generic object detections
  │     (yolo12n.pt, local)         │     (supplementary, conf ≥ 30%)
  └─────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │              OpenCV Multi-Pass Analysis              │
  │                                                     │
  │  Pass 1: Dark Blob  ──► dark_spot_stain             │
  │  Pass 2: Bright Blob ──► bright_spot_tear           │
  │  Pass 3: Edge Density ──► weave_anomaly_snag        │
  │  Pass 4: Texture Variance ──► texture_irregularity  │
  └─────────────────────────────────────────────────────┘
         │
         ▼
  NMS Deduplication (IoU threshold: 0.45)
         │
         ▼
  Severity Classification
  ├── conf ≥ 60% → CRITICAL → VERDICT: Failed (🔴 red boxes)
  ├── conf 30–60% → MINOR  → VERDICT: Failed (🟡 amber boxes)
  └── conf < 30%  → NOISE  → VERDICT: Passed (⚪ grey boxes)
         │
         ▼
  Annotated JPEG + Compliance Report → SQLite → React UI
```

---

## 🧑‍💻 Skills Alignment with Job Description

This section maps the Synergies job requirements to specific parts of this codebase:

### Required Skills
| Skill | File / Implementation |
|---|---|
| **ERP Developer** | `backend/app/api/routers/` — 4 modular ERP routers |
| **ERP Implementation** | `backend/main.py` — startup seeding, CORS, DB init |
| **Artificial Intelligence (AI)** | `backend/app/api/routers/qc.py` — YOLO12 neural inference |
| **Artificial Intelligence Usage** | `backend/app/services/ai_service.py` — Ollama LLM orchestration |
| **Generative AI** | `backend/app/api/routers/ingestion.py` — LLM Tech Pack parsing, RFQ generation |
| **Machine Learning** | `yolo12n.pt` — pre-trained YOLO12 model, OpenCV texture ML |
| **Management Information System** | Full ERP: orders, inventory, QC audit logs, reporting |
| **Software Development** | Full-stack: Python FastAPI backend + React 19 frontend |

### Responsibilities Demonstrated
| Responsibility | Where |
|---|---|
| Develop & customize ERP applications | `backend/app/` — full async FastAPI ERP with SQLAlchemy ORM |
| Analyze business processes & implement tech solutions | `qc.py` — replaced manual inspection with automated CV pipeline |
| Research & implement AI solutions | `ai_service.py` — Ollama GenAI + YOLO12 + OpenCV |
| Develop AI-enabled automation tools | Tech Pack parser automates BOM creation; QC scanner automates defect detection |
| Integrate third-party applications | Ollama API + YOLO12 + OpenCV all integrated into one backend |
| Provide technical support & troubleshoot | Detailed logging across all routers; `/docs` Swagger UI |
| Prepare technical documentation | This README; inline docstrings throughout codebase |

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Ensure virtual environment is active
venv\Scripts\activate

# Reinstall dependencies
pip install fastapi uvicorn sqlalchemy aiosqlite pydantic pydantic-settings \
            openai ultralytics opencv-python numpy python-multipart
```

### "ERP Connection Offline" banner in the UI
```bash
# Verify backend is running
curl http://localhost:8000/
# Expected: {"status":"online","service":"SmartFactory AI-ERP Backend"}

# Check port 8000 is free
netstat -ano | findstr :8000
```

### Ollama / LLM features not responding
```bash
# Check Ollama service is running
ollama list

# Start it manually if needed
ollama serve

# Pull the model if missing
ollama pull openchat
```

### QC showing "No defects" on a clearly defective fabric
Ensure the uploaded image is:
- **In sharp focus** — blurry images suppress edge detection
- **Well-lit** — low-light images collapse the dark blob threshold
- **JPEG or PNG** format — avoid WEBP, HEIC, or heavily compressed files
- **Photographed close-up** — defect must occupy a meaningful pixel area (> 80px²)

### Reset database to fresh state
```bash
# From the backend directory
del apparel_erp.db       # Windows
# rm apparel_erp.db      # macOS/Linux

# Restart backend — auto-creates and re-seeds
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Port conflict on 8000 or 5173
```bash
# Run backend on alternate port
python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# Then update frontend/src/App.jsx line 11:
const API_URL = 'http://localhost:8080/api';
```

---

## 👥 About

**Organization:** Synergies Sourcing Bangladesh Ltd.
**Active Workspace:** Dhaka Production Facility
**Platform Version:** v1.6.8
**User Role:** Synergies Merchandiser

---

## 📄 License

Internal use only — Synergies Sourcing Bangladesh Ltd. © 2026. All rights reserved.

---

*Built with FastAPI · React 19 · YOLO12 · OpenCV · Ollama · SQLite · Vite · TailwindCSS*
