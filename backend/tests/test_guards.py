from app.chat.guards import call_key, is_doom_loop


def test_three_identical_calls_are_a_doom_loop():
    key = call_key("search_notes", {"query": "atp"})
    assert not is_doom_loop([key, key])
    assert is_doom_loop([key, "other", key, key])


def test_different_arguments_are_different_calls():
    keys = [call_key("search_notes", {"query": q}) for q in ("a", "b", "c")]
    assert not is_doom_loop(keys)


def test_argument_order_does_not_matter():
    assert call_key("t", {"a": 1, "b": 2}) == call_key("t", {"b": 2, "a": 1})
