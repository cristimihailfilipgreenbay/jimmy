"""Remember which Topics were weak when a session finished

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "study_sessions",
        sa.Column(
            "weak_topic_ids",
            sa.JSON(),
            server_default="[]",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("study_sessions", "weak_topic_ids")
