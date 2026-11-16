import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Conflict(Base):
    """What the Student decided when their Notes and another Source disagreed."""

    __tablename__ = "conflicts"
    __table_args__ = (
        CheckConstraint(
            "decision IN ('keep_notes', 'accept_other', 'unsure')", name="decision"
        ),
        CheckConstraint("other_source_type IN ('library', 'learned')", name="other"),
        # One decision per pair of passages: deciding again replaces it.
        UniqueConstraint(
            "space_id", "notes_chunk_id", "other_chunk_id", name="uq_conflicts_pair"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), index=True
    )
    # The Topic the Tutor named, as the Student saw it; `topic_id` is set when the
    # Space has a Topic of that name.
    topic: Mapped[str] = mapped_column(String(200))
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL")
    )
    notes_chunk_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chunks.id", ondelete="CASCADE")
    )
    other_chunk_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chunks.id", ondelete="CASCADE")
    )
    other_source_type: Mapped[str] = mapped_column(String(10))
    decision: Mapped[str] = mapped_column(String(12))
    # What the two passages said, kept so the list reads on its own (and so nothing
    # outside app.chunks.retrieval has to query chunks).
    notes_document: Mapped[str] = mapped_column(String(300))
    other_document: Mapped[str] = mapped_column(String(300))
    notes_excerpt: Mapped[str] = mapped_column(Text)
    other_excerpt: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
