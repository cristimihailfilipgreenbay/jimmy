import uuid
from typing import Annotated

from fastapi import APIRouter
from pydantic import BaseModel, StringConstraints
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.deps import SessionDep
from app.errors import ApiError
from app.models import Student

router = APIRouter(tags=["students"])


class StudentOut(BaseModel):
    id: uuid.UUID
    display_name: str

    model_config = {"from_attributes": True}


class StudentIn(BaseModel):
    display_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ]


@router.get("/students", response_model=list[StudentOut])
def list_students(session: SessionDep):
    return session.scalars(
        select(Student).order_by(Student.created_at, Student.display_name)
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
