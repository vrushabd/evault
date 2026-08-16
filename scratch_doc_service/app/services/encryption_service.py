"""
AES-256-GCM document encryption with HKDF-SHA256 key derivation.

Encrypted blob format (IPFS stores ONLY this ciphertext — never plaintext PDF):
  v3:  [0x03][12-byte nonce][ciphertext || 16-byte GCM tag]
  v2/legacy: [12-byte nonce][ciphertext || 16-byte GCM tag]  (still decryptable)

ENCRYPTION_MASTER_KEY (32-byte hex) lives only in server env.
Per-document keys are derived via HKDF; the AES key is NEVER persisted.
"""
from __future__ import annotations

import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag

# Payload version byte for new encrypts
PAYLOAD_VERSION_V3 = 0x03
NONCE_LEN = 12
TAG_LEN = 16
MIN_LEGACY_LEN = NONCE_LEN + TAG_LEN
MIN_V3_LEN = 1 + NONCE_LEN + TAG_LEN


class EncryptionFailedError(Exception):
    pass


class DecryptionFailedError(Exception):
    pass


class EncryptionService:
    @staticmethod
    def _master_key_hex() -> str:
        from app.config.settings import settings
        key = settings.encryption_master_key or os.getenv("ENCRYPTION_MASTER_KEY") or ""
        return key.strip()

    @staticmethod
    def derive_version_key(doc_id: str, version_id: str) -> bytes:
        """
        Derive a unique 256-bit document key:
          ENCRYPTION_MASTER_KEY → HKDF-SHA256(info=doc/version context) → AES key
        """
        master_key_hex = EncryptionService._master_key_hex()
        if not master_key_hex:
            raise EncryptionFailedError("ENCRYPTION_MASTER_KEY is not set in environment")
        if len(master_key_hex) != 64:
            raise EncryptionFailedError("ENCRYPTION_MASTER_KEY must be 64 hex chars (32 bytes)")

        try:
            master_key = bytes.fromhex(master_key_hex)
        except ValueError as e:
            raise EncryptionFailedError("ENCRYPTION_MASTER_KEY must be valid hex") from e

        info = f"legal-evault/document/{doc_id}/version/{version_id}"
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=info.encode("utf-8"),
            backend=default_backend(),
        )
        return hkdf.derive(master_key)

    @staticmethod
    def sha256_hex(data: bytes) -> str:
        """Integrity hash of original plaintext PDF (hex, no 0x prefix)."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def generate_key() -> bytes:
        return AESGCM.generate_key(bit_length=256)

    @staticmethod
    def encrypt_file(plaintext: bytes, key: bytes) -> bytes:
        """
        Encrypt plaintext with AES-256-GCM.
        Returns: version(1) || nonce(12) || ciphertext || tag(16).
        A fresh cryptographically secure nonce is used every call — never reuse nonce+key.
        """
        if len(key) != 32:
            raise EncryptionFailedError("AES-256-GCM requires a 32-byte key")
        try:
            aesgcm = AESGCM(key)
            nonce = os.urandom(NONCE_LEN)
            ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, None)
            return bytes([PAYLOAD_VERSION_V3]) + nonce + ciphertext_and_tag
        except Exception as e:
            raise EncryptionFailedError("Encryption failed") from e

    @staticmethod
    def decrypt_file(encrypted_data: bytes, key: bytes) -> bytes:
        """
        Decrypt AES-256-GCM payload.
        Supports v3 (versioned) and legacy (nonce||ct||tag) formats for existing IPFS CIDs.
        """
        if len(key) != 32:
            raise DecryptionFailedError("AES-256-GCM requires a 32-byte key")
        if not encrypted_data or len(encrypted_data) < MIN_LEGACY_LEN:
            raise DecryptionFailedError("Invalid encrypted data format")

        try:
            aesgcm = AESGCM(key)

            # Versioned v3 payload
            if encrypted_data[0] == PAYLOAD_VERSION_V3 and len(encrypted_data) >= MIN_V3_LEN:
                nonce = encrypted_data[1 : 1 + NONCE_LEN]
                ciphertext_and_tag = encrypted_data[1 + NONCE_LEN :]
                return aesgcm.decrypt(nonce, ciphertext_and_tag, None)

            # Legacy: nonce || ciphertext||tag
            nonce = encrypted_data[:NONCE_LEN]
            ciphertext_and_tag = encrypted_data[NONCE_LEN:]
            return aesgcm.decrypt(nonce, ciphertext_and_tag, None)
        except InvalidTag:
            raise DecryptionFailedError(
                "Authentication failed: data was tampered with or incorrect key used"
            )
        except DecryptionFailedError:
            raise
        except Exception as e:
            raise DecryptionFailedError("Decryption failed") from e
