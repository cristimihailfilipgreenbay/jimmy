import logging
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

log = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    # The database. In Docker Compose the host is "db" and the port 5432.
    postgres_user: str = "jimmy"
    postgres_password: str = "jimmy"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "jimmy"
    # A full URL overrides the POSTGRES_* values above when it is not empty.
    database_url: str = ""

    # Signs the session cookie. Unset: a random one per process, so sessions end
    # on restart. Set JWT_SECRET (e.g. `openssl rand -hex 32`) to keep them.
    jwt_secret: str = ""
    session_hours: int = 24 * 7
    # Used when the Student does not tick "keep me signed in".
    short_session_hours: int = 12
    # Turn on when served over HTTPS.
    cookie_secure: bool = False

    # Embeddings go through OpenRouter. The model is locked once chunks exist, and
    # the chunks.embedding column is sized for `embedding_dimensions`.
    openrouter_api_key: str = ""
    # Web search (the Tutor's `search_web`). Wikipedia needs no key.
    tavily_api_key: str = ""
    # The Tutor's model (chat) and the cheaper one for background work.
    tutor_model: str = ""
    background_model: str = ""
    embedding_model: str = "openai/text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Where the seed command puts the Subject Library chapters (data/seed in the repo,
    # /data/seed in Docker, where ./data is mounted).
    seed_dir: str = str(Path(__file__).resolve().parents[2] / "data" / "seed")

    # LangSmith reads LANGSMITH_* straight from the environment; these are only
    # needed to decide whether to run the startup trace.
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""

    def connection_url(self) -> str | URL:
        if self.database_url:
            return self.database_url
        # URL.create escapes the password, so characters like @ or / are fine.
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


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
