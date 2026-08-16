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

    async def process_upload(
        self, file_bytes: bytes, filename: str, case_id: str, doc_type: str, uploader_wallet: str
    ) -> Document:
        """
        Upload pipeline (plaintext never leaves this process unencrypted):
          1) SHA-256(plaintext)
          2) AES-256-GCM encrypt (unique nonce)
          3) Pin ciphertext to IPFS → CID
          4) Store CID + hash on Sepolia
          5) Persist metadata in MySQL (no PDF bytes, no AES key)
          6) Audit DOCUMENT_UPLOADED
        """
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        version_id = str(uuid.uuid4())

        document_hash = EncryptionService.sha256_hex(file_bytes)

        key = EncryptionService.derive_version_key(doc_id, version_id)
        key_reference = f"v2:{version_id}"
        encrypted_bytes = EncryptionService.encrypt_file(file_bytes, key)
        # Drop plaintext reference ASAP (caller may still hold file_bytes; we do not persist it)
        del key

        ipfs_cid = await self.pinata_service.upload_encrypted_file(encrypted_bytes, f"{doc_id}.enc")

        tx_hash = None
        chain_error = None
        try:
            tx_hash = await self.blockchain_client.store_document(
                doc_id=doc_id,
                case_id=case_id,
                ipfs_cid=ipfs_cid,
                doc_type=doc_type,
                version=1,
                document_hash=document_hash,
            )
        except Exception as e:
            chain_error = str(e)
            logger.error(f"Failed to record on blockchain for {doc_id}: {e}")

        # Do not mark fully registered if chain write failed
        if tx_hash:
            status = "VERIFIED_BLOCKCHAIN"
        else:
            status = "PENDING_CHAIN"

        new_doc = Document(
            doc_id=doc_id,
            case_id=case_id,
            doc_type=doc_type,
            ipfs_cid=ipfs_cid,
            document_hash=document_hash,
            version=1,
            encryption_key_reference=key_reference,
            key_version=3,
            uploaded_by=uploader_wallet,
            tx_hash=tx_hash,
            status=status,
        )

        saved_doc = await self.doc_repo.create(new_doc)

        try:
            await self.integration_client.ensure_case(case_id, created_by=uploader_wallet)
        except Exception as e:
            logger.warning(f"Case registry update skipped: {e}")

        try:
            from app.models.case_participant import CaseParticipant
            from sqlalchemy.future import select

            existing = await self.db.execute(
                select(CaseParticipant).where(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.wallet_address == uploader_wallet,
                )
            )
            if not existing.scalars().first():
                self.db.add(
                    CaseParticipant(
                        case_id=case_id,
                        wallet_address=uploader_wallet,
                        role="UPLOADER",
                    )
                )
                await self.db.commit()
        except Exception as e:
            logger.warning(f"Could not add case participant: {e}")

        audit_meta = {"status": status, "ipfsCid": ipfs_cid, "documentHash": document_hash}
        if tx_hash:
            audit_meta["txHash"] = tx_hash
        if chain_error:
            audit_meta["chainError"] = "blockchain_write_failed"
        await self.audit_client.log_event(
            "DOCUMENT_UPLOADED", doc_id, case_id, uploader_wallet, audit_meta
        )

        return saved_doc

    async def get_document_metadata(self, doc_id: str) -> Optional[Document]:
        return await self.doc_repo.get_by_doc_id(doc_id)

    async def get_documents_by_case(self, case_id: str) -> List[Document]:
        return await self.doc_repo.get_by_case_id(case_id)

    async def get_documents_for_wallet(self, wallet_address: str) -> List[Document]:
        return await self.doc_repo.get_accessible_by_wallet(wallet_address)

    async def retrieve_document_content(self, doc_id: str, requester_wallet: str) -> bytes:
        """
        Authorized download: MySQL metadata → IPFS ciphertext → HKDF key → AES-GCM decrypt.
        Streams plaintext only in memory; never writes plaintext PDF to disk.
        """
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")

        requester = (requester_wallet or "").lower()
        owner = (doc.uploaded_by or "").lower()
        if owner != requester:
            access = await self.access_repo.get_access_by_doc_and_wallet(doc_id, requester_wallet)
            if not access:
                await self.audit_client.log_event(
                    "ACCESS_DENIED",
                    doc_id,
                    doc.case_id,
                    requester_wallet or "unknown",
                    {"reason": "not_owner_or_granted"},
                )
                raise ValueError("ACCESS_DENIED")

            from datetime import datetime, timezone

            if access.expires_at and access.expires_at < datetime.now(timezone.utc):
                try:
                    await self.blockchain_client.revoke_document_access(doc_id)
                except Exception as e:
                    logger.error(f"Failed to revoke expired access on blockchain: {e}")
                await self.audit_client.log_event(
                    "ACCESS_DENIED",
                    doc_id,
                    doc.case_id,
                    requester_wallet,
                    {"reason": "access_expired"},
                )
                raise ValueError("ACCESS_EXPIRED")

        if not doc.ipfs_cid:
            raise ValueError("IPFS_CID_NOT_FOUND")

        try:
            encrypted_bytes = await self.pinata_service.get_file(doc.ipfs_cid)
        except Exception:
            raise ValueError("IPFS_RETRIEVAL_FAILED")

        key_ref = doc.encryption_key_reference or ""
        try:
            if key_ref.startswith("v2:"):
                version_id = key_ref.split("v2:", 1)[1]
                decrypted = EncryptionService.decrypt_with_key_fallbacks(
                    encrypted_bytes, doc_id, version_id
                )
            else:
                # Legacy rows only — never store new plaintext AES keys
                key = base64.b64decode(key_ref)
                try:
                    decrypted = EncryptionService.decrypt_file(encrypted_bytes, key)
                finally:
                    del key
        except Exception:
            raise ValueError("ENCRYPTION_FAILED")

        await self.audit_client.log_event(
            "DOCUMENT_DOWNLOADED",
            doc_id,
            doc.case_id,
            requester_wallet,
            {"result": "success"},
        )
        return decrypted

    async def share_document(
        self, doc_id: str, owner_wallet: str, target_wallet: str, expires_at=None
    ) -> bool:
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")

        owner = (owner_wallet or "").lower()
        if (doc.uploaded_by or "").lower() != owner:
            await self.audit_client.log_event(
                "ACCESS_DENIED",
                doc_id,
                doc.case_id,
                owner_wallet or "unknown",
                {"reason": "share_not_owner"},
            )
            raise ValueError("UNAUTHORIZED")

        if not target_wallet or not str(target_wallet).startswith("0x"):
            raise ValueError("INVALID_WALLET")

        access = DocumentAccess(
            doc_id=doc_id,
            wallet_address=target_wallet,
            granted_by=owner_wallet,
            expires_at=expires_at,
        )
        await self.access_repo.grant_access(access)

        try:
            from app.models.case_participant import CaseParticipant
            from sqlalchemy.future import select

            existing = await self.db.execute(
                select(CaseParticipant).where(
                    CaseParticipant.case_id == doc.case_id,
                    CaseParticipant.wallet_address == target_wallet,
                )
            )
            if not existing.scalars().first():
                self.db.add(
                    CaseParticipant(
                        case_id=doc.case_id,
                        wallet_address=target_wallet,
                        role="SHARED",
                    )
                )
                await self.db.commit()
        except Exception as e:
            logger.warning(f"Could not add shared case participant: {e}")

        await self.audit_client.log_event(
            "ACCESS_GRANTED",
            doc_id,
            doc.case_id,
            owner_wallet,
            {"shared_with": target_wallet},
        )
        await self.notification_client.notify(
            "DOCUMENT_SHARED", target_wallet, {"docId": doc_id}
        )
        return True

    async def revoke_access(
        self, doc_id: str, owner_wallet: str, target_wallet: Optional[str] = None
    ) -> bool:
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")
        if (doc.uploaded_by or "").lower() != (owner_wallet or "").lower():
            raise ValueError("UNAUTHORIZED")

        if target_wallet:
            revoked = await self.access_repo.revoke_access(doc_id, target_wallet)
            if revoked:
                await self.audit_client.log_event(
                    "DOCUMENT_ACCESS_REVOKED",
                    doc_id,
                    doc.case_id,
                    owner_wallet,
                    {"revoked_for": target_wallet},
                )
            return revoked

        await self.doc_repo.update_status(doc_id, "REVOKED")
        await self.audit_client.log_event("DOCUMENT_REVOKED", doc_id, doc.case_id, owner_wallet)
        return True

    async def verify_document(self, doc_id: str) -> Dict[str, Any]:
        """
        Integrity verification without downloading/decrypting the PDF.
        Compares MySQL CID/hash against on-chain CID/hash when available.
        """
        doc = await self.get_document_metadata(doc_id)
        if not doc:
            raise ValueError("DOCUMENT_NOT_FOUND")

        cid_match = False
        hash_match = None
        blockchain_verified = False
        chain_error = None
        integrity = "UNKNOWN"

        try:
            if not doc.ipfs_cid:
                chain_error = "Document has no IPFS CID"
            else:
                result = await self.blockchain_client.verify_document(
                    doc.doc_id,
                    doc.ipfs_cid,
                    document_hash=doc.document_hash,
                )
                cid_match = bool(result.get("cidMatch", result.get("isValid")))
                if "hashMatch" in result:
                    hash_match = bool(result.get("hashMatch"))
                elif doc.document_hash and result.get("storedHash"):
                    stored = str(result.get("storedHash") or "").lower().replace("0x", "")
                    hash_match = stored == doc.document_hash.lower()
                else:
                    # On-chain hash not present yet — leave as unknown (None)
                    hash_match = None

                blockchain_verified = cid_match and (hash_match is not False)
        except Exception as e:
            logger.warning(f"On-chain verify failed for {doc_id}: {e}")
            chain_error = "Blockchain verification unavailable"
            # Do NOT claim CID/hash match when chain cannot be queried
            cid_match = None
            hash_match = None
            blockchain_verified = False

        if blockchain_verified and cid_match and hash_match is not False:
            integrity = "VALID"
            status = "UNTAMPERED"
            verified = True
        elif cid_match is False or hash_match is False:
            integrity = "INVALID"
            status = "TAMPERED"
            verified = False
        elif chain_error or doc.status == "PENDING_CHAIN" or not doc.tx_hash:
            integrity = "UNVERIFIED"
            status = "PENDING_CHAIN" if (doc.status == "PENDING_CHAIN" or not doc.tx_hash) else "CHAIN_UNAVAILABLE"
            verified = False
            if doc.status == "PENDING_CHAIN" and not chain_error:
                chain_error = "Document metadata not yet registered on Sepolia (PENDING_CHAIN)"
        else:
            integrity = "PARTIAL"
            status = "PARTIAL"
            verified = False

        await self.audit_client.log_event(
            "DOCUMENT_VERIFIED",
            doc_id,
            doc.case_id,
            "SYSTEM",
            {
                "integrity": integrity,
                "cidMatch": cid_match,
                "hashMatch": hash_match,
                "blockchainVerified": blockchain_verified,
            },
        )

        return {
            "documentId": doc.doc_id,
            "docId": doc.doc_id,
            "verified": verified,
            "status": status,
            "integrity": integrity,
            "cidMatch": cid_match,
            "hashMatch": hash_match,
            "blockchainVerified": blockchain_verified,
            "ipfsCid": doc.ipfs_cid,
            "documentHash": doc.document_hash,
            "txHash": doc.tx_hash,
            "error": chain_error,
        }

    async def amend_document(self, doc_id: str, file_bytes: bytes, uploader_wallet: str) -> Document:
        old_doc = await self.get_document_metadata(doc_id)
        if not old_doc:
            raise ValueError("DOCUMENT_NOT_FOUND")
        if (old_doc.uploaded_by or "").lower() != (uploader_wallet or "").lower():
            raise ValueError("UNAUTHORIZED")

        new_version_num = old_doc.version + 1
        document_hash = EncryptionService.sha256_hex(file_bytes)

        old_version = DocumentVersion(
            doc_id=doc_id,
            version=old_doc.version,
            previous_doc_id=old_doc.previous_doc_id,
            ipfs_cid=old_doc.ipfs_cid,
            tx_hash=old_doc.tx_hash,
        )
        await self.doc_repo.add_version(old_version)

        version_id = str(uuid.uuid4())
        key = EncryptionService.derive_version_key(doc_id, version_id)
        encrypted_bytes = EncryptionService.encrypt_file(file_bytes, key)
        del key
        new_cid = await self.pinata_service.upload_encrypted_file(
            encrypted_bytes, f"{doc_id}_v{new_version_num}.enc"
        )

        tx_hash = None
        try:
            tx_hash = await self.blockchain_client.store_document(
                doc_id=f"{doc_id}-v{new_version_num}",
                case_id=old_doc.case_id,
                ipfs_cid=new_cid,
                doc_type=old_doc.doc_type,
                version=new_version_num,
                document_hash=document_hash,
            )
        except Exception:
            logger.error("Blockchain update failed on amendment")

        old_doc.ipfs_cid = new_cid
        old_doc.document_hash = document_hash
        old_doc.version = new_version_num
        old_doc.tx_hash = tx_hash
        old_doc.encryption_key_reference = f"v2:{version_id}"
        old_doc.key_version = 3
        old_doc.status = "VERIFIED_BLOCKCHAIN" if tx_hash else "PENDING_CHAIN"
        await self.db.commit()
        await self.db.refresh(old_doc)

        await self.audit_client.log_event("DOCUMENT_AMENDED", doc_id, old_doc.case_id, uploader_wallet)
        return old_doc

    async def get_document_versions(self, doc_id: str) -> List[DocumentVersion]:
        return await self.doc_repo.get_versions(doc_id)
