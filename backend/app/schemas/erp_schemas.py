from pydantic import BaseModel, Field
from typing import List, Optional

# Buyer schemas
class BuyerBase(BaseModel):
    buyer_id: str
    name: str
    contact_email: str

class BuyerCreate(BuyerBase):
    pass

class BuyerOut(BuyerBase):
    class Config:
        from_attributes = True

# Supplier schemas
class SupplierBase(BaseModel):
    supplier_id: str
    name: str
    contact_email: str

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    class Config:
        from_attributes = True

# Inventory schemas
class InventoryBase(BaseModel):
    item: str
    quantity: float
    unit: str

class InventoryCreate(InventoryBase):
    pass

class InventoryOut(InventoryBase):
    class Config:
        from_attributes = True

# Bill of Materials schemas
class BOMBase(BaseModel):
    item: str
    quantity: float
    unit: str

class BOMCreate(BOMBase):
    order_id: str

class BOMOut(BOMBase):
    bom_id: int
    order_id: str
    class Config:
        from_attributes = True

# Purchase Order schemas
class PurchaseOrderBase(BaseModel):
    order_id: str
    buyer_id: str
    buyer_name: str
    item: str
    quantity: float
    unit: str

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderStatusUpdate(BaseModel):
    status: str
    risk_level: Optional[str] = None
    delay_probability: Optional[float] = None

class PurchaseOrderOut(PurchaseOrderBase):
    status: str
    risk_level: str
    delay_probability: float
    bom_items: List[BOMOut] = []
    qc_logs: List["QCLogOut"] = []
    production_orders: List["ProductionOrderOut"] = []
    shipments: List["ShipmentOut"] = []
    class Config:
        from_attributes = True

# QC Log schemas
class QCLogBase(BaseModel):
    order_id: str
    defect_type: Optional[str] = None
    status: str = "Passed"
    report: Optional[str] = None

class QCLogCreate(QCLogBase):
    pass

class QCLogOut(QCLogBase):
    log_id: int
    class Config:
        from_attributes = True

# Sourcing AI Ingestion Schemas
class TechPackIngestRequest(BaseModel):
    text: str

class BOMItemExtraction(BaseModel):
    item: str = Field(description="Name of raw material item")
    quantity: float = Field(description="Quantity required")
    unit: str = Field(description="Unit of measurement")

class TechPackExtractionResult(BaseModel):
    order_id: str
    buyer_id: str
    buyer_name: str
    buyer_email: str
    item: str = Field(description="Main finished product ordered")
    quantity: float = Field(description="Finished product quantity")
    unit: str = Field(description="Finished product unit")
    bom: List[BOMItemExtraction] = Field(description="List of raw materials required to produce the ordered item")

class TechPackResponse(BaseModel):
    status: str
    extracted_data: TechPackExtractionResult
    rfq_draft: str
    purchase_order: PurchaseOrderOut
    inventory_state: List[InventoryOut]

# Logistics AI Schemas
class LogisticsDisruptionRequest(BaseModel):
    order_id: str
    disruption_vector: str

class LogisticsDisruptionResponse(BaseModel):
    status: str
    order_id: str
    risk_level: str
    delay_probability: float
    workaround_report: str


# Production Order schemas
class ProductionOrderBase(BaseModel):
    order_id: str
    status: str = "Planned"
    progress_pct: float = 0.0
    risk_score: float = 0.0
    notes: Optional[str] = None

class ProductionOrderCreate(ProductionOrderBase):
    pass

class ProductionOrderOut(ProductionOrderBase):
    production_id: int
    class Config:
        from_attributes = True


# Shipment schemas
class ShipmentBase(BaseModel):
    order_id: str
    carrier: Optional[str] = None
    origin: str = "Dhaka"
    destination: str
    status: str = "Pending"
    eta: Optional[str] = None
    delay_days: int = 0
    risk_level: str = "Low"

class ShipmentCreate(ShipmentBase):
    pass

class ShipmentOut(ShipmentBase):
    shipment_id: int
    class Config:
        from_attributes = True


# RAG Document schemas
class RAGDocumentBase(BaseModel):
    filename: str
    doc_type: str
    content_text: str
    uploaded_at: str

class RAGDocumentCreate(RAGDocumentBase):
    pass

class RAGDocumentOut(RAGDocumentBase):
    doc_id: int
    class Config:
        from_attributes = True


# AI Assistant schemas
class AIAssistantRequest(BaseModel):
    message: str
    context_type: Optional[str] = "all"

class AIAssistantResponse(BaseModel):
    response: str
    actions: Optional[List[str]] = []


# NL SQL schemas
class NLSQLRequest(BaseModel):
    query: str

class NLSQLResponse(BaseModel):
    query: str
    sql: str
    results: List[dict]
    summary: str


# Dashboard Insight schemas
class DashboardInsightResponse(BaseModel):
    executive_summary: str
    kpis: dict
    daily_insights: List[str]
    alerts: List[dict]
    recommendations: List[str]


# Email Log schemas
class EmailLogBase(BaseModel):
    recipient: str
    subject: str
    body: str
    category: str
    sent_at: str

class EmailLogCreate(EmailLogBase):
    pass

class EmailLogOut(EmailLogBase):
    email_id: int
    class Config:
        from_attributes = True


# AI Task schemas
class AITaskBase(BaseModel):
    description: str
    assigned_to: str = "Unassigned"
    status: str = "Pending"
    due_date: Optional[str] = None

class AITaskCreate(AITaskBase):
    pass

class AITaskOut(AITaskBase):
    task_id: int
    class Config:
        from_attributes = True


