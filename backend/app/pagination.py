"""Page-based pagination: `?page=` (from 1) and `?page_size=`, for lists the Student
browses by page number. Lists that only grow at one end use a cursor instead."""

import base64
import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query
from pydantic import BaseModel

from app.errors import ApiError

MAX_PAGE_SIZE = 50


@dataclass(frozen=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 10,
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


PageDep = Annotated[PageParams, Depends(page_params)]


# ---------------------------------------------------------------------------
# Cursor pagination: for lists that grow at one end and are read in one direction, with
# a keyset (the sort columns of the last row) instead of an offset, so rows that arrive or
# go while the Student reads do not shift or repeat the next page.
# ---------------------------------------------------------------------------


class CursorPage[T](BaseModel):
    items: list[T]
    # Pass it as `?cursor=` for the next page; null on the last one.
    next_cursor: str | None
    # Rows in the whole list (with the filter, if any).
    total: int


def encode_cursor(*values: str) -> str:
    raw = json.dumps(list(values)).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str, size: int) -> list[str]:
    """The values `encode_cursor` was given, or a 422 if the text is not one of ours."""
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        values = json.loads(base64.urlsafe_b64decode(padded))
        if (
            isinstance(values, list)
            and len(values) == size
            and all(isinstance(v, str) for v in values)
        ):
            return values
    except ValueError:
        pass
    raise ApiError(
        422, "invalid_cursor", "That page link is not valid. Reload the list."
    )


def next_cursor[R](
    rows: list[R], limit: int, key: Callable[[R], list[str]]
) -> str | None:
    """The cursor for the page after `rows[:limit]`, given one more row than the page
    holds (to know there is one); None when there is no next page."""
    return encode_cursor(*key(rows[limit - 1])) if len(rows) > limit else None


LimitQuery = Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)]
CursorQuery = Annotated[str | None, Query()]
