from sqlalchemy.engine import URL, make_url

from app.config import Settings

POSTGRES_VARS = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_DB",
    "DATABASE_URL",
]


def settings(monkeypatch, **env: str) -> Settings:
    for name in POSTGRES_VARS:
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return Settings(_env_file=None)


def test_defaults_point_at_a_local_database(monkeypatch):
    url = settings(monkeypatch).connection_url()
    assert isinstance(url, URL)
    assert (url.host, url.port, url.username, url.database) == (
        "localhost",
        5432,
        "jimmy",
        "jimmy",
    )


def test_url_is_built_from_the_postgres_variables(monkeypatch):
    url = settings(
        monkeypatch,
        POSTGRES_USER="tutor",
        POSTGRES_PASSWORD="secret",
        POSTGRES_HOST="db",
        POSTGRES_PORT="6543",
        POSTGRES_DB="study",
    ).connection_url()
    assert (url.host, url.port, url.username, url.password, url.database) == (
        "db",
        6543,
        "tutor",
        "secret",
        "study",
    )


def test_password_with_special_characters_survives_the_url(monkeypatch):
    tricky = "p@ss:/w#rd?x=1"
    url = settings(monkeypatch, POSTGRES_PASSWORD=tricky).connection_url()
    rendered = url.render_as_string(hide_password=False)
    assert make_url(rendered).password == tricky


def test_database_url_overrides_the_postgres_variables(monkeypatch):
    explicit = "postgresql+psycopg://other:pw@elsewhere:1234/thing"
    s = settings(monkeypatch, POSTGRES_USER="ignored", DATABASE_URL=explicit)
    assert s.connection_url() == explicit


def test_empty_database_url_falls_back_to_the_postgres_variables(monkeypatch):
    # Compose sets DATABASE_URL to empty so a value in .env cannot leak into the container.
    url = settings(monkeypatch, DATABASE_URL="", POSTGRES_USER="tutor").connection_url()
    assert url.username == "tutor"
