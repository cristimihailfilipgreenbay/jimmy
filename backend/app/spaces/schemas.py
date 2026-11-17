import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints, field_validator

from app.pagination import CursorPage

# The accent is only a colour the Student picked; it says nothing about the subject.
# The ten colours from the design, by name.
Accent = Literal[
    "leaf-green",
    "ink-blue",
    "copper",
    "rosewood",
    "plum",
    "teal",
    "indigo",
    "ochre",
    "olive",
    "slate",
]


class SpaceOut(BaseModel):
    id: uuid.UUID
    name: str
    accent: str
    course: str | None
    library_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SpaceCardOut(SpaceOut):
    """A Space on the Spaces page, with what is in it."""

    notes_count: int
    flashcards_count: int
    weak_topics_count: int


class SpacesPage(CursorPage[SpaceCardOut]):
    """One page of the Student's Study Spaces, newest first."""

    # The colours the Student's Spaces use, so a new one can start with an unused colour.
    accents: list[str]


class SpaceIn(BaseModel):
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ]
    # For example "BIO 202 · Prof. Weber". Optional; blank counts as none.
    course: str | None = None
    accent: Accent = "slate"

    @field_validator("course")
    @classmethod
    def blank_course_is_none(cls, value: str | None) -> str | None:
        value = (value or "").strip()
        if len(value) > 120:
            raise ValueError("Use 120 characters or fewer.")
        return value or None


class SpaceUpdate(BaseModel):
    """Only the fields that are sent change. Sending `course` as null (or blank) clears it."""

    name: (
        Annotated[
            str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
        ]
        | None
    ) = None
    course: str | None = None
    accent: Accent | None = None

    @field_validator("course")
    @classmethod
    def blank_course_is_none(cls, value: str | None) -> str | None:
        value = (value or "").strip()
        if len(value) > 120:
            raise ValueError("Use 120 characters or fewer.")
        return value or None

    @field_validator("name", "accent", mode="before")
    @classmethod
    def not_null(cls, value):
        # A name or accent can be left out, but not set to null.
        if value is None:
            raise ValueError("This field cannot be null.")
        return value
