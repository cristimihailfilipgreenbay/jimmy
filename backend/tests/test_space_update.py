import pytest
from pydantic import ValidationError

from app.spaces.schemas import SpaceUpdate


def test_only_the_fields_that_are_sent_are_marked_as_sent():
    update = SpaceUpdate.model_validate({"accent": "plum"})
    assert update.model_fields_set == {"accent"}
    assert update.accent == "plum"


def test_course_can_be_cleared_with_null_or_blank():
    assert SpaceUpdate.model_validate({"course": None}).model_fields_set == {"course"}
    assert SpaceUpdate.model_validate({"course": "   "}).course is None


def test_course_is_trimmed_and_limited():
    assert (
        SpaceUpdate.model_validate({"course": " BIO 202 · Prof. Weber "}).course
        == "BIO 202 · Prof. Weber"
    )
    with pytest.raises(ValidationError):
        SpaceUpdate.model_validate({"course": "x" * 121})


def test_name_and_accent_cannot_be_null_or_invalid():
    for bad in ({"name": None}, {"name": "  "}, {"accent": None}, {"accent": "red"}):
        with pytest.raises(ValidationError):
            SpaceUpdate.model_validate(bad)
