"""Add course to spaces

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("spaces", sa.Column("course", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("spaces", "course")
