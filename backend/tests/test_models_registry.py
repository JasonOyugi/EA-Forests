from fastapi.testclient import TestClient

from app.api import models_registry
from app.main import app

client = TestClient(app)


def test_registry_lists_every_model_with_a_status():
    models = {m["model_id"]: m for m in client.get("/api/models").json()["models"]}
    assert set(models) == set(models_registry.MODELS)
    assert all(m["status"] in {"LIVE", "BETA", "COMING SOON"} for m in models.values())


def test_detail_includes_input_schema():
    detail = client.get("/api/models/roundwood-production").json()
    assert set(detail["input_schema"]["required"]) == {"lat", "lon"}


def test_sync_run_returns_envelope_and_caches():
    models_registry.clear_cache()
    first = client.post("/api/models/commercial-forest-viability/run", json={}).json()
    second = client.post("/api/models/commercial-forest-viability/run", json={}).json()
    assert first["status"] == "completed" and first["cached"] is False
    assert first["provenance"] == ["MODELLED"]
    assert second["cached"] is True
    assert second["result"]["metrics"] == first["result"]["metrics"]


def test_invalid_input_is_structured_and_user_safe():
    response = client.post("/api/models/roundwood-production/run", json={"lat": 999, "lon": 32})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_input"


def test_unknown_model_is_404():
    response = client.post("/api/models/not-a-model/run", json={})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "unknown_model"


def test_rate_limit_rejects_bursts(monkeypatch):
    models_registry.clear_cache()
    monkeypatch.setattr(models_registry, "RATE_LIMIT_RUNS", 1)
    models_registry._rate_windows.clear()
    ok = client.post("/api/models/commercial-forest-viability/run", json={"area_ha": 10})
    limited = client.post("/api/models/commercial-forest-viability/run", json={"area_ha": 11})
    assert ok.status_code == 200
    assert limited.status_code == 429
    models_registry._rate_windows.clear()


def test_legacy_route_keeps_bare_result_shape():
    body = client.post("/api/models/clonal-eucalyptus-nursery", json={}).json()
    assert "metrics" in body and "result" not in body
