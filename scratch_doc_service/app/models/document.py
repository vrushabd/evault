from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(36), unique=True, index=True, nullable=False)
    case_id = Column(String(255), index=True, nullable=False)
    doc_type = Column(String(50), nullable=False)
    ipfs_cid = Column(String(255), nullable=True)
    version = Column(Integer, default=1, nullable=False)
    previous_doc_id = Column(String(36), ForeignKey("documents.doc_id"), nullable=True)
    encryption_key_reference = Column(String(255), nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    tx_hash = Column(String(255), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    versions = relationship("DocumentVersion", back_populates="document")
    accesses = relationship("DocumentAccess", back_populates="document")
