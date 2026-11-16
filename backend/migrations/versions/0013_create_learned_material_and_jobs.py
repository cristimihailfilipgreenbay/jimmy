"""Create learned_material and jobs; let chunks belong to Learned Material

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learned_material",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("publisher", sa.String(length=300), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("fetched_at", sa.String(length=10), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('unreviewed', 'approved')",
            name=op.f("ck_learned_material_status"),
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_learned_material_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_learned_material")),
    )
    op.create_index(
        op.f("ix_learned_material_space_id"), "learned_material", ["space_id"]
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')",
            name=op.f("ck_jobs_status"),
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_jobs_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_jobs")),
    )
    op.create_index(op.f("ix_jobs_space_id"), "jobs", ["space_id"])

    op.add_column("chunks", sa.Column("learned_material_id", sa.Uuid(), nullable=True))
    op.alter_column("chunks", "document_id", nullable=True)
    op.create_foreign_key(
        op.f("fk_chunks_learned_material_id_learned_material"),
        "chunks",
        "learned_material",
        ["learned_material_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_chunks_learned_material_id"), "chunks", ["learned_material_id"]
    )
    op.drop_constraint(op.f("ck_chunks_source_type"), "chunks", type_="check")
    op.create_check_constraint(
        op.f("ck_chunks_source_type"),
        "chunks",
        "source_type IN ('notes', 'library', 'learned')",
    )
    op.create_check_constraint(
        op.f("ck_chunks_owner"),
        "chunks",
        "(source_type = 'learned' AND learned_material_id IS NOT NULL "
        "AND document_id IS NULL) OR "
        "(source_type <> 'learned' AND document_id IS NOT NULL "
        "AND learned_material_id IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_chunks_owner"), "chunks", type_="check")
    op.drop_constraint(op.f("ck_chunks_source_type"), "chunks", type_="check")
    op.execute("DELETE FROM chunks WHERE source_type = 'learned'")
    op.create_check_constraint(
        op.f("ck_chunks_source_type"), "chunks", "source_type IN ('notes', 'library')"
    )
    op.drop_index(op.f("ix_chunks_learned_material_id"), table_name="chunks")
    op.drop_constraint(
        op.f("fk_chunks_learned_material_id_learned_material"),
        "chunks",
        type_="foreignkey",
    )
    op.alter_column("chunks", "document_id", nullable=False)
    op.drop_column("chunks", "learned_material_id")
    op.drop_table("jobs")
    op.drop_table("learned_material")
