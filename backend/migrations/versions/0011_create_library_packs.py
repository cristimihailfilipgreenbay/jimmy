"""Create library_packs and link library documents to their pack

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "library_packs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("author", sa.String(length=300), nullable=False),
        sa.Column("license", sa.String(length=200), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.Column("subject", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_library_packs")),
        sa.UniqueConstraint("slug", name=op.f("uq_library_packs_slug")),
    )
    op.add_column("documents", sa.Column("pack_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        op.f("fk_documents_pack_id_library_packs"),
        "documents",
        "library_packs",
        ["pack_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_documents_pack_id"), "documents", ["pack_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_pack_id"), table_name="documents")
    op.drop_constraint(
        op.f("fk_documents_pack_id_library_packs"), "documents", type_="foreignkey"
    )
    op.drop_column("documents", "pack_id")
    op.drop_table("library_packs")
