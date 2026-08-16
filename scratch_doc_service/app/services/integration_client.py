import httpx
import logging
from typing import Optional, Dict, Any
from app.config.settings import settings

logger = logging.getLogger(__name__)

class IntegrationClient:
    def __init__(self):
        self.base_url = settings.integration_service_url.rstrip("/")
        self.enabled = settings.enable_ai_classification

    async def classify_document(self, doc_id: str, case_id: str, text_content: str) -> Optional[Dict[str, Any]]:
        """
        Call Integration Service to classify document using AI.
        """
        if not self.enabled:
            return None
            
        url = f"{self.base_url}/api/classify/document"
        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "content": text_content
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=15.0)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Integration Service classification failed: {response.status_code}")
                    return None
            except Exception as e:
                logger.error(f"Failed to call Integration Service: {str(e)}")
                return None
