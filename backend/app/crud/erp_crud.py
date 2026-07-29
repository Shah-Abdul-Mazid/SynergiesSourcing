from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any

class AttributeDict(dict):
    """Dictionary subclass that allows attribute-style access (e.g. obj.key)."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'AttributeDict' has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value

    def __delattr__(self, name: str) -> None:
        try:
            del self[name]
        except KeyError:
            raise AttributeError(f"'AttributeDict' has no attribute '{name}'")

def clean_doc(doc: Optional[dict]) -> Optional[AttributeDict]:
    if doc is None:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return AttributeDict(d)


# --- BUYER CRUD ---
async def get_buyer(db: AsyncIOMotorDatabase, buyer_id: str) -> Optional[AttributeDict]:
    doc = await db.buyers.find_one({"buyer_id": buyer_id})
    return clean_doc(doc)

async def get_or_create_buyer(db: AsyncIOMotorDatabase, buyer_id: str, name: str, email: str) -> AttributeDict:
    buyer = await get_buyer(db, buyer_id)
    if not buyer:
        doc = {"buyer_id": buyer_id, "name": name, "contact_email": email}
        await db.buyers.insert_one(doc)
        buyer = clean_doc(doc)
    return buyer

async def get_all_buyers(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.buyers.find({})
    return [clean_doc(doc) async for doc in cursor]


# --- SUPPLIER CRUD ---
async def get_supplier(db: AsyncIOMotorDatabase, supplier_id: str) -> Optional[AttributeDict]:
    doc = await db.suppliers.find_one({"supplier_id": supplier_id})
    return clean_doc(doc)

async def get_or_create_supplier(db: AsyncIOMotorDatabase, supplier_id: str, name: str, email: str) -> AttributeDict:
    supplier = await get_supplier(db, supplier_id)
    if not supplier:
        doc = {"supplier_id": supplier_id, "name": name, "contact_email": email}
        await db.suppliers.insert_one(doc)
        supplier = clean_doc(doc)
    return supplier

async def get_all_suppliers(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.suppliers.find({})
    return [clean_doc(doc) async for doc in cursor]


# --- INVENTORY CRUD ---
async def get_inventory_item(db: AsyncIOMotorDatabase, item_name: str) -> Optional[AttributeDict]:
    item_key = item_name.strip().lower()
    doc = await db.inventory.find_one({"item": item_key})
    return clean_doc(doc)

async def update_inventory_stock(db: AsyncIOMotorDatabase, item_name: str, quantity_add: float, unit: str) -> AttributeDict:
    item_key = item_name.strip().lower()
    doc = await db.inventory.find_one({"item": item_key})
    if doc:
        new_qty = float(doc.get("quantity", 0.0)) + quantity_add
        update_fields = {"quantity": new_qty}
        if unit:
            update_fields["unit"] = unit
        await db.inventory.update_one({"item": item_key}, {"$set": update_fields})
        doc["quantity"] = new_qty
        if unit:
            doc["unit"] = unit
    else:
        doc = {"item": item_key, "quantity": quantity_add, "unit": unit}
        await db.inventory.insert_one(doc)
    return clean_doc(doc)

async def get_all_inventory(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.inventory.find({})
    return [clean_doc(doc) async for doc in cursor]


# --- PURCHASE ORDER CRUD ---
async def get_purchase_order(db: AsyncIOMotorDatabase, order_id: str) -> Optional[AttributeDict]:
    doc = await db.purchase_orders.find_one({"order_id": order_id})
    if not doc:
        return None
    po = clean_doc(doc)
    boms = [clean_doc(b) async for b in db.bill_of_materials.find({"order_id": order_id})]
    qc = [clean_doc(q) async for q in db.qc_logs.find({"order_id": order_id})]
    prods = [clean_doc(p) async for p in db.production_orders.find({"order_id": order_id})]
    ships = [clean_doc(s) async for s in db.shipments.find({"order_id": order_id})]
    po["bom_items"] = boms
    po["qc_logs"] = qc
    po["production_orders"] = prods
    po["shipments"] = ships
    return po

async def get_all_purchase_orders(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.purchase_orders.find({})
    orders = []
    async for doc in cursor:
        po = clean_doc(doc)
        order_id = po["order_id"]
        po["bom_items"] = [clean_doc(b) async for b in db.bill_of_materials.find({"order_id": order_id})]
        po["qc_logs"] = [clean_doc(q) async for q in db.qc_logs.find({"order_id": order_id})]
        po["production_orders"] = [clean_doc(p) async for p in db.production_orders.find({"order_id": order_id})]
        po["shipments"] = [clean_doc(s) async for s in db.shipments.find({"order_id": order_id})]
        orders.append(po)
    return orders

async def create_purchase_order(db: AsyncIOMotorDatabase, order_data: Dict[str, Any]) -> AttributeDict:
    po = {
        "order_id": order_data["order_id"],
        "buyer_id": order_data["buyer_id"],
        "buyer_name": order_data["buyer_name"],
        "item": order_data["item"],
        "quantity": order_data["quantity"],
        "unit": order_data["unit"],
        "status": order_data.get("status", "Pending"),
        "risk_level": order_data.get("risk_level", "Low"),
        "delay_probability": order_data.get("delay_probability", 0.0)
    }
    await db.purchase_orders.insert_one(po)
    return await get_purchase_order(db, order_data["order_id"])

async def update_po_risk(db: AsyncIOMotorDatabase, order_id: str, risk_level: str, delay_probability: float) -> Optional[AttributeDict]:
    await db.purchase_orders.update_one(
        {"order_id": order_id},
        {"$set": {"risk_level": risk_level, "delay_probability": delay_probability}}
    )
    return await get_purchase_order(db, order_id)

async def update_po_status(db: AsyncIOMotorDatabase, order_id: str, status: str, risk_level: Optional[str] = None, delay_probability: Optional[float] = None) -> Optional[AttributeDict]:
    update_dict: Dict[str, Any] = {"status": status}
    if risk_level is not None:
        update_dict["risk_level"] = risk_level
    if delay_probability is not None:
        update_dict["delay_probability"] = max(0.0, min(1.0, delay_probability))
    await db.purchase_orders.update_one({"order_id": order_id}, {"$set": update_dict})
    return await get_purchase_order(db, order_id)


# --- BILL OF MATERIALS (BOM) CRUD ---
async def add_bom_item(db: AsyncIOMotorDatabase, order_id: str, item_name: str, quantity: float, unit: str) -> AttributeDict:
    count = await db.bill_of_materials.count_documents({})
    bom = {
        "bom_id": count + 1,
        "order_id": order_id,
        "item": item_name.strip().lower(),
        "quantity": quantity,
        "unit": unit
    }
    await db.bill_of_materials.insert_one(bom)
    return clean_doc(bom)

async def delete_bom_items_for_order(db: AsyncIOMotorDatabase, order_id: str):
    await db.bill_of_materials.delete_many({"order_id": order_id})


# --- QC LOG CRUD ---
async def create_qc_log(db: AsyncIOMotorDatabase, order_id: str, defect_type: str, status: str, report: str) -> AttributeDict:
    count = await db.qc_logs.count_documents({})
    log = {
        "log_id": count + 1,
        "order_id": order_id,
        "defect_type": defect_type,
        "status": status,
        "report": report
    }
    await db.qc_logs.insert_one(log)
    return clean_doc(log)

async def get_all_qc_logs(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.qc_logs.find({})
    return [clean_doc(doc) async for doc in cursor]


# --- PRODUCTION ORDER CRUD ---
async def create_production_order(db: AsyncIOMotorDatabase, po_data: Dict[str, Any]) -> AttributeDict:
    count = await db.production_orders.count_documents({})
    prod = {
        "production_id": count + 1,
        "order_id": po_data["order_id"],
        "status": po_data.get("status", "Planned"),
        "progress_pct": po_data.get("progress_pct", 0.0),
        "risk_score": po_data.get("risk_score", 0.0),
        "notes": po_data.get("notes")
    }
    await db.production_orders.insert_one(prod)
    return clean_doc(prod)

async def get_all_production_orders(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.production_orders.find({})
    return [clean_doc(doc) async for doc in cursor]

async def get_production_order(db: AsyncIOMotorDatabase, production_id: int) -> Optional[AttributeDict]:
    doc = await db.production_orders.find_one({"production_id": production_id})
    return clean_doc(doc)

async def update_production_status(db: AsyncIOMotorDatabase, production_id: int, status: str, progress_pct: float, risk_score: float) -> Optional[AttributeDict]:
    await db.production_orders.update_one(
        {"production_id": production_id},
        {"$set": {"status": status, "progress_pct": progress_pct, "risk_score": risk_score}}
    )
    return await get_production_order(db, production_id)


# --- SHIPMENT CRUD ---
async def create_shipment(db: AsyncIOMotorDatabase, shipment_data: Dict[str, Any]) -> AttributeDict:
    count = await db.shipments.count_documents({})
    shipment = {
        "shipment_id": count + 1,
        "order_id": shipment_data["order_id"],
        "carrier": shipment_data.get("carrier"),
        "origin": shipment_data.get("origin", "Dhaka"),
        "destination": shipment_data["destination"],
        "status": shipment_data.get("status", "Pending"),
        "eta": shipment_data.get("eta"),
        "delay_days": shipment_data.get("delay_days", 0),
        "risk_level": shipment_data.get("risk_level", "Low")
    }
    await db.shipments.insert_one(shipment)
    return clean_doc(shipment)

async def get_all_shipments(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.shipments.find({})
    return [clean_doc(doc) async for doc in cursor]

async def get_shipment(db: AsyncIOMotorDatabase, shipment_id: int) -> Optional[AttributeDict]:
    doc = await db.shipments.find_one({"shipment_id": shipment_id})
    return clean_doc(doc)

async def update_shipment_status(db: AsyncIOMotorDatabase, shipment_id: int, status: str, eta: str, delay_days: int, risk_level: str) -> Optional[AttributeDict]:
    await db.shipments.update_one(
        {"shipment_id": shipment_id},
        {"$set": {"status": status, "eta": eta, "delay_days": delay_days, "risk_level": risk_level}}
    )
    return await get_shipment(db, shipment_id)


# --- RAG DOCUMENT CRUD ---
async def create_rag_document(db: AsyncIOMotorDatabase, doc_data: Dict[str, Any]) -> AttributeDict:
    count = await db.rag_documents.count_documents({})
    doc = {
        "doc_id": count + 1,
        "filename": doc_data["filename"],
        "doc_type": doc_data["doc_type"],
        "content_text": doc_data["content_text"],
        "uploaded_at": doc_data["uploaded_at"]
    }
    await db.rag_documents.insert_one(doc)
    return clean_doc(doc)

async def get_all_rag_documents(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.rag_documents.find({})
    return [clean_doc(doc) async for doc in cursor]


# --- EMAIL LOG CRUD ---
async def create_email_log(db: AsyncIOMotorDatabase, email_data: Dict[str, Any]) -> AttributeDict:
    count = await db.email_logs.count_documents({})
    log = {
        "email_id": count + 1,
        "recipient": email_data["recipient"],
        "subject": email_data["subject"],
        "body": email_data["body"],
        "category": email_data["category"],
        "sent_at": email_data["sent_at"]
    }
    await db.email_logs.insert_one(log)
    return clean_doc(log)

async def get_all_email_logs(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.email_logs.find({}).sort("email_id", -1)
    return [clean_doc(doc) async for doc in cursor]


# --- AI TASK CRUD ---
async def create_ai_task(db: AsyncIOMotorDatabase, task_data: Dict[str, Any]) -> AttributeDict:
    count = await db.ai_tasks.count_documents({})
    task = {
        "task_id": count + 1,
        "description": task_data["description"],
        "assigned_to": task_data.get("assigned_to", "Unassigned"),
        "status": task_data.get("status", "Pending"),
        "due_date": task_data.get("due_date")
    }
    await db.ai_tasks.insert_one(task)
    return clean_doc(task)

async def get_all_ai_tasks(db: AsyncIOMotorDatabase) -> List[AttributeDict]:
    cursor = db.ai_tasks.find({}).sort("task_id", -1)
    return [clean_doc(doc) async for doc in cursor]

async def update_ai_task_status(db: AsyncIOMotorDatabase, task_id: int, status: str) -> Optional[AttributeDict]:
    await db.ai_tasks.update_one({"task_id": task_id}, {"$set": {"status": status}})
    doc = await db.ai_tasks.find_one({"task_id": task_id})
    return clean_doc(doc)
