import io

import pytest
from pypdf import PdfWriter

from app.documents.extract import MAX_PAGES, Rejected, extract


def _blank_pdf(pages: int) -> bytes:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=200, height=200)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def test_scanned_pdf_is_rejected_politely():
    # Pages with no text layer, which is what a scan looks like to a text extractor.
    with pytest.raises(Rejected) as err:
        extract("scan.pdf", _blank_pdf(3))
    assert (err.value.status, err.value.code) == (422, "scanned_document")
    assert "scanned" in err.value.message


def test_pdf_over_the_page_limit_is_rejected():
    with pytest.raises(Rejected) as err:
        extract("big.pdf", _blank_pdf(MAX_PAGES + 1))
    assert err.value.code == "too_many_pages"


def test_garbage_pdf_is_unreadable():
    with pytest.raises(Rejected) as err:
        extract("x.pdf", b"not a pdf")
    assert err.value.code == "unreadable_document"


def test_unknown_extension_is_rejected():
    with pytest.raises(Rejected) as err:
        extract("notes.docx", b"hello")
    assert err.value.code == "unsupported_type"


def test_markdown_becomes_one_page_titled_by_filename():
    result = extract("cell-biology.md", b"# Cells\n\nHello")
    assert result.title == "cell-biology"
    assert result.page_count is None
    assert result.pages[0].number is None


def test_blank_text_file_is_rejected():
    with pytest.raises(Rejected) as err:
        extract("empty.txt", b"  \n ")
    assert err.value.code == "empty_document"
