import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.errors import ApiError
from app.students.models import Student
from app.students.schemas import StudentIn, StudentOut

router = APIRouter(tags=["students"])


@router.get("/students", response_model=list[StudentOut])
def list_students(
    session: SessionDep,
    ids: Annotated[list[uuid.UUID] | None, Query(max_length=50)] = None,
):
    """Profiles for the switcher, limited to the ids this browser remembers.

    Without `ids` nothing is returned, so the endpoint cannot be used to
    discover other Students' ids.
    """
    if not ids:
        return []
    return session.scalars(
        select(Student)
        .where(Student.id.in_(ids))
        .order_by(Student.created_at, Student.display_name)
    )


@router.post("/students", response_model=StudentOut, status_code=201)
def create_student(body: StudentIn, session: SessionDep):
    if session.scalar(
        select(Student).where(
            func.lower(Student.display_name) == body.display_name.lower()
        )
    ):
        raise ApiError(
            409, "student_exists", "A profile with that name already exists."
        )
    student = Student(display_name=body.display_name)
    session.add(student)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise ApiError(
            409, "student_exists", "A profile with that name already exists."
        )
    return student
