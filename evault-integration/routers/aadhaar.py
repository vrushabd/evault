from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.aadhaar import AadhaarBindRequest
from services import aadhaar_service

router = APIRouter(prefix="/aadhaar", tags=["Aadhaar Identity Binding"])


@router.post("/bind")
async def bind_aadhaar_to_wallet(request: AadhaarBindRequest):
    """
    Validates 12-digit Aadhaar, hashes with SHA-256, and persists the binding.
    Never stores or returns plaintext Aadhaar.
    """
    try:
        bind_result = aadhaar_service.bind_aadhaar(
            aadhaar_number=request.aadhaarNumber,
            wallet_address=request.walletAddress
        )
        return {
            "success": True,
            "data": bind_result
        }
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Aadhaar binding failed: {str(e)}"}
        )


@router.get("/verify/{wallet_address}")
async def verify_aadhaar_binding(wallet_address: str):
    """
    Returns whether a wallet address has a bound Aadhaar hash.
    """
    try:
        verify_result = aadhaar_service.verify_aadhaar_binding(wallet_address)
        return {
            "success": True,
            "data": verify_result
        }
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Verification failed: {str(e)}"}
        )
