"""Turn an uploaded file into pages of text, or reject it with a clear message."""

import io
from dataclasses import dataclass
from pathlib import PurePath

from pypdf import PdfReader
from pypdf.errors import PyPdfError

MAX_BYTES = 20 * 1024 * 1024
MAX_PAGES = 200
# A scanned PDF has pages but (almost) no text layer.
MIN_CHARS_PER_PAGE = 20

TEXT_TYPES = {
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".txt": "text/plain",
}


class Rejected(Exception):
    """The file cannot become Notes. `code` and `status` follow docs/api.md."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Page:
    # None for Markdown and text, which have no pages.
    number: int | None
    text: str


@dataclass(frozen=True)
class Extracted:
    title: str
    author: str | None
    mime_type: str
    page_count: int | None
    pages: list[Page]


def extract(filename: str, data: bytes) -> Extracted:
    suffix = PurePath(filename).suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(filename, data)
    if suffix in TEXT_TYPES:
        return _extract_text(filename, data, TEXT_TYPES[suffix])
    raise Rejected(
        422,
        "unsupported_type",
        "Jimmy reads PDF, Markdown (.md) and plain text (.txt) files.",
    )


def _extract_text(filename: str, data: bytes, mime_type: str) -> Extracted:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise Rejected(
            422,
            "unsupported_type",
            "That file is not UTF-8 text. Save it as UTF-8 and try again.",
        )
    if not text.strip():
        raise Rejected(422, "empty_document", "That file has no text in it.")
    return Extracted(
        title=PurePath(filename).stem,
        author=None,
        mime_type=mime_type,
        page_count=None,
        pages=[Page(None, text)],
    )


def _extract_pdf(filename: str, data: bytes) -> Extracted:
    unreadable = Rejected(422, "unreadable_document", "Jimmy could not open that PDF.")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(""):
            raise Rejected(
                422, "unreadable_document", "That PDF is password protected."
            )
        count = len(reader.pages)
        if count > MAX_PAGES:
            raise Rejected(
                422,
                "too_many_pages",
                f"That PDF has {count} pages. The limit is {MAX_PAGES}.",
            )
        pages = [
            Page(i + 1, (p.extract_text() or "").strip())
            for i, p in enumerate(reader.pages)
        ]
        meta = reader.metadata
    except (PyPdfError, ValueError, OSError, KeyError):
        raise unreadable

    chars = sum(len(p.text) for p in pages)
    if count == 0 or chars < MIN_CHARS_PER_PAGE * count:
        raise Rejected(
            422,
            "scanned_document",
            "This PDF looks scanned: it has no text Jimmy can read. "
            "Upload a text version (or run OCR on it first) and try again.",
        )
    title = (meta.title or "").strip() if meta else ""
    author = (meta.author or "").strip() if meta else ""
    return Extracted(
        title=title or PurePath(filename).stem,
        author=author or None,
        mime_type="application/pdf",
        page_count=count,
        pages=pages,
    )
