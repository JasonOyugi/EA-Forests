import hashlib
import json
from copy import deepcopy
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from app.api.canonical import database
from app.api.spatial import parse_bbox
from app.db import schema as s
from app.main import app
from app.services.ingestion.spatial.arcgis import acquire_arcgis
from app.services.ingestion.spatial.base import Acquisition, AcquisitionError
from app.services.ingestion.spatial.commercial_forests import SpatialImporter
from app.services.ingestion.spatial.geometry import normalize_geometry
from app.services.ingestion.spatial.read_model import query_forests
from app.services.ingestion.spatial.registry import load_registry


def polygon(x=35, y=0, size=.02):
    return {"type": "Polygon", "coordinates": [[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]]}


def feature(fid=1, geometry=None):
    return {"type": "Feature", "id": fid, "properties": {"FID": fid, "USERLABEL": "Source forest", "AREA_SQKM_": 2},
            "geometry": geometry or polygon()}


class Response:
    headers = {"Content-Type": "application/json"}

    def __init__(self, data, url):
        self.content, self.url = json.dumps(data).encode(), url

    def raise_for_status(self):
        pass

    def json(self):
        return json.loads(self.content)


class ArcGISFixture:
    def __init__(self, count=5, truncate=False, omit=False):
        self.count, self.truncate, self.omit = count, truncate, omit
        self.pages = []

    def get(self, url, params=None, **kwargs):
        params = params or {}
        if url.endswith("/services"):
            data = {"services": [{"name": "ke_tree_plantations", "type": "FeatureServer", "url": "https://fixture/FeatureServer"}]}
        elif url.endswith("/FeatureServer"):
            data = {"serviceItemId": "test", "layers": [{"id": 7, "name": "ke_tree_plantations"}]}
        elif url.endswith("/7"):
            data = {"id": 7, "geometryType": "esriGeometryPolygon", "supportedQueryFormats": "JSON, geoJSON",
                    "objectIdField": "FID", "maxRecordCount": 2, "fields": [],
                    "extent": {"spatialReference": {"wkid": 102100, "latestWkid": 3857}}}
        elif params.get("returnCountOnly"):
            data = {"count": self.count}
        elif params.get("returnIdsOnly"):
            data = {"objectIds": list(range(self.count - int(self.omit)))}
        elif "objectIds" in params:
            ids = [int(x) for x in params["objectIds"].split(",")]
            self.pages.append(ids)
            truncated = self.truncate and len(ids) > 1
            data = {"type": "FeatureCollection", "features": [feature(i) for i in (ids[:1] if truncated else ids)],
                    "exceededTransferLimit": truncated}
        else:
            data = {"owner": "public-publisher", "copyrightText": "fixture"}
        return Response(data, url)


def test_arcgis_discovers_layer_and_paginates_all_ids(store):
    http = ArcGISFixture()
    acquisition = Acquisition(store, http)
    manifest = acquire_arcgis(load_registry()["KE-TREE-PLANTATIONS"], acquisition)
    assert manifest["layer_id"] == 7
    assert manifest["original_srid"] == 3857
    assert http.pages == [[0,1],[2,3],[4]]
    assert sum(p["feature_count"] for p in manifest["pages"]) == 5
    for raw in acquisition.artifacts:
        assert hashlib.sha256(store.get(raw["artifact_uri"])).hexdigest() == raw["content_hash"]


def test_arcgis_recovers_truncation_and_refuses_missing_inventory(store):
    acquisition = Acquisition(store, ArcGISFixture(truncate=True))
    manifest = acquire_arcgis(load_registry()["KE-TREE-PLANTATIONS"], acquisition)
    assert sum(p["feature_count"] for p in manifest["pages"]) == 5
    with pytest.raises(AcquisitionError, match="inventory mismatch"):
        acquire_arcgis(load_registry()["KE-TREE-PLANTATIONS"], Acquisition(store, ArcGISFixture(omit=True)))


@pytest.mark.parametrize("bbox", ["1,2,3", "nan,0,40,2", "40,0,35,2", "29,-91,42,5", "x,0,1,2"])
def test_bbox_validation(bbox):
    with pytest.raises(ValueError):
        parse_bbox(bbox)


def test_streaming_artifact_integrity(store, tmp_path):
    path = tmp_path / "upstream.zip"
    path.write_bytes(b"original polygon archive" * 100)
    uri, sha = store.put_file(path)
    assert sha == hashlib.sha256(path.read_bytes()).hexdigest()
    assert store.put_file(path) == (uri, sha)
    assert store.verified_path(uri).read_bytes() == path.read_bytes()


def importer(db, store, access="public", country="KE", key=None):
    source = deepcopy(load_registry()["KE-TREE-PLANTATIONS"])
    source["access"] = access
    source["countries"] = [country]
    if key:
        source["source_key"] = key
    a = Acquisition(store, ArcGISFixture())
    raw = a.preserve(json.dumps({"type": "FeatureCollection", "features": [feature()]}).encode(),
                     "features.geojson", "application/geo+json")
    manifest = {"status": "acquired", "artifacts": a.artifacts, "id_field": "FID", "layer_id": 7,
                "original_srid": 3857, "source_metadata": {"publisher": "public source"}}
    return SpatialImporter(db, store, source, manifest), raw


