"""Let a Student rename a chat

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "threads", sa.Column("custom_title", sa.String(length=80), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("threads", "custom_title")
