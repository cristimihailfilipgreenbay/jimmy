from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

Temperature = Annotated[float, Field(ge=0, le=1)]
MaxTokens = Annotated[int, Field(ge=128, le=8192)]
ModelName = Annotated[str, Field(max_length=100)]


class ToolOut(BaseModel):
    name: str
    label: str
    description: str
    enabled: bool


class SettingsOut(BaseModel):
    # The model in use: the Student's choice, else the one set in the environment.
    tutor_model: str
    temperature: float
    max_tokens: int
    tools: list[ToolOut]
    show_usage: bool
    # Fixed once Notes exist, because changing it means embedding everything again.
    embedding_model: str
    embedding_dimensions: int
    embedding_locked: bool


class SettingsIn(BaseModel):
    """Only what is sent changes. An empty model name goes back to the default."""

    tutor_model: ModelName | None = None
    temperature: Temperature | None = None
    max_tokens: MaxTokens | None = None
    # Tool name -> on or off.
    tools: dict[str, bool] | None = None
    show_usage: bool | None = None


class ModelOut(BaseModel):
    id: str
    name: str
    description: str
    # Dollars per token; null when OpenRouter does not list one.
    prompt: float | None
    completion: float | None
    # Whether the model uses a temperature; null when OpenRouter could not be asked.
    supports_temperature: bool | None


class UsageItem(BaseModel):
    message_id: str
    question: str
    model: str | None
    tools: list[str]
    tokens_in: int | None
    tokens_out: int | None
    cost_usd: float | None
    created_at: datetime


class UsageOut(BaseModel):
    # Estimated cost of every answer counted, not only the ones listed.
    total_usd: float
    answers: int
    items: list[UsageItem]
