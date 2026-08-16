from pydantic import BaseModel
from datetime import datetime

class VerificationResponse(BaseModel):
    docId: str
    verified: bool
    status: str
    ipfsCid: str | None
    txHash: str | None
