import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LearnedMaterialOut(BaseModel):
    id: uuid.UUID
    title: str
    publisher: str | None
    url: str
    reason: str | None
    status: Literal["unreviewed", "approved"]
    fetched_at: str | None
    created_at: datetime
    approved_at: datetime | None
    # Answers in this Study Space that cited it.
    used_in_answers: int

    model_config = {"from_attributes": True}
