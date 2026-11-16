import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.chat.models import Message, Thread
from app.db import SessionDep
from app.errors import ApiError
from app.learned.models import LearnedMaterial
from app.learned.schemas import LearnedMaterialOut
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space

router = APIRouter(tags=["learned-material"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


def _answer_citations(session, space: Space) -> list[list[dict]]:
    return list(
        session.scalars(
            select(Message.citations)
            .join(Thread, Thread.id == Message.thread_id)
            .where(Thread.space_id == space.id, Message.role == "assistant")
        )
    )


def _out(material: LearnedMaterial, answers: list[list[dict]]) -> LearnedMaterialOut:
    used = sum(any(c.get("url") == material.url for c in answer) for answer in answers)
    fields = LearnedMaterialOut.model_fields.keys() - {"used_in_answers"}
    values = {f: getattr(material, f) for f in fields - {"excerpt"}}
    return LearnedMaterialOut(
        **values, excerpt=material.excerpt or "", used_in_answers=used
    )


def _owned(session, space: Space, material_id: uuid.UUID) -> LearnedMaterial:
    material = session.get(LearnedMaterial, material_id)
    if material is None or material.space_id != space.id:
        raise ApiError(404, "learned_material_not_found", "That item does not exist.")
    return material


@router.get(
    "/spaces/{space_id}/learned-material", response_model=list[LearnedMaterialOut]
)
def list_learned_material(
    space: SpaceDep,
    session: SessionDep,
    status: Annotated[Literal["unreviewed", "approved"] | None, Query()] = None,
):
    query = select(LearnedMaterial).where(LearnedMaterial.space_id == space.id)
    if status:
        query = query.where(LearnedMaterial.status == status)
    answers = _answer_citations(session, space)
    items = session.scalars(query.order_by(LearnedMaterial.created_at.desc()))
    return [_out(m, answers) for m in items]


@router.post(
    "/spaces/{space_id}/learned-material/{material_id}/approve",
    response_model=LearnedMaterialOut,
)
def approve_learned_material(
    material_id: uuid.UUID, space: SpaceDep, session: SessionDep
):
    """Approve it, so it may feed Quizzes, Tests and Flashcards (ADR 0002)."""
    material = _owned(session, space, material_id)
    if material.status != "approved":
        material.status = "approved"
        material.approved_at = datetime.now(UTC)
        session.commit()
        session.refresh(material)
    return _out(material, _answer_citations(session, space))


@router.delete("/spaces/{space_id}/learned-material/{material_id}", status_code=204)
def delete_learned_material(
    material_id: uuid.UUID, space: SpaceDep, session: SessionDep
):
    """Delete it; its chunks go with it."""
    session.delete(_owned(session, space, material_id))
    session.commit()
