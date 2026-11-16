import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ProfileFact(Base):
    """Something Jimmy remembers about the Student: a fact, or a style preference.

    Only an approved one shapes later work; a proposed one waits for the Student."""

    __tablename__ = "profile_facts"
    __table_args__ = (
        CheckConstraint("kind IN ('fact', 'style')", name="kind"),
        CheckConstraint("status IN ('proposed', 'approved')", name="status"),
        CheckConstraint(
            "origin IN ('student', 'feedback', 'flashcard_edits')", name="origin"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10), default="style")
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10), default="proposed")
    origin: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
