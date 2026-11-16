"""Which Topic the next question is about. Weak Topics are weighted up (docs/design.md)."""

import random
import uuid

WEAK_WEIGHT = 3
NORMAL_WEIGHT = 1


def pick_topic(
    topic_ids: list[uuid.UUID],
    weak_ids: set[uuid.UUID],
    previous: uuid.UUID | None = None,
    rng: random.Random | None = None,
) -> uuid.UUID:
    """A weak Topic is three times as likely as another. The same Topic is not asked
    twice in a row unless it is the only one chosen."""
    if not topic_ids:
        raise ValueError("no Topics to pick from")
    rng = rng or random.Random()
    pool = [t for t in topic_ids if t != previous] or list(topic_ids)
    weights = [WEAK_WEIGHT if t in weak_ids else NORMAL_WEIGHT for t in pool]
    return rng.choices(pool, weights=weights, k=1)[0]


def next_difficulty(current: str, recent: list[bool]) -> str:
    """Harder after two correct answers in a row, easier after a wrong one."""
    levels = ["easy", "medium", "hard"]
    i = levels.index(current) if current in levels else 1
    if recent and not recent[-1]:
        i -= 1
    elif len(recent) >= 2 and recent[-1] and recent[-2]:
        i += 1
    return levels[max(0, min(len(levels) - 1, i))]
