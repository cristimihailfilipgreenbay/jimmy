import uuid

from fastapi import APIRouter, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.errors import ApiError
from app.spaces.models import Space
from app.spaces.schemas import SpaceIn, SpaceOut, SpaceUpdate
from app.students.dependencies import StudentDep

router = APIRouter(tags=["spaces"])


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
    return _get_owned(session, student, space_id)


@router.patch("/spaces/{space_id}", response_model=SpaceOut)
def update_space(
    space_id: uuid.UUID, body: SpaceUpdate, session: SessionDep, student: StudentDep
):
    """Rename, change the course or the colour. Fields that are not sent stay as they are."""
    space = _get_owned(session, student, space_id)
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
    session.delete(_get_owned(session, student, space_id))
    session.commit()
    return Response(status_code=204)
