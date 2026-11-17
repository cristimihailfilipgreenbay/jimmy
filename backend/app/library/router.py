import json
import re
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import and_, func, or_, select, text, tuple_

from app.chat.models import Message, Thread
from app.db import SessionDep
from app.documents.models import Document
from app.errors import ApiError
from app.library.ingest import ingest_library_document
from app.library.models import LibraryPack
from app.library.schemas import LibraryIn, LibraryOut, PackOut, ShelfBook
from app.library.search import TYPO_THRESHOLD, pack_match
from app.library.seed import seed_root
from app.pagination import (
    CursorPage,
    CursorQuery,
    LimitQuery,
    decode_cursor,
    next_cursor,
)
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


def _answer_citations(session, space: Space) -> list[list[dict]]:
    return list(
        session.scalars(
            select(Message.citations)
            .join(Thread, Thread.id == Message.thread_id)
            .where(Thread.space_id == space.id, Message.role == "assistant")
        )
    )


def _cited_in(answers: list[list[dict]], pack: LibraryPack) -> int:
    """Answers with a Citation from this book. A library document is titled
    "<book>, ch. N ...", and a Citation carries its document's title."""
    prefix = f"{pack.title}, "
    return sum(
        any(
            c.get("source_type") == "library"
            and str(c.get("document", "")).startswith(prefix)
            for c in answer
        )
        for answer in answers
    )


def _chapter_numbers(documents: list[Document]) -> list[int]:
    # Chapter files are named "ch08-photosynthesis.pdf" by the seed command.
    numbers = (re.match(r"ch(\d+)-", d.filename) for d in documents)
    return sorted(int(m.group(1)) for m in numbers if m)


def _status(documents: list[Document]) -> str:
    if any(d.status in ("failed", "rejected") for d in documents):
        return "failed"
    if all(d.status == "ready" for d in documents):
        return "ready"
    return "indexing"


def _state(session, space: Space) -> LibraryOut:
    documents = _library_documents(session, space)
    if not documents:
        return LibraryOut(
            enabled=False,
            status="none",
            book_count=0,
            chapters_ready=0,
            chapters_total=0,
            pack_ids=[],
        )
    pack_ids = list(dict.fromkeys(d.pack_id for d in documents))
    return LibraryOut(
        enabled=space.library_enabled,
        status=_status(documents),
        book_count=len(pack_ids),
        chapters_ready=sum(d.status == "ready" for d in documents),
        chapters_total=len(documents),
        pack_ids=pack_ids,
    )


def _invalid_cursor() -> ApiError:
    return ApiError(422, "invalid_cursor", "That page link is not valid.")


@router.get("/spaces/{space_id}/library/books", response_model=CursorPage[ShelfBook])
def list_books(
    space: SpaceDep,
    session: SessionDep,
    limit: LimitQuery = 20,
    cursor: CursorQuery = None,
):
    """The textbooks on the Space's shelf by title, twenty at a time."""
    documents = _library_documents(session, space)
    on_shelf = {d.pack_id for d in documents}
    after = ()
    if cursor:
        title, pack_id = decode_cursor(cursor, 2)
        try:
            after = (
                tuple_(LibraryPack.title, LibraryPack.id)
                > tuple_(title, uuid.UUID(pack_id)),
            )
        except ValueError as exc:
            raise _invalid_cursor() from exc
    packs = list(
        session.scalars(
            select(LibraryPack)
            .where(LibraryPack.id.in_(on_shelf), *after)
            .order_by(LibraryPack.title, LibraryPack.id)
            .limit(limit + 1)
        )
    )
    answers = _answer_citations(session, space)
    books = []
    for pack in packs[:limit]:
        mine = [d for d in documents if d.pack_id == pack.id]
        books.append(
            ShelfBook(
                pack=PackOut.model_validate(pack),
                status=_status(mine),
                chapters_ready=sum(d.status == "ready" for d in mine),
                chapters_total=len(mine),
                chapters=_chapter_numbers(mine),
                cited_in_answers=_cited_in(answers, pack),
            )
        )
    return CursorPage(
        items=books,
        next_cursor=next_cursor(packs, limit, lambda p: [p.title, str(p.id)]),
        total=len(on_shelf),
    )


