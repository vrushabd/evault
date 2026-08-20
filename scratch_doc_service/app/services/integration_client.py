import httpx
import logging
from typing import Optional, Dict, Any
from app.config.settings import settings

logger = logging.getLogger(__name__)

class IntegrationClient:
    def __init__(self):
        self.base_url = settings.integration_service_url.rstrip("/")
        self.enabled = settings.enable_ai_classification

    async def ensure_case(
        self,
        case_id: str,
        *,
        title: Optional[str] = None,
        court: Optional[str] = None,
        judge: Optional[str] = None,
        lawyer_bar: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Register case in integration registry if missing (idempotent upsert)."""
        url = f"{self.base_url}/ecourts/cases"
        payload = {
            "caseId": case_id,
            "title": title or f"Case {case_id}",
            "court": court or "Registered via eVault",
            "judge": judge or "",
            "status": "ACTIVE",
            "caseType": "Civil",
            "lawyerBar": lawyer_bar,
            "createdBy": created_by,
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code < 400:
                    return response.json().get("data")
                logger.warning(f"Case register failed: {response.status_code} {response.text}")
            except Exception as e:
                logger.warning(f"Could not register case with integration service: {e}")
        return None

    async def is_aadhaar_bound(self, wallet_address: str) -> bool:
        """Check whether the wallet has completed Aadhaar identity binding."""
        if not wallet_address:
            return False

        url = f"{self.base_url}/aadhaar/verify/{wallet_address}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    body = response.json()
                    if body.get("success"):
                        return bool(body.get("data", {}).get("isBound"))
                logger.warning(
                    "Aadhaar verify returned %s for wallet %s",
                    response.status_code,
                    wallet_address[:10],
                )
            except Exception as e:
                logger.warning(f"Could not verify Aadhaar binding: {e}")
        return False

    async def classify_document(self, doc_id: str, case_id: str, text_content: str) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        url = f"{self.base_url}/classify/document"
        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "content": text_content,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=15.0)
                if response.status_code == 200:
                    return response.json()
                logger.warning(f"Integration Service classification failed: {response.status_code}")
                return None
            except Exception as e:
                logger.error(f"Failed to call Integration Service: {str(e)}")
                return None
