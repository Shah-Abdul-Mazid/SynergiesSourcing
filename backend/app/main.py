from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import get_db
from app.api.routers import orders, ingestion, logistics, qc, procurement, inventory_extended, production, reports, ai_assistant

import uvicorn
import logging

# Configure enterprise logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smartfactory.main")

app = FastAPI(
    title="SmartFactory AI-ERP",
    description="Production-ready AI-ERP ecosystem for garment buying houses.",
    version="1.0.0"
)

# Set up open CORS permissions for developer workstation environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under the /api prefix
app.include_router(orders.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")
app.include_router(logistics.router, prefix="/api")
app.include_router(qc.router, prefix="/api")
app.include_router(procurement.router, prefix="/api")
app.include_router(inventory_extended.router, prefix="/api")
app.include_router(production.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(ai_assistant.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup: MongoDB client ready.")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SmartFactory AI-ERP Backend",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
