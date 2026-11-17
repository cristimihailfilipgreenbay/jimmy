import uuid
from typing import Literal

from pydantic import BaseModel

Status = Literal["indexing", "ready", "failed"]


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
    """Switches the whole Library of the Space on or off."""

    enabled: bool


class ShelfBook(BaseModel):
    """One textbook on a Space's shelf, with how far its indexing has got."""

    pack: PackOut
    status: Status
    chapters_ready: int
    chapters_total: int
    # The book's chapter numbers in this Space, and the answers that cited it.
    chapters: list[int]
    cited_in_answers: int


class LibraryOut(BaseModel):
    """The state of a Space's Library, without the shelf itself: the books are paged at
    GET /spaces/{id}/library/books."""

    enabled: bool
    # none: no textbook attached; indexing: some chapter is still being embedded;
    # failed: some chapter could not be indexed.
    status: Literal["none", "indexing", "ready", "failed"]
    book_count: int
    # Chapters indexed so far, and in all, across every book on the shelf.
    chapters_ready: int
    chapters_total: int
    # The textbooks on the shelf, so the catalogue can mark the ones already added.
    pack_ids: list[uuid.UUID]
