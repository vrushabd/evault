import pytest
from unittest.mock import patch, MagicMock
from app.services.pinata_service import PinataService, IPFSUploadFailedError, IPFSRetrievalFailedError

@pytest.mark.asyncio
@patch("app.services.pinata_service.httpx.AsyncClient.post")
async def test_upload_success(mock_post):
    # Mocking httpx response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"IpfsHash": "QmTestHash12345"}
    mock_post.return_value = mock_response

    service = PinataService()
    service.jwt = "test_jwt"
    cid = await service.upload_encrypted_file(b"encrypted_data", "test.enc")
    
    assert cid == "QmTestHash12345"
    mock_post.assert_called_once()

@pytest.mark.asyncio
@patch("app.services.pinata_service.httpx.AsyncClient.post")
async def test_upload_failure(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"
    mock_post.return_value = mock_response

    service = PinataService()
    service.jwt = "test_jwt"
    with pytest.raises(IPFSUploadFailedError):
        await service.upload_encrypted_file(b"encrypted_data", "test.enc")

@pytest.mark.asyncio
@patch("app.services.pinata_service.httpx.AsyncClient.get")
async def test_get_file_success(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"\x00" * 40  # min ciphertext-looking payload
    mock_response.headers = {"content-type": "application/octet-stream"}
    mock_get.return_value = mock_response

    service = PinataService()
    service.jwt = "test_jwt"
    content = await service.get_file("QmTestHash12345")

    assert content == b"\x00" * 40
    mock_get.assert_called()
