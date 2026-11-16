import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Topic(Base):
    """A Topic in a Study Space: the unit of progress."""

    __tablename__ = "topics"
    __table_args__ = (
        CheckConstraint("status IN ('proposed', 'approved')", name="status"),
        # A merged Topic keeps its row (its history moves to the Topic it was merged
        # into), so only Topics that are still in use must have distinct names.
        Index(
            "uq_topics_space_id_lower_name",
            "space_id",
            text("lower(name)"),
            unique=True,
            postgresql_where=text("merged_into_id IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(10), default="approved")
    merged_into_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
