import uuid
from datetime import datetime

from fastapi import APIRouter, Response
from sqlalchemy import func, select, tuple_
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.errors import ApiError
from app.pagination import (
    CursorQuery,
    LimitQuery,
    decode_cursor,
    next_cursor,
)
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.spaces.schemas import SpaceIn, SpaceOut, SpacesPage, SpaceUpdate
from app.students.dependencies import StudentDep

router = APIRouter(tags=["spaces"])


def _duplicate() -> ApiError:
    return ApiError(
        409, "space_exists", "You already have a Study Space with that name."
    )


@router.get("/spaces", response_model=SpacesPage)
def list_spaces(
    session: SessionDep,
    student: StudentDep,
    limit: LimitQuery = 12,
    cursor: CursorQuery = None,
):
    """The Student's Study Spaces, newest first, twelve at a time."""
    mine = Space.student_id == student.id
    older = ()
    if cursor:
        created, space_id = decode_cursor(cursor, 2)
        try:
            older = (
                tuple_(Space.created_at, Space.id)
                < tuple_(datetime.fromisoformat(created), uuid.UUID(space_id)),
            )
        except ValueError as exc:
            raise ApiError(
                422, "invalid_cursor", "That page link is not valid."
            ) from exc
    rows = list(
        session.scalars(
            select(Space)
            .where(mine, *older)
            .order_by(Space.created_at.desc(), Space.id.desc())
            .limit(limit + 1)
        )
    )
    return SpacesPage(
        items=rows[:limit],
        next_cursor=next_cursor(
            rows, limit, lambda s: [s.created_at.isoformat(), str(s.id)]
        ),
        total=session.scalar(select(func.count()).select_from(Space).where(mine)),
        accents=list(session.scalars(select(Space.accent).where(mine).distinct())),
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
    space = Space(
        student_id=student.id, name=body.name, course=body.course, accent=body.accent
    )
    session.add(space)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise _duplicate()
    return space


@router.get("/spaces/{space_id}", response_model=SpaceOut)
def get_space(space_id: uuid.UUID, session: SessionDep, student: StudentDep):
    return get_owned_space(session, student, space_id)


@router.patch("/spaces/{space_id}", response_model=SpaceOut)
def update_space(
    space_id: uuid.UUID, body: SpaceUpdate, session: SessionDep, student: StudentDep
):
    """Rename, change the course or the colour. Fields that are not sent stay as they are."""
    space = get_owned_space(session, student, space_id)
    sent = body.model_fields_set
    if "name" in sent and body.name is not None:
        clash = session.scalar(
            select(Space.id).where(
                Space.student_id == student.id,
                func.lower(Space.name) == body.name.lower(),
                Space.id != space.id,
            )
        )
        if clash:
            raise _duplicate()
        space.name = body.name
    if "course" in sent:
        space.course = body.course
    if "accent" in sent and body.accent is not None:
        space.accent = body.accent
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise _duplicate()
    return space


@router.delete("/spaces/{space_id}", status_code=204)
def delete_space(space_id: uuid.UUID, session: SessionDep, student: StudentDep):
    """Cascades to everything the Space owns through foreign keys (ON DELETE CASCADE)."""
    session.delete(get_owned_space(session, student, space_id))
    session.commit()
    return Response(status_code=204)
