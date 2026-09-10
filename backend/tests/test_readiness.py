from fastapi.testclient import TestClient

from app.main import app
from app.readiness import system_readiness


def test_liveness_does_not_claim_full_system_readiness(monkeypatch, tmp_path):
    monkeypatch.delenv("CANONICAL_DATABASE_URL", raising=False)
    monkeypatch.delenv("CANONICAL_API_TOKEN", raising=False)
    monkeypatch.setenv("CANONICAL_ARTIFACT_ROOT", str(tmp_path))
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        response = client.get("/api/ready")
        assert response.status_code == 503
        assert response.json()["checks"] == {
            "admin": "not_configured", "artifacts": "ok", "database": "not_configured"
        }


def test_readiness_does_not_leak_configuration(monkeypatch, tmp_path):
    monkeypatch.setenv("CANONICAL_API_TOKEN", "private-test-token")
    monkeypatch.setenv("CANONICAL_DATABASE_URL", "invalid://user:private-password@host/db")
    monkeypatch.setenv("CANONICAL_ARTIFACT_ROOT", str(tmp_path / "missing"))
    result = system_readiness()
    assert result["status"] == "not_ready"
    assert result["checks"]["database"] == "unavailable"
    assert "private" not in str(result)


def test_readiness_checks_current_postgis_schema(database_engine, monkeypatch, tmp_path):
    monkeypatch.setenv("CANONICAL_API_TOKEN", "private-test-token")
    monkeypatch.setenv("CANONICAL_ARTIFACT_ROOT", str(tmp_path))
    with TestClient(app) as client:
        response = client.get("/api/ready")
        assert response.status_code == 200, response.text
        assert response.json()["checks"]["schema"] == "ok"
