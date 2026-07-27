from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from app.models.erp_models import Buyer, Supplier, Inventory, PurchaseOrder, BillOfMaterials, QCLog, ProductionOrder, Shipment, RAGDocument, EmailLog, AITask

# --- BUYER CRUD ---
async def get_buyer(db: AsyncSession, buyer_id: str) -> Optional[Buyer]:
    result = await db.execute(select(Buyer).filter(Buyer.buyer_id == buyer_id))
    return result.scalars().first()

async def get_or_create_buyer(db: AsyncSession, buyer_id: str, name: str, email: str) -> Buyer:
    buyer = await get_buyer(db, buyer_id)
    if not buyer:
        buyer = Buyer(buyer_id=buyer_id, name=name, contact_email=email)
        db.add(buyer)
        await db.flush()  # flush to populate and link without committing transaction yet
    return buyer

async def get_all_buyers(db: AsyncSession) -> List[Buyer]:
    result = await db.execute(select(Buyer))
    return list(result.scalars().all())


# --- SUPPLIER CRUD ---
async def get_supplier(db: AsyncSession, supplier_id: str) -> Optional[Supplier]:
    result = await db.execute(select(Supplier).filter(Supplier.supplier_id == supplier_id))
    return result.scalars().first()

async def get_or_create_supplier(db: AsyncSession, supplier_id: str, name: str, email: str) -> Supplier:
    supplier = await get_supplier(db, supplier_id)
    if not supplier:
        supplier = Supplier(supplier_id=supplier_id, name=name, contact_email=email)
        db.add(supplier)
        await db.flush()
    return supplier

async def get_all_suppliers(db: AsyncSession) -> List[Supplier]:
    result = await db.execute(select(Supplier))
    return list(result.scalars().all())


# --- INVENTORY CRUD ---
async def get_inventory_item(db: AsyncSession, item_name: str) -> Optional[Inventory]:
    result = await db.execute(select(Inventory).filter(Inventory.item == item_name))
    return result.scalars().first()

async def update_inventory_stock(db: AsyncSession, item_name: str, quantity_add: float, unit: str) -> Inventory:
    item_key = item_name.strip().lower()
    inv_item = await get_inventory_item(db, item_key)
    if inv_item:
        inv_item.quantity += quantity_add
        if unit:
            inv_item.unit = unit
    else:
        inv_item = Inventory(item=item_key, quantity=quantity_add, unit=unit)
        db.add(inv_item)
    await db.flush()
    return inv_item

async def get_all_inventory(db: AsyncSession) -> List[Inventory]:
    result = await db.execute(select(Inventory))
    return list(result.scalars().all())


# --- PURCHASE ORDER CRUD ---
async def get_purchase_order(db: AsyncSession, order_id: str) -> Optional[PurchaseOrder]:
    # Eager load all relationships to avoid MissingGreenlet lazy-load errors
    result = await db.execute(
        select(PurchaseOrder)
        .filter(PurchaseOrder.order_id == order_id)
        .options(
            selectinload(PurchaseOrder.bom_items),
            selectinload(PurchaseOrder.qc_logs),
            selectinload(PurchaseOrder.production_orders),
            selectinload(PurchaseOrder.shipments),
        )
    )
    return result.scalars().first()

async def get_all_purchase_orders(db: AsyncSession) -> List[PurchaseOrder]:
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.bom_items),
            selectinload(PurchaseOrder.qc_logs),
            selectinload(PurchaseOrder.production_orders),
            selectinload(PurchaseOrder.shipments),
        )
    )
    return list(result.scalars().all())

async def create_purchase_order(db: AsyncSession, order_data: Dict[str, Any]) -> PurchaseOrder:
    po = PurchaseOrder(
        order_id=order_data["order_id"],
        buyer_id=order_data["buyer_id"],
        buyer_name=order_data["buyer_name"],
        item=order_data["item"],
        quantity=order_data["quantity"],
        unit=order_data["unit"],
        status=order_data.get("status", "Pending"),
        risk_level=order_data.get("risk_level", "Low"),
        delay_probability=order_data.get("delay_probability", 0.0)
    )
    db.add(po)
    await db.flush()
    return po

async def update_po_risk(db: AsyncSession, order_id: str, risk_level: str, delay_probability: float) -> Optional[PurchaseOrder]:
    po = await get_purchase_order(db, order_id)
    if po:
        po.risk_level = risk_level
        po.delay_probability = delay_probability
        await db.flush()
    return po

async def update_po_status(db: AsyncSession, order_id: str, status: str, risk_level: Optional[str] = None, delay_probability: Optional[float] = None) -> Optional[PurchaseOrder]:
    po = await get_purchase_order(db, order_id)
    if po:
        po.status = status
        if risk_level is not None:
            po.risk_level = risk_level
        if delay_probability is not None:
            po.delay_probability = max(0.0, min(1.0, delay_probability))
        await db.flush()
    return po


# --- BILL OF MATERIALS (BOM) CRUD ---
async def add_bom_item(db: AsyncSession, order_id: str, item_name: str, quantity: float, unit: str) -> BillOfMaterials:
    bom = BillOfMaterials(
        order_id=order_id,
        item=item_name.strip().lower(),
        quantity=quantity,
        unit=unit
    )
    db.add(bom)
    await db.flush()
    return bom


