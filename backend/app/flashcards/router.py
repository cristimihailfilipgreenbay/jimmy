import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from langgraph.types import Command
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chat.models import Thread
from app.db import SessionDep
from app.errors import ApiError
from app.flashcards.cards import MAX_BACK, MAX_FRONT
from app.flashcards.models import Flashcard
from app.flashcards.runtime import get_flashcard_graph
from app.flashcards.schemas import (
    CardOut,
    DraftBatchOut,
    DraftIn,
    FlashcardDecision,
    ReviewOut,
    StyleProposalOut,
)
from app.flashcards.service import (
    batch_out,
    cards_out,
    config,
    pending_pause,
    start_batch,
)
from app.profile.models import ProfileFact
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space

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


@router.get("/spaces/{space_id}/flashcards/drafts", response_model=list[DraftBatchOut])
def list_drafts(space: SpaceDep, session: SessionDep):
    """Every batch of drafts still waiting for the Student."""
    threads = session.scalars(
        select(Flashcard.thread_id)
        .where(Flashcard.space_id == space.id, Flashcard.status == "draft")
        .distinct()
    ).all()
    batches = [batch_out(session, t) for t in threads if t]
    # A batch whose run is not waiting any more has nothing the Student can decide.
    return [b for b in batches if b.interrupt_id and b.cards]


@router.get("/spaces/{space_id}/flashcards", response_model=list[CardOut])
def list_flashcards(space: SpaceDep, session: SessionDep):
    """The deck: approved cards, oldest first."""
    cards = session.scalars(
        select(Flashcard)
        .where(Flashcard.space_id == space.id, Flashcard.status == "approved")
        .order_by(Flashcard.created_at, Flashcard.id)
    ).all()
    return cards_out(session, list(cards))


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
