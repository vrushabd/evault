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

# Public gateways as fallback when Pinata's CDN returns Cloudflare challenges
FALLBACK_GATEWAYS = (
    "https://dweb.link/ipfs/{cid}",
    "https://ipfs.io/ipfs/{cid}",
    "https://w3s.link/ipfs/{cid}",
)

MIN_CIPHERTEXT_LEN = 28  # nonce(12) + tag(16)


class IPFSUploadFailedError(Exception):
    pass


class IPFSRetrievalFailedError(Exception):
    pass


def _looks_like_ciphertext(content: bytes, content_type: str = "") -> bool:
    """Reject HTML challenge pages / error bodies mistaken for encrypted blobs."""
    if not content or len(content) < MIN_CIPHERTEXT_LEN:
        return False
    ct = (content_type or "").lower()
    if "text/html" in ct or "text/plain" in ct:
        return False
    head = content[:64].lstrip().lower()
    if head.startswith(b"<!doctype") or head.startswith(b"<html") or b"just a moment" in head:
        return False
    if b"the provided cid is invalid" in head or b"unable to retrieve" in head:
        return False
    return True


class PinataService:
    def __init__(self):
        self.jwt = settings.pinata_jwt
        self.api_key = settings.pinata_api_key
        self.api_secret = settings.pinata_secret_api_key
        self.gateway_url = (getattr(settings, "pinata_gateway_url", None) or "").strip()

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

    def _gateway_candidates(self, cid: str) -> list[str]:
        urls: list[str] = []
        if self.gateway_url:
            base = self.gateway_url.rstrip("/")
            urls.append(f"{base}/{cid}" if base.endswith("ipfs") else f"{base}/ipfs/{cid}")
        urls.append(PINATA_GATEWAY.format(cid=cid))
        urls.extend(g.format(cid=cid) for g in FALLBACK_GATEWAYS)
        # dedupe preserve order
        seen = set()
        out = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                out.append(u)
        return out

    async def get_file(self, cid: str) -> bytes:
        """Retrieve encrypted blob from IPFS (ciphertext only), with gateway fallbacks."""
        if self.jwt == "mock":
            try:
                with open(os.path.join(self.mock_dir, cid), "rb") as f:
                    return f.read()
            except Exception as e:
                raise IPFSRetrievalFailedError("Mock encrypted blob not found locally") from e

        # Fresh pins can take a few seconds to appear on public gateways
        import asyncio

        last_error: IPFSRetrievalFailedError | None = None
        for attempt in range(3):
            try:
                return await self._get_file_once(cid)
            except IPFSRetrievalFailedError as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 * (attempt + 1))
        assert last_error is not None
        raise last_error

    async def _get_file_once(self, cid: str) -> bytes:
        errors: list[str] = []
        async with httpx.AsyncClient(follow_redirects=True) as client:
            for url in self._gateway_candidates(cid):
                try:
                    headers = {}
                    # Authenticated Pinata gateway when JWT is available
                    if "pinata.cloud" in url and self.jwt and self.jwt != "mock":
                        headers["Authorization"] = f"Bearer {self.jwt}"
                    response = await client.get(url, headers=headers, timeout=45.0)
                    if response.status_code != 200:
                        errors.append(f"{url} -> HTTP {response.status_code}")
                        continue
                    body = response.content
                    if not _looks_like_ciphertext(body, response.headers.get("content-type", "")):
                        errors.append(f"{url} -> non-ciphertext body ({len(body)} bytes)")
                        continue
                    return body
                except httpx.RequestError as e:
                    errors.append(f"{url} -> {type(e).__name__}")
                    continue

        raise IPFSRetrievalFailedError(
            "Failed to retrieve encrypted blob from IPFS. " + "; ".join(errors[:4])
        )

    async def unpin_file(self, cid: str) -> bool:
        url = PINATA_UNPIN_URL.format(cid=cid)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=self.headers, timeout=30.0)
                return response.status_code == 200
            except httpx.RequestError:
                return False
