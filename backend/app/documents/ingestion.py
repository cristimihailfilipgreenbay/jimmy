"""The Ingestion graph: page-aware chunking -> extract Topics -> Topic review pause ->
embed -> store with `space_id`.

Text is extracted before the graph starts, so the Student gets a scanned, oversized
or unsupported file rejected straight away (docs/api.md). The graph pauses with
`interrupt()` after proposing Topics; the run waits in the Postgres checkpointer until
the Student answers (`POST /threads/{id}/resume`).

State holds only plain data (dicts, strings), because it is saved to the checkpointer.
"""

import logging
import uuid
from collections.abc import Callable
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.chunks.models import Chunk
from app.config import get_settings
from app.db import engine
from app.documents.chunking import ChunkDraft, chunk_pages
from app.documents.extract import Page
from app.documents.models import Document
from app.topics.models import Topic
from app.topics.review import clean_name

log = logging.getLogger(__name__)

Embedder = Callable[[list[str]], list[list[float]]]
SessionFactory = Callable[[], Session]
TopicProposer = Callable[[list[str]], list[str]]


class IngestionState(TypedDict, total=False):
    document_id: str
    space_id: str
    pages: list[dict]
    chunks: list[dict]
    # The Topic review: what was proposed, what the Space already has, what was kept.
    proposed: list[dict]
    existing: list[dict]
    topic_names: list[str]
    vectors: list[list[float]]


def _set_status(
    factory: SessionFactory,
    document_id: uuid.UUID | str,
    status: str,
    reason: str | None = None,
) -> None:
    with factory() as session:
        session.execute(
            update(Document)
            .where(Document.id == uuid.UUID(str(document_id)))
            .values(status=status, rejection_reason=reason)
        )
        session.commit()


def _to_draft(data: dict) -> ChunkDraft:
    return ChunkDraft(**data)


def _to_dict(draft: ChunkDraft) -> dict:
    return {
        "index": draft.index,
        "text": draft.text,
        "page_start": draft.page_start,
        "page_end": draft.page_end,
        "section": draft.section,
        "token_count": draft.token_count,
    }


def build_ingestion_graph(
    embed: Embedder,
    factory: SessionFactory,
    propose: TopicProposer,
    checkpointer,
):
    def chunk(state: IngestionState) -> IngestionState:
        _set_status(factory, state["document_id"], "extracting")
        pages = [Page(number=p["number"], text=p["text"]) for p in state["pages"]]
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError("The document has no text to index.")
        return {"chunks": [_to_dict(c) for c in chunks]}

    def extract_topics(state: IngestionState) -> IngestionState:
        space_id = uuid.UUID(state["space_id"])
        with factory() as session:
            existing = [
                {"id": str(t.id), "name": t.name}
                for t in session.scalars(
                    select(Topic)
                    .where(Topic.space_id == space_id, Topic.merged_into_id.is_(None))
                    .order_by(Topic.name)
                )
            ]
        by_name = {e["name"].casefold(): e["id"] for e in existing}
        names = propose([c["text"] for c in state["chunks"]])
        proposed = [
            {
                "id": f"p{i}",
                "name": name,
                # A Topic the Space already has is proposed as a merge into it.
                "existing_id": by_name.get(name.casefold()),
            }
            for i, name in enumerate(names, start=1)
        ]
        _set_status(factory, state["document_id"], "awaiting_topic_review")
        return {"proposed": proposed, "existing": existing}

    def topic_review(state: IngestionState) -> IngestionState:
        # Everything before interrupt() runs again on resume, so this node does
        # nothing else. The answer is the final list of names, already checked.
        answer = interrupt(
            {
                "kind": "topic_review",
                "document_id": state["document_id"],
                "proposed": state["proposed"],
                "existing": state["existing"],
            }
        )
        return {"topic_names": answer["names"]}

    def save_topics(state: IngestionState) -> IngestionState:
        space_id = uuid.UUID(state["space_id"])
        with factory() as session:
            have = {
                name.casefold()
                for name in session.scalars(
                    select(Topic.name).where(
                        Topic.space_id == space_id, Topic.merged_into_id.is_(None)
                    )
                )
            }
            for name in state["topic_names"]:
                name = clean_name(name)
                if name and name.casefold() not in have:
                    have.add(name.casefold())
                    session.add(Topic(space_id=space_id, name=name, status="approved"))
            session.commit()
        return {}

    def embed_node(state: IngestionState) -> IngestionState:
        _set_status(factory, state["document_id"], "embedding")
        return {"vectors": embed([c["text"] for c in state["chunks"]])}

    def store(state: IngestionState) -> IngestionState:
        model = get_settings().embedding_model
        document_id = uuid.UUID(state["document_id"])
        with factory() as session:
            session.add_all(
                Chunk(
                    space_id=uuid.UUID(state["space_id"]),
                    source_type="notes",
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
                for draft, vector in zip(
                    (_to_draft(c) for c in state["chunks"]),
                    state["vectors"],
                    strict=True,
                )
            )
            # Chunks and the status change commit together: a document is "ready"
            # exactly when all of its chunks are stored.
            session.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(status="ready")
            )
            session.commit()
        return {}

    graph = StateGraph(IngestionState)
    graph.add_node("chunk", chunk)
    graph.add_node("extract_topics", extract_topics)
    graph.add_node("topic_review", topic_review)
    graph.add_node("save_topics", save_topics)
    graph.add_node("embed", embed_node)
    graph.add_node("store", store)
    graph.add_edge(START, "chunk")
    graph.add_edge("chunk", "extract_topics")
    graph.add_edge("extract_topics", "topic_review")
    graph.add_edge("topic_review", "save_topics")
    graph.add_edge("save_topics", "embed")
    graph.add_edge("embed", "store")
    graph.add_edge("store", END)
    return graph.compile(checkpointer=checkpointer)


def _real_graph(factory: SessionFactory):
    from app.checkpointer import get_checkpointer
    from app.documents.embeddings import embed_texts
    from app.topics.extract import propose_topics

    return build_ingestion_graph(
        embed_texts, factory, propose_topics, get_checkpointer()
    )


def _run(graph, factory: SessionFactory, document_id: uuid.UUID, payload, thread_id):
    """Run until the graph ends or pauses. Failures mark the document."""
    try:
        graph.invoke(payload, {"configurable": {"thread_id": str(thread_id)}})
    except Exception as exc:
        log.exception("Ingestion failed for document %s", document_id)
        _set_status(factory, document_id, "failed", str(exc)[:500])


def run_ingestion(
    document_id: uuid.UUID,
    space_id: uuid.UUID,
    pages: list[Page],
    thread_id: uuid.UUID,
    graph=None,
    factory: SessionFactory | None = None,
) -> None:
    """Runs in the background after the upload returns, up to the Topic review pause."""
    factory = factory or (lambda: Session(engine))
    graph = graph or _real_graph(factory)
    state: IngestionState = {
        "document_id": str(document_id),
        "space_id": str(space_id),
        "pages": [{"number": p.number, "text": p.text} for p in pages],
    }
    _run(graph, factory, document_id, state, thread_id)


def resume_ingestion(
    document_id: uuid.UUID,
    thread_id: uuid.UUID,
    names: list[str],
    graph=None,
    factory: SessionFactory | None = None,
) -> None:
    """Continue after the Student's Topic review: save the Topics, embed, store."""
    factory = factory or (lambda: Session(engine))
    graph = graph or _real_graph(factory)
    _run(graph, factory, document_id, Command(resume={"names": names}), thread_id)
