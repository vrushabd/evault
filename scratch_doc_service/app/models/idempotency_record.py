from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.database.base import Base

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    idem_key = Column(String(100), unique=True, nullable=False)
    wallet = Column(String(42))
    response = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
