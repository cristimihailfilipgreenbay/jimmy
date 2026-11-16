"""Make student display name optional

Sign-up asks only for email and password; the name is set during onboarding.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "students", "display_name", existing_type=sa.String(length=80), nullable=True
    )


def downgrade() -> None:
    # Fails if a Student has no name yet; give them one first.
    op.alter_column(
        "students", "display_name", existing_type=sa.String(length=80), nullable=False
    )
