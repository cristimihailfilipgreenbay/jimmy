"""The name of a chat: the Student's own, else the first question trimmed to a line."""

MAX_TITLE = 58


def trim_title(text: str) -> str:
    """The first question as a title: one line of at most 58 characters, cut at a word
    boundary with an ellipsis, as in the design."""
    line = " ".join(text.split())
    if len(line) <= MAX_TITLE:
        return line
    cut = line[:MAX_TITLE]
    space = cut.rfind(" ")
    cut = cut[:space] if space > 30 else cut
    return cut.rstrip(",.;:–- ") + "…"


def clean_custom_title(text: str | None, limit: int = 80) -> str | None:
    """A name the Student typed, or None to use the first question again."""
    line = " ".join((text or "").split())
    return line[:limit] or None
