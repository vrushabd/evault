from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class DocumentResponse(BaseModel):
    doc_id: str
    case_id: str
    doc_type: str
    ipfs_cid: str | None = None
    document_hash: str | None = None
    version: int
    key_version: int | None = None
    uploaded_by: str
    tx_hash: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class VerificationResponse(BaseModel):
    """Integrity check only — never returns PDF bytes or encryption keys."""

    documentId: str = Field(alias="docId")
    docId: str | None = None  # backward-compatible mirror
    verified: bool
    status: str
    integrity: str | None = None
    cidMatch: bool | None = None
    hashMatch: bool | None = None
    blockchainVerified: bool | None = None
    ipfsCid: str | None = None
    documentHash: str | None = None
    txHash: str | None = None
    error: str | None = None

    model_config = ConfigDict(populate_by_name=True)