@router.get("/libraries", response_model=CursorPage[PackOut])
def list_packs(
    session: SessionDep,
    student: StudentDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    limit: LimitQuery = 20,
    cursor: CursorQuery = None,
):
    """The packs the seed command has made available, by title, twenty at a time. With
    `q`, only the packs that match those words (misspellings included), best match
    first."""
    words = (q or "").strip()
    if not words:
        after = ()
        if cursor:
            title, pack_id = decode_cursor(cursor, 2)
            try:
                after = (
                    tuple_(LibraryPack.title, LibraryPack.id)
                    > tuple_(title, uuid.UUID(pack_id)),
                )
            except ValueError as exc:
                raise _invalid_cursor() from exc
        packs = list(
            session.scalars(
                select(LibraryPack)
                .where(*after)
                .order_by(LibraryPack.title, LibraryPack.id)
                .limit(limit + 1)
            )
        )
        total = session.scalar(select(func.count()).select_from(LibraryPack))
        return CursorPage(
            items=packs[:limit],
            next_cursor=next_cursor(packs, limit, lambda p: [p.title, str(p.id)]),
            total=total,
        )
    # Applies to this transaction only; the `<%` operator reads it.
    session.execute(
        text(f"SET LOCAL pg_trgm.word_similarity_threshold = {TYPO_THRESHOLD}")
    )
    score, match = pack_match(words)
    after = ()
    if cursor:
        last_score, title, pack_id = decode_cursor(cursor, 3)
        try:
            ranked = float(last_score)
            after = (
                or_(
                    score < ranked,
                    and_(
                        score == ranked,
                        tuple_(LibraryPack.title, LibraryPack.id)
                        > tuple_(title, uuid.UUID(pack_id)),
                    ),
                ),
            )
        except ValueError as exc:
            raise _invalid_cursor() from exc
    rows = session.execute(
        select(LibraryPack, score.label("score"))
        .where(match, *after)
        .order_by(score.desc(), LibraryPack.title, LibraryPack.id)
        .limit(limit + 1)
    ).all()
    total = session.scalar(select(func.count()).select_from(LibraryPack).where(match))
    return CursorPage(
        items=[pack for pack, _ in rows[:limit]],
        next_cursor=next_cursor(
            rows, limit, lambda r: [repr(float(r[1])), r[0].title, str(r[0].id)]
        ),
        total=total,
    )


@router.get("/spaces/{space_id}/library", response_model=LibraryOut)
def get_library(space: SpaceDep, session: SessionDep):
    return _state(session, space)


@router.put("/spaces/{space_id}/library", response_model=LibraryOut)
def switch_library(body: LibraryIn, space: SpaceDep, session: SessionDep):
    """Switch the Space's whole Subject Library on or off. Off keeps the chapters
    but nothing in them is searched."""
    documents = _library_documents(session, space)
    if not documents:
        raise ApiError(409, "no_library", "This Study Space has no textbook yet.")
    for document in documents:
        document.enabled = body.enabled
    space.library_enabled = body.enabled
    session.commit()
    return _state(session, space)


@router.put("/spaces/{space_id}/library/packs/{pack_id}", response_model=LibraryOut)
def add_pack(
    pack_id: uuid.UUID,
    space: SpaceDep,
    session: SessionDep,
    background: BackgroundTasks,
):
    """Add a textbook to the Space: its chapters become documents of this Space and
    are indexed in the background. Adding it again retries chapters that failed.
    Adding a textbook switches the Library on."""
    pack = session.get(LibraryPack, pack_id)
    if pack is None:
        raise ApiError(404, "pack_not_found", "That textbook does not exist.")
    folder = seed_root() / pack.slug
    manifest_path = folder / "manifest.json"
    if not manifest_path.exists():
        raise ApiError(
            409,
            "library_not_seeded",
            "This textbook has not been downloaded yet. Run the seed command first.",
        )

    have = {}
    for document in _library_documents(session, space):
        if document.pack_id != pack.id:
            continue
        if document.status == "failed":
            session.delete(document)
        else:
            have[document.filename] = document

    new: list[tuple[Document, Path, int]] = []
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

    for document in _library_documents(session, space):
        document.enabled = True
    space.library_enabled = True
    session.commit()
    for document, path, first_page in new:
        background.add_task(
            ingest_library_document, document.id, space.id, path, first_page
        )
    return _state(session, space)


@router.delete("/spaces/{space_id}/library/packs/{pack_id}", response_model=LibraryOut)
def remove_pack(pack_id: uuid.UUID, space: SpaceDep, session: SessionDep):
    """Take a textbook off the Space's shelf and delete its chapters. The Library
    switches itself off when the last textbook goes."""
    for document in _library_documents(session, space):
        if document.pack_id == pack_id:
            session.delete(document)
    session.flush()
    if not _library_documents(session, space):
        space.library_enabled = False
    session.commit()
    return _state(session, space)
