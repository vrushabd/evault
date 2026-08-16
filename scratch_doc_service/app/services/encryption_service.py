import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag

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
        master_key_hex = EncryptionService._master_key_hex()
        if not master_key_hex:
            raise EncryptionFailedError("ENCRYPTION_MASTER_KEY is not set in environment")
            
        master_key = bytes.fromhex(master_key_hex)
        info = f"legal-evault/document/{doc_id}/version/{version_id}"
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=info.encode(),
            backend=default_backend()
        )
        return hkdf.derive(master_key)

    @staticmethod
    def generate_key() -> bytes:
        """Generates a secure 256-bit AES key."""
        return AESGCM.generate_key(bit_length=256)
        
    @staticmethod
    def encrypt_file(plaintext: bytes, key: bytes) -> bytes:
        """
        Encrypts plaintext using AES-256-GCM.
        Returns serialized bytes: nonce (12 bytes) + ciphertext + tag (16 bytes)
        AESGCM in cryptography appends the 16-byte authentication tag to the ciphertext automatically.
        """
        try:
            aesgcm = AESGCM(key)
            nonce = os.urandom(12)  # 96-bit nonce is standard for GCM
            
            # The encrypt method returns ciphertext + tag
            ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, None)
            
            # Prepend nonce for storage
            return nonce + ciphertext_and_tag
        except Exception as e:
            raise EncryptionFailedError(f"Encryption failed: {str(e)}")

    @staticmethod
    def decrypt_file(encrypted_data: bytes, key: bytes) -> bytes:
        """
        Decrypts data using AES-256-GCM.
        Expects serialized bytes: nonce (12 bytes) + ciphertext + tag (16 bytes)
        """
        if len(encrypted_data) < 28: # 12 bytes nonce + 16 bytes tag minimum
            raise DecryptionFailedError("Invalid encrypted data format")
            
        try:
            aesgcm = AESGCM(key)
            nonce = encrypted_data[:12]
            ciphertext_and_tag = encrypted_data[12:]
            
            # Decrypt validates the tag automatically to ensure integrity
            plaintext = aesgcm.decrypt(nonce, ciphertext_and_tag, None)
            return plaintext
        except InvalidTag:
            raise DecryptionFailedError("Authentication failed: Data was tampered with or incorrect key used")
        except Exception as e:
            raise DecryptionFailedError(f"Decryption failed: {str(e)}")
