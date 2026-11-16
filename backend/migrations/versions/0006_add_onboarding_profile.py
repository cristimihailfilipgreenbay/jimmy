"""Add the onboarding profile

Adds profiles (what the Student told Jimmy about themselves) and
students.onboarded_at. Existing Students have no onboarded_at, so they are sent
through onboarding the next time they open the app.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("course", sa.String(length=120), nullable=True),
        sa.Column("university", sa.String(length=120), nullable=True),
        sa.Column("year", sa.String(length=10), nullable=True),
        sa.Column(
            "goals",
            postgresql.ARRAY(sa.String(length=20)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "explanation_style",
            sa.String(length=20),
            server_default="balanced",
            nullable=False,
        ),
        sa.Column(
            "web_search_enabled", sa.Boolean(), server_default="true", nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            name=op.f("fk_profiles_student_id_students"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("student_id", name=op.f("pk_profiles")),
    )
    op.add_column(
        "students", sa.Column("onboarded_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("students", "onboarded_at")
    op.drop_table("profiles")
