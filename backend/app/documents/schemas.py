import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    kind: str
    title: str
    author: str | None
    filename: str
    mime_type: str
    size_bytes: int
    page_count: int | None
    status: str
    rejection_reason: str | None
    thread_id: uuid.UUID | None
    enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}
