import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ConflictOut(BaseModel):
    id: uuid.UUID
    topic: str
    topic_id: uuid.UUID | None
    other_source_type: Literal["library", "learned"]
    decision: Literal["keep_notes", "accept_other", "unsure"]
    decided_at: datetime
    notes_document: str
    other_document: str
    notes_excerpt: str
    other_excerpt: str

    model_config = {"from_attributes": True}
