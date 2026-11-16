"""The Student's Topic review, applied: pure functions, no database.

The ingestion run pauses with a list of proposed Topics. The Student answers with one
decision per Topic (or none, which means approve). `resolve_review` turns that into the
final list of Topic names to create, or says why the answer cannot be applied.
"""

from dataclasses import dataclass

MAX_NAME = 120
ACTIONS = ("approve", "rename", "merge", "remove")


class InvalidReview(Exception):
    """The Student's decisions do not make sense; the run stays paused."""


@dataclass(frozen=True)
class Proposed:
    id: str
    name: str


@dataclass(frozen=True)
class Existing:
    id: str
    name: str


@dataclass(frozen=True)
class Decision:
    id: str
    action: str
    # The new name, for `rename`.
    name: str | None = None
    # Where a `merge` goes: the id of another proposed Topic or of an existing one.
    into: str | None = None


def clean_name(name: str) -> str:
    """One line, single spaces, at most MAX_NAME characters."""
    return " ".join(name.split())[:MAX_NAME].strip()


def resolve_review(
    proposed: list[Proposed],
    existing: list[Existing],
    decisions: list[Decision],
) -> list[str]:
    """The names of the Topics to create, in the order they were proposed.

    A Topic with no decision is approved. A merge into an existing Topic, or into a
    Topic that ends up with the same name as an existing one, creates nothing.
    """
    by_id = {p.id: p for p in proposed}
    existing_ids = {e.id for e in existing}
    chosen: dict[str, Decision] = {}
    for d in decisions:
        if d.id not in by_id:
            raise InvalidReview("That Topic is not in the list.")
        if d.id in chosen:
            raise InvalidReview("A Topic can only have one decision.")
        if d.action not in ACTIONS:
            raise InvalidReview("Unknown action.")
        chosen[d.id] = d

    names: dict[str, str] = {}
    for p in proposed:
        d = chosen.get(p.id)
        if d is not None and d.action == "rename":
            renamed = clean_name(d.name or "")
            if not renamed:
                raise InvalidReview("A Topic needs a name.")
            names[p.id] = renamed
        else:
            names[p.id] = clean_name(p.name)

    def check_merge(start: str) -> None:
        """Follow a chain of merges to its end; it must end in a Topic that is kept."""
        seen: set[str] = set()
        current = start
        while True:
            d = chosen.get(current)
            if d is None or d.action in ("approve", "rename"):
                return
            if d.action == "remove":
                raise InvalidReview("Cannot merge into a Topic that is removed.")
            if d.into in existing_ids:
                return
            seen.add(current)
            if d.into not in by_id or d.into in seen:
                raise InvalidReview("Merge into a different Topic in the list.")
            current = d.into

    keep: list[str] = []
    for p in proposed:
        d = chosen.get(p.id)
        if d is not None and d.action == "merge":
            check_merge(p.id)
        elif d is None or d.action != "remove":
            keep.append(p.id)

    taken = {e.name.casefold() for e in existing}
    final: list[str] = []
    for pid in keep:
        key = names[pid].casefold()
        if key in taken:
            continue
        taken.add(key)
        final.append(names[pid])
    return final
