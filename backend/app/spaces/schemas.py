import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

# The accent is only a colour the Student picked; it says nothing about the subject.
Accent = Literal[
    "slate",
    "red",
    "orange",
    "amber",
    "green",
    "teal",
    "blue",
    "indigo",
    "purple",
    "pink",
]


class SpaceOut(BaseModel):
    id: uuid.UUID
    name: str
    accent: str
    library_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SpaceIn(BaseModel):
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ]
    accent: Accent = "slate"
