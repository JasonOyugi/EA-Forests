"""Transactional import into existing identity/evidence/geometry tables.

No forestry stand, ownership, species, age, commercial status or inventory is
inferred. Different sources may describe the same entity without sharing geometry.
"""
import json
import math
from collections import Counter
from uuid import uuid4

from geoalchemy2.elements import WKBElement
from sqlalchemy import select, text
from sqlalchemy.exc import DataError, InternalError

from app.db import schema as s
from app.services.ingestion.market_databases import synthetic_record
from app.services.state.registry import audit_context, bootstrap, insert_row
from .base import canonical_json, digest
from .geometry import normalize_geometry

PARSER_VERSION = "spatial-evidence/1.0"
COUNTRY_ALIASES = {"UG": "UG", "UGA": "UG", "UGANDA": "UG", "KE": "KE", "KEN": "KE",
                   "KENYA": "KE", "TZ": "TZ", "TZA": "TZ", "TANZANIA": "TZ",
                   "UNITED REPUBLIC OF TANZANIA": "TZ", "TANZANIA, UNITED REPUBLIC OF": "TZ"}


def first_value(properties, fields):
    for field in fields:
        value = properties.get(field)
        if value is not None and str(value).strip():
            return value
    return None


def register_source(db, definition):
    key = definition["source_key"]
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
               {"key": "spatial:" + key})
    config_hash = digest(definition)
    existing = db.execute(select(s.source).where(
        s.source.c.metadata["spatial_source_key"].astext == key,
        s.source.c.metadata["registry_hash"].astext == config_hash,
    )).mappings().first()
    if existing:
        return dict(existing)
    return insert_row(db, s.source, source_type=definition["source_type"],
                      title=definition["title"], publisher=definition["publisher"],
                      uri=definition["reference_url"], access=definition["access"],
                      data_class="REPORTED", data_vintage=definition["data_vintage"],
                      metadata={"spatial_source_key": key, "registry_hash": config_hash,
                                "spatial_registry": definition})


def persist_raw(db, source_id, raw, batch_id):
    existing = db.execute(select(s.raw_ingest).where(
        s.raw_ingest.c.source_id == source_id, s.raw_ingest.c.content_hash == raw["content_hash"],
        s.raw_ingest.c.parser_version == PARSER_VERSION,
        s.raw_ingest.c.original_filename == raw["original_filename"],
    )).mappings().first()
    if existing:
        return dict(existing)
    return insert_row(db, s.raw_ingest, source_id=source_id, batch_id=batch_id,
                      **{k: raw[k] for k in ("artifact_uri", "content_hash", "original_filename", "media_type")},
                      parser_version=PARSER_VERSION,
                      metadata={k: v for k, v in raw.items() if k not in
                                ("artifact_uri", "content_hash", "original_filename", "media_type")})


def reconcile_nfa(db, name, ewkb):
    """Exact normalized name plus spatial corroboration; ambiguous matches require review."""
    rows = db.execute(text("""
        SELECT DISTINCT e.id, e.canonical_name,
          max(CASE WHEN ST_Dimension(g.geometry)=2 THEN
            ST_Area(ST_Intersection(g.geometry,ST_GeomFromEWKB(decode(:wkb,'hex')))) /
            nullif(ST_Area(ST_Union(g.geometry,ST_GeomFromEWKB(decode(:wkb,'hex')))),0)
          WHEN ST_Covers(ST_GeomFromEWKB(decode(:wkb,'hex')),g.geometry) THEN 1 ELSE 0 END) AS agreement
        FROM core.entity e JOIN core.external_identity x ON x.entity_id=e.id
        LEFT JOIN geo.geometry_observation g ON g.entity_id=e.id
        WHERE x.dataset='central-forest-reserves'
          AND lower(regexp_replace(trim(e.canonical_name),'\\s+',' ','g'))=:name
        GROUP BY e.id,e.canonical_name
    """), {"name": " ".join(name.lower().split()), "wkb": ewkb}).mappings().all()
    if not rows:
        return None
    if len(rows) == 1 and rows[0]["agreement"] is not None and rows[0]["agreement"] >= 0.8:
        return rows[0]["id"]
    raise ValueError("NFA identity requires reconciliation: name collision or insufficient spatial agreement")


