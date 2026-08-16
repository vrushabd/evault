import pytest
from unittest.mock import patch, MagicMock
import httpx
from app.services.blockchain_client import BlockchainClient, BlockchainServiceError

@pytest.mark.asyncio
@patch("app.services.blockchain_client.httpx.AsyncClient.post")
async def test_store_document_success(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "txHash": "0x123abc"}
    mock_post.return_value = mock_response

    client = BlockchainClient()
    tx_hash = await client.store_document(
        doc_id="DOC-001",
        case_id="CASE-001",
        ipfs_cid="bafy123",
        doc_type="JUDGMENT",
        version=1
    )
    
    assert tx_hash == "0x123abc"
    mock_post.assert_called_once()

@pytest.mark.asyncio
@patch("app.services.blockchain_client.httpx.AsyncClient.post")
async def test_store_document_failure_response(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": False, "error": "Contract execution failed"}
    mock_post.return_value = mock_response

    client = BlockchainClient()
    with pytest.raises(BlockchainServiceError) as exc:
        await client.store_document("DOC-001", "CASE-001", "bafy123", "JUDGMENT", 1)
        
    assert "failure response" in str(exc.value)

@pytest.mark.asyncio
@patch("app.services.blockchain_client.httpx.AsyncClient.post")
async def test_store_document_network_error(mock_post):
    mock_post.side_effect = httpx.RequestError("Connection refused")

    client = BlockchainClient()
    with pytest.raises(BlockchainServiceError) as exc:
        await client.store_document("DOC-001", "CASE-001", "bafy123", "JUDGMENT", 1)
        
    assert "currently unavailable" in str(exc.value)
