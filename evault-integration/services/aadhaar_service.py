import hashlib
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# In-memory database storing walletAddress -> { aadhaarHash, walletAddress, boundAt }
aadhaar_store: Dict[str, Dict[str, Any]] = {}


def validate_aadhaar_number(aadhaar_number: str) -> bool:
    """Validates that Aadhaar is exactly 12 numeric digits."""
    cleaned = str(aadhaar_number).strip().replace(" ", "").replace("-", "")
    return bool(re.match(r"^\d{12}$", cleaned))


def bind_aadhaar(aadhaar_number: str, wallet_address: str) -> Dict[str, Any]:
    """Hashes 12-digit Aadhaar and binds SHA-256 hash to wallet address in memory."""
    cleaned_aadhaar = str(aadhaar_number).strip().replace(" ", "").replace("-", "")
    
    if not validate_aadhaar_number(cleaned_aadhaar):
        raise ValueError("Invalid Aadhaar format. Must be a 12-digit numeric string.")
    
    if not wallet_address or not wallet_address.startswith("0x"):
        raise ValueError("Invalid wallet address format. Must start with '0x'.")
        
    aadhaar_hash = hashlib.sha256(cleaned_aadhaar.encode('utf-8')).hexdigest()
    bound_at = datetime.now(timezone.utc).isoformat()
    
    normalized_wallet = wallet_address.lower()
    
    binding_record = {
        "aadhaarHash": aadhaar_hash,
        "walletAddress": wallet_address,
        "boundAt": bound_at
    }
    
    aadhaar_store[normalized_wallet] = binding_record
    
    return {
        "success": True,
        "aadhaarHash": aadhaar_hash,
        "walletAddress": wallet_address,
        "boundAt": bound_at
    }


def verify_aadhaar_binding(wallet_address: str) -> Dict[str, Any]:
    """Verifies whether a wallet address has a bound Aadhaar hash."""
    if not wallet_address:
        raise ValueError("Wallet address is required for verification.")
        
    normalized_wallet = wallet_address.lower()
    record = aadhaar_store.get(normalized_wallet)
    
    if record:
        return {
            "wallet": wallet_address,
            "isBound": True,
            "boundAt": record["boundAt"]
        }
    else:
        return {
            "wallet": wallet_address,
            "isBound": False,
            "boundAt": None
        }
