from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base, SessionLocal
from app.api.routers import orders, ingestion, logistics, qc, procurement, inventory_extended, production, reports, ai_assistant
from app.models.erp_models import Buyer, Supplier, Inventory, PurchaseOrder, ProductionOrder, Shipment, RAGDocument
from sqlalchemy.future import select
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
    logger.info("Initializing SQLite database tables...")
    async with engine.begin() as conn:
        # Create all tables safely
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified.")

    # Populate seed data inside an isolated session context
    async with SessionLocal() as db:
        try:
            # 1. Seed Buyers if empty
            buyer_result = await db.execute(select(Buyer))
            if not buyer_result.scalars().first():
                logger.info("Seeding default Buyer profiles...")
                buyers = [
                    Buyer(buyer_id="ZARA", name="Zara International", contact_email="sourcing@zara.com"),
                    Buyer(buyer_id="LEVIS", name="Levi Strauss & Co.", contact_email="sourcing@levis.com"),
                    Buyer(buyer_id="HM", name="H&M Group", contact_email="sourcing@hm.com"),
                ]
                db.add_all(buyers)

            # 2. Seed Suppliers if empty
            supplier_result = await db.execute(select(Supplier))
            if not supplier_result.scalars().first():
                logger.info("Seeding default Supplier directories...")
                suppliers = [
                    Supplier(supplier_id="TEXSUP", name="Textile Synergy Ltd", contact_email="sales@textilesynergy.com"),
                    Supplier(supplier_id="TRIMCORP", name="Global Trim Solutions", contact_email="orders@globaltrims.com"),
                    Supplier(supplier_id="THREADKING", name="ThreadKing Spinning Mills", contact_email="bulk@threadking.com"),
                ]
                db.add_all(suppliers)

            # 3. Seed some default material inventory if empty
            inv_result = await db.execute(select(Inventory))
            if not inv_result.scalars().first():
                logger.info("Seeding material inventory counts...")
                items = [
                    Inventory(item="cotton fabric", quantity=1200.0, unit="meters"),
                    Inventory(item="polyester thread", quantity=80.0, unit="spools"),
                    Inventory(item="brass buttons", quantity=5000.0, unit="pieces"),
                    Inventory(item="denim fabric", quantity=2500.0, unit="meters"),
                    Inventory(item="zippers", quantity=350.0, unit="pieces"),
                ]
                db.add_all(items)

            # 4. Seed initial orders if empty
            po_result = await db.execute(select(PurchaseOrder))
            if not po_result.scalars().first():
                logger.info("Seeding default Purchase Orders...")
                demo_orders = [
                    PurchaseOrder(
                        order_id="PO-9901",
                        buyer_id="ZARA",
                        buyer_name="Zara International",
                        item="Slim Fit Jeans",
                        quantity=1000.0,
                        unit="pcs",
                        status="Processing",
                        risk_level="Low",
                        delay_probability=0.04
                    ),
                    PurchaseOrder(
                        order_id="PO-9902",
                        buyer_id="LEVIS",
                        buyer_name="Levi Strauss & Co.",
                        item="Denim Jacket",
                        quantity=500.0,
                        unit="pcs",
                        status="Pending",
                        risk_level="Medium",
                        delay_probability=0.38
                    ),
                    PurchaseOrder(
                        order_id="PO-9903",
                        buyer_id="HM",
                        buyer_name="H&M Group",
                        item="Cotton T-Shirt",
                        quantity=3000.0,
                        unit="pcs",
                        status="Pending",
                        risk_level="High",
                        delay_probability=0.78
                    )
                ]
                db.add_all(demo_orders)

            await db.commit()

            # 5. Seed initial Production Orders if empty
            prod_result = await db.execute(select(ProductionOrder))
            if not prod_result.scalars().first():
                logger.info("Seeding default Production Orders...")
                demo_prod = [
                    ProductionOrder(order_id="PO-9901", status="Completed", progress_pct=100.0, risk_score=5.0, notes="Cutting complete, sewing complete. Approved."),
                    ProductionOrder(order_id="PO-9902", status="In Progress", progress_pct=45.0, risk_score=25.0, notes="Sewing line 2 active. Buttons delivery pending."),
                    ProductionOrder(order_id="PO-9903", status="Planned", progress_pct=0.0, risk_score=78.0, notes="Awaiting initial fabric scan. High delay warning at Chittagong.")
                ]
                db.add_all(demo_prod)

            # 6. Seed initial Shipments if empty
            shipment_result = await db.execute(select(Shipment))
            if not shipment_result.scalars().first():
                logger.info("Seeding default Shipments...")
                demo_ship = [
                    Shipment(order_id="PO-9901", carrier="Maersk Line", origin="Dhaka", destination="Hamburg, Germany", status="Delivered", eta="2026-07-10", delay_days=0, risk_level="Low"),
                    Shipment(order_id="PO-9902", carrier="DHL Global", origin="Dhaka", destination="New York, USA", status="In Transit", eta="2026-07-20", delay_days=2, risk_level="Medium"),
                    Shipment(order_id="PO-9903", carrier="Apex Logistics", origin="Dhaka", destination="London, UK", status="Pending", eta="2026-08-01", delay_days=5, risk_level="High")
                ]
                db.add_all(demo_ship)

            await db.commit()
            logger.info("Database seeding completed.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding database: {e}", exc_info=True)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SmartFactory AI-ERP Backend",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    # Start the server using uvicorn when running file directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
