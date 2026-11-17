"""Let a Student pause Weak Topic tracking

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column(
            "remember_weak_topics",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("profiles", "remember_weak_topics")
