import pytest

from app.errors import ApiError
from app.pagination import PageParams, decode_cursor, encode_cursor


def test_a_cursor_round_trips():
    cursor = encode_cursor("2026-11-17T10:00:00+00:00", "abc")
    assert decode_cursor(cursor, 2) == ["2026-11-17T10:00:00+00:00", "abc"]


@pytest.mark.parametrize("text", ["!!!", "e30", "WyJhIl0", encode_cursor("only one")])
def test_a_cursor_that_is_not_ours_is_refused(text):
    with pytest.raises(ApiError) as caught:
        decode_cursor(text, 2)
    assert caught.value.status_code == 422


def test_the_offset_of_a_page_follows_its_size():
    assert PageParams(page=1, page_size=10).offset == 0
    assert PageParams(page=3, page_size=10).offset == 20
