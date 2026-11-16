import pytest
from pydantic import ValidationError

from app.onboarding.schemas import OnboardingIn


def payload(**overrides):
    body = {
        "name": "Ana",
        "subjects": [{"name": "Genetics", "accent": "rosewood"}],
    }
    body.update(overrides)
    return body


def test_minimal_onboarding_is_valid_and_defaults_are_set():
    parsed = OnboardingIn.model_validate(payload())
    assert parsed.preferences.explanation_style == "balanced"
    assert parsed.preferences.web_search is True
    assert parsed.preferences.goals == []
    assert parsed.studies.course is None


def test_a_name_and_at_least_one_subject_are_required():
    with pytest.raises(ValidationError):
        OnboardingIn.model_validate(payload(name="   "))
    with pytest.raises(ValidationError):
        OnboardingIn.model_validate(payload(subjects=[]))


def test_subject_names_must_be_unique_ignoring_case():
    subjects = [
        {"name": "Biology", "accent": "teal"},
        {"name": " biology ", "accent": "olive"},
    ]
    with pytest.raises(ValidationError):
        OnboardingIn.model_validate(payload(subjects=subjects))


def test_blank_optional_text_becomes_none_and_text_is_trimmed():
    parsed = OnboardingIn.model_validate(
        payload(
            studies={"course": "  BSc Biology ", "university": "   ", "year": "2nd"},
            subjects=[{"name": "Genetics", "course": "  ", "accent": "plum"}],
        )
    )
    assert parsed.studies.course == "BSc Biology"
    assert parsed.studies.university is None
    assert parsed.subjects[0].course is None


def test_unknown_year_goal_style_or_colour_is_rejected():
    for bad in (
        payload(studies={"year": "5th"}),
        payload(preferences={"goals": ["cheat"]}),
        payload(preferences={"explanation_style": "epic"}),
        payload(subjects=[{"name": "X", "accent": "red"}]),
    ):
        with pytest.raises(ValidationError):
            OnboardingIn.model_validate(bad)


def test_repeated_goals_are_collapsed_in_order():
    parsed = OnboardingIn.model_validate(
        payload(preferences={"goals": ["exams", "understand", "exams"]})
    )
    assert parsed.preferences.goals == ["exams", "understand"]


def test_at_most_twenty_subjects():
    subjects = [{"name": f"Subject {i}", "accent": "slate"} for i in range(21)]
    with pytest.raises(ValidationError):
        OnboardingIn.model_validate(payload(subjects=subjects))
