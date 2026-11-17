import uuid

from fastapi import APIRouter, Response
from sqlalchemy import select

from app.db import SessionDep
from app.errors import ApiError
from app.profile.models import ProfileFact
from app.profile.schemas import FactOut, ProfileIn, ProfileOut
from app.students.dependencies import StudentDep
from app.students.models import Profile

router = APIRouter(tags=["profile"])


def _fact(session, student_id: uuid.UUID, fact_id: uuid.UUID) -> ProfileFact:
    fact = session.get(ProfileFact, fact_id)
    if fact is None or fact.student_id != student_id:
        raise ApiError(404, "fact_not_found", "That does not exist.")
    return fact


def _profile(session, student_id: uuid.UUID) -> Profile:
    profile = session.get(Profile, student_id)
    if profile is None:
        profile = Profile(student_id=student_id)
        session.add(profile)
    return profile


def _out(profile: Profile | None) -> ProfileOut:
    return ProfileOut(
        language=profile.language if profile else None,
        explanation_style=profile.explanation_style if profile else "balanced",
        adaptive_difficulty=bool(profile and profile.adaptive_difficulty),
    )


@router.get("/profile", response_model=ProfileOut)
def get_profile(student: StudentDep, session: SessionDep):
    return _out(session.get(Profile, student.id))


@router.patch("/profile", response_model=ProfileOut)
def update_profile(body: ProfileIn, student: StudentDep, session: SessionDep):
    profile = _profile(session, student.id)
    if body.adaptive_difficulty is not None:
        profile.adaptive_difficulty = body.adaptive_difficulty
    if body.language is not None:
        profile.language = body.language.strip() or None
    if body.explanation_style is not None:
        profile.explanation_style = body.explanation_style
    session.commit()
    return _out(profile)


@router.get("/profile/facts", response_model=list[FactOut])
def list_facts(student: StudentDep, session: SessionDep):
    """What Jimmy remembers about the Student: facts and style preferences, with their
    status."""
    return session.scalars(
        select(ProfileFact)
        .where(ProfileFact.student_id == student.id)
        .order_by(ProfileFact.created_at.desc())
    ).all()


@router.post("/profile/facts/{fact_id}/approve", response_model=FactOut)
def approve_fact(fact_id: uuid.UUID, student: StudentDep, session: SessionDep):
    """Only an approved fact shapes later work."""
    fact = _fact(session, student.id, fact_id)
    fact.status = "approved"
    session.commit()
    return fact


@router.delete("/profile/facts/{fact_id}", status_code=204)
def delete_fact(fact_id: uuid.UUID, student: StudentDep, session: SessionDep):
    session.delete(_fact(session, student.id, fact_id))
    session.commit()
    return Response(status_code=204)
