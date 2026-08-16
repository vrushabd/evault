import httpx
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Map document-service event names → AuditAction enum values
_ACTION_MAP = {
    "DOCUMENT_UPLOADED": "UPLOAD",
    "DOCUMENT_RETRIEVED": "VIEW",
    "DOCUMENT_SHARED": "SHARE",
    "DOCUMENT_VERIFIED": "VERIFY",
    "DOCUMENT_ACCESS_REVOKED": "REVOKE",
    "DOCUMENT_REVOKED": "REVOKE",
    "DOCUMENT_AMENDED": "AMEND",
    "DOCUMENT_SIGNED": "SIGN",
    "UPLOAD": "UPLOAD",
    "VIEW": "VIEW",
    "SHARE": "SHARE",
    "VERIFY": "VERIFY",
    "REVOKE": "REVOKE",
    "AMEND": "AMEND",
    "SIGN": "SIGN",
}

class AuditClient:
    def __init__(self):
        self.base_url = settings.audit_service_url.rstrip("/")

    async def log_event(self, event_type: str, doc_id: str, case_id: str, user: str, metadata: dict = None):
        """
        Send an audit event to the Audit Service.
        Audit API: POST /audit/log with {docId, caseId, action, performedBy, txHash?, details?}
        """
        url = f"{self.base_url}/audit/log"
        action = _ACTION_MAP.get(event_type, "UPLOAD")
        details = event_type
        if metadata:
            details = f"{event_type}: " + ", ".join(f"{k}={v}" for k, v in metadata.items())
        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "action": action,
            "performedBy": user,
            "details": details,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=5.0)
                if response.status_code >= 400:
                    logger.warning(f"Audit Service returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Failed to send audit event: {str(e)}")
