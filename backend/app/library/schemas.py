import uuid
from typing import Literal

from pydantic import BaseModel


class PackOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    author: str
    license: str
    source_url: str
    subject: str

    model_config = {"from_attributes": True}


class LibraryIn(BaseModel):
    """`pack_id` attaches that pack (replacing another); null detaches the Library."""

    pack_id: uuid.UUID | None = None
    enabled: bool = True


class LibraryOut(BaseModel):
    pack: PackOut | None
    enabled: bool
    # none: no pack attached; indexing: chapters still being embedded.
    status: Literal["none", "indexing", "ready", "failed"]
    chapters_ready: int
    chapters_total: int
    # The book's chapter numbers in this Space, and how many answers cited the Library.
    chapters: list[int]
    cited_in_answers: int
