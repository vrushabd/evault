"""Universal Audit Ledger — shared across all sessions and roles."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional

from services import persistence

router = APIRouter(prefix="/audit", tags=["Universal Audit Ledger"])


class AuditLogRequest(BaseModel):
    id: str = Field(..., min_length=1)
    timestamp: Optional[str] = None
    action: Optional[str] = "UNKNOWN"
    service: Optional[str] = "Auth"
    hash: Optional[str] = None
    blockNumber: Optional[str] = None
    status: Optional[str] = "VERIFIED"
    user: Optional[str] = None
    userName: Optional[str] = None
    role: Optional[str] = None
    performedBy: Optional[str] = None
    details: Optional[str] = None
    docId: Optional[str] = None
    caseId: Optional[str] = None


@router.post("/log")
async def create_audit_log(request: AuditLogRequest):
    """Persist a single audit event to the universal ledger."""
    try:
        entry = persistence.insert_audit_log(request.model_dump())
        return {"success": True, "data": entry}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to persist audit log: {str(e)}"},
        )


@router.get("/logs")
async def list_audit_logs(limit: int = 100):
    """Retrieve the universal audit ledger (most recent first)."""
    try:
        logs = persistence.list_audit_logs(limit)
        return {"success": True, "data": logs}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve audit logs: {str(e)}"},
        )
