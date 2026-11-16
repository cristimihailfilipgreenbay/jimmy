import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StudySession(Base):
    """One Quiz (a Test comes later). Its thread is the LangGraph thread."""

    __tablename__ = "study_sessions"
    __table_args__ = (
        CheckConstraint("kind IN ('quiz', 'test')", name="kind"),
        CheckConstraint("status IN ('active', 'finished')", name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), index=True
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("threads.id", ondelete="CASCADE")
    )
    kind: Mapped[str] = mapped_column(String(10), default="quiz")
    status: Mapped[str] = mapped_column(String(10), default="active")
    # The difficulty of the next question; it adapts to how the Student is doing.
    difficulty: Mapped[str] = mapped_column(String(10), default="medium")
    question_count: Mapped[int] = mapped_column(Integer)
    topic_ids: Mapped[list] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Correct answers, set when the session finishes.
    score: Mapped[int | None] = mapped_column(Integer)


class SessionQuestion(Base):
    __tablename__ = "session_questions"
    __table_args__ = (
        CheckConstraint(
            "question_type IN ('multiple_choice', 'short_answer', 'essay')",
            name="question_type",
        ),
        UniqueConstraint("session_id", "position", name="uq_session_questions_pos"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), index=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE")
    )
    position: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[str] = mapped_column(String(20))
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[list | None] = mapped_column(JSON)
    # An option number for multiple choice, a reference answer for a short answer.
    answer_key: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(10))
    source_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("chunks.id", ondelete="SET NULL")
    )
    # The passage the answer key comes from, as it was when asked, shown with the
    # answer. Kept here so nothing outside app.chunks.retrieval reads chunks.
    source: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("session_questions.id", ondelete="CASCADE"), unique=True
    )
    answer: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Numeric(4, 3))
    confidence: Mapped[float] = mapped_column(Numeric(4, 3))
    is_correct: Mapped[bool] = mapped_column(Boolean)
    graded_by: Mapped[str] = mapped_column(String(10), default="auto")
    # The grader's note on a written answer.
    explanation: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Dispute(Base):
    """The Student's decision on a grade the grader was unsure of. It overrides the
    attempt's grade; the automatic one is kept here."""

    __tablename__ = "disputes"
    __table_args__ = (
        CheckConstraint(
            "decision IN ('correct', 'incorrect', 'unsure')", name="decision"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"), unique=True
    )
    auto_score: Mapped[float] = mapped_column(Numeric(4, 3))
    auto_confidence: Mapped[float] = mapped_column(Numeric(4, 3))
    decision: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class WeakTopic(Base):
    """A cache of one Topic's state; `weak_state` can always recompute it."""

    __tablename__ = "weak_topics"

    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), primary_key=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True
    )
    is_weak: Mapped[bool] = mapped_column(Boolean, default=False)
    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0)
    # Answers before this moment no longer count: the Student cleared the Topic.
    cleared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
