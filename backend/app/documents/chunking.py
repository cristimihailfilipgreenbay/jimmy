"""Page-aware chunking: each chunk remembers the pages (and section) it came from."""

import re
from dataclasses import dataclass

from app.documents.extract import Page

MAX_CHARS = 1800
OVERLAP_CHARS = 200

_HEADING = re.compile(r"^#{1,6}\s+(.+?)\s*#*$")


@dataclass(frozen=True)
class ChunkDraft:
    index: int
    text: str
    page_start: int | None
    page_end: int | None
    section: str | None
    token_count: int


@dataclass(frozen=True)
class _Piece:
    text: str
    page: int | None
    section: str | None


def estimate_tokens(text: str) -> int:
    """Rough count (about four characters a token); only stored for display and budgeting."""
    return max(1, len(text) // 4)


def _pieces(pages: list[Page], max_chars: int) -> list[_Piece]:
    pieces: list[_Piece] = []
    section: str | None = None
    for page in pages:
        for block in re.split(r"\n\s*\n", page.text):
            block = block.strip()
            if not block:
                continue
            heading = _HEADING.match(block.splitlines()[0])
            if heading:
                section = heading.group(1)
            for start in range(0, len(block), max_chars):
                pieces.append(
                    _Piece(block[start : start + max_chars], page.number, section)
                )
    return pieces


def chunk_pages(
    pages: list[Page], max_chars: int = MAX_CHARS, overlap_chars: int = OVERLAP_CHARS
) -> list[ChunkDraft]:
    pieces = _pieces(pages, max_chars)
    chunks: list[ChunkDraft] = []
    current: list[_Piece] = []

    def flush() -> None:
        text = "\n\n".join(p.text for p in current)
        numbers = [p.page for p in current if p.page is not None]
        chunks.append(
            ChunkDraft(
                index=len(chunks),
                text=text,
                page_start=min(numbers) if numbers else None,
                page_end=max(numbers) if numbers else None,
                # The section the chunk starts in.
                section=current[0].section,
                token_count=estimate_tokens(text),
            )
        )

    fresh = 0  # pieces added since the last flush (the carried overlap does not count)
    for piece in pieces:
        size = sum(len(p.text) for p in current) + 2 * len(current)
        if current and size + len(piece.text) > max_chars:
            flush()
            last = current[-1]
            current = [last] if len(last.text) <= overlap_chars else []
            fresh = 0
        current.append(piece)
        fresh += 1
    if fresh:
        flush()
    return chunks
