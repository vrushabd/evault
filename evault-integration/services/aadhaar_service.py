import hashlib
import hmac
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict

from services import persistence


def validate_aadhaar_number(aadhaar_number: str) -> bool:
    cleaned = str(aadhaar_number).strip().replace(" ", "").replace("-", "")
    return bool(re.match(r"^\d{12}$", cleaned))


def _commitment_secret() -> bytes:
    """
    Server-side secret for HMAC identity commitments.
    Prefer AADHAAR_HMAC_SECRET; fall back to ENCRYPTION_MASTER_KEY hex as bytes.
    """
    secret = (os.getenv("AADHAAR_HMAC_SECRET") or "").strip()
    if secret:
        return secret.encode("utf-8")
    master = (os.getenv("ENCRYPTION_MASTER_KEY") or "").strip()
    if master:
        try:
            return bytes.fromhex(master)
        except ValueError:
            return master.encode("utf-8")
    raise ValueError("AADHAAR_HMAC_SECRET or ENCRYPTION_MASTER_KEY must be configured")


def bind_aadhaar(aadhaar_number: str, wallet_address: str) -> Dict[str, Any]:
    """
    Create a privacy-preserving identity commitment (HMAC-SHA256) and bind to wallet.
    Never stores plaintext Aadhaar. This is NOT UIDAI/Aadhaar KYC verification.
    """
    cleaned_aadhaar = str(aadhaar_number).strip().replace(" ", "").replace("-", "")

    if not validate_aadhaar_number(cleaned_aadhaar):
        raise ValueError("Invalid Aadhaar format. Must be a 12-digit numeric string.")

    if not wallet_address or not wallet_address.startswith("0x"):
        raise ValueError("Invalid wallet address format. Must start with '0x'.")

    commitment = hmac.new(
        _commitment_secret(),
        cleaned_aadhaar.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    bound_at = datetime.now(timezone.utc).isoformat()

    persistence.save_aadhaar_binding(wallet_address, commitment, bound_at)

    return {
        "success": True,
        "aadhaarHash": commitment,
        "commitment": commitment,
        "scheme": "HMAC-SHA256",
        "walletAddress": wallet_address,
        "boundAt": bound_at,
        "note": "Identity commitment only — not UIDAI-verified Aadhaar KYC.",
    }


def verify_aadhaar_binding(wallet_address: str) -> Dict[str, Any]:
    if not wallet_address:
        raise ValueError("Wallet address is required for verification.")

    record = persistence.get_aadhaar_binding(wallet_address)
    if record:
        return {
            "wallet": wallet_address,
            "isBound": True,
            "boundAt": record["boundAt"],
            "scheme": "HMAC-SHA256",
            "note": "Commitment bound — not a government Aadhaar verification.",
        }
    return {
        "wallet": wallet_address,
        "isBound": False,
        "boundAt": None,
    }
