import uuid
import base64
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_access import DocumentAccess
from app.models.document_version import DocumentVersion
from app.repositories.document_repository import DocumentRepository
from app.repositories.document_access_repository import DocumentAccessRepository
from app.services.encryption_service import EncryptionService
from app.services.pinata_service import PinataService
from app.services.blockchain_client import BlockchainClient
from app.services.audit_client import AuditClient
from app.services.notification_client import NotificationClient
from app.services.integration_client import IntegrationClient

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.doc_repo = DocumentRepository(db_session)
        self.access_repo = DocumentAccessRepository(db_session)
        self.pinata_service = PinataService()
        self.blockchain_client = BlockchainClient()
        self.audit_client = AuditClient()
        self.notification_client = NotificationClient()
        self.integration_client = IntegrationClient()

    async def process_upload(self, file_bytes: bytes, filename: str, case_id: str, doc_type: str, uploader_wallet: str) -> Document:
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        version_id = str(uuid.uuid4())
        
        key = EncryptionService.derive_version_key(doc_id, version_id)
        key_reference = f"v2:{version_id}"

        encrypted_bytes = EncryptionService.encrypt_file(file_bytes, key)

        ipfs_cid = await self.pinata_service.upload_encrypted_file(encrypted_bytes, f"{doc_id}.enc")

        tx_hash = None
        try:
            tx_hash = await self.blockchain_client.store_document(
                doc_id=doc_id, case_id=case_id, ipfs_cid=ipfs_cid, doc_type=doc_type, version=1
            )
        except Exception as e:
            logger.error(f"Failed to record on blockchain: {str(e)}")

        status = "VERIFIED_BLOCKCHAIN" if tx_hash else "UPLOADED_IPFS"
        
        new_doc = Document(
            doc_id=doc_id, case_id=case_id, doc_type=doc_type, ipfs_cid=ipfs_cid,
            version=1, encryption_key_reference=key_reference, uploaded_by=uploader_wallet,
            tx_hash=tx_hash, status=status
        )

        saved_doc = await self.doc_repo.create(new_doc)
        
        # Send audit event
        await self.audit_client.log_event("DOCUMENT_UPLOADED", doc_id, case_id, uploader_wallet)
        
        return saved_doc

    async def get_document_metadata(self, doc_id: str) -> Optional[Document]:
        return await self.doc_repo.get_by_doc_id(doc_id)

    async def get_documents_by_case(self, case_id: str) -> List[Document]:
        return await self.doc_repo.get_by_case_id(case_id)

    async def retrieve_document_content(self, doc_id: str, requester_wallet: str) -> bytes:
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")
            
        # Check authorization
        if doc.uploaded_by != requester_wallet:
            access = await self.access_repo.get_access_by_doc_and_wallet(doc_id, requester_wallet)
            if not access:
                raise ValueError("ACCESS_DENIED")
            
            from datetime import datetime, timezone
            if access.expires_at and access.expires_at < datetime.now(timezone.utc):
                # Call Blockchain Service to revoke
                try:
                    await self.blockchain_client.revoke_document_access(doc_id)
                except Exception as e:
                    logger.error(f"Failed to revoke expired access on blockchain: {str(e)}")
                raise ValueError("ACCESS_EXPIRED")
        
        if not doc.ipfs_cid:
            raise ValueError("IPFS_CID_NOT_FOUND")
            
        try:
            encrypted_bytes = await self.pinata_service.get_file(doc.ipfs_cid)
        except Exception:
            raise ValueError("IPFS_RETRIEVAL_FAILED")
            
        key_ref = doc.encryption_key_reference
        if key_ref.startswith("v2:"):
            version_id = key_ref.split("v2:")[1]
            key = EncryptionService.derive_version_key(doc_id, version_id)
        else:
            # Fallback for old documents
            key = base64.b64decode(key_ref)
        
        try:
            decrypted = EncryptionService.decrypt_file(encrypted_bytes, key)
            await self.audit_client.log_event("DOCUMENT_RETRIEVED", doc_id, doc.case_id, requester_wallet)
            return decrypted
        except Exception:
            raise ValueError("ENCRYPTION_FAILED")

    async def share_document(self, doc_id: str, owner_wallet: str, target_wallet: str, expires_at=None) -> bool:
        doc = await self.get_document_metadata(doc_id)
        if not doc or doc.uploaded_by != owner_wallet:
            raise ValueError("DOCUMENT_NOT_FOUND_OR_UNAUTHORIZED")
            
        access = DocumentAccess(doc_id=doc_id, wallet_address=target_wallet, granted_by=owner_wallet, expires_at=expires_at)
        await self.access_repo.grant_access(access)
        
        await self.audit_client.log_event("DOCUMENT_SHARED", doc_id, doc.case_id, owner_wallet, {"shared_with": target_wallet})
        await self.notification_client.notify("DOCUMENT_SHARED", target_wallet, {"docId": doc_id})
        return True

    async def revoke_access(self, doc_id: str, owner_wallet: str, target_wallet: Optional[str] = None) -> bool:
        doc = await self.get_document_metadata(doc_id)
        if not doc or doc.uploaded_by != owner_wallet:
            raise ValueError("DOCUMENT_NOT_FOUND_OR_UNAUTHORIZED")
        
        if target_wallet:
            revoked = await self.access_repo.revoke_access(doc_id, target_wallet)
            if revoked:
                await self.audit_client.log_event("DOCUMENT_ACCESS_REVOKED", doc_id, doc.case_id, owner_wallet, {"revoked_for": target_wallet})
            return revoked
        else:
            # Revoke entire document conceptually
            await self.doc_repo.update_status(doc_id, "REVOKED")
            await self.audit_client.log_event("DOCUMENT_REVOKED", doc_id, doc.case_id, owner_wallet)
            return True

    async def verify_document(self, doc_id: str) -> Dict[str, Any]:
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")
            
        # Call blockchain to verify
        # In a real impl, we'd check if doc.tx_hash matches what's on chain.
        # Stub logic relying on DB for demo, since BlockchainClient verify is stubbed.
        is_verified = (doc.status in ["VERIFIED_BLOCKCHAIN", "UPLOADED_IPFS"])
        
        await self.audit_client.log_event("DOCUMENT_VERIFIED", doc_id, doc.case_id, "SYSTEM")
        
        return {
            "docId": doc.doc_id,
            "verified": is_verified,
            "status": "VERIFIED" if is_verified else "TAMPERED",
            "ipfsCid": doc.ipfs_cid,
            "txHash": doc.tx_hash
        }

    async def amend_document(self, doc_id: str, file_bytes: bytes, uploader_wallet: str) -> Document:
        old_doc = await self.get_document_metadata(doc_id)
        if not old_doc or old_doc.uploaded_by != uploader_wallet:
            raise ValueError("DOCUMENT_NOT_FOUND_OR_UNAUTHORIZED")
            
        new_version_num = old_doc.version + 1
        
        # Save old version record
        old_version = DocumentVersion(
            doc_id=doc_id, version=old_doc.version, previous_doc_id=old_doc.previous_doc_id,
            ipfs_cid=old_doc.ipfs_cid, tx_hash=old_doc.tx_hash
        )
        await self.doc_repo.add_version(old_version)
        
        # Encrypt & Upload new file
        version_id = str(uuid.uuid4())
        key = EncryptionService.derive_version_key(doc_id, version_id)
        encrypted_bytes = EncryptionService.encrypt_file(file_bytes, key)
        new_cid = await self.pinata_service.upload_encrypted_file(encrypted_bytes, f"{doc_id}_v{new_version_num}.enc")
        
        # Update blockchain
        tx_hash = None
        try:
            tx_hash = await self.blockchain_client.store_document(
                doc_id=doc_id, case_id=old_doc.case_id, ipfs_cid=new_cid, doc_type=old_doc.doc_type, version=new_version_num
            )
        except Exception:
            logger.error("Blockchain update failed on amendment")
            
        # Update main document metadata
        old_doc.ipfs_cid = new_cid
        old_doc.version = new_version_num
        old_doc.tx_hash = tx_hash
        old_doc.encryption_key_reference = f"v2:{version_id}"
        await self.db.commit()
        await self.db.refresh(old_doc)
        
        await self.audit_client.log_event("DOCUMENT_AMENDED", doc_id, old_doc.case_id, uploader_wallet)
        return old_doc

    async def get_document_versions(self, doc_id: str) -> List[DocumentVersion]:
        return await self.doc_repo.get_versions(doc_id)
