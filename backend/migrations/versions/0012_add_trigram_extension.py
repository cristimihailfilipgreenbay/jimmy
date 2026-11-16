"""Enable pg_trgm for typo-tolerant search of Subject Library packs

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-16
"""

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
