import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.database import get_db
import os

os.environ["ENCRYPTION_MASTER_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Create a mock session dependency
async def override_get_db():
    mock_session = MagicMock()
    # Mocking sqlalchemy execute/add/commit
    yield mock_session

app.dependency_overrides[get_db] = override_get_db

@pytest.mark.asyncio
@patch("app.services.pinata_service.PinataService.upload_encrypted_file")
@patch("app.repositories.document_repository.DocumentRepository.create")
async def test_full_upload_pipeline(mock_repo_create, mock_pinata_upload):
    # Mock Pinata CID
    mock_pinata_upload.return_value = "QmFakePinataCIDForIntegrationTest"
    
    # Mock DB Create
    mock_doc = MagicMock()
    mock_doc.doc_id = "DOC-INTEGRATION"
    mock_doc.case_id = "CASE-123"
    mock_doc.doc_type = "AFFIDAVIT"
    mock_doc.ipfs_cid = "QmFakePinataCIDForIntegrationTest"
    mock_doc.document_hash = "0x1234567890abcdef"
    mock_doc.version = 1
    mock_doc.key_version = 1
    mock_doc.uploaded_by = "0xMockUserWalletAddress"
    mock_doc.status = "UPLOADED_IPFS"
    mock_doc.tx_hash = None
    mock_doc.created_at = "2026-08-14T12:00:00Z"
    mock_doc.updated_at = None
    mock_repo_create.return_value = mock_doc

    pdf_content = b"%PDF-1.4\nIntegration Test Content\n%%EOF\n"
    files = {"file": ("integration.pdf", pdf_content, "application/pdf")}
    data = {"caseId": "CASE-123", "docType": "AFFIDAVIT"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/documents/upload", data=data, files=files)
        
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["doc_id"] == "DOC-INTEGRATION"
    assert res_data["ipfs_cid"] == "QmFakePinataCIDForIntegrationTest"
    assert res_data["status"] == "UPLOADED_IPFS"

    # Verify mocks were called
    mock_pinata_upload.assert_called_once()
    mock_repo_create.assert_called_once()
