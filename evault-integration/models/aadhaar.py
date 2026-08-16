from typing import Optional
from pydantic import BaseModel, Field


class AadhaarBindRequest(BaseModel):
    aadhaarNumber: str = Field(..., description="12-digit Aadhaar number")
    walletAddress: str = Field(..., description="Ethereum wallet address (0x...)")


class AadhaarBindResponse(BaseModel):
    success: bool = Field(True, description="Operation success status")
    aadhaarHash: str = Field(..., description="SHA-256 hash of Aadhaar number")
    walletAddress: str = Field(..., description="Bound wallet address")
    boundAt: str = Field(..., description="Timestamp of binding (ISO format)")


class AadhaarVerifyResponse(BaseModel):
    wallet: str = Field(..., description="Wallet address checked")
    isBound: bool = Field(..., description="True if bound to Aadhaar hash")
    boundAt: Optional[str] = Field(None, description="Timestamp of binding if bound")
