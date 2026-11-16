from typing import Annotated

from fastapi import Cookie, Depends

from app.auth.security import read_token
from app.config import session_secret
from app.db import SessionDep
from app.errors import ApiError
from app.students.models import Student

SESSION_COOKIE = "jimmy_session"


def current_student(
    session: SessionDep,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> Student:
    """The signed-in Student, from the session cookie."""
    student_id = read_token(token, session_secret()) if token else None
    student = session.get(Student, student_id) if student_id else None
    if student is None:
        raise ApiError(401, "unauthenticated", "Sign in to continue.")
    return student


StudentDep = Annotated[Student, Depends(current_student)]
