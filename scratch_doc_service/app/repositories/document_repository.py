from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete

from app.models.document import Document
from app.models.document_version import DocumentVersion

class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, document: Document) -> Document:
        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)
        return document

    async def get_by_doc_id(self, doc_id: str) -> Optional[Document]:
        result = await self.session.execute(select(Document).where(Document.doc_id == doc_id))
        return result.scalars().first()

    async def get_by_case_id(self, case_id: str) -> List[Document]:
        result = await self.session.execute(select(Document).where(Document.case_id == case_id))
        return list(result.scalars().all())

    async def update_status(self, doc_id: str, status: str, tx_hash: Optional[str] = None) -> Optional[Document]:
        doc = await self.get_by_doc_id(doc_id)
        if doc:
            doc.status = status
            if tx_hash:
                doc.tx_hash = tx_hash
            await self.session.commit()
            await self.session.refresh(doc)
        return doc

    async def add_version(self, version: DocumentVersion) -> DocumentVersion:
        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(version)
        return version

    async def get_versions(self, doc_id: str) -> List[DocumentVersion]:
        result = await self.session.execute(
            select(DocumentVersion).where(DocumentVersion.doc_id == doc_id).order_by(DocumentVersion.version.desc())
        )
        return list(result.scalars().all())
