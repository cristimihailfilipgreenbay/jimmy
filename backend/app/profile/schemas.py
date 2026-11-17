import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FactOut(BaseModel):
    id: uuid.UUID
    kind: str
    text: str
    status: str
    origin: str
    created_at: datetime


class ProfileOut(BaseModel):
    # The language answers come in; null means the Student's own language.
    language: str | None
    # How long answers are: short, balanced or detailed.
    explanation_style: Literal["short", "balanced", "detailed"]
    # Off: a Quiz or Test is written up front at one difficulty. On: it follows the answers.
    adaptive_difficulty: bool


class ProfileIn(BaseModel):
    # An empty string goes back to the Student's own language.
    language: str | None = Field(default=None, max_length=40)
    explanation_style: Literal["short", "balanced", "detailed"] | None = None
    adaptive_difficulty: bool | None = None
