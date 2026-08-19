from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.aadhaar import AadhaarBindRequest, AadhaarSendOtpRequest, AadhaarVerifyOtpRequest
from services import aadhaar_service

router = APIRouter(prefix="/aadhaar", tags=["Aadhaar Identity Binding"])


@router.post("/send-otp")
async def send_aadhaar_otp(request: AadhaarSendOtpRequest):
    """
    Step 1: Validates Aadhaar format and Verhoeff checksum.
    Generates and returns an e-KYC OTP session.
    """
    try:
        result = aadhaar_service.send_aadhaar_otp(
            aadhaar_number=request.aadhaarNumber,
            wallet_address=request.walletAddress,
        )
        return {"success": True, "data": result}
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to send OTP: {str(e)}"},
        )


@router.post("/verify-otp")
async def verify_aadhaar_otp(request: AadhaarVerifyOtpRequest):
    """
    Step 2: Validates the 6-digit OTP, creates the HMAC identity commitment,
    and binds the identity to the wallet.
    """
    try:
        result = aadhaar_service.verify_aadhaar_otp(
            txn_id=request.txnId,
            otp=request.otp,
            wallet_address=request.walletAddress,
        )
        return {"success": True, "data": result}
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to verify OTP: {str(e)}"},
        )


@router.post("/bind")
async def bind_aadhaar_to_wallet(request: AadhaarBindRequest):
    """
    Direct binding endpoint with Verhoeff validation.
    """
    try:
        bind_result = aadhaar_service.bind_aadhaar(
            aadhaar_number=request.aadhaarNumber,
            wallet_address=request.walletAddress,
        )
        return {"success": True, "data": bind_result}
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Aadhaar binding failed: {str(e)}"},
        )


@router.get("/verify/{wallet_address}")
async def verify_aadhaar_binding(wallet_address: str):
    """
    Returns whether a wallet address has a bound Aadhaar hash.
    """
    try:
        verify_result = aadhaar_service.verify_aadhaar_binding(wallet_address)
        return {"success": True, "data": verify_result}
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Verification failed: {str(e)}"},
        )


@router.delete("/unbind/{wallet_address}")
@router.post("/unbind/{wallet_address}")
async def unbind_aadhaar_wallet(wallet_address: str):
    """
    Unlinks/resets Aadhaar binding for a given wallet address.
    """
    try:
        result = aadhaar_service.unbind_aadhaar(wallet_address)
        return {"success": True, "data": result}
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(ve)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Unbind failed: {str(e)}"},
        )

