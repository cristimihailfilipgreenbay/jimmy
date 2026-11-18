"""Let a Study Session ask only one kind of question

Revision ID: 0026
Revises: 0025
Create Date: 2026-11-18
"""

import sqlalchemy as sa
from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "study_sessions",
        sa.Column("format", sa.String(15), server_default="mixed", nullable=False),
    )
    op.create_check_constraint(
        "ck_study_sessions_format",
        "study_sessions",
        "format IN ('multiple_choice', 'short_answer', 'essay', 'mixed')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_study_sessions_format", "study_sessions", type_="check")
    op.drop_column("study_sessions", "format")
