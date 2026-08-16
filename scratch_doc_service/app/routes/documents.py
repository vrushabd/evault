from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Request
from fastapi.responses import Response
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
from app.config.settings import settings
from app.database.database import get_db
from app.services.document_service import DocumentService
from app.schemas.document import DocumentResponse
from app.schemas.share import DocumentShareRequest, DocumentShareResponse
from app.schemas.verification import VerificationResponse
from app.schemas.version import DocumentVersionResponse
from app.models.document import Document
from app.models.case_participant import CaseParticipant
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

def _normalize_user_claims(claims: dict) -> dict:
    """Map JWT claim names from auth service (walletAddress/sub) to internal keys."""
    wallet = (
        claims.get("wallet_address")
        or claims.get("walletAddress")
        or claims.get("sub")
    )
    role = claims.get("role") or "USER"
    return {"wallet_address": wallet, "role": role, **claims}


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    allow_mock = settings.allow_mock_auth

    if not auth_header or not auth_header.startswith("Bearer "):
        if allow_mock:
            return {"wallet_address": "0xMockUserWalletAddress", "role": "USER"}
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": "Missing Authorization Bearer token"},
        )

    token = auth_header.split(" ", 1)[1]
    jwt_secret = settings.jwt_secret or os.getenv("JWT_SECRET", "")
    try:
        if jwt_secret:
            claims = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        else:
            # Dev fallback when JWT_SECRET is not shared with auth service
            claims = jwt.decode(token, options={"verify_signature": False})
        return _normalize_user_claims(claims)
    except Exception:
        raise HTTPException(status_code=401, detail={"success": False, "error": "Invalid token"})

