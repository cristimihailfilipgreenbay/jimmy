import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Thread(Base):
    """A conversation in a Study Space. Its id is also the LangGraph thread id."""

    __tablename__ = "threads"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('chat', 'session', 'ingestion', 'flashcard_draft')", name="kind"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20), default="chat")
    title: Mapped[str] = mapped_column(String(200), default="New conversation")
    # A name the Student chose; empty means the title (the first question) is used.
    custom_title: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Message(Base):
    """What the Student sees in the chat, with its Citations and token counts."""

    __tablename__ = "messages"
    __table_args__ = (CheckConstraint("role IN ('user', 'assistant')", name="role"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("threads.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    tokens_in: Mapped[int | None] = mapped_column(Integer)
    tokens_out: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[float | None] = mapped_column(Numeric(12, 6))
    trace_id: Mapped[str | None] = mapped_column(String(64))
    # The model that wrote the answer and the tools it called, for the usage table.
    model: Mapped[str | None] = mapped_column(String(100))
    tools: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
