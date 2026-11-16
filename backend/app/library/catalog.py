"""The Subject Library packs Jimmy can seed: OpenStax chapters (docs/design.md section 7).

Only a few chapters per book are used, so a Study Space stays small.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PackSpec:
    slug: str
    title: str
    author: str
    license: str
    source_url: str
    subject: str
    pdf_url: str
    # Chapter numbers to keep from the book.
    chapters: tuple[int, ...]


CATALOG = (
    PackSpec(
        slug="biology-2e",
        title="Biology 2e",
        author="Mary Ann Clark, Matthew Douglas, Jung Choi",
        license="CC BY-NC-SA 4.0",
        source_url="https://openstax.org/details/books/biology-2e",
        subject="Biology",
        pdf_url="https://assets.openstax.org/oscms-prodcms/media/documents/Biology-2e_-_WEB.pdf",
        chapters=(5, 7, 8),
    ),
    PackSpec(
        slug="college-physics-2e",
        title="College Physics 2e",
        author="Paul Peter Urone, Roger Hinrichs",
        license="CC BY-NC-SA 4.0",
        source_url="https://openstax.org/details/books/college-physics-2e",
        subject="Physics",
        pdf_url="https://assets.openstax.org/oscms-prodcms/media/documents/college-physics-2e_-_WEB.pdf",
        chapters=(4, 7, 8),
    ),
)
