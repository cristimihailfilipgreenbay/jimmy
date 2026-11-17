"""Tutor settings per Student, and the model and tools behind each answer

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("tutor_model", sa.String(length=100), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("max_tokens", sa.Integer(), nullable=True),
        sa.Column("tools", sa.JSON(), nullable=False),
        sa.Column(
            "show_usage", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            name=op.f("fk_settings_student_id_students"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("student_id", name=op.f("pk_settings")),
    )
    op.add_column("messages", sa.Column("model", sa.String(length=100), nullable=True))
    op.add_column(
        "messages",
        sa.Column("tools", sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("messages", "tools")
    op.drop_column("messages", "model")
    op.drop_table("settings")