# --- QC LOG CRUD ---
async def create_qc_log(db: AsyncSession, order_id: str, defect_type: str, status: str, report: str) -> QCLog:
    log = QCLog(
        order_id=order_id,
        defect_type=defect_type,
        status=status,
        report=report
    )
    db.add(log)
    await db.flush()
    return log

async def get_all_qc_logs(db: AsyncSession) -> List[QCLog]:
    result = await db.execute(select(QCLog))
    return list(result.scalars().all())


# --- PRODUCTION ORDER CRUD ---
async def create_production_order(db: AsyncSession, po_data: Dict[str, Any]) -> ProductionOrder:
    prod = ProductionOrder(
        order_id=po_data["order_id"],
        status=po_data.get("status", "Planned"),
        progress_pct=po_data.get("progress_pct", 0.0),
        risk_score=po_data.get("risk_score", 0.0),
        notes=po_data.get("notes")
    )
    db.add(prod)
    await db.flush()
    return prod

async def get_all_production_orders(db: AsyncSession) -> List[ProductionOrder]:
    result = await db.execute(select(ProductionOrder))
    return list(result.scalars().all())

async def get_production_order(db: AsyncSession, production_id: int) -> Optional[ProductionOrder]:
    result = await db.execute(select(ProductionOrder).filter(ProductionOrder.production_id == production_id))
    return result.scalars().first()

async def update_production_status(db: AsyncSession, production_id: int, status: str, progress_pct: float, risk_score: float) -> Optional[ProductionOrder]:
    prod = await get_production_order(db, production_id)
    if prod:
        prod.status = status
        prod.progress_pct = progress_pct
        prod.risk_score = risk_score
        await db.flush()
    return prod


# --- SHIPMENT CRUD ---
async def create_shipment(db: AsyncSession, shipment_data: Dict[str, Any]) -> Shipment:
    shipment = Shipment(
        order_id=shipment_data["order_id"],
        carrier=shipment_data.get("carrier"),
        origin=shipment_data.get("origin", "Dhaka"),
        destination=shipment_data["destination"],
        status=shipment_data.get("status", "Pending"),
        eta=shipment_data.get("eta"),
        delay_days=shipment_data.get("delay_days", 0),
        risk_level=shipment_data.get("risk_level", "Low")
    )
    db.add(shipment)
    await db.flush()
    return shipment

async def get_all_shipments(db: AsyncSession) -> List[Shipment]:
    result = await db.execute(select(Shipment))
    return list(result.scalars().all())

async def get_shipment(db: AsyncSession, shipment_id: int) -> Optional[Shipment]:
    result = await db.execute(select(Shipment).filter(Shipment.shipment_id == shipment_id))
    return result.scalars().first()

async def update_shipment_status(db: AsyncSession, shipment_id: int, status: str, eta: str, delay_days: int, risk_level: str) -> Optional[Shipment]:
    shipment = await get_shipment(db, shipment_id)
    if shipment:
        shipment.status = status
        shipment.eta = eta
        shipment.delay_days = delay_days
        shipment.risk_level = risk_level
        await db.flush()
    return shipment


# --- RAG DOCUMENT CRUD ---
async def create_rag_document(db: AsyncSession, doc_data: Dict[str, Any]) -> RAGDocument:
    doc = RAGDocument(
        filename=doc_data["filename"],
        doc_type=doc_data["doc_type"],
        content_text=doc_data["content_text"],
        uploaded_at=doc_data["uploaded_at"]
    )
    db.add(doc)
    await db.flush()
    return doc

async def get_all_rag_documents(db: AsyncSession) -> List[RAGDocument]:
    result = await db.execute(select(RAGDocument))
    return list(result.scalars().all())


# --- EMAIL LOG CRUD ---
async def create_email_log(db: AsyncSession, email_data: Dict[str, Any]) -> EmailLog:
    log = EmailLog(
        recipient=email_data["recipient"],
        subject=email_data["subject"],
        body=email_data["body"],
        category=email_data["category"],
        sent_at=email_data["sent_at"]
    )
    db.add(log)
    await db.flush()
    return log

async def get_all_email_logs(db: AsyncSession) -> List[EmailLog]:
    result = await db.execute(select(EmailLog).order_by(EmailLog.email_id.desc()))
    return list(result.scalars().all())


# --- AI TASK CRUD ---
async def create_ai_task(db: AsyncSession, task_data: Dict[str, Any]) -> AITask:
    task = AITask(
        description=task_data["description"],
        assigned_to=task_data.get("assigned_to", "Unassigned"),
        status=task_data.get("status", "Pending"),
        due_date=task_data.get("due_date")
    )
    db.add(task)
    await db.flush()
    return task

async def get_all_ai_tasks(db: AsyncSession) -> List[AITask]:
    result = await db.execute(select(AITask).order_by(AITask.task_id.desc()))
    return list(result.scalars().all())

async def update_ai_task_status(db: AsyncSession, task_id: int, status: str) -> Optional[AITask]:
    result = await db.execute(select(AITask).filter(AITask.task_id == task_id))
    task = result.scalars().first()
    if task:
        task.status = status
        await db.flush()
    return task


