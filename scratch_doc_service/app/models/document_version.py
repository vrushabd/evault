from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.base import Base

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(36), ForeignKey("documents.doc_id"), index=True, nullable=False)
    version = Column(Integer, nullable=False)
    previous_doc_id = Column(String(36), nullable=True)
    ipfs_cid = Column(String(255), nullable=True)
    tx_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="versions")
