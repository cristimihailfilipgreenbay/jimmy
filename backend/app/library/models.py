import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LibraryPack(Base):
    """A Subject Library pack: an open textbook the Student can attach to a Study Space."""

    __tablename__ = "library_packs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    author: Mapped[str] = mapped_column(String(300))
    license: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(String(500))
    subject: Mapped[str] = mapped_column(String(80))
