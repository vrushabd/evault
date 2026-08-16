from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(36), unique=True, index=True, nullable=False)
    case_id = Column(String(255), index=True, nullable=False)
    doc_type = Column(String(50), nullable=False)
    # CID of the ENCRYPTED blob on IPFS (never plaintext PDF)
    ipfs_cid = Column(String(255), nullable=True)
    # SHA-256 hex of original plaintext PDF (integrity only — not encryption material)
    document_hash = Column(String(64), nullable=True)
    version = Column(Integer, default=1, nullable=False)
    previous_doc_id = Column(String(36), ForeignKey("documents.doc_id"), nullable=True)
    # Key derivation reference only, e.g. "v2:{version_uuid}" — NEVER the AES key itself
    encryption_key_reference = Column(String(255), nullable=False)
    key_version = Column(Integer, default=3, nullable=False)
    uploaded_by = Column(String(255), nullable=False)
    tx_hash = Column(String(255), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    versions = relationship("DocumentVersion", back_populates="document")
    accesses = relationship("DocumentAccess", back_populates="document")
