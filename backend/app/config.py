from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = "postgresql+psycopg://jimmy:jimmy@localhost:5432/jimmy"

    # LangSmith reads LANGSMITH_* straight from the environment; these are only
    # needed to decide whether to run the startup trace.
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
