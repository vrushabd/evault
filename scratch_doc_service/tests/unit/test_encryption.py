import pytest
from app.services.encryption_service import EncryptionService, DecryptionFailedError

def test_encryption_decryption_lifecycle():
    # 1. Generate Key
    key = EncryptionService.generate_key()
    assert len(key) == 32  # 256 bits = 32 bytes

    # 2. Original PDF Bytes
    original_pdf = b"%PDF-1.4\n%...\n%%EOF\n"
    
    # 3. Encrypt
    encrypted_bytes = EncryptionService.encrypt_file(original_pdf, key)
    
    # Ensure it's not plaintext
    assert encrypted_bytes != original_pdf
    assert b"%PDF" not in encrypted_bytes
    
    # 4. Decrypt
    decrypted_bytes = EncryptionService.decrypt_file(encrypted_bytes, key)
    
    # 5. Assert identity
    assert decrypted_bytes == original_pdf

def test_decryption_fails_with_wrong_key():
    key1 = EncryptionService.generate_key()
    key2 = EncryptionService.generate_key()
    
    original_pdf = b"Secret Legal Document"
    encrypted_bytes = EncryptionService.encrypt_file(original_pdf, key1)
    
    with pytest.raises(DecryptionFailedError):
        EncryptionService.decrypt_file(encrypted_bytes, key2)

def test_decryption_fails_if_tampered():
    key = EncryptionService.generate_key()
    original_pdf = b"Secret Legal Document"
    encrypted_bytes = EncryptionService.encrypt_file(original_pdf, key)
    
    # Tamper with the ciphertext (change the last byte, which is part of the tag)
    tampered_bytes = bytearray(encrypted_bytes)
    tampered_bytes[-1] ^= 0xFF
    
    with pytest.raises(DecryptionFailedError):
        EncryptionService.decrypt_file(bytes(tampered_bytes), key)
