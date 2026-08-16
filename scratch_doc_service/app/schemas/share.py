from pydantic import BaseModel
from datetime import datetime

class DocumentShareRequest(BaseModel):
    docId: str
    walletAddress: str
    expiresAt: datetime | None = None

class DocumentShareResponse(BaseModel):
    success: bool
    docId: str
    walletAddress: str
    message: str
