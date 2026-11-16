"""Create disputes

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "disputes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("auto_score", sa.Numeric(4, 3), nullable=False),
        sa.Column("auto_confidence", sa.Numeric(4, 3), nullable=False),
        sa.Column("decision", sa.String(length=10), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "decision IN ('correct', 'incorrect', 'unsure')",
            name=op.f("ck_disputes_decision"),
        ),
        sa.ForeignKeyConstraint(
            ["attempt_id"],
            ["quiz_attempts.id"],
            name=op.f("fk_disputes_attempt_id_quiz_attempts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_disputes")),
        sa.UniqueConstraint("attempt_id", name=op.f("uq_disputes_attempt_id")),
    )


def downgrade() -> None:
    op.drop_table("disputes")
