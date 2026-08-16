import httpx
import logging
from typing import Optional, Dict, Any
from app.config.settings import settings

logger = logging.getLogger(__name__)


class BlockchainServiceError(Exception):
    pass


class BlockchainClient:
    def __init__(self):
        self.base_url = settings.blockchain_service_url.rstrip("/")

    async def store_document(
        self,
        doc_id: str,
        case_id: str,
        ipfs_cid: str,
        doc_type: str,
        version: int,
        document_hash: Optional[str] = None,
    ) -> Optional[str]:
        """
        Store non-sensitive integrity metadata on Sepolia.
        Never sends PDF bytes, AES keys, or PII.
        """
        url = f"{self.base_url}/blockchain/store"
        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "ipfsCID": ipfs_cid,
            "ipfsCid": ipfs_cid,
            "docType": doc_type,
            "version": version,
            "documentHash": document_hash,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=120.0)
                response.raise_for_status()
                data = response.json()
                if data.get("success"):
                    inner = data.get("data") or {}
                    if inner.get("mock"):
                        logger.warning(
                            "Blockchain store returned mock tx — not a live chain registration"
                        )
                        # Treat mock as non-registration for status purposes
                        return None
                    return inner.get("txHash") or data.get("txHash")
                raise BlockchainServiceError("Blockchain service returned failure response")
            except httpx.RequestError as e:
                raise BlockchainServiceError("Blockchain service is currently unavailable") from e
            except httpx.HTTPStatusError as e:
                raise BlockchainServiceError(
                    f"Blockchain service returned HTTP error {e.response.status_code}"
                ) from e

    async def verify_document(
        self,
        doc_id: str,
        ipfs_cid: str,
        document_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/blockchain/verify/{doc_id}"
        params: Dict[str, str] = {"cid": ipfs_cid}
        if document_hash:
            params["hash"] = document_hash

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                if data.get("success"):
                    return data.get("data") or {}
                raise BlockchainServiceError(data.get("error") or "Verify failed")
            except httpx.RequestError as e:
                raise BlockchainServiceError(f"Blockchain unavailable: {e}") from e
            except httpx.HTTPStatusError as e:
                raise BlockchainServiceError(
                    f"Blockchain verify HTTP {e.response.status_code}"
                ) from e

    async def get_document(self, doc_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/blockchain/document/{doc_id}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                if data.get("success"):
                    return data.get("data") or {}
                raise BlockchainServiceError(data.get("error") or "Get document failed")
            except httpx.RequestError as e:
                raise BlockchainServiceError(f"Blockchain unavailable: {e}") from e
            except httpx.HTTPStatusError as e:
                raise BlockchainServiceError(
                    f"Blockchain get HTTP {e.response.status_code}"
                ) from e

    async def sign_document(self, doc_id: str, wallet_address: str) -> Optional[str]:
        url = f"{self.base_url}/blockchain/sign"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"docId": doc_id}, timeout=120.0)
            response.raise_for_status()
            data = response.json()
            inner = data.get("data") or {}
            return inner.get("txHash")

    async def revoke_document_access(self, doc_id: str) -> Optional[str]:
        url = f"{self.base_url}/blockchain/revoke"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"docId": doc_id}, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            inner = data.get("data") or {}
            return inner.get("txHash")
