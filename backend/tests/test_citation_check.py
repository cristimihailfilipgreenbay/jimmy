from app.chat.citations import (
    check_answer,
    cited_ids,
    enforce,
    page_or_section,
    strip_markers,
)


def test_cited_and_labelled_paragraphs_pass():
    text = "ATP is the energy currency. [1]\n\n[tutor] It was found in 1929."
    assert check_answer(text, {1, 2}) == []


def test_paragraph_without_citation_or_label_fails():
    problems = check_answer("Cited. [1]\n\nNo source at all.", {1})
    assert len(problems) == 1
    assert "Paragraph 2" in problems[0]


def test_citation_that_no_search_returned_fails():
    problems = check_answer("Made up. [7]", {1, 2})
    assert "[7]" in problems[0]


def test_empty_answer_fails():
    assert check_answer("   ", {1})


def test_enforce_labels_unattributed_paragraphs_and_drops_bad_ids():
    text = "Fine. [1]\n\nNo source.\n\nBad id. [9]"
    fixed = enforce(text, {1})
    assert check_answer(fixed, {1}) == []
    paragraphs = fixed.split("\n\n")
    assert paragraphs[0] == "Fine. [1]"
    assert paragraphs[1] == "[tutor] No source."
    assert paragraphs[2] == "[tutor] Bad id."


def test_cited_ids_are_in_order_of_first_use_and_only_valid():
    assert cited_ids("A [2][1] B [2] C [5]", {1, 2}) == [2, 1]


def test_strip_markers_leaves_plain_text():
    assert strip_markers("[tutor] Hello. [1][2]\n\nBye [3]") == "Hello.\n\nBye"


def test_page_or_section():
    assert page_or_section(12, 12, None) == "p. 12"
    assert page_or_section(12, 14, "Intro") == "pp. 12–14"
    assert page_or_section(None, None, "Intro") == "Intro"
    assert page_or_section(None, None, None) is None
