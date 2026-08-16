import httpx
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Map document-service event names → AuditAction enum values
_ACTION_MAP = {
    "DOCUMENT_UPLOADED": "UPLOAD",
    "DOCUMENT_RETRIEVED": "DOCUMENT_DOWNLOADED",
    "DOCUMENT_DOWNLOADED": "DOCUMENT_DOWNLOADED",
    "DOCUMENT_SHARED": "ACCESS_GRANTED",
    "ACCESS_GRANTED": "ACCESS_GRANTED",
    "ACCESS_DENIED": "ACCESS_DENIED",
    "DOCUMENT_VERIFIED": "VERIFY",
    "DOCUMENT_ACCESS_REVOKED": "REVOKE",
    "DOCUMENT_REVOKED": "REVOKE",
    "DOCUMENT_AMENDED": "AMEND",
    "DOCUMENT_SIGNED": "SIGN",
    "UPLOAD": "UPLOAD",
    "VIEW": "DOCUMENT_DOWNLOADED",
    "SHARE": "ACCESS_GRANTED",
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
        Send an audit event. Never include PDF bytes, keys, JWTs, or passwords in metadata.
        """
        url = f"{self.base_url}/audit/log"
        action = _ACTION_MAP.get(event_type)
        if not action:
            logger.warning(f"Unknown audit event type {event_type}; skipping")
            return

        # Sanitize metadata — strip anything that looks like secrets
        safe_meta = {}
        if metadata:
            for k, v in metadata.items():
                key_l = str(k).lower()
                if any(s in key_l for s in ("key", "password", "token", "secret", "jwt", "pdf")):
                    continue
                safe_meta[k] = v

        details = event_type
        if safe_meta:
            details = f"{event_type}: " + ", ".join(f"{k}={v}" for k, v in safe_meta.items())

        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "action": action,
            "performedBy": (user or "")[:42],
            "details": details,
            "txHash": safe_meta.get("txHash"),
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=5.0)
                if response.status_code >= 400:
                    logger.warning(
                        f"Audit Service returned status {response.status_code}: {response.text[:200]}"
                    )
            except Exception as e:
                logger.error(f"Failed to send audit event: {e}")
