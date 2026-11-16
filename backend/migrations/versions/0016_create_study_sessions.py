"""Create study sessions, questions, attempts and Weak Topics

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-16
"""

import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("difficulty", sa.String(length=10), nullable=False),
        sa.Column("question_count", sa.Integer(), nullable=False),
        sa.Column("topic_ids", sa.JSON(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('quiz', 'test')", name=op.f("ck_study_sessions_kind")
        ),
        sa.CheckConstraint(
            "status IN ('active', 'finished')", name=op.f("ck_study_sessions_status")
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_study_sessions_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["threads.id"],
            name=op.f("fk_study_sessions_thread_id_threads"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_study_sessions")),
    )
    op.create_index(op.f("ix_study_sessions_space_id"), "study_sessions", ["space_id"])

    op.create_table(
        "session_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("question_type", sa.String(length=20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("answer_key", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(length=10), nullable=False),
        sa.Column("source_chunk_id", sa.Uuid(), nullable=True),
        sa.Column("source", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "question_type IN ('multiple_choice', 'short_answer', 'essay')",
            name=op.f("ck_session_questions_question_type"),
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["study_sessions.id"],
            name=op.f("fk_session_questions_session_id_study_sessions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name=op.f("fk_session_questions_topic_id_topics"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_chunk_id"],
            ["chunks.id"],
            name=op.f("fk_session_questions_source_chunk_id_chunks"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_session_questions")),
        sa.UniqueConstraint("session_id", "position", name="uq_session_questions_pos"),
    )
    op.create_index(
        op.f("ix_session_questions_session_id"), "session_questions", ["session_id"]
    )

    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("score", sa.Numeric(4, 3), nullable=False),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("graded_by", sa.String(length=10), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["question_id"],
            ["session_questions.id"],
            name=op.f("fk_quiz_attempts_question_id_session_questions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_attempts")),
        sa.UniqueConstraint("question_id", name=op.f("uq_quiz_attempts_question_id")),
    )

    op.create_table(
        "weak_topics",
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("is_weak", sa.Boolean(), nullable=False),
        sa.Column("consecutive_correct", sa.Integer(), nullable=False),
        sa.Column("cleared_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["space_id"],
            ["spaces.id"],
            name=op.f("fk_weak_topics_space_id_spaces"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name=op.f("fk_weak_topics_topic_id_topics"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("space_id", "topic_id", name=op.f("pk_weak_topics")),
    )


def downgrade() -> None:
    op.drop_table("weak_topics")
    op.drop_table("quiz_attempts")
    op.drop_index(
        op.f("ix_session_questions_session_id"), table_name="session_questions"
    )
    op.drop_table("session_questions")
    op.drop_index(op.f("ix_study_sessions_space_id"), table_name="study_sessions")
    op.drop_table("study_sessions")
