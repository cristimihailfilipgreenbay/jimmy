from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import main


class _BrokenEngine:
    def dispose(self):
        pass

    def connect(self):
        raise OperationalError("SELECT 1", {}, Exception("db down"))


def test_health_reports_degraded_when_database_is_down(monkeypatch):
    monkeypatch.setattr(main, "engine", _BrokenEngine())
    monkeypatch.setattr(main, "run_trace_check", lambda: None)
    with TestClient(main.app) as client:
        res = client.get("/health")
    assert res.status_code == 503
    assert res.json() == {"status": "degraded", "database": "down"}
