import uuid
from typing import Annotated

from fastapi import Depends, Header

from app.db import SessionDep
from app.errors import ApiError
from app.students.models import Student


def current_student(
    session: SessionDep,
    x_student_id: Annotated[str | None, Header()] = None,
) -> Student:
    """The Student named by the profile switcher's `X-Student-Id` header."""
    student = None
    if x_student_id:
        try:
            student = session.get(Student, uuid.UUID(x_student_id))
        except ValueError:
            pass
    if student is None:
        raise ApiError(401, "unknown_student", "Choose a profile to continue.")
    return student


StudentDep = Annotated[Student, Depends(current_student)]
