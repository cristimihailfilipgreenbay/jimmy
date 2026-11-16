"""The one place that reads chunks (ADR 0001).

`space_id` is a required argument, and it is always part of the query, so one Study
Space cannot read another's Notes. No other module may query `Chunk`.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import Select, func, literal, select, text
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


# Typos: pg_trgm's word_similarity must reach this (0 to 1) for a passage to match
# without sharing a stemmed word with the query. Lower finds more misspellings.
TYPO_THRESHOLD = 0.4


@dataclass(frozen=True)
class KeywordHit:
    chunk_id: uuid.UUID
    document_title: str
    document_author: str | None
    source_type: str
    text: str
    page_start: int | None
    page_end: int | None
    section: str | None
    score: float


def build_keyword_query(
    space_id: uuid.UUID,
    query: str,
    limit: int = 10,
    source_types: tuple[str, ...] = DEFAULT_SOURCES,
) -> Select:
    """Full-text match (stemmed words) or trigram match (typos), best first."""
    if not isinstance(space_id, uuid.UUID):
        raise TypeError("space_id is required to search chunks")
    if limit < 1:
        raise ValueError("limit must be at least 1")
    tsvector = func.to_tsvector("english", Chunk.text)
    tsquery = func.websearch_to_tsquery("english", query)
    similarity = func.word_similarity(query, Chunk.text)
    # ts_rank_cd rewards the words being close together; similarity rewards a near
    # spelling. Adding them lets either signal find a passage.
    score = (func.ts_rank_cd(tsvector, tsquery) + similarity).label("score")
    return (
        select(Chunk, Document.title, Document.author, score)
        .join(Document, Document.id == Chunk.document_id)
        .where(
            Chunk.space_id == space_id,
            Document.space_id == space_id,
            Document.enabled.is_(True),
            Document.status == "ready",
            Chunk.source_type.in_(source_types),
            tsvector.op("@@")(tsquery) | literal(query).op("<%")(Chunk.text),
        )
        .order_by(score.desc())
        .limit(limit)
    )


def keyword_search_chunks(
    session: Session,
    *,
    space_id: uuid.UUID,
    query: str,
    limit: int = 10,
    source_types: tuple[str, ...] = DEFAULT_SOURCES,
) -> list[KeywordHit]:
    """Chunks of one Study Space that match the words of `query`, typos allowed."""
    statement = build_keyword_query(space_id, query, limit, source_types)
    # Applies to this transaction only; the `<%` operator reads it.
    session.execute(
        text(f"SET LOCAL pg_trgm.word_similarity_threshold = {TYPO_THRESHOLD}")
    )
    return [
        KeywordHit(
            chunk_id=chunk.id,
            document_title=title,
            document_author=author,
            source_type=chunk.source_type,
            text=chunk.text,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            section=chunk.section,
            score=float(score),
        )
        for chunk, title, author, score in session.execute(statement)
    ]
