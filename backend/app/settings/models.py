import uuid

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Settings(Base):
    """How the Tutor runs for one Student. An empty value means the default."""

    __tablename__ = "settings"

    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    tutor_model: Mapped[str | None] = mapped_column(String(100))
    background_model: Mapped[str | None] = mapped_column(String(100))
    temperature: Mapped[float | None] = mapped_column(Float)
    max_tokens: Mapped[int | None] = mapped_column(Integer)
    # Tool name -> on or off. A tool that is not here is on.
    tools: Mapped[dict] = mapped_column(JSON, default=dict)
    # Show tokens and estimated cost under each answer.
    show_usage: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
