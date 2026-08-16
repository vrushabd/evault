from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.base import Base

class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(36), ForeignKey("documents.doc_id"), index=True, nullable=False)
    wallet_address = Column(String(255), index=True, nullable=False)
    granted_by = Column(String(255), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)

    document = relationship("Document", back_populates="accesses")
