"""The Tutor's tools: `search_notes`, `search_library`, `search_wikipedia`, `search_web`."""

import logging
import threading
import uuid
from dataclasses import dataclass, field
from datetime import date

from langchain_core.tools import StructuredTool
from sqlalchemy.orm import Session

from app.chat.citations import Citation, page_or_section
from app.chat.web import LookupFailed, Page, search_tavily, search_wikipedia
from app.chunks.retrieval import search_chunks
from app.db import engine
from app.documents.embeddings import EmbeddingError, embed_texts
from app.guardrails.classify import scan_passages

log = logging.getLogger(__name__)

TOP_K = 5
# A search always returns its nearest passages, however far away. Passages much farther
# than the best one, or plainly unrelated, would only be noise to cite or ignore.
MAX_DISTANCE = 0.65
DISTANCE_SLACK = 0.12
WITHHELD = "[a passage was withheld: it tried to give instructions to the assistant]"


def relevant(hits: list) -> list:
    """The hits worth showing the Tutor: close in absolute terms and close to the best one."""
    if not hits:
        return []
    best = min(h.distance for h in hits)
    return [
        h
        for h in hits
        if h.distance <= MAX_DISTANCE and h.distance <= best + DISTANCE_SLACK
    ]


@dataclass
class RunSources:
    """The passages one run has found. Numbers are what the answer cites as [n]."""

    citations: dict[int, Citation] = field(default_factory=dict)
    _by_chunk: dict = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def add(self, citation_args: dict) -> Citation:
        """A chunk is numbered once; so is a web page (by its address)."""
        key = citation_args.get("chunk_id") or citation_args["url"]
        with self._lock:
            if key in self._by_chunk:
                return self.citations[self._by_chunk[key]]
            number = len(self.citations) + 1
            citation = Citation(id=number, **citation_args)
            self.citations[number] = citation
            self._by_chunk[key] = number
            return citation

    def restore(self, saved: list[dict]) -> None:
        """Put back Citations saved by an earlier part of a paused run, with their numbers."""
        with self._lock:
            for d in saved:
                if d["id"] in self.citations:
                    continue
                chunk_id = uuid.UUID(d["chunk_id"]) if d.get("chunk_id") else None
                self.citations[d["id"]] = Citation(**{**d, "chunk_id": chunk_id})
                self._by_chunk[chunk_id or d["url"]] = d["id"]

    @property
    def ids(self) -> set[int]:
        return set(self.citations)


def _make_search(
    space_id, sources: RunSources, *, name: str, source_type: str, doc: str, none: str
) -> StructuredTool:
    def search(query: str) -> tuple[str, list[dict]]:
        try:
            [vector] = embed_texts([query])
        except EmbeddingError as exc:
            return f"The search failed ({exc}). Answer without it and say so.", []
        with Session(engine) as session:
            hits = search_chunks(
                session,
                space_id=space_id,
                query_embedding=vector,
                limit=TOP_K,
                source_types=(source_type,),
            )
        hits = relevant(hits)
        if not hits:
            return none, []
        # Notes are the Student's own uploads, so they are scanned; the Library is trusted.
        flagged = (
            scan_passages([h.text for h in hits]) if source_type == "notes" else set()
        )
        lines, found = [], []
        for i, hit in enumerate(hits):
            if i in flagged:
                log.warning("Withheld a Note passage that looks like an injection")
                lines.append(WITHHELD)
                continue
            citation = sources.add(
                {
                    "chunk_id": hit.chunk_id,
                    "source_type": hit.source_type,
                    "document": hit.document_title,
                    "author": hit.document_author,
                    "page_or_section": page_or_section(
                        hit.page_start, hit.page_end, hit.section
                    ),
                    "passage": hit.text,
                    "url": hit.url,
                }
            )
            found.append(citation.as_json())
            where = f", {citation.page_or_section}" if citation.page_or_section else ""
            lines.append(f"[{citation.id}] ({citation.document}{where})\n{hit.text}")
        return "\n\n".join(lines), found

    search.__doc__ = doc
    return StructuredTool.from_function(
        search, name=name, response_format="content_and_artifact"
    )


def make_search_notes(space_id, sources: RunSources) -> StructuredTool:
    """`search_notes` bound to one Study Space: the model cannot name another."""
    return _make_search(
        space_id,
        sources,
        name="search_notes",
        source_type="notes",
        doc="Search the Student's Notes in this Study Space. Returns numbered passages.",
        none="No passages found in the Notes.",
    )


def make_search_library(space_id, sources: RunSources) -> StructuredTool:
    """`search_library`: the textbook chapters attached to this Study Space."""
    return _make_search(
        space_id,
        sources,
        name="search_library",
        source_type="library",
        doc=(
            "Search the Subject Library (open-textbook chapters) attached to this "
            "Study Space. Returns numbered passages with book, author and page."
        ),
        none="No passages found in the Subject Library.",
    )


def _make_web_search(
    sources: RunSources, *, name: str, source_type: str, lookup, doc: str, none: str
) -> StructuredTool:
    def search(query: str) -> tuple[str, list[dict]]:
        try:
            pages: list[Page] = lookup(query)
        except LookupFailed as exc:
            return f"The search failed ({exc}). Answer without it and say so.", []
        if not pages:
            return none, []
        flagged = scan_passages([p.text for p in pages])
        today = date.today().isoformat()
        lines, found = [], []
        for i, page in enumerate(pages):
            if i in flagged:
                log.warning("Withheld a web result that looks like an injection")
                lines.append(WITHHELD)
                continue
            citation = sources.add(
                {
                    "source_type": source_type,
                    "document": page.title,
                    "author": None,
                    "page_or_section": page.domain,
                    "passage": page.text,
                    "url": page.url,
                    "fetched_at": today,
                }
            )
            found.append(citation.as_json())
            lines.append(f"[{citation.id}] ({page.title}, {page.domain})\n{page.text}")
        return "\n\n".join(lines), found

    search.__doc__ = doc
    return StructuredTool.from_function(
        search, name=name, response_format="content_and_artifact"
    )


def make_search_wikipedia(sources: RunSources) -> StructuredTool:
    return _make_web_search(
        sources,
        name="search_wikipedia",
        source_type="wikipedia",
        lookup=search_wikipedia,
        doc=(
            "Search Wikipedia. Returns numbered article extracts, each a Finding "
            "from outside the Study Space."
        ),
        none="No Wikipedia article found.",
    )


def make_search_web(sources: RunSources) -> StructuredTool:
    return _make_web_search(
        sources,
        name="search_web",
        source_type="web",
        lookup=search_tavily,
        doc=(
            "Search the web. Returns numbered page extracts, each a Finding from "
            "outside the Study Space."
        ),
        none="No web results found.",
    )


def make_search_learned(space_id, sources: RunSources) -> StructuredTool:
    """`search_learned_material`: web pages saved into this Study Space from earlier chats."""
    return _make_search(
        space_id,
        sources,
        name="search_learned_material",
        source_type="learned",
        doc=(
            "Search Learned Material: web pages saved into this Study Space from "
            "earlier conversations. Not reviewed by the Student. Returns numbered passages."
        ),
        none="No passages found in Learned Material.",
    )
