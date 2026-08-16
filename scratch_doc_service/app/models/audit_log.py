from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.database.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    doc_id = Column(String(36), index=True, nullable=False)
    case_id = Column(String(255), index=True, nullable=False)
    user = Column(String(255), nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
