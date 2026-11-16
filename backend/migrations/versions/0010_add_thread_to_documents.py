"""Add the ingestion thread to documents

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("thread_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        op.f("fk_documents_thread_id_threads"),
        "documents",
        "threads",
        ["thread_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_documents_thread_id_threads"), "documents", type_="foreignkey"
    )
    op.drop_column("documents", "thread_id")
