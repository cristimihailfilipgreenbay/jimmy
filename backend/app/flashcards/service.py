"""Starting a batch of drafts and reading what is waiting."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chat.models import Thread
from app.errors import ApiError
from app.flashcards.models import Flashcard
from app.flashcards.runtime import get_flashcard_graph
from app.flashcards.schemas import CardOut, DraftBatchOut
from app.spaces.models import Space
from app.study.schemas import SourceOut
from app.study.service import topic_names
from app.study.sources import NoSource
from app.topics.models import Topic


def config(thread_id: uuid.UUID) -> dict:
    return {"configurable": {"thread_id": str(thread_id)}}


def pending_pause(thread_id: uuid.UUID):
    """The `flashcard_review` pause a batch waits on, or None."""
    state = get_flashcard_graph().get_state(config(thread_id))
    for task in state.tasks:
        for pause in task.interrupts:
            return pause
    return None


def card_out(card: Flashcard, topic: str) -> CardOut:
    return CardOut(
        id=card.id,
        topic_id=card.topic_id,
        topic=topic,
        front=card.front,
        back=card.back,
        status=card.status,
        was_edited=card.was_edited,
        source=SourceOut(**card.source),
        created_at=card.created_at,
    )


def cards_out(session: Session, cards: list[Flashcard]) -> list[CardOut]:
    names = topic_names(session, [c.topic_id for c in cards])
    return [card_out(c, names.get(c.topic_id, "")) for c in cards]


def space_topic_ids(session: Session, space: Space) -> list[uuid.UUID]:
    return list(
        session.scalars(
            select(Topic.id).where(
                Topic.space_id == space.id,
                Topic.merged_into_id.is_(None),
                Topic.status == "approved",
            )
        )
    )


def start_batch(
    session: Session,
    space: Space,
    topic_ids: list[uuid.UUID],
    count: int,
) -> DraftBatchOut:
    """Draft cards from the Space's sources and pause for the Student's review."""
    available = space_topic_ids(session, space)
    if not available:
        raise ApiError(
            409, "no_topics", "Upload Notes and review their Topics before drafting."
        )
    if topic_ids:
        if any(t not in available for t in topic_ids):
            raise ApiError(404, "topic_not_found", "That Topic does not exist.")
        chosen = list(dict.fromkeys(topic_ids))
    else:
        chosen = available
    thread = Thread(space_id=space.id, kind="flashcard_draft", title="Flashcards")
    session.add(thread)
    session.commit()
    try:
        get_flashcard_graph().invoke(
            {
                "space_id": str(space.id),
                "student_id": str(space.student_id),
                "thread_id": str(thread.id),
                "topic_ids": [str(t) for t in chosen],
                "count": count,
                "pending": [],
                "edits": [],
            },
            config(thread.id),
        )
    except NoSource as exc:
        session.delete(thread)
        session.commit()
        raise ApiError(409, "no_sources", str(exc)) from exc
    except Exception as exc:
        session.delete(thread)
        session.commit()
        raise ApiError(
            502,
            "upstream_unavailable",
            "Jimmy could not draft Flashcards. Try again in a moment.",
        ) from exc
    return batch_out(session, thread.id)


def batch_out(session: Session, thread_id: uuid.UUID) -> DraftBatchOut:
    pause = pending_pause(thread_id)
    order = list(pause.value["card_ids"]) if pause else []
    rows = {
        str(c.id): c
        for c in session.scalars(
            select(Flashcard).where(
                Flashcard.thread_id == thread_id, Flashcard.status == "draft"
            )
        )
    }
    cards = [rows[i] for i in order if i in rows]
    return DraftBatchOut(
        thread_id=thread_id,
        interrupt_id=pause.id if pause else "",
        cards=cards_out(session, cards),
    )
