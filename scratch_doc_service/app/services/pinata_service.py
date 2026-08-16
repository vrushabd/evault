import httpx
import os
from app.config.settings import settings

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

    async def upload_encrypted_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Uploads an encrypted file to IPFS via Pinata.
        Returns the IPFS CID.
        """
        # Bypass for local testing without real keys
        if self.jwt == "mock":
            cid = f"QmMock_{filename}"
            with open(os.path.join(self.mock_dir, cid), "wb") as f:
                f.write(file_bytes)
            return cid

        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        
        files = {
            'file': (filename, file_bytes, "application/octet-stream")
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, files=files, headers=self.headers, timeout=60.0)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("IpfsHash")
                else:
                    raise IPFSUploadFailedError(f"Pinata upload failed with status {response.status_code}: {response.text}")
            except httpx.RequestError as e:
                raise IPFSUploadFailedError(f"Network error during Pinata upload: {str(e)}")

    async def get_file(self, cid: str) -> bytes:
        """
        Retrieves a file from IPFS using a Pinata gateway.
        """
        # Bypass for local testing without real keys
        if self.jwt == "mock":
            try:
                with open(os.path.join(self.mock_dir, cid), "rb") as f:
                    return f.read()
            except Exception:
                raise IPFSRetrievalFailedError("Mock file not found locally")
            
        gateway_url = f"https://gateway.pinata.cloud/ipfs/{cid}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(gateway_url, timeout=60.0)
                if response.status_code == 200:
                    return response.content
                else:
                    raise IPFSRetrievalFailedError(f"Failed to retrieve file from IPFS. Status {response.status_code}")
            except httpx.RequestError as e:
                raise IPFSRetrievalFailedError(f"Network error during IPFS retrieval: {str(e)}")

    async def unpin_file(self, cid: str) -> bool:
        """
        Unpins a file from Pinata.
        """
        url = f"https://api.pinata.cloud/pinning/unpin/{cid}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=self.headers, timeout=30.0)
                return response.status_code == 200
            except httpx.RequestError:
                return False

    async def unpin_file(self, cid: str) -> bool:
        """
        Unpins a file from Pinata.
        """
        url = f"https://api.pinata.cloud/pinning/unpin/{cid}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=self.headers, timeout=30.0)
                return response.status_code == 200
            except httpx.RequestError:
                return False
