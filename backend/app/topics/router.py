import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Response
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError

from app.chat.dependencies import ThreadDep
from app.db import SessionDep
from app.documents.ingestion import resume_ingestion
from app.documents.models import Document
from app.documents.schemas import DocumentOut
from app.errors import ApiError
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.topics.models import Topic
from app.topics.review import (
    Decision,
    Existing,
    InvalidReview,
    Proposed,
    clean_name,
    resolve_review,
)
from app.topics.schemas import (
    InterruptOut,
    ResumeIn,
    ThreadDetail,
    TopicMerge,
    TopicOut,
    TopicRename,
)

router = APIRouter(tags=["topics"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


def _in_use(space_id: uuid.UUID):
    return (Topic.space_id == space_id, Topic.merged_into_id.is_(None))


def _get_topic(session, space: Space, topic_id: uuid.UUID) -> Topic:
    topic = session.get(Topic, topic_id)
    if topic is None or topic.space_id != space.id or topic.merged_into_id:
        raise ApiError(404, "topic_not_found", "That Topic does not exist.")
    return topic


def _name_taken(session, space: Space, name: str, *, except_ids=()) -> bool:
    return (
        session.scalar(
            select(Topic.id).where(
                *_in_use(space.id),
                Topic.id.not_in(except_ids),
                func.lower(Topic.name) == name.lower(),
            )
        )
        is not None
    )


@router.get("/spaces/{space_id}/topics", response_model=list[TopicOut])
def list_topics(space: SpaceDep, session: SessionDep):
    return session.scalars(select(Topic).where(*_in_use(space.id)).order_by(Topic.name))


@router.patch("/spaces/{space_id}/topics/{topic_id}", response_model=TopicOut)
def rename_topic(
    topic_id: uuid.UUID, body: TopicRename, space: SpaceDep, session: SessionDep
):
    topic = _get_topic(session, space, topic_id)
    name = clean_name(body.name)
    if not name:
        raise ApiError(422, "invalid_name", "A Topic needs a name.")
    if _name_taken(session, space, name, except_ids=[topic.id]):
        raise ApiError(
            409, "topic_exists", "This Space already has a Topic with that name."
        )
    topic.name = name
    session.commit()
    session.refresh(topic)
    return topic


@router.delete("/spaces/{space_id}/topics/{topic_id}", status_code=204)
def delete_topic(topic_id: uuid.UUID, space: SpaceDep, session: SessionDep):
    """Delete a Topic, and the Topics that were merged into it (they would otherwise
    come back as separate Topics)."""
    topic = _get_topic(session, space, topic_id)
    session.execute(delete(Topic).where(Topic.merged_into_id == topic.id))
    session.delete(topic)
    session.commit()
    return Response(status_code=204)


@router.post("/spaces/{space_id}/topics/merge", response_model=TopicOut)
def merge_topics(body: TopicMerge, space: SpaceDep, session: SessionDep):
    """Merge several Topics into the first one, which takes the new name."""
    ids = list(dict.fromkeys(body.ids))
    if len(ids) < 2:
        raise ApiError(422, "invalid_merge", "Pick at least two different Topics.")
    topics = [_get_topic(session, space, i) for i in ids]
    name = clean_name(body.name)
    if not name:
        raise ApiError(422, "invalid_name", "A Topic needs a name.")
    if _name_taken(session, space, name, except_ids=ids):
        raise ApiError(
            409, "topic_exists", "This Space already has a Topic with that name."
        )
    target = topics[0]
    # Free the name first: merged rows are outside the unique index.
    session.execute(
        update(Topic).where(Topic.id.in_(ids[1:])).values(merged_into_id=target.id)
    )
    target.name = name
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise ApiError(
            409, "topic_exists", "This Space already has a Topic with that name."
        )
    session.refresh(target)
    return target


# --- Pauses -----------------------------------------------------------------
# Every pause is answered at /threads/{id}/resume. Today the only one a run can wait on
# is the Topic review of an ingestion thread; later pauses are added here by kind.


def _graph():
    from app.checkpointer import get_checkpointer
    from app.documents.ingestion import build_ingestion_graph

    # Only reading state, so no model or embedder is needed.
    return build_ingestion_graph(
        lambda texts: [],
        lambda: None,
        lambda texts: [],
        get_checkpointer(),  # type: ignore[arg-type]
    )


def _pending(thread_id: uuid.UUID) -> InterruptOut | None:
    state = _graph().get_state({"configurable": {"thread_id": str(thread_id)}})
    for task in state.tasks:
        for pause in task.interrupts:
            payload = dict(pause.value)
            return InterruptOut(
                interrupt_id=pause.id, kind=payload.pop("kind"), payload=payload
            )
    return None


@router.get("/threads/{thread_id}", response_model=ThreadDetail)
def get_thread(thread: ThreadDep):
    """Metadata and the pause the run is waiting on, if any."""
    pending = _pending(thread.id) if thread.kind == "ingestion" else None
    return ThreadDetail(
        id=thread.id,
        space_id=thread.space_id,
        kind=thread.kind,
        title=thread.title,
        created_at=thread.created_at,
        interrupt=pending,
    )


@router.post("/threads/{thread_id}/resume", response_model=DocumentOut, status_code=202)
def resume_thread(
    body: ResumeIn, thread: ThreadDep, session: SessionDep, background: BackgroundTasks
):
    """Answer the Topic review. Checks the answer, then finishes indexing in the background."""
    pending = _pending(thread.id) if thread.kind == "ingestion" else None
    if pending is None or pending.interrupt_id != body.interrupt_id:
        raise ApiError(409, "nothing_to_resume", "There is nothing to answer here.")
    document = session.scalar(select(Document).where(Document.thread_id == thread.id))
    if document is None:
        raise ApiError(409, "nothing_to_resume", "There is nothing to answer here.")
    try:
        names = resolve_review(
            [Proposed(p["id"], p["name"]) for p in pending.payload["proposed"]],
            [Existing(e["id"], e["name"]) for e in pending.payload["existing"]],
            [Decision(d.id, d.action, d.name, d.into) for d in body.decision],
        )
    except InvalidReview as exc:
        raise ApiError(422, "invalid_topic_review", str(exc))
    document.status = "embedding"
    session.commit()
    session.refresh(document)
    background.add_task(resume_ingestion, document.id, thread.id, names)
    return document


__all__ = ["router"]
