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

    async def store_document(self, doc_id: str, case_id: str, ipfs_cid: str, doc_type: str, version: int) -> Optional[str]:
        """
        Calls Blockchain Service to store document metadata.
        Returns txHash if successful.
        """
        # Blockchain service mounts routes at /blockchain/*
        url = f"{self.base_url}/blockchain/store"
        payload = {
            "docId": doc_id,
            "caseId": case_id,
            "ipfsCID": ipfs_cid,  # contract API expects ipfsCID (capital CID)
            "ipfsCid": ipfs_cid,
            "docType": doc_type,
            "version": version,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=120.0)
                response.raise_for_status()
                data = response.json()
                if data.get("success"):
                    inner = data.get("data") or {}
                    return inner.get("txHash") or data.get("txHash")
                else:
                    logger.error(f"Blockchain Service returned failure: {data}")
                    raise BlockchainServiceError("Blockchain service returned failure response")
            except httpx.RequestError as e:
                logger.error(f"Network error calling Blockchain Service: {str(e)}")
                raise BlockchainServiceError("Blockchain service is currently unavailable")
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error {e.response.status_code} calling Blockchain Service: {e.response.text}")
                raise BlockchainServiceError(f"Blockchain service returned HTTP error {e.response.status_code}")

    async def verify_document(self, doc_id: str) -> Dict[str, Any]:
        """Stub for Phase 10"""
        pass
        
    async def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Stub for retrieval"""
        pass
        
    async def sign_document(self, doc_id: str, wallet_address: str) -> Optional[str]:
        """Stub for signing"""
        pass
        
    async def revoke_document_access(self, doc_id: str) -> Optional[str]:
        """Stub for revocation"""
        url = f"{self.base_url}/blockchain/revoke"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"docId": doc_id}, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            inner = data.get("data") or {}
            return inner.get("txHash")
