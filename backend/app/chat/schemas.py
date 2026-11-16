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

    model_config = {"from_attributes": True}


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
