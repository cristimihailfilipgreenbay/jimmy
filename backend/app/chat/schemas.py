import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ThreadOut(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    kind: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadItemOut(BaseModel):
    """A chat in the list: its name, when it was last active and how long it is."""

    id: uuid.UUID
    # The Student's own name, else the first question trimmed.
    title: str
    created_at: datetime
    # When its last message was written.
    updated_at: datetime
    message_count: int


class ThreadRename(BaseModel):
    # Empty or missing: use the first question again.
    title: str | None = None


class CitationOut(BaseModel):
    id: int
    source_type: str
    document: str
    author: str | None
    page_or_section: str | None
    passage: str
    # Only a web Finding has these.
    url: str | None = None
    fetched_at: str | None = None


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: list[CitationOut]
    tokens_in: int | None
    tokens_out: int | None
    cost_usd: float | None
    trace_id: str | None
    created_at: datetime
    # The Student's 👍/👎 on this answer, and why, if given.
    rating: str | None = None
    rating_comment: str | None = None

    model_config = {"from_attributes": True}


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
