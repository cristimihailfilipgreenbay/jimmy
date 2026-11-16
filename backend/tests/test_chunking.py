from app.documents.chunking import chunk_pages
from app.documents.extract import Page


def test_chunks_keep_their_page_numbers():
    pages = [Page(1, "a" * 60), Page(2, "b" * 60), Page(3, "c" * 60)]
    chunks = chunk_pages(pages, max_chars=130, overlap_chars=0)
    assert [(c.page_start, c.page_end) for c in chunks] == [(1, 2), (3, 3)]


def test_every_chunk_fits_the_limit_and_nothing_is_lost():
    text = "word " * 2000
    chunks = chunk_pages([Page(1, text)], max_chars=500, overlap_chars=0)
    assert all(len(c.text) <= 500 for c in chunks)
    assert "".join("".join(c.text.split()) for c in chunks) == "word" * 2000
    assert len(chunks) > 1


def test_markdown_chunks_carry_their_section_and_no_page():
    md = "# Cells\n\nCells are small.\n\n## Organelles\n\nThe nucleus holds DNA."
    (only,) = chunk_pages([Page(None, md)])
    assert only.page_start is None and only.page_end is None
    assert only.section == "Cells"
    chunks = chunk_pages([Page(None, md)], max_chars=30, overlap_chars=0)
    assert chunks[-1].section == "Organelles"


def test_indexes_run_from_zero_and_overlap_is_not_a_chunk_of_its_own():
    pages = [Page(1, "x" * 50 + "\n\n" + "y" * 50)]
    chunks = chunk_pages(pages, max_chars=60, overlap_chars=60)
    assert [c.index for c in chunks] == list(range(len(chunks)))
    assert chunks[-1].text.endswith("y" * 50)
    assert len(chunks) == 2


def test_empty_pages_give_no_chunks():
    assert chunk_pages([Page(1, "   "), Page(2, "")]) == []
