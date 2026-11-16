from fastapi import APIRouter, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.schemas import SignInIn, SignUpIn
from app.auth.security import (
    DUMMY_HASH,
    create_token,
    hash_password,
    verify_password,
)
from app.config import get_settings, session_secret
from app.db import SessionDep
from app.errors import ApiError
from app.students.dependencies import SESSION_COOKIE, StudentDep
from app.students.models import Student
from app.students.schemas import StudentOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _start_session(response: Response, student: Student) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        create_token(student.id, session_secret(), settings.session_hours),
        max_age=settings.session_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def _email_taken() -> ApiError:
    return ApiError(409, "email_exists", "An account with that email already exists.")


@router.post("/sign-up", response_model=StudentOut, status_code=201)
def sign_up(body: SignUpIn, response: Response, session: SessionDep):
    email = body.email.lower()
    if session.scalar(select(Student.id).where(Student.email == email)):
        raise _email_taken()
    student = Student(
        display_name=body.name, email=email, password_hash=hash_password(body.password)
    )
    session.add(student)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise _email_taken()
    _start_session(response, student)
    return student


@router.post("/sign-in", response_model=StudentOut)
def sign_in(body: SignInIn, response: Response, session: SessionDep):
    student = session.scalar(select(Student).where(Student.email == body.email.lower()))
    # Same work and same answer whether the email or the password is wrong.
    ok = verify_password(
        body.password, student.password_hash if student else DUMMY_HASH
    )
    if student is None or not ok:
        raise ApiError(
            401, "invalid_credentials", "That email and password don’t match."
        )
    _start_session(response, student)
    return student


@router.post("/sign-out", status_code=204)
def sign_out(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.status_code = 204
    return response


@router.get("/me", response_model=StudentOut)
def me(student: StudentDep):
    return student
