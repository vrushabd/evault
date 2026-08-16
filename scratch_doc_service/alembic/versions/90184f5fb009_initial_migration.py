"""Initial migration

Revision ID: 90184f5fb009
Revises: 
Create Date: 2026-08-14 22:47:00.051305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90184f5fb009'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create documents WITHOUT self-FK first so MySQL can unique-index doc_id,
    # then add the previous_doc_id foreign key.
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=255), nullable=False),
        sa.Column('doc_type', sa.String(length=50), nullable=False),
        sa.Column('ipfs_cid', sa.String(length=255), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('previous_doc_id', sa.String(length=36), nullable=True),
        sa.Column('encryption_key_reference', sa.String(length=255), nullable=False),
        sa.Column('uploaded_by', sa.String(length=255), nullable=False),
        sa.Column('tx_hash', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('doc_id', name='uq_documents_doc_id'),
    )
    op.create_index(op.f('ix_documents_case_id'), 'documents', ['case_id'], unique=False)
    op.create_index(op.f('ix_documents_doc_id'), 'documents', ['doc_id'], unique=True)
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_foreign_key(
        'fk_documents_previous_doc_id',
        'documents',
        'documents',
        ['previous_doc_id'],
        ['doc_id'],
    )

    op.create_table(
        'document_access',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.String(length=36), nullable=False),
        sa.Column('wallet_address', sa.String(length=255), nullable=False),
        sa.Column('granted_by', sa.String(length=255), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['doc_id'], ['documents.doc_id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_document_access_doc_id'), 'document_access', ['doc_id'], unique=False)
    op.create_index(op.f('ix_document_access_id'), 'document_access', ['id'], unique=False)
    op.create_index(op.f('ix_document_access_wallet_address'), 'document_access', ['wallet_address'], unique=False)

    op.create_table(
        'document_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('previous_doc_id', sa.String(length=36), nullable=True),
        sa.Column('ipfs_cid', sa.String(length=255), nullable=True),
        sa.Column('tx_hash', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['doc_id'], ['documents.doc_id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_document_versions_doc_id'), 'document_versions', ['doc_id'], unique=False)
    op.create_index(op.f('ix_document_versions_id'), 'document_versions', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_document_versions_id'), table_name='document_versions')
    op.drop_index(op.f('ix_document_versions_doc_id'), table_name='document_versions')
    op.drop_table('document_versions')
    op.drop_index(op.f('ix_document_access_wallet_address'), table_name='document_access')
    op.drop_index(op.f('ix_document_access_id'), table_name='document_access')
    op.drop_index(op.f('ix_document_access_doc_id'), table_name='document_access')
    op.drop_table('document_access')
    op.drop_constraint('fk_documents_previous_doc_id', 'documents', type_='foreignkey')
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_doc_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_case_id'), table_name='documents')
    op.drop_table('documents')
