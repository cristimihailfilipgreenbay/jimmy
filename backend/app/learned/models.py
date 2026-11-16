import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LearnedMaterial(Base):
    """A web Finding saved into a Study Space. Unreviewed until the Student approves it."""

    __tablename__ = "learned_material"
    __table_args__ = (
        CheckConstraint("status IN ('unreviewed', 'approved')", name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    # The site it came from, such as en.wikipedia.org.
    publisher: Mapped[str | None] = mapped_column(String(300))
    url: Mapped[str] = mapped_column(Text)
    # The start of the saved text, for the review list (the full text is in its chunk).
    excerpt: Mapped[str | None] = mapped_column(Text)
    # Why the Tutor decided to save it.
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="unreviewed")
    fetched_at: Mapped[str | None] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