class SpatialImporter:
    def __init__(self, db, store, definition, manifest):
        self.db, self.store, self.definition, self.manifest = db, store, definition, manifest
        self.world_id = bootstrap(db)["production"]["id"]
        audit_context(db, "spatial-importer", "Preserve public forest candidate polygon evidence")
        self.source = register_source(db, definition)
        self.batch_id = uuid4()
        self.raw = {}
        for artifact in manifest.get("artifacts", []):
            self.raw[artifact["artifact_uri"]] = persist_raw(db, self.source["id"], artifact, self.batch_id)
        content = canonical_json(manifest)
        uri, sha = store.put(content)
        self.manifest_raw = persist_raw(db, self.source["id"], {
            "artifact_uri": uri, "content_hash": sha, "original_filename": "acquisition-manifest.json",
            "media_type": "application/json", "retrieved_at": manifest.get("retrieved_at"),
        }, self.batch_id)
        self.counts = Counter()
        self.reasons = Counter()

    def ingest(self, feature, artifact, srid=4326, key=None, locator=None):
        self.counts["source_count"] += 1
        properties = feature.get("properties") or {}
        key_value = key if key is not None else first_value(
            properties, [self.manifest.get("id_field", "")] + self.definition.get("id_fields", []))
        if key_value is None:
            key_value = feature.get("id")
        feature_key = str(key_value) if key_value is not None else None
        layer = self.manifest.get("layer_id", (locator or {}).get("layer", "vector"))
        source_key = self.definition["source_key"]
        identity_key = f"{layer}:{feature_key}" if feature_key is not None else None
        name = str(first_value(properties, self.definition.get("name_fields", []))
                   or f"{self.definition['map_label']} · {feature_key}")
        record_hash = digest({"feature": feature, "feature_key": identity_key, "srid": srid,
                              "dataset_version": self.definition["dataset_version"], "parser": PARSER_VERSION})
        existing = self.db.execute(select(s.evidence_item).where(
            s.evidence_item.c.source_id == self.source["id"],
            s.evidence_item.c.content_hash == record_hash,
            s.evidence_item.c.kind.in_(["spatial_polygon", "spatial_quarantine"]),
        )).mappings().first()
        if existing:
            if existing["kind"] == "spatial_quarantine":
                self.counts["rejected"] += 1
                self.reasons[existing["locator"]["reason"]] += 1
            else:
                self.counts["accepted"] += 1
                self.counts["unchanged"] += 1
            return
        raw = self.raw[artifact["artifact_uri"]]
        location = {"source_feature_id": feature_key, "identity_key": identity_key,
                    "layer": layer, "manifest_raw_ingest_id": str(self.manifest_raw["id"]),
                    **(locator or {})}
        try:
            with self.db.begin_nested():
                if identity_key is None:
                    raise ValueError("Missing stable source feature identifier")
                if synthetic_record(feature):
                    raise ValueError("Synthetic/demo source record excluded from production")
                if len(self.definition["countries"]) == 1:
                    country = self.definition["countries"][0]
                else:
                    country = COUNTRY_ALIASES.get(str(first_value(
                        properties, self.definition.get("country_fields", []))).upper())
                    if country not in self.definition["countries"]:
                        raise ValueError("Country not evidenced in requested coverage")
                normalized = normalize_geometry(self.db, feature.get("geometry"), srid)
                evidence = insert_row(self.db, s.evidence_item, source_id=self.source["id"],
                    raw_ingest_id=raw["id"], kind="spatial_polygon", data_class="REPORTED",
                    locator=location, content_hash=record_hash, raw_record=feature)
                entity_id = self.db.scalar(select(s.external_identity.c.entity_id).where(
                    s.external_identity.c.dataset == source_key,
                    s.external_identity.c.source_record_key == identity_key,
                    s.external_identity.c.role == "forest_candidate"))
                if entity_id is None:
                    if source_key == "UG-NFA-CFR":
                        entity_id = reconcile_nfa(self.db, name, normalized["ewkb"])
                        if entity_id:
                            self.counts["reconciled"] += 1
                    if entity_id is None:
                        entity_id = insert_row(self.db, s.entity, entity_type="forest_candidate",
                            canonical_name=name, metadata={"country": country})["id"]
                    insert_row(self.db, s.external_identity, dataset=source_key,
                        source_record_key=identity_key, role="forest_candidate", entity_id=entity_id,
                        evidence_item_id=evidence["id"])
                area = properties.get(self.definition.get("area_field"))
                area_ha = None
                if isinstance(area, (int, float)) and not isinstance(area, bool) and math.isfinite(area) and area >= 0:
                    area_ha = area * self.definition.get("area_to_ha", 1)
                insert_row(self.db, s.geometry_observation, entity_id=entity_id, world_id=self.world_id,
                    geometry=WKBElement(normalized["ewkb"], srid=4326, extended=True),
                    original_srid=self.manifest.get("original_srid") or srid, method="digitised",
                    precision_description="Source polygon; precision unspecified by publisher. "
                                          + self.manifest.get("normalization", "PostGIS CRS transformation"),
                    source_id=self.source["id"], evidence_item_id=evidence["id"],
                    metadata={"spatial_source_key": source_key, "source_feature_id": feature_key,
                              "identity_key": identity_key, "country": country, "source_name": name,
                              "commercial_class": self.definition["semantic_class"],
                              "authority_class": self.definition["authority_class"],
                              "dataset_version": self.definition["dataset_version"],
                              "data_vintage": self.definition["data_vintage"],
                              "retrieved_at": artifact.get("retrieved_at"),
                              "raw_content_hash": raw["content_hash"], "area_ha": area_ha,
                              "geometry_area_ha": normalized["geometry_area_ha"],
                              "geometry_validity": normalized["validity"], "repair": normalized["repair"],
                              "normalization_version": PARSER_VERSION})
                self.counts["accepted"] += 1
                self.counts["inserted"] += 1
                if normalized["repair"]:
                    self.counts["repaired"] += 1
        except (ValueError, DataError, InternalError) as exc:
            # The raw artifact and quarantine record survive the geometry savepoint.
            reason = str(exc).split("\n")[0][:500]
            insert_row(self.db, s.evidence_item, source_id=self.source["id"],
                       raw_ingest_id=raw["id"], kind="spatial_quarantine", data_class="UNKNOWN",
                       locator={**location, "reason": reason}, content_hash=record_hash, raw_record=feature)
            self.counts["rejected"] += 1
            self.reasons[reason] += 1

    def report(self):
        return {"source_key": self.definition["source_key"],
                **{k: self.counts[k] for k in ("source_count", "accepted", "rejected", "inserted", "unchanged", "repaired", "reconciled")},
                "rejection_reasons": dict(self.reasons)}
