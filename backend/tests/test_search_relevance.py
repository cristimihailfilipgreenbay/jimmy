from types import SimpleNamespace

from app.chat.tools import relevant


def hits(*distances):
    return [SimpleNamespace(distance=d) for d in distances]


def test_far_passages_are_dropped():
    kept = relevant(hits(0.5, 0.66, 0.71))
    assert [h.distance for h in kept] == [0.5]


def test_unrelated_search_finds_nothing():
    assert relevant(hits(0.73, 0.77, 0.8)) == []


def test_passages_close_to_the_best_stay():
    kept = relevant(hits(0.42, 0.48, 0.54, 0.6))
    assert [h.distance for h in kept] == [0.42, 0.48, 0.54]


def test_no_hits():
    assert relevant([]) == []
