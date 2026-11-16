import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.study.schemas import SourceOut


class DraftIn(BaseModel):
    # Empty means every Topic in the Study Space.
    topic_ids: list[uuid.UUID] = []
    count: int = Field(default=5, ge=1, le=10)


class CardOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    topic: str
    front: str
    back: str
    status: str
    was_edited: bool
    source: SourceOut
    created_at: datetime


class DraftBatchOut(BaseModel):
    """Drafts waiting for the Student, with the pause to answer at
    POST /threads/{thread_id}/resume."""

    thread_id: uuid.UUID
    interrupt_id: str
    cards: list[CardOut]


class FlashcardDecision(BaseModel):
    id: uuid.UUID
    action: Literal["approve", "reject", "edit"]
    front: str | None = None
    back: str | None = None


class StyleProposalOut(BaseModel):
    id: uuid.UUID
    text: str


class ReviewOut(BaseModel):
    approved: int
    rejected: int
    # Drafts of this batch still waiting.
    remaining: int
    # A card style the edits showed, waiting for the Student's Approval.
    style: StyleProposalOut | None
