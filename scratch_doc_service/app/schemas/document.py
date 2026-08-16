from pydantic import BaseModel
from datetime import datetime

class DocumentResponse(BaseModel):
    doc_id: str
    case_id: str
    doc_type: str
    ipfs_cid: str | None = None
    version: int
    uploaded_by: str
    tx_hash: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
