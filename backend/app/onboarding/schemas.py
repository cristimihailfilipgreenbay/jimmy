from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    Field,
    StringConstraints,
    model_validator,
)

from app.spaces.schemas import Accent, SpaceOut
from app.students.schemas import StudentOut

Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]

Year = Literal["1st", "2nd", "3rd", "4th+", "Master's"]
Goal = Literal["understand", "exams", "cards", "catchup", "write"]
ExplanationStyle = Literal["short", "balanced", "detailed"]


def _optional_text(value: str | None) -> str | None:
    """Trimmed text, or None when blank."""
    value = (value or "").strip()
    if len(value) > 120:
        raise ValueError("Use 120 characters or fewer.")
    return value or None


OptionalText = Annotated[str | None, AfterValidator(_optional_text)]


class StudiesIn(BaseModel):
    course: OptionalText = None
    university: OptionalText = None
    year: Year | None = None


class SubjectIn(BaseModel):
    name: Name
    course: OptionalText = None
    accent: Accent


class PreferencesIn(BaseModel):
    goals: list[Goal] = []
    explanation_style: ExplanationStyle = "balanced"
    web_search: bool = True

    @model_validator(mode="after")
    def drop_repeated_goals(self):
        self.goals = list(dict.fromkeys(self.goals))
        return self


class OnboardingIn(BaseModel):
    name: Name
    studies: StudiesIn = StudiesIn()
    subjects: Annotated[list[SubjectIn], Field(min_length=1, max_length=20)]
    preferences: PreferencesIn = PreferencesIn()

    @model_validator(mode="after")
    def subject_names_are_unique(self):
        names = [s.name.casefold() for s in self.subjects]
        if len(names) != len(set(names)):
            raise ValueError("Each Study Space needs its own name.")
        return self


class OnboardingOut(BaseModel):
    student: StudentOut
    spaces: list[SpaceOut]
