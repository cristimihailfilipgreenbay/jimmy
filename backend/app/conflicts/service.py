"""Stored Conflict decisions."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.conflicts.models import Conflict
from app.topics.models import Topic

DECISIONS = ("keep_notes", "accept_other", "unsure")
EXCERPT_CHARS = 400


def find_decision(
    session: Session, space_id: uuid.UUID, notes_chunk_id, other_chunk_id
) -> Conflict | None:
    return session.scalar(
        select(Conflict).where(
            Conflict.space_id == space_id,
            Conflict.notes_chunk_id == notes_chunk_id,
            Conflict.other_chunk_id == other_chunk_id,
        )
    )


def save_decision(
    session: Session,
    *,
    space_id: uuid.UUID,
    topic: str,
    notes_chunk_id,
    other_chunk_id,
    other_source_type: str,
    decision: str,
    notes_document: str,
    other_document: str,
    notes_excerpt: str,
    other_excerpt: str,
) -> Conflict:
    """Deciding the same pair again replaces the earlier decision."""
    topic_id = session.scalar(
        select(Topic.id).where(
            Topic.space_id == space_id,
            Topic.merged_into_id.is_(None),
            Topic.name.ilike(topic),
        )
    )
    row = find_decision(session, space_id, notes_chunk_id, other_chunk_id)
    if row is None:
        row = Conflict(
            space_id=space_id,
            notes_chunk_id=notes_chunk_id,
            other_chunk_id=other_chunk_id,
        )
        session.add(row)
    row.topic = topic
    row.topic_id = topic_id
    row.other_source_type = other_source_type
    row.decision = decision
    row.notes_document = notes_document[:300]
    row.other_document = other_document[:300]
    row.notes_excerpt = notes_excerpt[:EXCERPT_CHARS]
    row.other_excerpt = other_excerpt[:EXCERPT_CHARS]
    session.commit()
    return row
