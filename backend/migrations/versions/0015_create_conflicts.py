"""Create conflicts: the Student's decisions when Notes and another Source disagree

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conflicts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("topic", sa.String(length=200), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=True),
        sa.Column("notes_chunk_id", sa.Uuid(), nullable=False),
        sa.Column("other_chunk_id", sa.Uuid(), nullable=False),
        sa.Column("other_source_type", sa.String(length=10), nullable=False),
        sa.Column("decision", sa.String(length=12), nullable=False),
        sa.Column("notes_document", sa.String(length=300), nullable=False),
        sa.Column("other_document", sa.String(length=300), nullable=False),
        sa.Column("notes_excerpt", sa.Text(), nullable=False),
        sa.Column("other_excerpt", sa.Text(), nullable=False),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "decision IN ('keep_notes', 'accept_other', 'unsure')",
            name=op.f("ck_conflicts_decision"),
        ),
        sa.CheckConstraint(
            "other_source_type IN ('library', 'learned')",
            name=op.f("ck_conflicts_other"),
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_conflicts_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name=op.f("fk_conflicts_topic_id_topics"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["notes_chunk_id"],
            ["chunks.id"],
            name=op.f("fk_conflicts_notes_chunk_id_chunks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["other_chunk_id"],
            ["chunks.id"],
            name=op.f("fk_conflicts_other_chunk_id_chunks"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_conflicts")),
        sa.UniqueConstraint(
            "space_id", "notes_chunk_id", "other_chunk_id", name="uq_conflicts_pair"
        ),
    )
    op.create_index(op.f("ix_conflicts_space_id"), "conflicts", ["space_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_conflicts_space_id"), table_name="conflicts")
    op.drop_table("conflicts")
