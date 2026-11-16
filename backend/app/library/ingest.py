"""Index one Subject Library chapter into a Study Space.

Library chapters are trusted, already reviewed text, so they skip the Topic review
that Notes go through: chunk (page numbers are the book's own) -> embed -> store with
the Space's `space_id` and source type `library`.
"""

import logging
import uuid
from collections.abc import Callable
from pathlib import Path

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.chunks.models import Chunk
from app.config import get_settings
from app.db import engine
from app.documents.chunking import chunk_pages
from app.documents.extract import Page, extract
from app.documents.models import Document

log = logging.getLogger(__name__)


def book_pages(pages: list[Page], first_page: int) -> list[Page]:
    """Number a chapter file's pages with the book's page numbers."""
    return [Page(first_page + i, p.text) for i, p in enumerate(pages)]


def _set_status(factory, document_id: uuid.UUID, status: str, reason=None) -> None:
    with factory() as session:
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=status, rejection_reason=reason)
        )
        session.commit()


def ingest_library_document(
    document_id: uuid.UUID,
    space_id: uuid.UUID,
    path: Path,
    first_page: int,
    embed: Callable[[list[str]], list[list[float]]] | None = None,
    factory: Callable[[], Session] | None = None,
) -> None:
    """Runs in the background after a pack is attached. Failures mark the document."""
    factory = factory or (lambda: Session(engine))
    if embed is None:
        from app.documents.embeddings import embed_texts as embed
    try:
        _set_status(factory, document_id, "extracting")
        pages = book_pages(extract(path.name, path.read_bytes()).pages, first_page)
        drafts = chunk_pages(pages)
        if not drafts:
            raise ValueError("The chapter has no text to index.")
        _set_status(factory, document_id, "embedding")
        vectors = embed([d.text for d in drafts])
        model = get_settings().embedding_model
        with factory() as session:
            # A Student who detached the pack meanwhile deleted the document.
            if session.get(Document, document_id) is None:
                return
            session.add_all(
                Chunk(
                    space_id=space_id,
                    source_type="library",
                    document_id=document_id,
                    chunk_index=draft.index,
                    text=draft.text,
                    page_start=draft.page_start,
                    page_end=draft.page_end,
                    section=draft.section,
                    token_count=draft.token_count,
                    embedding=vector,
                    embedding_model=model,
                    embedding_dimensions=len(vector),
                )
                for draft, vector in zip(drafts, vectors, strict=True)
            )
            session.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(status="ready")
            )
            session.commit()
    except Exception as exc:
        log.exception("Library ingestion failed for document %s", document_id)
        _set_status(factory, document_id, "failed", str(exc)[:500])
