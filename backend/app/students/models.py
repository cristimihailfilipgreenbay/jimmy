import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Empty until the Student says what to call them (onboarding).
    display_name: Mapped[str | None] = mapped_column(String(80))
    # Stored lower-cased, so one unique constraint is a case-insensitive check.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Set when the Student finishes onboarding; until then the app sends them there.
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @property
    def onboarded(self) -> bool:
        return self.onboarded_at is not None


class Profile(Base):
    """What a Student told Jimmy about themselves; shared across their Study Spaces."""

    __tablename__ = "profiles"

    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    course: Mapped[str | None] = mapped_column(String(120))
    university: Mapped[str | None] = mapped_column(String(120))
    year: Mapped[str | None] = mapped_column(String(10))
    goals: Mapped[list[str]] = mapped_column(
        ARRAY(String(20)), default=list, server_default="{}"
    )
    # How long answers should be: short, balanced or detailed.
    explanation_style: Mapped[str] = mapped_column(
        String(20), default="balanced", server_default="balanced"
    )
    # The language answers are written in; empty means the Student's own language.
    language: Mapped[str | None] = mapped_column(String(40))
    web_search_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    # Off: Weak Topics are neither updated nor used to pick questions. What is already
    # marked weak stays, and can still be cleared.
    remember_weak_topics: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    # Off: a Quiz or Test writes every question up front, at one difficulty, so answering
    # never waits. On: each question is written after the last answer and follows it.
    adaptive_difficulty: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
