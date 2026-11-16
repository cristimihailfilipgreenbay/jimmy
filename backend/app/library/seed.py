"""Download the OpenStax chapters into `data/seed/` and register the packs.

    uv run python -m app.library.seed          (in Docker: docker compose exec backend python -m app.library.seed)

Idempotent: chapters already on disk are not downloaded again, and packs are updated
in place. Each pack gets a folder with one small PDF per chapter and a `manifest.json`;
`data/seed/ATTRIBUTION.md` credits title, author and licence. Nothing here is committed.
"""

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path

import httpx
from pypdf import PdfReader, PdfWriter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import engine
from app.library.catalog import CATALOG, PackSpec
from app.library.models import LibraryPack

log = logging.getLogger(__name__)

_CHAPTER = re.compile(r"^Chapter\s+(\d+)\s+(.+)$")


@dataclass(frozen=True)
class ChapterRange:
    number: int
    title: str
    # Zero-based PDF page indexes, end exclusive.
    start: int
    end: int


def seed_root() -> Path:
    return Path(get_settings().seed_dir)


def chapter_ranges(reader: PdfReader, wanted: tuple[int, ...]) -> list[ChapterRange]:
    """Where each wanted chapter starts and ends, from the book's top-level bookmarks."""
    marks = [
        (item.title.strip(), reader.get_destination_page_number(item))
        for item in reader.outline
        if not isinstance(item, list)
    ]
    found: list[ChapterRange] = []
    for i, (title, start) in enumerate(marks):
        match = _CHAPTER.match(title)
        if not match or int(match.group(1)) not in wanted:
            continue
        end = marks[i + 1][1] if i + 1 < len(marks) else len(reader.pages)
        found.append(ChapterRange(int(match.group(1)), match.group(2), start, end))
    missing = set(wanted) - {c.number for c in found}
    if missing:
        raise ValueError(f"Chapters not found in the book: {sorted(missing)}")
    return found


def chapter_filename(chapter: ChapterRange) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", chapter.title.lower()).strip("-")[:50]
    return f"ch{chapter.number:02d}-{slug}.pdf"


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, follow_redirects=True, timeout=120) as response:
        response.raise_for_status()
        with dest.open("wb") as out:
            for block in response.iter_bytes(1 << 20):
                out.write(block)


def _slice_chapters(spec: PackSpec, book: Path, folder: Path) -> list[dict]:
    reader = PdfReader(book)
    entries = []
    for chapter in chapter_ranges(reader, spec.chapters):
        writer = PdfWriter()
        for index in range(chapter.start, chapter.end):
            writer.add_page(reader.pages[index])
        name = chapter_filename(chapter)
        with (folder / name).open("wb") as out:
            writer.write(out)
        entries.append(
            {
                "number": chapter.number,
                "title": chapter.title,
                "file": name,
                # The book's own page of the file's first page (the PDF page labels
                # equal the PDF page number), so Citations name the book's pages.
                "first_page": chapter.start + 1,
            }
        )
    return entries


def prepare_pack(spec: PackSpec, root: Path) -> dict:
    """Make sure the pack's chapter files and manifest exist; returns the manifest."""
    folder = root / spec.slug
    manifest_path = folder / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        if all((folder / c["file"]).exists() for c in manifest["chapters"]):
            log.info("%s: chapters already downloaded", spec.title)
            return manifest
    folder.mkdir(parents=True, exist_ok=True)
    book = root / ".cache" / f"{spec.slug}.pdf"
    log.info("%s: downloading %s (large; this takes a while)", spec.title, spec.pdf_url)
    _download(spec.pdf_url, book)
    try:
        chapters = _slice_chapters(spec, book, folder)
    finally:
        book.unlink(missing_ok=True)
    manifest = {"slug": spec.slug, "chapters": chapters}
    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest


def write_attribution(root: Path) -> None:
    lines = [
        "# Attribution",
        "",
        (
            "The Subject Library demo data is made of chapters from OpenStax "
            "textbooks, used under their open licences. Chapters are unmodified, "
            "cut from the published PDFs."
        ),
        "",
    ]
    for spec in CATALOG:
        manifest = json.loads((root / spec.slug / "manifest.json").read_text())
        chapters = ", ".join(
            f"{c['number']} ({c['title']})" for c in manifest["chapters"]
        )
        lines += [
            f"## {spec.title}",
            "",
            f"- Authors: {spec.author}",
            "- Publisher: OpenStax, Rice University",
            f"- Licence: {spec.license}",
            f"- Source: {spec.source_url}",
            f"- Chapters used: {chapters}",
            "",
        ]
    (root / "ATTRIBUTION.md").write_text("\n".join(lines))


def register_packs(session: Session, specs=CATALOG) -> None:
    for spec in specs:
        pack = session.scalar(select(LibraryPack).where(LibraryPack.slug == spec.slug))
        if pack is None:
            pack = LibraryPack(slug=spec.slug)
            session.add(pack)
        pack.title = spec.title
        pack.author = spec.author
        pack.license = spec.license
        pack.source_url = spec.source_url
        pack.subject = spec.subject
    session.commit()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    root = seed_root()
    for spec in CATALOG:
        prepare_pack(spec, root)
    write_attribution(root)
    with Session(engine) as session:
        register_packs(session)
    log.info("Done. Subject Library packs are ready in %s", root)


if __name__ == "__main__":
    main()