@pytest.mark.integration
def test_immutable_idempotent_identity_provenance_and_no_synthetic(db, store):
    imp, raw = importer(db, store)
    imp.ingest(feature(), raw)
    counts = {table.name: db.scalar(select(func.count()).select_from(table)) for table in
              (s.entity, s.geometry_observation, s.evidence_item, s.raw_ingest, s.external_identity)}
    again = SpatialImporter(db, store, imp.definition, imp.manifest)
    again.ingest(feature(), raw)
    assert again.report()["unchanged"] == 1
    for table in (s.entity, s.geometry_observation, s.evidence_item, s.raw_ingest, s.external_identity):
        assert db.scalar(select(func.count()).select_from(table)) == counts[table.name]
    row = db.execute(select(s.geometry_observation).where(s.geometry_observation.c.source_id == imp.source["id"])).mappings().one()
    ev = db.execute(select(s.evidence_item).where(s.evidence_item.c.id == row["evidence_item_id"])).mappings().one()
    assert ev["raw_ingest_id"] == imp.raw[raw["artifact_uri"]]["id"]
    assert ev["source_id"] == row["source_id"]
    assert row["metadata"]["raw_content_hash"] == raw["content_hash"]
    assert row["original_srid"] == 3857
    assert row["metadata"]["commercial_class"] == "tree_plantation"
    altered = feature()
    altered["geometry"] = polygon(36)
    imp.ingest(altered, raw)
    assert db.scalar(select(func.count()).select_from(s.external_identity).where(
        s.external_identity.c.dataset == imp.definition["source_key"])) == 1
    assert db.scalar(select(func.count()).select_from(s.geometry_observation).where(
        s.geometry_observation.c.source_id == imp.source["id"])) == 2
    demo = feature(2)
    demo["properties"]["USERLABEL"] = "synthetic demonstration"
    imp.ingest(demo, raw)
    assert imp.report()["rejected"] == 1


@pytest.mark.integration
def test_geometry_crs_multipolygon_holes_repair_and_quarantine(db, store):
    normalized = normalize_geometry(db, polygon(3896182.177, 0, 100), 3857)
    lon = db.scalar(text("SELECT ST_XMin(ST_GeomFromEWKB(decode(:wkb,'hex')))"), {"wkb": normalized["ewkb"]})
    assert abs(lon - 35) < .001
    p = polygon()
    p["coordinates"][0].pop()
    assert normalize_geometry(db, p, 4326)["repair"] == "close_unclosed_ring"
    multi = {"type": "MultiPolygon", "coordinates": [polygon()["coordinates"], polygon(36)["coordinates"]]}
    assert normalize_geometry(db, multi, 4326)["validity"] == "valid"
    bad = {"type": "Polygon", "coordinates": [[[35,0],[36,1],[36,0],[35,1],[35,0]]]}
    imp, raw = importer(db, store)
    imp.ingest(feature(3, bad), raw)
    assert imp.report()["rejected"] == 1
    ev = db.execute(select(s.evidence_item).where(s.evidence_item.c.kind == "spatial_quarantine",
                    s.evidence_item.c.source_id == imp.source["id"])).mappings().one()
    assert "Self-intersection" in ev["locator"]["reason"]
    assert ev["raw_ingest_id"] is not None


@pytest.mark.integration
def test_spatial_filters_latest_history_and_geojson(db, store):
    imp, raw = importer(db, store)
    imp.ingest(feature(), raw)
    imp.ingest(feature(2, polygon(38)), raw)
    result = query_forests(db, (34,-1,36,1), country="KE", source_keys=["KE-TREE-PLANTATIONS"])
    assert len(result["features"]) == 1
    item = result["features"][0]
    assert item["geometry"]["type"] == "MultiPolygon"
    assert item["properties"]["area_ha"] == 200
    assert item["properties"]["geometry_area_ha"] > 0
    assert "raw_record" not in json.dumps(result)
    assert not query_forests(db, (34,-1,36,1), country="TZ")["features"]
    assert not query_forests(db, (34,-1,36,1), source_keys=["TZ-FORESTS"])["features"]
    assert not query_forests(db, (34,-1,36,1), classes=["gazetted_forest"])["features"]
    assert query_forests(db, (34,-1,39,1), limit=1)["meta"]["truncated"]
    # A changed feature moving out of a viewport must not resurrect its old shape.
    imp.ingest(feature(1, polygon(39)), raw)
    assert not query_forests(db, (34,-1,36,1))["features"]


@pytest.mark.integration
def test_api_auth_confidential_visibility_and_evidence(db, store, monkeypatch):
    public, raw = importer(db, store)
    public.ingest(feature(), raw)
    secret, secret_raw = importer(db, store, access="confidential", key="secret")
    secret.ingest(feature(8), secret_raw)
    monkeypatch.setenv("CANONICAL_API_TOKEN", "spatial-test-only")
    app.dependency_overrides[database] = lambda: db
    try:
        with TestClient(app) as client:
            url = "/api/canonical/forest-polygons?bbox=34,-1,36,1"
            assert client.get(url).status_code == 401
            client.headers["Authorization"] = "Bearer spatial-test-only"
            result = client.get(url)
            assert result.status_code == 200, result.text
            assert len(result.json()["features"]) == 1
            ev = client.get(result.json()["features"][0]["properties"]["evidence_url"])
            assert ev.status_code == 200
            assert ev.json()["content_hash"] == raw["content_hash"]
            assert "raw_record" not in ev.text
            assert client.get(url + "&source_key=secret").status_code == 422
            secret_id = db.scalar(select(s.geometry_observation.c.id).where(s.geometry_observation.c.source_id == secret.source["id"]))
            assert client.get(f"/api/canonical/forest-polygons/{secret_id}/evidence").status_code == 404
            assert client.get(f"/api/canonical/forest-polygons/{uuid4()}/evidence").status_code == 404
    finally:
        app.dependency_overrides.clear()
