import logging
import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = "postgresql+psycopg://jimmy:jimmy@localhost:5432/jimmy"

    # Signs the session cookie. Unset: a random one per process, so sessions end
    # on restart. Set JWT_SECRET (e.g. `openssl rand -hex 32`) to keep them.
    jwt_secret: str = ""
    session_hours: int = 24 * 7
    # Turn on when served over HTTPS.
    cookie_secure: bool = False

    # LangSmith reads LANGSMITH_* straight from the environment; these are only
    # needed to decide whether to run the startup trace.
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def session_secret() -> str:
    """The key that signs session cookies."""
    configured = get_settings().jwt_secret
    if configured:
        return configured
    log.warning("JWT_SECRET is not set; using a random one. Sessions end on restart.")
    return secrets.token_hex(32)
