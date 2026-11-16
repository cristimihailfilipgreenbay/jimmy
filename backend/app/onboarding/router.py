from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.errors import ApiError
from app.onboarding.schemas import OnboardingIn, OnboardingOut
from app.spaces.models import Space
from app.students.dependencies import StudentDep
from app.students.models import Profile

router = APIRouter(tags=["onboarding"])


def _space_exists(name: str) -> ApiError:
    return ApiError(
        409,
        "space_exists",
        f"You already have a Study Space called {name}.",
        {"name": name},
    )


@router.post("/onboarding", response_model=OnboardingOut, status_code=201)
def complete_onboarding(body: OnboardingIn, session: SessionDep, student: StudentDep):
    """Set the name, save the profile and create the Spaces in one transaction."""
    if student.onboarded:
        raise ApiError(
            409, "already_onboarded", "You have already set up your account."
        )

    taken = {
        name.casefold()
        for name in session.scalars(
            select(Space.name).where(Space.student_id == student.id)
        )
    }
    for subject in body.subjects:
        if subject.name.casefold() in taken:
            raise _space_exists(subject.name)

    student.display_name = body.name
    profile = session.get(Profile, student.id) or Profile(student_id=student.id)
    profile.course = body.studies.course
    profile.university = body.studies.university
    profile.year = body.studies.year
    profile.goals = body.preferences.goals
    profile.explanation_style = body.preferences.explanation_style
    profile.web_search_enabled = body.preferences.web_search
    session.add(profile)

    spaces = [
        Space(
            student_id=student.id,
            name=s.name,
            course=s.course,
            accent=s.accent,
        )
        for s in body.subjects
    ]
    session.add_all(spaces)
    student.onboarded_at = datetime.now(UTC)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise _space_exists(body.subjects[0].name)
    return {"student": student, "spaces": spaces}
