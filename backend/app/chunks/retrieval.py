"""The one place that reads chunks (ADR 0001).

`space_id` is a required argument, and it is always part of the query, so one Study
Space cannot read another's Notes. No other module may query `Chunk`.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.chunks.models import Chunk
from app.documents.models import Document

DEFAULT_SOURCES = ("notes", "library")


@dataclass(frozen=True)
class Hit:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    document_author: str | None
    source_type: str
    text: str
    page_start: int | None
    page_end: int | None
    section: str | None
    distance: float


def build_query(
    space_id: uuid.UUID,
    query_embedding: list[float],
    limit: int = 5,
    source_types: tuple[str, ...] = DEFAULT_SOURCES,
) -> Select:
    if not isinstance(space_id, uuid.UUID):
        raise TypeError("space_id is required to search chunks")
    if limit < 1:
        raise ValueError("limit must be at least 1")
    distance = Chunk.embedding.cosine_distance(query_embedding).label("distance")
    return (
        select(Chunk, Document.title, Document.author, distance)
        .join(Document, Document.id == Chunk.document_id)
        .where(
            Chunk.space_id == space_id,
            Document.space_id == space_id,
            Document.enabled.is_(True),
            Document.status == "ready",
            Chunk.source_type.in_(source_types),
        )
        .order_by(distance)
        .limit(limit)
    )


def search_chunks(
    session: Session,
    *,
    space_id: uuid.UUID,
    query_embedding: list[float],
    limit: int = 5,
    source_types: tuple[str, ...] = DEFAULT_SOURCES,
) -> list[Hit]:
    """The nearest chunks to `query_embedding` inside one Study Space."""
    query = build_query(space_id, query_embedding, limit, source_types)
    return [
        Hit(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            document_title=title,
            document_author=author,
            source_type=chunk.source_type,
            text=chunk.text,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            section=chunk.section,
            distance=dist,
        )
        for chunk, title, author, dist in session.execute(query)
    ]
