"""Create topics

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "topics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("merged_into_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('proposed', 'approved')", name=op.f("ck_topics_status")
        ),
        sa.ForeignKeyConstraint(
            ["merged_into_id"],
            ["topics.id"],
            name=op.f("fk_topics_merged_into_id_topics"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_topics_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_topics")),
    )
    op.create_index(op.f("ix_topics_space_id"), "topics", ["space_id"])
    op.create_index(
        "uq_topics_space_id_lower_name",
        "topics",
        ["space_id", sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("merged_into_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_table("topics")
