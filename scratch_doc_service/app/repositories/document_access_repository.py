from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.document_access import DocumentAccess

class DocumentAccessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def grant_access(self, access: DocumentAccess) -> DocumentAccess:
        self.session.add(access)
        await self.session.commit()
        await self.session.refresh(access)
        return access

    async def get_access_by_doc_and_wallet(self, doc_id: str, wallet_address: str) -> Optional[DocumentAccess]:
        from sqlalchemy import func
        wallet = (wallet_address or "").lower()
        result = await self.session.execute(
            select(DocumentAccess).where(
                DocumentAccess.doc_id == doc_id,
                func.lower(DocumentAccess.wallet_address) == wallet,
                DocumentAccess.status == "ACTIVE"
            )
        )
        return result.scalars().first()

    async def revoke_access(self, doc_id: str, wallet_address: str) -> bool:
        access = await self.get_access_by_doc_and_wallet(doc_id, wallet_address)
        if access:
            access.status = "REVOKED"
            await self.session.commit()
            return True
        return False
