"""The LangGraph Postgres checkpointer: where paused runs wait for the Student."""

from functools import lru_cache

from langgraph.checkpoint.postgres import PostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from sqlalchemy.engine import URL

from app.config import get_settings

_pool: ConnectionPool | None = None


def _libpq_url() -> str:
    url = get_settings().connection_url()
    if isinstance(url, URL):
        return url.set(drivername="postgresql").render_as_string(hide_password=False)
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


@lru_cache
def get_checkpointer() -> PostgresSaver:
    """One saver for the process. It creates its own tables on first use."""
    global _pool
    _pool = ConnectionPool(
        _libpq_url(),
        max_size=5,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        open=True,
    )
    saver = PostgresSaver(_pool)
    saver.setup()
    return saver


def close_checkpointer() -> None:
    if _pool is not None:
        _pool.close()
