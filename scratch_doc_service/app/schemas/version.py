from pydantic import BaseModel
from datetime import datetime

class DocumentVersionResponse(BaseModel):
    doc_id: str
    version: int
    ipfs_cid: str | None
    tx_hash: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
