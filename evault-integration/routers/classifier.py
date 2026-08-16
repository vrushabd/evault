from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from models.classification import TextClassifyRequest
from services import classifier_service

router = APIRouter(prefix="/classify", tags=["AI Document Classifier"])


@router.post("/document")
async def classify_pdf_document(file: UploadFile = File(...)):
    """
    Accepts multipart PDF upload, extracts text using pdfplumber, 
    and classifies legal metadata using Gemini 1.5 Flash.
    """
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Uploaded file must be a PDF."}
        )

    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Uploaded file is empty."}
            )

        extracted_text = classifier_service.extract_text_from_pdf(pdf_bytes)
        
        if not extracted_text or not extracted_text.strip():
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "no text found"}
            )

        classification_data = classifier_service.classify_legal_text(extracted_text)
        return {
            "success": True,
            "data": classification_data
        }
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Classification failed: {str(e)}"}
        )


@router.post("/text")
async def classify_raw_text(request: TextClassifyRequest):
    """
    Accepts raw legal document text string and classifies metadata using Gemini 1.5 Flash.
    """
    if not request.text or not request.text.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Document text cannot be empty."}
        )

    try:
        classification_data = classifier_service.classify_legal_text(request.text)
        return {
            "success": True,
            "data": classification_data
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Text classification failed: {str(e)}"}
        )
