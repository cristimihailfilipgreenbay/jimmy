import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Feedback(Base):
    """A 👍/👎 on one of Jimmy's answers. One per answer: a new rating replaces it."""

    __tablename__ = "feedback"
    __table_args__ = (CheckConstraint("rating IN ('up', 'down')", name="rating"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), unique=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    rating: Mapped[str] = mapped_column(String(4))
    # Why a 👎 was given: one of the reasons the chat offers, or the Student's own words.
    comment: Mapped[str | None] = mapped_column(Text)
    # When this rating was sent to LangSmith; empty if tracing is off or the send failed.
    synced_to_langsmith_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # When this rating was counted in a proposed style change, so it is counted once.
    proposed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
