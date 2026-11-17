import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, StringConstraints


class FactOut(BaseModel):
    id: uuid.UUID
    kind: str
    text: str
    status: str
    origin: str
    created_at: datetime


Year = Literal["1st", "2nd", "3rd", "4th+", "Master's"]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]


def _optional_text(value: str | None) -> str | None:
    """Trimmed text; blank means empty (it clears the field)."""
    if value is None:
        return None
    value = value.strip()
    if len(value) > 120:
        raise ValueError("Use 120 characters or fewer.")
    return value


OptionalText = Annotated[str | None, AfterValidator(_optional_text)]


class ProfileOut(BaseModel):
    name: str | None
    course: str | None
    university: str | None
    year: Year | None
    # Search Wikipedia and the web when the Notes and Library have no answer.
    web_search: bool
    # Off: Weak Topics are paused (see docs/domain.md).
    remember_weak_topics: bool
    # The language answers come in; null means the Student's own language.
    language: str | None
    # How long answers are: short, balanced or detailed.
    explanation_style: Literal["short", "balanced", "detailed"]
    # Off: a Quiz or Test is written up front at one difficulty. On: it follows the answers.
    adaptive_difficulty: bool


class ProfileIn(BaseModel):
    """Only what is sent changes. Blank course or university clears it."""

    name: Name | None = None
    course: OptionalText = None
    university: OptionalText = None
    year: Year | None = None
    web_search: bool | None = None
    remember_weak_topics: bool | None = None
    # An empty string goes back to the Student's own language.
    language: str | None = Field(default=None, max_length=40)
    explanation_style: Literal["short", "balanced", "detailed"] | None = None
    adaptive_difficulty: bool | None = None
