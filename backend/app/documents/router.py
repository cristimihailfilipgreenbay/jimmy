import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Response, UploadFile
from sqlalchemy import select

from app.db import SessionDep
from app.documents.extract import MAX_BYTES, Rejected, extract
from app.documents.ingestion import run_ingestion
from app.documents.models import Document
from app.documents.schemas import DocumentOut
from app.errors import ApiError
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space

router = APIRouter(tags=["documents"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


def _get_document(session, space: Space, document_id: uuid.UUID) -> Document:
    document = session.get(Document, document_id)
    if document is None or document.space_id != space.id:
        raise ApiError(404, "document_not_found", "That document does not exist.")
    return document


@router.post(
    "/spaces/{space_id}/documents", response_model=DocumentOut, status_code=202
)
def upload_document(
    file: UploadFile,
    space: SpaceDep,
    session: SessionDep,
    background: BackgroundTasks,
):
    """Check the file, store the document, and index it in the background."""
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ApiError(
            413,
            "file_too_large",
            f"That file is over the {MAX_BYTES // (1024 * 1024)} MB limit.",
        )
    filename = (file.filename or "notes").rsplit("/", 1)[-1]
    try:
        extracted = extract(filename, data)
    except Rejected as rejected:
        raise ApiError(rejected.status, rejected.code, rejected.message)

    document = Document(
        space_id=space.id,
        kind="notes",
        title=extracted.title[:300],
        author=extracted.author[:300] if extracted.author else None,
        filename=filename[:300],
        mime_type=extracted.mime_type,
        size_bytes=len(data),
        page_count=extracted.page_count,
        status="uploaded",
    )
    session.add(document)
    session.commit()
    background.add_task(run_ingestion, document.id, space.id, extracted.pages)
    return document


@router.get("/spaces/{space_id}/documents", response_model=list[DocumentOut])
def list_documents(space: SpaceDep, session: SessionDep):
    return session.scalars(
        select(Document)
        .where(Document.space_id == space.id)
        .order_by(Document.created_at.desc())
    )


@router.get("/spaces/{space_id}/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: uuid.UUID, space: SpaceDep, session: SessionDep):
    return _get_document(session, space, document_id)


@router.delete("/spaces/{space_id}/documents/{document_id}", status_code=204)
def delete_document(document_id: uuid.UUID, space: SpaceDep, session: SessionDep):
    """Deletes the document; its chunks go with it (ON DELETE CASCADE)."""
    session.delete(_get_document(session, space, document_id))
    session.commit()
    return Response(status_code=204)
