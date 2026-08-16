import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
@patch("app.routes.documents.DocumentService.process_upload")
async def test_upload_valid_pdf(mock_process):
    mock_doc = MagicMock()
    mock_doc.doc_id = "DOC-123"
    mock_doc.case_id = "CASE-123"
    mock_doc.doc_type = "AFFIDAVIT"
    mock_doc.ipfs_cid = "bafytest"
    mock_doc.document_hash = "a" * 64
    mock_doc.version = 1
    mock_doc.key_version = 3
    mock_doc.status = "PENDING_CHAIN"
    mock_doc.uploaded_by = "0xMockUserWalletAddress"
    mock_doc.tx_hash = None
    mock_doc.created_at = "2026-08-14T12:00:00Z"
    mock_doc.updated_at = None
    mock_process.return_value = mock_doc

    pdf_content = b"%PDF-1.4\n%...\n%%EOF\n"
    files = {"file": ("test.pdf", pdf_content, "application/pdf")}
    data = {"caseId": "CASE-123", "docType": "AFFIDAVIT"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/documents/upload", data=data, files=files)
        
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["doc_id"] == "DOC-123"
    assert res_data["case_id"] == "CASE-123"

@pytest.mark.asyncio
async def test_upload_invalid_mime_type():
    txt_content = b"This is a text file, not a pdf."
    # Change extension to .pdf to pass the extension check, but keep MIME type wrong
    files = {"file": ("test.pdf", txt_content, "text/plain")}
    data = {"caseId": "CASE-123", "docType": "AFFIDAVIT"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/documents/upload", data=data, files=files)
        
    assert response.status_code == 400
    error = response.json()["detail"]["error"]
    assert error == "Invalid MIME type"

@pytest.mark.asyncio
async def test_upload_invalid_pdf_content():
    # correct MIME type but invalid content (doesn't start with %PDF)
    fake_pdf = b"I am pretending to be a PDF"
    files = {"file": ("fake.pdf", fake_pdf, "application/pdf")}
    data = {"caseId": "CASE-123", "docType": "AFFIDAVIT"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/documents/upload", data=data, files=files)
        
    assert response.status_code == 400
    error = response.json()["detail"]["error"]
    assert error == "File is not a valid PDF"

@pytest.mark.asyncio
async def test_upload_file_too_large():
    # 21 MB file to exceed 20 MB limit
    large_content = b"%PDF-1.4\n" + (b"0" * (21 * 1024 * 1024))
    files = {"file": ("large.pdf", large_content, "application/pdf")}
    data = {"caseId": "CASE-123", "docType": "AFFIDAVIT"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/documents/upload", data=data, files=files)
        
    assert response.status_code == 400
    error = response.json()["detail"]["error"]
    assert error == "File too large. Max 20MB"
