import uuid
from datetime import datetime

from pydantic import BaseModel


class FactOut(BaseModel):
    id: uuid.UUID
    kind: str
    text: str
    status: str
    origin: str
    created_at: datetime


class ProfileOut(BaseModel):
    # Off: a Quiz or Test is written up front at one difficulty. On: it follows the answers.
    adaptive_difficulty: bool


class ProfileIn(BaseModel):
    adaptive_difficulty: bool | None = None
