"""Add document_hash and key_version to documents

Revision ID: a1b2c3d4e5f6
Revises: f30880e79d1c
Create Date: 2026-08-16 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f30880e79d1c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("document_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("key_version", sa.Integer(), server_default="3", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("documents", "key_version")
    op.drop_column("documents", "document_hash")
