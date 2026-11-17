from typing import Literal

from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    rating: Literal["up", "down"]
    comment: str | None = Field(default=None, max_length=500)


class FeedbackOut(BaseModel):
    message_id: str
    rating: str
    comment: str | None
    # True when this rating made Jimmy propose a style change (see /profile/facts).
    style_proposed: bool
