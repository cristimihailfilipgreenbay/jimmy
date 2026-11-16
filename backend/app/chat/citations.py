"""The Citation check: every statement in an answer is cited or labelled.

Pure functions, no model and no database, so they can be unit-tested.

The Tutor writes each paragraph in one of two ways:
- it ends with one or more markers such as `[1]` or `[2][3]`, each naming a passage
  that `search_notes` returned in this run (a Citation), or
- it starts with `[tutor]` (Tutor Knowledge: the model's own knowledge, not cited).
"""

import re
import uuid
from dataclasses import dataclass

TUTOR_LABEL = "[tutor]"
_MARKER = re.compile(r"\[(\d+)\]")
_PARAGRAPHS = re.compile(r"\n\s*\n")


@dataclass(frozen=True)
class Citation:
    id: int
    chunk_id: uuid.UUID
    source_type: str
    document: str
    author: str | None
    page_or_section: str | None
    passage: str

    def as_json(self) -> dict:
        return {
            "id": self.id,
            "chunk_id": str(self.chunk_id),
            "source_type": self.source_type,
            "document": self.document,
            "author": self.author,
            "page_or_section": self.page_or_section,
            "passage": self.passage,
        }


def page_or_section(
    page_start: int | None, page_end: int | None, section: str | None
) -> str | None:
    """ "p. 12", "pp. 12-13", or the section name when the document has no pages."""
    if page_start is not None:
        if page_end is not None and page_end != page_start:
            return f"pp. {page_start}–{page_end}"
        return f"p. {page_start}"
    return section or None


def paragraphs(text: str) -> list[str]:
    return [p.strip() for p in _PARAGRAPHS.split(text) if p.strip()]


def check_answer(text: str, valid_ids: set[int]) -> list[str]:
    """What is wrong with the answer, in words the Tutor can act on. Empty if fine."""
    problems: list[str] = []
    if not text.strip():
        return ["The answer is empty."]
    for number, paragraph in enumerate(paragraphs(text), start=1):
        ids = {int(m) for m in _MARKER.findall(paragraph)}
        unknown = sorted(ids - valid_ids)
        if unknown:
            problems.append(
                f"Paragraph {number} cites {unknown}, which no search returned."
            )
        elif paragraph.startswith(TUTOR_LABEL):
            continue
        elif not ids:
            problems.append(
                f"Paragraph {number} has no Citation and is not labelled {TUTOR_LABEL}."
            )
    return problems


def enforce(text: str, valid_ids: set[int]) -> str:
    """Last resort once retries are used up: never show an unattributed statement.

    A paragraph with no valid Citation is labelled as Tutor Knowledge (it says it is
    not from the Notes), and Citations that name no real passage are removed.
    """
    fixed: list[str] = []
    for paragraph in paragraphs(text):
        paragraph = _MARKER.sub(
            lambda m: m.group(0) if int(m.group(1)) in valid_ids else "", paragraph
        ).strip()
        if not paragraph:
            continue
        has_valid = bool(_MARKER.search(paragraph))
        if not has_valid and not paragraph.startswith(TUTOR_LABEL):
            paragraph = f"{TUTOR_LABEL} {paragraph}"
        fixed.append(paragraph)
    return "\n\n".join(fixed)


def cited_ids(text: str, valid_ids: set[int]) -> list[int]:
    """The passages the answer cites, in order of first use."""
    seen: list[int] = []
    for match in _MARKER.finditer(text):
        n = int(match.group(1))
        if n in valid_ids and n not in seen:
            seen.append(n)
    return seen


def strip_markers(text: str) -> str:
    """The answer as plain text, for history: markers number one run's passages only."""
    text = _MARKER.sub("", text).replace(TUTOR_LABEL, "")
    return re.sub(r"[ \t]+\n", "\n", text).strip()
