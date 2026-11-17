"""The two Study Spaces the evaluation asks its questions in.

Built through the app's own code (extract, chunk, embed, store with `space_id`), under a
Student of its own, so the real Tutor runs against real retrieval. Safe to repeat: a Space
that is already built is reused unless `rebuild` is set.
"""

import json
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.chunks.models import Chunk
from app.config import get_settings
from app.db import engine
from app.documents.chunking import chunk_pages
from app.documents.embeddings import embed_texts
from app.documents.extract import extract
from app.documents.models import Document
from app.library.ingest import ingest_library_document
from app.library.models import LibraryPack
from app.library.seed import seed_root
from app.spaces.models import Space
from app.students.models import Student

log = logging.getLogger(__name__)

EMAIL = "evaluation@jimmy.invalid"
SAMPLE_NOTES = Path(get_settings().seed_dir).parent / "sample-notes"


@dataclass(frozen=True)
class SpaceSpec:
    key: str
    name: str
    pack_slug: str
    notes: tuple[str, ...]


SPACES = (
    SpaceSpec(
        "biology",
        "Eval Biology",
        "biology-2e",
        (
            "cell-respiration.md",
            "membrane-transport.md",
            "photosynthesis.txt",
        ),
    ),
    SpaceSpec("physics", "Eval Physics", "college-physics-2e", ()),
)


def _student(session: Session) -> Student:
    student = session.scalar(select(Student).where(Student.email == EMAIL))
    if student is None:
        student = Student(
            email=EMAIL,
            password_hash=hash_password(uuid.uuid4().hex),
            display_name="Eval",
        )
        session.add(student)
        session.flush()
    return student


def _ready(session: Session, space: Space, spec: SpaceSpec) -> bool:
    documents = list(
        session.scalars(select(Document).where(Document.space_id == space.id))
    )
    wanted = len(spec.notes) + len(
        json.loads((seed_root() / spec.pack_slug / "manifest.json").read_text())[
            "chapters"
        ]
    )
    return len(documents) == wanted and all(d.status == "ready" for d in documents)


def _add_notes(session: Session, space: Space, filename: str) -> None:
    data = (SAMPLE_NOTES / filename).read_bytes()
    extracted = extract(filename, data)
    drafts = chunk_pages(extracted.pages)
    vectors = embed_texts([d.text for d in drafts])
    document = Document(
        space_id=space.id,
        kind="notes",
        title=extracted.title[:300],
        author=extracted.author,
        filename=filename,
        mime_type=extracted.mime_type,
        size_bytes=len(data),
        page_count=extracted.page_count,
        status="ready",
    )
    session.add(document)
    session.flush()
    model = get_settings().embedding_model
    session.add_all(
        Chunk(
            space_id=space.id,
            source_type="notes",
            document_id=document.id,
            chunk_index=d.index,
            text=d.text,
            page_start=d.page_start,
            page_end=d.page_end,
            section=d.section,
            token_count=d.token_count,
            embedding=v,
            embedding_model=model,
            embedding_dimensions=len(v),
        )
        for d, v in zip(drafts, vectors, strict=True)
    )


def _add_pack(session: Session, space: Space, slug: str) -> list[tuple]:
    pack = session.scalar(select(LibraryPack).where(LibraryPack.slug == slug))
    if pack is None:
        raise SystemExit(
            f"The {slug} textbook is not registered. Run: python -m app.library.seed"
        )
    folder = seed_root() / slug
    jobs = []
    for chapter in json.loads((folder / "manifest.json").read_text())["chapters"]:
        path = folder / chapter["file"]
        document = Document(
            space_id=space.id,
            kind="library",
            pack_id=pack.id,
            title=f"{pack.title}, ch. {chapter['number']} {chapter['title']}"[:300],
            author=f"{pack.author} (OpenStax)"[:300],
            filename=chapter["file"],
            mime_type="application/pdf",
            size_bytes=path.stat().st_size,
            status="uploaded",
        )
        session.add(document)
        session.flush()
        jobs.append((document.id, path, chapter["first_page"]))
    space.library_enabled = True
    return jobs


def build(rebuild: bool = False) -> dict[str, uuid.UUID]:
    """The id of each evaluation Study Space, by key (`biology`, `physics`)."""
    ids: dict[str, uuid.UUID] = {}
    for spec in SPACES:
        with Session(engine) as session:
            student = _student(session)
            space = session.scalar(
                select(Space).where(
                    Space.student_id == student.id, Space.name == spec.name
                )
            )
            if space and not rebuild and _ready(session, space, spec):
                session.commit()
                ids[spec.key] = space.id
                continue
            if space:
                session.delete(space)
                session.flush()
            space = Space(student_id=student.id, name=spec.name, accent="slate")
            session.add(space)
            session.flush()
            log.info("Building %s", spec.name)
            for filename in spec.notes:
                _add_notes(session, space, filename)
            jobs = _add_pack(session, space, spec.pack_slug)
            session.commit()
            ids[spec.key] = space.id
        for document_id, path, first_page in jobs:
            ingest_library_document(document_id, ids[spec.key], path, first_page)
        with Session(engine) as session:
            if not _ready(session, session.get(Space, ids[spec.key]), spec):
                raise SystemExit(f"{spec.name} did not finish indexing; see the log.")
    return ids
