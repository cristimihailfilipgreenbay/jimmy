"""The Ingestion graph: page-aware chunking -> embed -> store with `space_id`.

Text is extracted before the graph starts, so the Student gets a scanned, oversized
or unsupported file rejected straight away (docs/api.md). Topic extraction and the
Topic review pause are added to this graph by the Topics issue.
"""

import logging
import uuid
from collections.abc import Callable
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.chunks.models import Chunk
from app.config import get_settings
from app.db import engine
from app.documents.chunking import ChunkDraft, chunk_pages
from app.documents.extract import Page
from app.documents.models import Document

log = logging.getLogger(__name__)

Embedder = Callable[[list[str]], list[list[float]]]
SessionFactory = Callable[[], Session]


class IngestionState(TypedDict, total=False):
    document_id: uuid.UUID
    space_id: uuid.UUID
    pages: list[Page]
    chunks: list[ChunkDraft]
    vectors: list[list[float]]


def _set_status(
    factory: SessionFactory,
    document_id: uuid.UUID,
    status: str,
    reason: str | None = None,
) -> None:
    with factory() as session:
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=status, rejection_reason=reason)
        )
        session.commit()


def build_ingestion_graph(embed: Embedder, factory: SessionFactory):
    def chunk(state: IngestionState) -> IngestionState:
        chunks = chunk_pages(state["pages"])
        if not chunks:
            raise ValueError("The document has no text to index.")
        return {"chunks": chunks}

    def embed_node(state: IngestionState) -> IngestionState:
        _set_status(factory, state["document_id"], "embedding")
        return {"vectors": embed([c.text for c in state["chunks"]])}

    def store(state: IngestionState) -> IngestionState:
        model = get_settings().embedding_model
        with factory() as session:
            session.add_all(
                Chunk(
                    space_id=state["space_id"],
                    source_type="notes",
                    document_id=state["document_id"],
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
                for draft, vector in zip(state["chunks"], state["vectors"], strict=True)
            )
            # Chunks and the status change commit together: a document is "ready"
            # exactly when all of its chunks are stored.
            session.execute(
                update(Document)
                .where(Document.id == state["document_id"])
                .values(status="ready")
            )
            session.commit()
        return {}

    graph = StateGraph(IngestionState)
    graph.add_node("chunk", chunk)
    graph.add_node("embed", embed_node)
    graph.add_node("store", store)
    graph.add_edge(START, "chunk")
    graph.add_edge("chunk", "embed")
    graph.add_edge("embed", "store")
    graph.add_edge("store", END)
    return graph.compile()


def run_ingestion(
    document_id: uuid.UUID,
    space_id: uuid.UUID,
    pages: list[Page],
    embed: Embedder | None = None,
    factory: SessionFactory | None = None,
) -> None:
    """Runs in the background after the upload returns. Failures mark the document."""
    from app.documents.embeddings import embed_texts

    factory = factory or (lambda: Session(engine))
    graph = build_ingestion_graph(embed or embed_texts, factory)
    try:
        graph.invoke({"document_id": document_id, "space_id": space_id, "pages": pages})
    except Exception as exc:
        log.exception("Ingestion failed for document %s", document_id)
        _set_status(factory, document_id, "failed", str(exc)[:500])

