from pydantic import BaseModel, ConfigDict, Field


class VerificationResponse(BaseModel):
    """Integrity check only — never returns PDF bytes or encryption keys."""

    documentId: str | None = None
    docId: str
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

    model_config = ConfigDict(extra="ignore")
