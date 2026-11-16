"""Limits that stop a runaway Tutor run (iteration cap and doom-loop stop)."""

import json
from collections.abc import Sequence

MAX_MODEL_CALLS = 8
DOOM_LOOP_REPEATS = 3


class StepLimitReached(Exception):
    """The run used its eight steps, or repeated the same tool call three times."""


def call_key(name: str, args: dict) -> str:
    return f"{name}:{json.dumps(args, sort_keys=True, default=str)}"


def is_doom_loop(calls: Sequence[str], repeats: int = DOOM_LOOP_REPEATS) -> bool:
    """True when the same tool call was made `repeats` times (anywhere in the run)."""
    return any(calls.count(key) >= repeats for key in set(calls))
