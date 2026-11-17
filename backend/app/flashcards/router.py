import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from langgraph.types import Command
from pydantic import ValidationError
from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session

from app.chat.models import Thread
from app.db import SessionDep
from app.errors import ApiError
from app.flashcards.cards import MAX_BACK, MAX_FRONT
from app.flashcards.models import Flashcard
from app.flashcards.runtime import get_flashcard_graph
from app.flashcards.schemas import (
    DeckPage,
    DraftBatchOut,
    DraftIn,
    DraftOut,
    FlashcardDecision,
    ReviewOut,
    StyleProposalOut,
)
from app.flashcards.service import (
    card_out,
    cards_out,
    config,
    pending_pause,
    start_batch,
)
from app.pagination import (
    CursorPage,
    CursorQuery,
    LimitQuery,
    decode_cursor,
    encode_cursor,
)
from app.profile.models import ProfileFact
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.study.service import topic_names
from app.topics.models import Topic

router = APIRouter(tags=["flashcards"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


@router.post(
    "/spaces/{space_id}/flashcards/drafts",
    response_model=DraftBatchOut,
    status_code=201,
)
def draft_flashcards(body: DraftIn, space: SpaceDep, session: SessionDep):
    """Draft cards from the Space's sources. They wait for the Student's review."""
    return start_batch(session, space, body.topic_ids, body.count)


def _after(cursor: str | None):
    """The keyset condition for the rows after a cursor, oldest first."""
    if not cursor:
        return ()
    created, card_id = decode_cursor(cursor, 2)
    try:
        key = (datetime.fromisoformat(created), uuid.UUID(card_id))
    except ValueError as exc:
        raise ApiError(422, "invalid_cursor", "That page link is not valid.") from exc
    return (tuple_(Flashcard.created_at, Flashcard.id) > tuple_(*key),)


def _next_cursor(rows: list[Flashcard], limit: int) -> str | None:
    if len(rows) <= limit:
        return None
    last = rows[limit - 1]
    return encode_cursor(last.created_at.isoformat(), str(last.id))


@router.get("/spaces/{space_id}/flashcards/drafts", response_model=CursorPage[DraftOut])
def list_drafts(
    space: SpaceDep,
    session: SessionDep,
    limit: LimitQuery = 10,
    cursor: CursorQuery = None,
):
    """Drafts still waiting for the Student, oldest first, ten at a time."""
    mine = (Flashcard.space_id == space.id, Flashcard.status == "draft")
    rows = list(
        session.scalars(
            select(Flashcard)
            .where(*mine, *_after(cursor))
            .order_by(Flashcard.created_at, Flashcard.id)
            .limit(limit + 1)
        )
    )
    page = rows[:limit]
    # The pause each card waits on. A card whose run is not waiting any more has
    # nothing the Student can decide, so it is left out of the page.
    pauses = {}
    for thread_id in {c.thread_id for c in page if c.thread_id}:
        pause = pending_pause(thread_id)
        if pause:
            pauses[thread_id] = (pause.id, set(pause.value["card_ids"]))
    names = topic_names(session, [c.topic_id for c in page])
    items = [
        DraftOut(
            **card_out(c, names.get(c.topic_id, "")).model_dump(),
            thread_id=c.thread_id,
            interrupt_id=pauses[c.thread_id][0],
        )
        for c in page
        if c.thread_id in pauses and str(c.id) in pauses[c.thread_id][1]
    ]
    total = session.scalar(select(func.count()).select_from(Flashcard).where(*mine))
    return CursorPage(items=items, next_cursor=_next_cursor(rows, limit), total=total)


@router.get("/spaces/{space_id}/flashcards", response_model=DeckPage)
def list_flashcards(
    space: SpaceDep,
    session: SessionDep,
    limit: LimitQuery = 30,
    cursor: CursorQuery = None,
    topic_id: uuid.UUID | None = None,
):
    """The deck: approved cards, oldest first, thirty at a time."""
    mine = (Flashcard.space_id == space.id, Flashcard.status == "approved")
    chosen = mine + ((Flashcard.topic_id == topic_id,) if topic_id else ())
    rows = list(
        session.scalars(
            select(Flashcard)
            .where(*chosen, *_after(cursor))
            .order_by(Flashcard.created_at, Flashcard.id)
            .limit(limit + 1)
        )
    )
    topics = session.execute(
        select(Topic.id, Topic.name)
        .join(Flashcard, Flashcard.topic_id == Topic.id)
        .where(*mine)
        .distinct()
        .order_by(Topic.name)
    ).all()
    return DeckPage(
        items=cards_out(session, rows[:limit]),
        next_cursor=_next_cursor(rows, limit),
        total=session.scalar(
            select(func.count()).select_from(Flashcard).where(*chosen)
        ),
        total_all=session.scalar(
            select(func.count()).select_from(Flashcard).where(*mine)
        ),
        topics=[{"id": i, "name": n} for i, n in topics],
    )


@router.delete("/spaces/{space_id}/flashcards/{card_id}", status_code=204)
def delete_flashcard(space: SpaceDep, card_id: uuid.UUID, session: SessionDep):
    card = session.get(Flashcard, card_id)
    if card is None or card.space_id != space.id:
        raise ApiError(404, "flashcard_not_found", "That Flashcard does not exist.")
    session.delete(card)
    session.commit()
    return Response(status_code=204)


def _decisions(raw: list, pending: list[str]) -> list[dict]:
    """The decisions checked against the cards the run waits on."""
    try:
        decisions = [FlashcardDecision.model_validate(d.model_dump()) for d in raw]
    except ValidationError as exc:
        raise ApiError(422, "invalid_flashcard_review", "Check each card.") from exc
    seen: set[str] = set()
    out = []
    for d in decisions:
        card_id = str(d.id)
        if card_id not in pending or card_id in seen:
            raise ApiError(
                422, "invalid_flashcard_review", "A decision is for a card not waiting."
            )
        seen.add(card_id)
        front, back = (
            " ".join((d.front or "").split()),
            " ".join((d.back or "").split()),
        )
        if d.action == "edit" and not (front and back):
            raise ApiError(
                422,
                "invalid_flashcard_review",
                "An edited card needs a front and a back.",
            )
        if d.action == "edit" and (len(front) > MAX_FRONT or len(back) > MAX_BACK):
            raise ApiError(422, "invalid_flashcard_review", "That card is too long.")
        out.append({"id": card_id, "action": d.action, "front": front, "back": back})
    if not out:
        raise ApiError(422, "invalid_flashcard_review", "Decide on at least one card.")
    return out


def resume_flashcards(
    interrupt_id: str,
    raw: list,
    thread: Thread,
    student_id: uuid.UUID,
    session: Session,
) -> ReviewOut:
    """The Student's decisions on drafts, from POST /threads/{id}/resume."""
    pause = pending_pause(thread.id)
    if pause is None or pause.id != interrupt_id:
        raise ApiError(409, "nothing_to_resume", "There is nothing to answer here.")
    decisions = _decisions(raw, list(pause.value["card_ids"]))
    try:
        get_flashcard_graph().invoke(Command(resume=decisions), config(thread.id))
    except Exception as exc:
        raise ApiError(
            502, "upstream_unavailable", "Jimmy could not save that review. Try again."
        ) from exc
    session.expire_all()
    cards = {
        str(c.id): c
        for c in session.scalars(
            select(Flashcard).where(
                Flashcard.id.in_([uuid.UUID(d["id"]) for d in decisions])
            )
        )
    }
    approved = sum(cards[d["id"]].status == "approved" for d in decisions)
    after = pending_pause(thread.id)
    style = session.scalar(
        select(ProfileFact)
        .where(
            ProfileFact.student_id == student_id,
            ProfileFact.kind == "style",
            ProfileFact.origin == "flashcard_edits",
            ProfileFact.status == "proposed",
        )
        .order_by(ProfileFact.created_at.desc())
    )
    return ReviewOut(
        approved=approved,
        rejected=len(decisions) - approved,
        remaining=len(after.value["card_ids"]) if after else 0,
        style=StyleProposalOut(id=style.id, text=style.text) if style else None,
    )
