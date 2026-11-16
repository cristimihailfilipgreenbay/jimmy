"""Create students and spaces tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-16 13:11:21.139957
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.create_table(
        "students",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_students")),
        sa.UniqueConstraint("display_name", name=op.f("uq_students_display_name")),
    )
    op.create_table(
        "spaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("accent", sa.String(length=20), nullable=False),
        sa.Column(
            "library_enabled", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            name=op.f("fk_spaces_student_id_students"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_spaces")),
    )
    op.create_index(
        op.f("ix_spaces_student_id"), "spaces", ["student_id"], unique=False
    )
    op.create_index(
        "uq_spaces_student_id_lower_name",
        "spaces",
        ["student_id", sa.literal_column("lower(name)")],
        unique=True,
    )


def downgrade() -> None:

    op.drop_index("uq_spaces_student_id_lower_name", table_name="spaces")
    op.drop_index(op.f("ix_spaces_student_id"), table_name="spaces")
    op.drop_table("spaces")
    op.drop_table("students")
