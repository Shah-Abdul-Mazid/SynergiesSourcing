from sqlalchemy import Column, String, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Buyer(Base):
    __tablename__ = "buyers"

    buyer_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)

    orders = relationship("PurchaseOrder", back_populates="buyer")


class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)


class Inventory(Base):
    __tablename__ = "inventory"

    item = Column(String, primary_key=True, index=True)
    quantity = Column(Float, default=0.0)
    unit = Column(String, nullable=False)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    order_id = Column(String, primary_key=True, index=True)
    buyer_id = Column(String, ForeignKey("buyers.buyer_id"), nullable=False)
    buyer_name = Column(String, nullable=False)
    item = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    status = Column(String, default="Pending")  # e.g., Pending, Processing, Shipped, QC Passed
    risk_level = Column(String, default="Low")  # Low, Medium, High
    delay_probability = Column(Float, default=0.0)  # Range 0.0 to 1.0

    buyer = relationship("Buyer", back_populates="orders")
    bom_items = relationship("BillOfMaterials", back_populates="order", cascade="all, delete-orphan")
    qc_logs = relationship("QCLog", back_populates="order", cascade="all, delete-orphan")
    production_orders = relationship("ProductionOrder", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="order", cascade="all, delete-orphan")


class BillOfMaterials(Base):
    __tablename__ = "bill_of_materials"

    bom_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, ForeignKey("purchase_orders.order_id"), nullable=False)
    item = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

    order = relationship("PurchaseOrder", back_populates="bom_items")


class QCLog(Base):
    __tablename__ = "qc_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, ForeignKey("purchase_orders.order_id"), nullable=False)
    defect_type = Column(String, nullable=True)  # e.g., Stain, Hole, None
    status = Column(String, default="Passed")  # Passed, Failed
    report = Column(String, nullable=True)  # AI compliance text report

    order = relationship("PurchaseOrder", back_populates="qc_logs")


class ProductionOrder(Base):
    __tablename__ = "production_orders"

    production_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, ForeignKey("purchase_orders.order_id"), nullable=False)
    status = Column(String, default="Planned")  # e.g., Planned, In Progress, QC, Completed
    progress_pct = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    notes = Column(String, nullable=True)

    order = relationship("PurchaseOrder", back_populates="production_orders")


class Shipment(Base):
    __tablename__ = "shipments"

    shipment_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, ForeignKey("purchase_orders.order_id"), nullable=False)
    carrier = Column(String, nullable=True)
    origin = Column(String, default="Dhaka")
    destination = Column(String, nullable=False)
    status = Column(String, default="Pending")  # e.g., Pending, In Transit, Customs, Delivered, Delayed
    eta = Column(String, nullable=True)
    delay_days = Column(Integer, default=0)
    risk_level = Column(String, default="Low")

    order = relationship("PurchaseOrder", back_populates="shipments")


class RAGDocument(Base):
    __tablename__ = "rag_documents"

    doc_id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)  # e.g., PDF, DOCX, Excel, CSV
    content_text = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)


class EmailLog(Base):
    __tablename__ = "email_logs"

    email_id = Column(Integer, primary_key=True, autoincrement=True)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    category = Column(String, nullable=False)
    sent_at = Column(String, nullable=False)


class AITask(Base):
    __tablename__ = "ai_tasks"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    description = Column(String, nullable=False)
    assigned_to = Column(String, default="Unassigned")
    status = Column(String, default="Pending")
    due_date = Column(String, nullable=True)


