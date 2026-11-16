import uuid
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.deps import SessionDep, StudentDep
from app.errors import ApiError
from app.models import Space

router = APIRouter(tags=["spaces"])

Accent = Literal["default", "biology", "physics", "chemistry", "history", "math"]


class SpaceOut(BaseModel):
    id: uuid.UUID
    name: str
    accent: str
    library_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SpaceIn(BaseModel):
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ]
    accent: Accent = "default"


def _duplicate() -> ApiError:
    return ApiError(
        409, "space_exists", "You already have a Study Space with that name."
    )


def _get_owned(session, student, space_id: uuid.UUID) -> Space:
    """A Space owned by another Student behaves as if it does not exist."""
    space = session.get(Space, space_id)
    if space is None or space.student_id != student.id:
        raise ApiError(404, "space_not_found", "That Study Space does not exist.")
    return space


@router.get("/spaces", response_model=list[SpaceOut])
def list_spaces(session: SessionDep, student: StudentDep):
    return session.scalars(
        select(Space).where(Space.student_id == student.id).order_by(Space.created_at)
    )


@router.post("/spaces", response_model=SpaceOut, status_code=201)
def create_space(body: SpaceIn, session: SessionDep, student: StudentDep):
    taken = session.scalar(
        select(Space.id).where(
            Space.student_id == student.id, func.lower(Space.name) == body.name.lower()
        )
    )
    if taken:
        raise _duplicate()
    space = Space(student_id=student.id, name=body.name, accent=body.accent)
    session.add(space)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise _duplicate()
    return space


@router.get("/spaces/{space_id}", response_model=SpaceOut)
def get_space(space_id: uuid.UUID, session: SessionDep, student: StudentDep):
    return _get_owned(session, student, space_id)


@router.delete("/spaces/{space_id}", status_code=204)
def delete_space(space_id: uuid.UUID, session: SessionDep, student: StudentDep):
    """Cascades to everything the Space owns through foreign keys (ON DELETE CASCADE)."""
    session.delete(_get_owned(session, student, space_id))
    session.commit()
    return Response(status_code=204)
