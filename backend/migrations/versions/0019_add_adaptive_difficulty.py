"""Add the adaptive difficulty setting to profiles

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column(
            "adaptive_difficulty",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("profiles", "adaptive_difficulty")
