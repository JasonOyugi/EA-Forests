"""Acquire public vector evidence and replay it into the existing canonical PostGIS store.

Run from backend: python scripts/ingest_spatial_forests.py acquire --source KE-TREE-PLANTATIONS
Then: python scripts/ingest_spatial_forests.py ingest --source KE-TREE-PLANTATIONS
Neither map requests nor application startup download datasets.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.db.session import database_url, engine_for
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.spatial.arcgis import acquire_arcgis
from app.services.ingestion.spatial.archive import (
    download_archive, extract_archive, geojson_features, resolve_archive, vector_features,
)
from app.services.ingestion.spatial.base import Acquisition, canonical_json
from app.services.ingestion.spatial.commercial_forests import (
    COUNTRY_ALIASES, SpatialImporter, first_value, register_source,
)
from app.services.ingestion.spatial.registry import load_registry
from app.services.state.registry import bootstrap


def acquire(source, store, workdir, max_gb):
    a = Acquisition(store)
    manifest = {"source_key": source["source_key"],
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "registry": source}
    try:
        if source["strategy"] == "arcgis":
            manifest.update(acquire_arcgis(source, a))
        elif source["strategy"] in ("nfa_download", "wri_archive"):
            url = resolve_archive(source, a)
            raw = download_archive(url, a, workdir, max_bytes=int(max_gb * 1024**3))
            manifest.update(status="acquired", archive=raw)
        else:
            manifest.update(status="registered", reason="Existing CFR read model" if
                            source["strategy"] == "existing_cfr" else "Separate bounded raster preprocessing")
    except Exception as exc:
        manifest.update(status="pending_acquisition", reason=f"{type(exc).__name__}: {exc}")
    manifest["artifacts"] = a.artifacts
    destination = workdir / (source["source_key"] + ".manifest.json")
    destination.write_bytes(canonical_json(manifest))
    # Pending attempts are evidence too; exact upstream HTML/error metadata retained.
    store.put(canonical_json(manifest))
    print(json.dumps({"source_key": source["source_key"], "status": manifest["status"],
                      "count": manifest.get("source_count"), "reason": manifest.get("reason")}), flush=True)
    return manifest


def ingest(source, manifest, store, workdir, vector_layer=None, local_file=None):
    with Session(engine_for(database_url())) as db, db.begin():
        bootstrap(db)
        if source["strategy"] == "existing_cfr":
            register_source(db, source)
            return {"source_key": source["source_key"], "status": "existing_canonical_evidence"}
        importer = SpatialImporter(db, store, source, manifest)
        if manifest["status"] != "acquired":
            return {"source_key": source["source_key"], "status": manifest["status"],
                    "reason": manifest.get("reason")}
        if manifest.get("pages") is not None:
            for page in manifest["pages"]:
                for feature in geojson_features(store.get(page["artifact_uri"])):
                    importer.ingest(feature, page, srid=manifest["geometry_srid"])
            if importer.counts["source_count"] != manifest["source_count"]:
                raise ValueError("Parsed feature count differs from verified acquisition inventory")
        else:
            archive = manifest["archive"]
            path = local_file or extract_archive(store.verified_path(archive["artifact_uri"]),
                                                 workdir / (source["source_key"] + "-extracted"))
            excluded = 0
            for feature, srid in vector_features(path, layer=vector_layer,
                    bbox=(29.5, -11.8, 41.95, 5.1) if source["strategy"] == "wri_archive" else None):
                if source["strategy"] == "wri_archive":
                    value = first_value(feature["properties"], source.get("country_fields", []))
                    country = COUNTRY_ALIASES.get(str(value).upper())
                    if value is not None and country not in source["countries"]:
                        excluded += 1
                        continue
                importer.ingest(feature, archive, srid=srid, locator={"layer": vector_layer or "vector"})
            importer.counts["excluded_outside_country"] = excluded
        report = {"status": "ingested", **importer.report()}
        report["excluded_outside_country"] = importer.counts["excluded_outside_country"]
        uri, sha = store.put(canonical_json(report))
        from app.services.ingestion.spatial.commercial_forests import persist_raw
        persist_raw(db, importer.source["id"], {"artifact_uri": uri, "content_hash": sha,
                    "original_filename": "ingestion-report.json", "media_type": "application/json"},
                    importer.batch_id)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["acquire", "ingest", "all"])
    parser.add_argument("--source", action="append")
    parser.add_argument("--registry", type=Path)
    parser.add_argument("--workdir", type=Path, default=Path(".cache/spatial"))
    parser.add_argument("--max-download-gb", type=float, default=12)
    parser.add_argument("--layer")
    parser.add_argument("--local-file", type=Path, help="Reviewed local SHP/GeoJSON/GDB import")
    args = parser.parse_args()
    registry = load_registry(args.registry) if args.registry else load_registry()
    sources = args.source or list(registry)
    if args.local_file and len(sources) != 1:
        parser.error("Local import requires exactly one --source")
    args.workdir.mkdir(parents=True, exist_ok=True)
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT"))
    reports = []
    for key in sources:
        source = registry[key]
        manifest_path = args.workdir / (key + ".manifest.json")
        if args.local_file:
            uri, sha = store.put_file(args.local_file)
            raw = {"artifact_uri": uri, "content_hash": sha, "original_filename": args.local_file.name,
                   "media_type": "application/octet-stream", "retrieved_at": None}
            manifest = {"source_key": key, "status": "acquired", "archive": raw,
                        "artifacts": [raw], "registry": source,
                        "acquisition_method": "operator-supplied; upstream retrieval time unknown"}
            manifest_path.write_bytes(canonical_json(manifest))
        elif args.action in ("acquire", "all"):
            manifest = acquire(source, store, args.workdir, args.max_download_gb)
        else:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if args.action in ("ingest", "all"):
            report = ingest(source, manifest, store, args.workdir, args.layer, args.local_file)
            reports.append(report)
            print(json.dumps(report), flush=True)
    if reports:
        (args.workdir / "last-ingestion-report.json").write_bytes(canonical_json(reports))


if __name__ == "__main__":
    main()
