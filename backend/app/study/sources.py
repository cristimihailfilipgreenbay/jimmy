"""Finding the passage a question is written from.

Goes through `search_chunks`, the one function that reads chunks (ADR 0001). Only Notes,
the Subject Library and *approved* Learned Material qualify (ADR 0002); Tutor Knowledge and
web Findings never do.
"""

import random
import uuid
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.chat.citations import page_or_section
from app.chunks.retrieval import search_chunks
from app.documents.embeddings import embed_texts
from app.guardrails.classify import scan_passages

ASSESSMENT_SOURCES = ("notes", "library", "learned")
POOL = 8
CHOICES = 4

# (session, space_id, topic name, chunk ids to avoid) -> a passage with its Citation fields
PassageFinder = Callable[[Session, uuid.UUID, str, set[uuid.UUID]], dict]


class NoSource(Exception):
    """The Study Space has nothing to write a question from."""


def find_passage(
    session: Session,
    space_id: uuid.UUID,
    topic: str,
    avoid: set[uuid.UUID],
    rng: random.Random | None = None,
) -> dict:
    rng = rng or random.Random()
    [vector] = embed_texts([topic])
    hits = search_chunks(
        session,
        space_id=space_id,
        query_embedding=vector,
        limit=POOL,
        source_types=ASSESSMENT_SOURCES,
        learned_status=("approved",),
    )
    if not hits:
        raise NoSource("There is nothing to write questions from yet.")
    # Prefer a passage this session has not used; take one of the closest at random.
    fresh = [h for h in hits if h.chunk_id not in avoid] or hits
    candidates = fresh[:CHOICES]
    rng.shuffle(candidates)
    # The Student's own Notes are scanned, as in the chat; a flagged passage is skipped.
    notes = [h.text for h in candidates if h.source_type == "notes"]
    flagged = scan_passages(notes) if notes else set()
    flagged_texts = {notes[i] for i in flagged}
    for hit in candidates:
        if hit.text in flagged_texts:
            continue
        return {
            "chunk_id": str(hit.chunk_id),
            "source_type": hit.source_type,
            "document": hit.document_title,
            "author": hit.document_author,
            "page_or_section": page_or_section(
                hit.page_start, hit.page_end, hit.section
            ),
            "passage": hit.text,
            "url": hit.url,
        }
    raise NoSource("The passages found could not be used.")
