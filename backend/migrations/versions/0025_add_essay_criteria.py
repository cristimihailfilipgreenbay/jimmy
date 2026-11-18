"""Keep how each rubric line of an Essay was met

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-18
"""

import sqlalchemy as sa
from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quiz_attempts", sa.Column("criteria", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("quiz_attempts", "criteria")
