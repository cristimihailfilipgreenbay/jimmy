"""Add email and password to students

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Profiles made with the old profile switcher have no email or password and
    # cannot sign in. Fail clearly instead of with a NOT NULL error.
    if op.get_bind().execute(sa.text("SELECT EXISTS (SELECT 1 FROM students)")).scalar():
        raise RuntimeError(
            "students has rows from before sign-in existed. "
            "Reset the development database: docker compose down -v"
        )
    op.add_column("students", sa.Column("email", sa.String(length=254), nullable=False))
    op.add_column("students", sa.Column("password_hash", sa.String(length=255), nullable=False))
    op.drop_constraint(op.f("uq_students_display_name"), "students", type_="unique")
    op.create_unique_constraint(op.f("uq_students_email"), "students", ["email"])


def downgrade() -> None:
    op.drop_constraint(op.f("uq_students_email"), "students", type_="unique")
    op.create_unique_constraint(op.f("uq_students_display_name"), "students", ["display_name"])
    op.drop_column("students", "password_hash")
    op.drop_column("students", "email")
