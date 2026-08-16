"""
Pinata / IPFS client.

SECURITY MODEL:
  - Only ENCRYPTED document bytes are pinned.
  - The CID refers to ciphertext, not a plaintext PDF.
  - Possession of a CID alone must NOT yield plaintext; only the authorized
    backend decrypt path (after JWT authz) can return the PDF.
  - IPFS itself is not private — confidentiality comes from AES-256-GCM.
"""
import httpx
import os
from app.config.settings import settings

PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_UNPIN_URL = "https://api.pinata.cloud/pinning/unpin/{cid}"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/{cid}"


class IPFSUploadFailedError(Exception):
    pass


class IPFSRetrievalFailedError(Exception):
    pass


class PinataService:
    def __init__(self):
        self.jwt = settings.pinata_jwt
        self.api_key = settings.pinata_api_key
        self.api_secret = settings.pinata_secret_api_key

        self.headers = {}
        if self.jwt and self.jwt != "mock":
            self.headers["Authorization"] = f"Bearer {self.jwt}"
        elif self.api_key and self.api_secret:
            self.headers["pinata_api_key"] = self.api_key
            self.headers["pinata_secret_api_key"] = self.api_secret

        self.mock_dir = os.path.join(os.getcwd(), "mock_ipfs")
        if self.jwt == "mock" and not os.path.exists(self.mock_dir):
            os.makedirs(self.mock_dir)

    async def upload_encrypted_file(self, encrypted_bytes: bytes, filename: str) -> str:
        """
        Pin encrypted bytes to IPFS via Pinata. Returns CID of the ciphertext blob.
        """
        if self.jwt == "mock":
            # Explicit local-only mode — still stores ciphertext, never plaintext API
            cid = f"QmMock_{filename}"
            with open(os.path.join(self.mock_dir, cid), "wb") as f:
                f.write(encrypted_bytes)
            return cid

        if not self.headers:
            raise IPFSUploadFailedError(
                "Pinata credentials missing. Set PINATA_JWT (or API key/secret). "
                "For local-only IPFS, set PINATA_JWT=mock explicitly."
            )

        files = {
            "file": (filename, encrypted_bytes, "application/octet-stream"),
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    PINATA_PIN_URL, files=files, headers=self.headers, timeout=60.0
                )
                if response.status_code == 200:
                    data = response.json()
                    cid = data.get("IpfsHash")
                    if not cid:
                        raise IPFSUploadFailedError("Pinata response missing IpfsHash")
                    return cid
                raise IPFSUploadFailedError(
                    f"Pinata upload failed with status {response.status_code}"
                )
            except httpx.RequestError as e:
                raise IPFSUploadFailedError(f"Network error during Pinata upload: {e}") from e

    async def get_file(self, cid: str) -> bytes:
        """Retrieve encrypted blob from IPFS (ciphertext only)."""
        if self.jwt == "mock":
            try:
                with open(os.path.join(self.mock_dir, cid), "rb") as f:
                    return f.read()
            except Exception as e:
                raise IPFSRetrievalFailedError("Mock encrypted blob not found locally") from e

        gateway_url = PINATA_GATEWAY.format(cid=cid)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(gateway_url, timeout=60.0)
                if response.status_code == 200:
                    return response.content
                raise IPFSRetrievalFailedError(
                    f"Failed to retrieve encrypted blob from IPFS. Status {response.status_code}"
                )
            except httpx.RequestError as e:
                raise IPFSRetrievalFailedError(f"Network error during IPFS retrieval: {e}") from e

    async def unpin_file(self, cid: str) -> bool:
        url = PINATA_UNPIN_URL.format(cid=cid)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=self.headers, timeout=30.0)
                return response.status_code == 200
            except httpx.RequestError:
                return False
