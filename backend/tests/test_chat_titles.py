import pytest

from app.chat.titles import MAX_TITLE, clean_custom_title, trim_title


def test_a_short_question_is_its_own_title():
    assert (
        trim_title("Explain the Calvin cycle in 3 steps")
        == "Explain the Calvin cycle in 3 steps"
    )


def test_a_long_question_is_cut_at_a_word_with_an_ellipsis():
    title = trim_title(
        "Where does the light-dependent stage of photosynthesis happen, and what does it produce?"
    )
    assert title.endswith("…")
    assert len(title) <= MAX_TITLE + 1
    assert title == "Where does the light-dependent stage of photosynthesis…"


def test_whitespace_and_new_lines_become_one_line():
    assert trim_title("  What is\n\n osmosis?  ") == "What is osmosis?"


def test_a_word_longer_than_the_limit_is_cut_where_it_is():
    assert trim_title("a" * 100) == "a" * MAX_TITLE + "…"


@pytest.mark.parametrize("typed", [None, "", "   \n "])
def test_an_empty_name_means_the_first_question_again(typed):
    assert clean_custom_title(typed) is None


def test_a_typed_name_is_tidied_and_limited():
    assert clean_custom_title("  Membranes   in the cold ") == "Membranes in the cold"
    assert len(clean_custom_title("x" * 200) or "") == 80
