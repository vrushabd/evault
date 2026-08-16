from sqlalchemy import Column, Integer, String
from app.database.base import Base

class CaseParticipant(Base):
    __tablename__ = "case_participants"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(255), index=True, nullable=False)
    wallet_address = Column(String(255), index=True, nullable=False)
    role = Column(String(50), nullable=False)
