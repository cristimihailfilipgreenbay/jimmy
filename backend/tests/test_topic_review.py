"""The Topic review: what the Student's answers turn into."""

import pytest

from app.topics.extract import normalise_names, propose_topics, sample_text
from app.topics.review import (
    Decision,
    Existing,
    InvalidReview,
    Proposed,
    resolve_review,
)

PROPOSED = [
    Proposed("p1", "Facilitated diffusion"),
    Proposed("p2", "Active transport"),
    Proposed("p3", "Sodium-potassium pump"),
    Proposed("p4", "Na+/K+-ATPase"),
]
EXISTING = [Existing("e1", "Osmosis")]


def test_no_decisions_approves_everything():
    assert resolve_review(PROPOSED, EXISTING, []) == [p.name for p in PROPOSED]


def test_rename_remove_and_merge_into_a_proposed_topic():
    final = resolve_review(
        PROPOSED,
        EXISTING,
        [
            Decision("p1", "rename", name="  Facilitated   diffusion (carriers) "),
            Decision("p2", "remove"),
            Decision("p4", "merge", into="p3"),
        ],
    )
    assert final == ["Facilitated diffusion (carriers)", "Sodium-potassium pump"]


def test_merge_into_an_existing_topic_creates_nothing():
    final = resolve_review(
        [Proposed("p1", "Osmosis & tonicity")],
        EXISTING,
        [Decision("p1", "merge", into="e1")],
    )
    assert final == []


def test_a_name_the_space_already_has_is_not_created_twice():
    final = resolve_review(
        [Proposed("p1", "osmosis"), Proposed("p2", "Active transport")], EXISTING, []
    )
    assert final == ["Active transport"]


def test_renaming_two_topics_to_one_name_keeps_the_first():
    final = resolve_review(
        PROPOSED[:2],
        [],
        [
            Decision("p1", "rename", name="Transport"),
            Decision("p2", "rename", name="transport"),
        ],
    )
    assert final == ["Transport"]


@pytest.mark.parametrize(
    "decisions",
    [
        [Decision("nope", "approve")],
        [Decision("p1", "approve"), Decision("p1", "remove")],
        [Decision("p1", "shuffle")],
        [Decision("p1", "rename", name="   ")],
        [Decision("p1", "merge", into="p1")],
        [Decision("p1", "merge", into="missing")],
        [Decision("p1", "merge", into="p2"), Decision("p2", "merge", into="p1")],
        [Decision("p1", "merge", into="p2"), Decision("p2", "remove")],
    ],
)
def test_answers_that_make_no_sense_are_refused(decisions):
    with pytest.raises(InvalidReview):
        resolve_review(PROPOSED, EXISTING, decisions)


def test_model_output_is_cleaned_up():
    names = normalise_names(["  Osmosis ", "osmosis", "", "Cell\nmembrane", "x" * 300])
    assert names[0] == "Osmosis"
    assert names[1] == "Cell membrane"
    assert len(names) == 3 and len(names[2]) == 120


def test_long_documents_are_sampled_from_every_chunk():
    texts = [f"chunk{i} " + "word " * 1000 for i in range(40)]
    sample = sample_text(texts, limit=4000)
    assert len(sample) <= 4000
    assert "chunk0" in sample and "chunk20" in sample


def test_proposals_come_from_a_fake_model():
    class FakeModel:
        def with_structured_output(self, schema):
            return self

        def invoke(self, messages):
            from app.topics.extract import TopicNames

            assert "<notes>" in messages[1].content
            return TopicNames(topics=["Osmosis", "osmosis", "Diffusion"])

    assert propose_topics(["Some notes"], model=FakeModel()) == ["Osmosis", "Diffusion"]
