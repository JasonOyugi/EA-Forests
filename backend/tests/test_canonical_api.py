import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_canonical_api_is_private_by_default(monkeypatch):
    monkeypatch.delenv("CANONICAL_API_TOKEN", raising=False)
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        assert client.get("/api/canonical/entities").status_code == 503
    monkeypatch.setenv("CANONICAL_API_TOKEN", "unit-test-only")
    with TestClient(app) as client:
        assert client.get("/api/canonical/entities").status_code == 401
        assert (
            client.get(
                "/api/canonical/entities", headers={"Authorization": "Bearer wrong"}
            ).status_code
            == 401
        )


def test_legacy_defaults_and_local_models_still_work():
    with TestClient(app) as client:
        assert client.get("/api/models/roundwood-production/defaults").status_code == 200
        assert client.post("/api/models/commercial-forest-viability", json={}).status_code == 200
        assert client.post("/api/models/clonal-eucalyptus-nursery", json={}).status_code == 200


@pytest.mark.integration
def test_evidence_observation_snapshot_api_and_redaction(db, monkeypatch, tmp_path):
    from app.api.canonical import database

    monkeypatch.setenv("CANONICAL_API_TOKEN", "api-integration-test")
    monkeypatch.setenv("CANONICAL_ARTIFACT_ROOT", str(tmp_path))
    app.dependency_overrides[database] = lambda: db
    try:
        with TestClient(app, headers={"Authorization": "Bearer api-integration-test"}) as client:
            entity = client.post(
                "/api/canonical/entities",
                json={
                    "entity_type": "tree",
                    "canonical_name": "Field tree",
                    "reason": "Field inventory",
                },
            )
            assert entity.status_code == 201
            evidence = client.post(
                "/api/canonical/evidence",
                json={
                    "source_type": "field_campaign",
                    "title": "Private source title",
                    "data_class": "OBSERVED",
                    "access": "confidential",
                    "original_filename": "field.txt",
                    "content_utf8": "Tree DBH measured at 31.7 cm",
                    "reason": "Register field evidence",
                    "locator": {"private": "location detail"},
                },
            )
            assert evidence.status_code == 201, evidence.text
            independent_copy = client.post(
                "/api/canonical/evidence",
                json={
                    "source_type": "second_field_campaign",
                    "title": "Independent source",
                    "data_class": "OBSERVED",
                    "original_filename": "field.txt",
                    "content_utf8": "Tree DBH measured at 31.7 cm",
                    "reason": "Independent provenance",
                },
            )
            assert independent_copy.status_code == 201, independent_copy.text
            assert independent_copy.json()["source_id"] != evidence.json()["source_id"]
            source = evidence.json()
            world = next(
                w for w in client.get("/api/canonical/worlds").json() if w["name"] == "production"
            )
            observation = client.post(
                "/api/canonical/observations",
                json={
                    "subject_entity_id": entity.json()["id"],
                    "source_id": source["source_id"],
                    "evidence_item_id": source["evidence_item_id"],
                    "world_id": world["id"],
                    "variable_key": "DBH",
                    "numeric_value": 31.7,
                    "unit": "cm",
                    "method": "diameter_tape",
                    "epistemic_class": "OBSERVED",
                },
            )
            assert observation.status_code == 201, observation.text
            snapshot = client.post(
                "/api/canonical/state-snapshots",
                json={
                    "entity_id": entity.json()["id"],
                    "world_id": world["id"],
                    "as_of": "2026-07-15T00:00:00Z",
                },
            )
            assert snapshot.status_code == 201, snapshot.text
            explanation = client.get(
                f"/api/canonical/state/{entity.json()['id']}/explain",
                params={"world_id": world["id"]},
            )
            assert explanation.status_code == 200
            evidence_ref = explanation.json()["inputs"][0]
            assert evidence_ref["source"]["title"] == "Restricted source"
            assert evidence_ref["evidence"]["locator"] is None
            assert (
                client.get(f"/api/canonical/evidence/{source['evidence_item_id']}").json()[
                    "locator"
                ]
                is None
            )
            task = client.post(
                "/api/canonical/verification-tasks",
                json={
                    "target_entity_id": entity.json()["id"],
                    "world_id": world["id"],
                    "reason": "Repeat measurement with a second crew",
                    "priority": 3,
                },
            )
            assert task.status_code == 201
    finally:
        app.dependency_overrides.pop(database, None)
