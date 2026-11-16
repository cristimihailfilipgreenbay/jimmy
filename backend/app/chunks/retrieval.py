"""The one place that reads chunks (ADR 0001).

`space_id` is a required argument, and it is always part of the query, so one Study
Space cannot read another's Notes. No other module may query `Chunk`.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from app.chunks.models import Chunk
from app.documents.models import Document
from app.learned.models import LearnedMaterial

DEFAULT_SOURCES = ("notes", "library")
# Assessments (Quiz, Test, Flashcards) pass ("approved",): ADR 0002.
ANY_STATUS = ("unreviewed", "approved")


@dataclass(frozen=True)
class Hit:
    chunk_id: uuid.UUID
    document_id: uuid.UUID | None
    document_title: str
    document_author: str | None
    source_type: str
    # Learned Material only: where the page came from.
    url: str | None
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
    learned_status: tuple[str, ...] = ANY_STATUS,
) -> Select:
    if not isinstance(space_id, uuid.UUID):
        raise TypeError("space_id is required to search chunks")
    if limit < 1:
        raise ValueError("limit must be at least 1")
    distance = Chunk.embedding.cosine_distance(query_embedding).label("distance")
    # Both joins repeat the space_id check, so a chunk can never borrow another
    # Space's document or Learned Material.
    return (
        select(
            Chunk,
            func.coalesce(Document.title, LearnedMaterial.title),
            func.coalesce(Document.author, LearnedMaterial.publisher),
            LearnedMaterial.url,
            distance,
        )
        .outerjoin(
            Document,
            and_(Document.id == Chunk.document_id, Document.space_id == space_id),
        )
        .outerjoin(
            LearnedMaterial,
            and_(
                LearnedMaterial.id == Chunk.learned_material_id,
                LearnedMaterial.space_id == space_id,
            ),
        )
        .where(
            Chunk.space_id == space_id,
            Chunk.source_type.in_(source_types),
            or_(
                and_(
                    Document.id.is_not(None),
                    Document.enabled.is_(True),
                    Document.status == "ready",
                ),
                and_(
                    LearnedMaterial.id.is_not(None),
                    LearnedMaterial.status.in_(learned_status),
                ),
            ),
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
    learned_status: tuple[str, ...] = ANY_STATUS,
) -> list[Hit]:
    """The nearest chunks to `query_embedding` inside one Study Space."""
    query = build_query(space_id, query_embedding, limit, source_types, learned_status)
    return [
        Hit(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            document_title=title,
            document_author=author,
            source_type=chunk.source_type,
            url=url,
            text=chunk.text,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            section=chunk.section,
            distance=dist,
        )
        for chunk, title, author, url, dist in session.execute(query)
    ]
