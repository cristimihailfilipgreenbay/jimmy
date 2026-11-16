import json
import re
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from app.chat.models import Message, Thread
from app.db import SessionDep
from app.documents.models import Document
from app.errors import ApiError
from app.library.ingest import ingest_library_document
from app.library.models import LibraryPack
from app.library.schemas import LibraryIn, LibraryOut, PackOut
from app.library.seed import seed_root
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.students.dependencies import StudentDep

router = APIRouter(tags=["library"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]

AUTHOR_SUFFIX = " (OpenStax)"


def _library_documents(session, space: Space) -> list[Document]:
    return list(
        session.scalars(
            select(Document)
            .where(Document.space_id == space.id, Document.kind == "library")
            .order_by(Document.created_at, Document.filename)
        )
    )


def _cited_in_answers(session, space: Space) -> int:
    """Answers in this Space with at least one Citation from the Subject Library."""
    rows = session.scalars(
        select(Message.citations)
        .join(Thread, Thread.id == Message.thread_id)
        .where(Thread.space_id == space.id, Message.role == "assistant")
    )
    return sum(any(c.get("source_type") == "library" for c in rows_) for rows_ in rows)


def _chapter_numbers(documents: list[Document]) -> list[int]:
    # Chapter files are named "ch08-photosynthesis.pdf" by the seed command.
    numbers = (re.match(r"ch(\d+)-", d.filename) for d in documents)
    return sorted(int(m.group(1)) for m in numbers if m)


def _state(session, space: Space) -> LibraryOut:
    documents = _library_documents(session, space)
    if not documents:
        return LibraryOut(
            pack=None,
            enabled=False,
            status="none",
            chapters_ready=0,
            chapters_total=0,
            chapters=[],
            cited_in_answers=0,
        )
    pack = session.get(LibraryPack, documents[0].pack_id)
    ready = sum(d.status == "ready" for d in documents)
    if any(d.status in ("failed", "rejected") for d in documents):
        status = "failed"
    elif ready == len(documents):
        status = "ready"
    else:
        status = "indexing"
    return LibraryOut(
        pack=PackOut.model_validate(pack) if pack else None,
        enabled=space.library_enabled,
        status=status,
        chapters_ready=ready,
        chapters_total=len(documents),
        chapters=_chapter_numbers(documents),
        cited_in_answers=_cited_in_answers(session, space),
    )


@router.get("/libraries", response_model=list[PackOut])
def list_packs(session: SessionDep, student: StudentDep):
    """The packs the seed command has made available."""
    return session.scalars(select(LibraryPack).order_by(LibraryPack.title))


@router.get("/spaces/{space_id}/library", response_model=LibraryOut)
def get_library(space: SpaceDep, session: SessionDep):
    return _state(session, space)


@router.put("/spaces/{space_id}/library", response_model=LibraryOut)
def put_library(
    body: LibraryIn, space: SpaceDep, session: SessionDep, background: BackgroundTasks
):
    """Attach a pack (its chapters become documents of this Space), switch it on or
    off, or detach it. A Space has at most one pack."""
    existing = _library_documents(session, space)
    if body.pack_id is None:
        for document in existing:
            session.delete(document)
        space.library_enabled = False
        session.commit()
        return _state(session, space)

    pack = session.get(LibraryPack, body.pack_id)
    if pack is None:
        raise ApiError(404, "pack_not_found", "That Subject Library does not exist.")

    keep = []
    for document in existing:
        # Another pack, or a chapter that failed, is replaced.
        if document.pack_id == pack.id and document.status != "failed":
            keep.append(document)
        else:
            session.delete(document)
    have = {d.filename for d in keep}

    new: list[tuple[Document, Path, int]] = []
    if not keep or len(keep) < _chapter_count(pack):
        folder = seed_root() / pack.slug
        manifest_path = folder / "manifest.json"
        if not manifest_path.exists():
            raise ApiError(
                409,
                "library_not_seeded",
                "This Subject Library has not been downloaded yet. "
                "Run the seed command first.",
            )
        for chapter in json.loads(manifest_path.read_text())["chapters"]:
            if chapter["file"] in have:
                continue
            path = folder / chapter["file"]
            document = Document(
                space_id=space.id,
                kind="library",
                pack_id=pack.id,
                title=f"{pack.title}, ch. {chapter['number']} {chapter['title']}"[:300],
                author=f"{pack.author}{AUTHOR_SUFFIX}"[:300],
                filename=chapter["file"],
                mime_type="application/pdf",
                size_bytes=path.stat().st_size,
                status="uploaded",
            )
            session.add(document)
            new.append((document, path, chapter["first_page"]))
    session.flush()

    for document in [*keep, *(d for d, _, _ in new)]:
        document.enabled = body.enabled
    space.library_enabled = body.enabled
    session.commit()
    for document, path, first_page in new:
        background.add_task(
            ingest_library_document, document.id, space.id, path, first_page
        )
    return _state(session, space)


def _chapter_count(pack: LibraryPack) -> int:
    manifest = seed_root() / pack.slug / "manifest.json"
    if not manifest.exists():
        return 0
    return len(json.loads(manifest.read_text())["chapters"])
