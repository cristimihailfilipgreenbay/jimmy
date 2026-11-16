"""The Promotion gate and how Findings reach it."""

import uuid
from unittest.mock import patch

import pytest

from app.chat.citations import Citation
from app.learned.promotion import (
    Decision,
    gate,
    parse_decision,
    promote_finding,
    promote_in_background,
)

GOOD = Decision(True, "core topic", relevant=True, reputable=True, stable=True)


def test_a_good_finding_is_promoted():
    assert gate(GOOD, injected=False, duplicate=False) is None


def test_an_injected_finding_is_refused_even_if_the_tutor_said_save():
    assert "instructions" in gate(GOOD, injected=True, duplicate=False)


@pytest.mark.parametrize(
    ("field", "expected"),
    [
        ("relevant", "relevant"),
        ("reputable", "reputable"),
        ("stable", "out of date"),
    ],
)
def test_each_rule_can_refuse(field, expected):
    bad = Decision(**{**GOOD.__dict__, field: False})
    assert expected in gate(bad, injected=False, duplicate=False)


def test_a_duplicate_is_refused():
    assert "already has it" in gate(GOOD, injected=False, duplicate=True)


def test_keeping_it_in_the_conversation_gives_the_tutors_reason():
    keep = Decision(False, "a one-off fact", True, True, True)
    assert gate(keep, injected=False, duplicate=False) == "a one-off fact"


def test_a_missing_or_loose_answer_counts_as_no():
    assert parse_decision({}).save is False
    assert parse_decision({"save": "yes", "relevant": 1}).save is False
    d = parse_decision(
        {
            "save": True,
            "reason": "x",
            "relevant": True,
            "reputable": True,
            "stable": True,
        }
    )
    assert gate(d, injected=False, duplicate=False) is None


def _finding(source="wikipedia", url="https://en.wikipedia.org/wiki/A", n=1):
    return Citation(
        id=n,
        source_type=source,
        document="A",
        author=None,
        page_or_section="en.wikipedia.org",
        passage="text",
        url=url,
    )


def test_only_web_findings_are_promoted_once_each():
    seen = []
    with patch("app.learned.promotion.threading.Thread") as thread:
        thread.side_effect = lambda target, **kw: type(
            "T", (), {"start": lambda s: target()}
        )()
        with patch(
            "app.learned.promotion.promote_finding",
            side_effect=lambda space, name, f: seen.append(f.url),
        ):
            promote_in_background(
                uuid.uuid4(),
                "Biology",
                [
                    _finding(),
                    _finding(n=2),  # same page cited twice
                    _finding("learned", "https://x.org/learned", 3),  # already saved
                    _finding("notes", None, 4),
                    _finding("web", "https://site.org/b", 5),
                ],
            )
    assert seen == ["https://en.wikipedia.org/wiki/A", "https://site.org/b"]


def test_no_web_finding_starts_no_background_work():
    with patch("app.learned.promotion.threading.Thread") as thread:
        promote_in_background(uuid.uuid4(), "Biology", [_finding("notes", None)])
    thread.assert_not_called()


def _run(decision, *, injected=False, duplicate=False):
    saved = []
    with (
        patch("app.learned.promotion.start_job", return_value=uuid.uuid4()),
        patch("app.learned.promotion.finish_job") as finish,
        patch("app.learned.promotion.decide", return_value=decision),
        patch(
            "app.learned.promotion.scan_passages",
            return_value={0} if injected else set(),
        ),
        patch("app.learned.promotion.embed_texts", return_value=[[0.1]]),
        patch("app.learned.promotion.is_duplicate", return_value=duplicate),
        patch("app.learned.promotion.save", side_effect=lambda *a: saved.append(a)),
    ):
        promote_finding(uuid.uuid4(), "Biology", _finding())
    return saved, finish.call_args


def test_a_good_finding_is_saved_and_reported():
    saved, finish = _run(GOOD)
    assert len(saved) == 1
    assert finish.args[1] == "succeeded" and finish.args[3] == {"outcome": "saved"}


def test_an_injected_finding_is_not_saved():
    saved, finish = _run(GOOD, injected=True)
    assert saved == []
    assert finish.args[3] == {"outcome": "refused"}


def test_a_duplicate_is_not_saved():
    saved, finish = _run(GOOD, duplicate=True)
    assert saved == [] and finish.args[3] == {"outcome": "kept"}


def test_a_crash_is_reported_as_failed_not_raised():
    with (
        patch("app.learned.promotion.start_job", return_value=uuid.uuid4()),
        patch("app.learned.promotion.finish_job") as finish,
        patch("app.learned.promotion.decide", side_effect=RuntimeError("down")),
    ):
        promote_finding(uuid.uuid4(), "Biology", _finding())
    assert finish.call_args.args[1] == "failed"
