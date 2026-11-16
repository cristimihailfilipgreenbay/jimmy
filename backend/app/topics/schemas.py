import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.topics.review import MAX_NAME


class TopicOut(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TopicRename(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_NAME)


class TopicMerge(BaseModel):
    # The first id is the Topic that stays; the others are merged into it.
    ids: list[uuid.UUID] = Field(min_length=2)
    name: str = Field(min_length=1, max_length=MAX_NAME)


class TopicDecision(BaseModel):
    """One answer in a Topic review. A Topic with no answer is approved."""

    id: str
    action: Literal["approve", "rename", "merge", "remove"]
    name: str | None = Field(default=None, max_length=MAX_NAME)
    # For `merge`: the id of another proposed Topic or of one the Space already has.
    into: str | None = None


class ResumeIn(BaseModel):
    interrupt_id: str
    # A Topic review answers with a list; a Conflict in a chat with one word.
    decision: list[TopicDecision] | str


class InterruptOut(BaseModel):
    interrupt_id: str
    kind: str
    payload: dict


class ThreadDetail(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    kind: str
    title: str
    created_at: datetime
    # The pause the run is waiting on, if any.
    interrupt: InterruptOut | None