async def check_case_participant(
    request: Request,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallet = user.get("wallet_address")
    role = user.get("role", "").upper()
    
    if role in ["JUDGE", "ADMIN"]:
        return user
        
    case_id = request.path_params.get("caseId")
    doc_id = request.path_params.get("docId")
    
    # POST /share might pass docId in the body
    if not doc_id and request.method == "POST":
        try:
            body = await request.json()
            doc_id = body.get("docId")
        except Exception:
            pass
            
    if not case_id and doc_id:
        result = await db.execute(select(Document).where(Document.doc_id == doc_id))
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(status_code=404, detail={"success": False, "error": "Not Found"})
        # Uploader always has access
        if doc.uploaded_by and wallet and doc.uploaded_by.lower() == str(wallet).lower():
            return user
        case_id = doc.case_id
        
    if not case_id:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Not Found"})

    # Uploader of any doc on this case
    owner_result = await db.execute(
        select(Document).where(
            Document.case_id == case_id,
            Document.uploaded_by == wallet,
        ).limit(1)
    )
    if owner_result.scalars().first():
        return user
        
    result = await db.execute(
        select(CaseParticipant).where(
            CaseParticipant.case_id == case_id,
            CaseParticipant.wallet_address == wallet
        )
    )
    participant = result.scalars().first()
    
    if not participant:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Not Found"})
        
    return user

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024

def handle_service_error(e: Exception):
    err_str = str(e)
    if "DOCUMENT_NOT_FOUND" in err_str:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Document not found"})
    elif "ACCESS_EXPIRED" in err_str:
        raise HTTPException(status_code=403, detail={"success": False, "error": "Access permission has expired"})
    elif "ACCESS_DENIED" in err_str or "UNAUTHORIZED" in err_str:
        raise HTTPException(status_code=403, detail={"success": False, "error": "Access denied"})
    elif "FILE_TOO_LARGE" in err_str:
        raise HTTPException(status_code=400, detail={"success": False, "error": "File is too large"})
    elif "INVALID_FILE" in err_str:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Invalid file format"})
    elif "Access denied" in err_str or "OperationalError" in type(e).__name__:
        logger.error(f"Database error: {err_str}")
        raise HTTPException(
            status_code=503,
            detail={"success": False, "error": "Document database unavailable. Check DATABASE_URL / MySQL credentials."},
        )
    elif "IPFS" in err_str or "Pinata" in err_str:
        logger.error(f"IPFS error: {err_str}")
        raise HTTPException(
            status_code=502,
            detail={"success": False, "error": "IPFS/Pinata upload failed. Check PINATA credentials."},
        )
    else:
        logger.error(f"Internal error: {err_str}", exc_info=True)
        raise HTTPException(status_code=500, detail={"success": False, "error": "An internal error occurred"})

async def validate_pdf(file: UploadFile):
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": f"File too large. Max {settings.max_file_size_mb}MB"},
        )
    
    # 2. File extension must be .pdf
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail={"success": False, "error": "Only PDF files accepted"})
        
    # 3. MIME type must be application/pdf or application/x-pdf
    if file.content_type not in ["application/pdf", "application/x-pdf"]:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Invalid MIME type"})
        
    # 4. First 4 bytes must equal b'%PDF'
    first_bytes = await file.read(4)
    await file.seek(0)
    if first_bytes != b'%PDF':
        raise HTTPException(status_code=400, detail={"success": False, "error": "File is not a valid PDF"})

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    caseId: str = Form(...),
    docType: str = Form(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await validate_pdf(file)
    
    file_bytes = await file.read()
    uploader_wallet = user.get("wallet_address")
    
    idem_key = request.headers.get("X-Idempotency-Key")
    if idem_key:
        from app.models.idempotency_record import IdempotencyRecord
        from sqlalchemy import select
        import json
        
        result = await db.execute(select(IdempotencyRecord).where(IdempotencyRecord.idem_key == idem_key))
        record = result.scalars().first()
        
        if record:
            if record.wallet != uploader_wallet:
                raise HTTPException(status_code=409, detail={"success": False, "error": "Idempotency key used by different caller"})
            return json.loads(record.response)
            
    doc_service = DocumentService(db)
    
    try:
        saved_doc = await doc_service.process_upload(file_bytes, file.filename or "upload.pdf", caseId, docType, uploader_wallet)
        
        if idem_key:
            from app.models.idempotency_record import IdempotencyRecord
            import json
            response_data = DocumentResponse.model_validate(saved_doc).model_dump_json()
            new_record = IdempotencyRecord(idem_key=idem_key, wallet=uploader_wallet, response=response_data)
            db.add(new_record)
            await db.commit()
            
        return saved_doc
    except Exception as e:
        handle_service_error(e)

@router.get("/{docId}", dependencies=[Depends(check_case_participant)])
async def get_document(docId: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uploader_wallet = user.get("wallet_address")
    doc_service = DocumentService(db)
    try:
        pdf_bytes = await doc_service.retrieve_document_content(docId, uploader_wallet)
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={docId}.pdf"}
        )
    except Exception as e:
        handle_service_error(e)

@router.get("/case/{caseId}", response_model=List[DocumentResponse], dependencies=[Depends(check_case_participant)])
async def get_case_documents(caseId: str, db: AsyncSession = Depends(get_db)):
    doc_service = DocumentService(db)
    docs = await doc_service.get_documents_by_case(caseId)
    return docs

@router.post("/share", response_model=DocumentShareResponse, dependencies=[Depends(check_case_participant)])
async def share_document(req: DocumentShareRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    owner_wallet = user.get("wallet_address")
    doc_service = DocumentService(db)
    try:
        await doc_service.share_document(req.docId, owner_wallet, req.walletAddress, req.expiresAt)
        return {"success": True, "docId": req.docId, "walletAddress": req.walletAddress, "message": "Document shared successfully"}
    except Exception as e:
        handle_service_error(e)

@router.delete("/{docId}")
async def revoke_document(docId: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    owner_wallet = user.get("wallet_address")
    doc_service = DocumentService(db)
    try:
        await doc_service.revoke_access(docId, owner_wallet)
        return {"success": True, "message": "Document access revoked"}
    except Exception as e:
        handle_service_error(e)

@router.get("/verify/{docId}", response_model=VerificationResponse)
async def verify_document(docId: str, db: AsyncSession = Depends(get_db)):
    doc_service = DocumentService(db)
    try:
        result = await doc_service.verify_document(docId)
        return result
    except Exception as e:
        handle_service_error(e)

@router.get("/versions/{docId}", response_model=List[DocumentVersionResponse])
async def get_versions(docId: str, db: AsyncSession = Depends(get_db)):
    doc_service = DocumentService(db)
    versions = await doc_service.get_document_versions(docId)
    return versions

@router.post("/amend/{docId}", response_model=DocumentResponse, dependencies=[Depends(check_case_participant)])
async def amend_document(docId: str, file: UploadFile = File(...), user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await validate_pdf(file)
    file_bytes = await file.read()
        
    uploader_wallet = user.get("wallet_address")
    doc_service = DocumentService(db)
    try:
        updated_doc = await doc_service.amend_document(docId, file_bytes, uploader_wallet)
        return updated_doc
    except Exception as e:
        handle_service_error(e)

@router.get("/qr/{docId}")
async def get_qr_data(docId: str, db: AsyncSession = Depends(get_db)):
    doc_service = DocumentService(db)
    doc = await doc_service.get_document_metadata(docId)
    if not doc:
        raise HTTPException(status_code=404, detail={"error": {"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"}})
    
    return {
        "docId": doc.doc_id,
        "verificationUrl": f"{settings.blockchain_service_url}/verify/{doc.doc_id}",
        "txHash": doc.tx_hash
    }
