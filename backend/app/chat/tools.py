"""The Tutor's tools. Only `search_notes` exists so far."""

import threading
from dataclasses import dataclass, field

from langchain_core.tools import StructuredTool
from sqlalchemy.orm import Session

from app.chat.citations import Citation, page_or_section
from app.chunks.retrieval import search_chunks
from app.db import engine
from app.documents.embeddings import EmbeddingError, embed_texts

TOP_K = 5


@dataclass
class RunSources:
    """The passages one run has found. Numbers are what the answer cites as [n]."""

    citations: dict[int, Citation] = field(default_factory=dict)
    _by_chunk: dict = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def add(self, citation_args: dict) -> Citation:
        with self._lock:
            chunk_id = citation_args["chunk_id"]
            if chunk_id in self._by_chunk:
                return self.citations[self._by_chunk[chunk_id]]
            number = len(self.citations) + 1
            citation = Citation(id=number, **citation_args)
            self.citations[number] = citation
            self._by_chunk[chunk_id] = number
            return citation

    @property
    def ids(self) -> set[int]:
        return set(self.citations)


def make_search_notes(space_id, sources: RunSources) -> StructuredTool:
    """`search_notes` bound to one Study Space: the model cannot name another."""

    def search_notes(query: str) -> str:
        """Search the Student's Notes in this Study Space. Returns numbered passages."""
        try:
            [vector] = embed_texts([query])
        except EmbeddingError as exc:
            return f"The search failed ({exc}). Answer without it and say so."
        with Session(engine) as session:
            hits = search_chunks(
                session,
                space_id=space_id,
                query_embedding=vector,
                limit=TOP_K,
                source_types=("notes",),
            )
        if not hits:
            return "No passages found in the Notes."
        lines = []
        for hit in hits:
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
                }
            )
            where = f", {citation.page_or_section}" if citation.page_or_section else ""
            lines.append(f"[{citation.id}] ({citation.document}{where})\n{hit.text}")
        return "\n\n".join(lines)

    return StructuredTool.from_function(search_notes, name="search_notes")
