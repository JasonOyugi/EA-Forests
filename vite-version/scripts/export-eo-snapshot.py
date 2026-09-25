# Regenerates public/data/eo/* (the landing page "Latest EO" cards and their evidence sidebar).
# Needs the canonical spatial read model, which lives in the EA-Forests repo backend
# (feature/uganda-cfr-s2-history), with its Postgres running. Run from that backend directory:
#   PYTHONPATH=. .venv/Scripts/python.exe <this file> <path-to>/vite-version/public/data/eo
"""Snapshot the national EO maps (NationalEoMap on feature/uganda-cfr-s2-history) to static files:

- ``{cc}-forests.geojson``: the map's forest polygons (same read model and default classes, i.e.
  everything except tree_plantation), each carrying a short ``key`` into the evidence file.
- ``{cc}-evidence.json``: per-forest monthly Sentinel-2 optical and Sentinel-1 ascending/descending
  radar observations (mean + spatial SD) and active change candidates — what the EO evidence
  sheet shows. Only public fields: no entity/AOI ids, artifact paths or provenance internals.
- ``summary.json``: per-country card numbers.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(".env")
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.api.spatial import DEFAULT_CLASSES  # noqa: E402
from app.db.session import database_url, engine_for  # noqa: E402
from app.services.ingestion.spatial.read_model import query_forests  # noqa: E402

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
BBOX = {"UG": (29.5, -1.5, 35.1, 4.3), "KE": (33.8, -4.8, 41.95, 5.1), "TZ": (29.3, -11.8, 40.5, -0.9)}
LANES = {"s2-sr-optical-v1": "s2", "s1-grd-backscatter-ascending-v1": "s1a", "s1-grd-backscatter-descending-v1": "s1d"}
FEATURES = {"s2": ["ndvi", "ndmi", "nbr"], "s1a": ["s1_vv", "s1_vh"], "s1d": ["s1_vv", "s1_vh"]}
OBSERVED = ("success", "partial")


def rnd(c):
    return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 4), round(c[1], 4)]


def num(value, digits=4):
    return None if value is None else round(float(value), digits)


def month(value):
    return value.strftime("%Y-%m") if value else None


def load_observations(db, aoi_version_ids):
    """{aoi_version_id: {lane: [[month, outcome, f1, f1_sd, f2, f2_sd, ...], ...]}} oldest first."""
    rows = db.execute(text("""
        SELECT es.aoi_version_id::text av, es.recipe_key, o.id::text oid, o.window_start, o.outcome,
               fv.feature_key, fv.value, fv.standard_deviation
        FROM observations.eo_observation o
        JOIN observations.eo_series es ON es.id = o.series_id
        LEFT JOIN observations.eo_feature_set fs ON fs.eo_observation_id = o.id
        LEFT JOIN observations.eo_feature_value fv ON fv.eo_feature_set_id = fs.id AND fv.value_statistic = 'mean'
        WHERE es.aoi_version_id::text = ANY(:ids)
    """), {"ids": list(aoi_version_ids)})
    obs = defaultdict(dict)  # (av, lane) -> {oid: {"month", "outcome", features}}
    for r in rows:
        lane = LANES.get(r.recipe_key)
        if not lane:
            continue
        entry = obs[(r.av, lane)].setdefault(r.oid, {"month": month(r.window_start), "outcome": r.outcome, "f": {}})
        if r.feature_key and r.value is not None:
            entry["f"][r.feature_key] = (num(r.value), num(r.standard_deviation))
    out = defaultdict(dict)
    for (av, lane), by_id in obs.items():
        series = []
        for entry in sorted(by_id.values(), key=lambda e: e["month"]):
            row = [entry["month"], entry["outcome"]]
            for key in FEATURES[lane]:
                row += list(entry["f"].get(key, (None, None)))
            series.append(row)
        out[av][lane] = series
    return out


def load_changes(db, aoi_version_ids):
    rows = db.execute(text("""
        SELECT aoi_version_id::text av, sensor_stream, features, candidate_window_start, candidate_window_end,
               algorithm, algorithm_version, metadata
        FROM processing.change_candidate
        WHERE status = 'active' AND aoi_version_id::text = ANY(:ids)
        ORDER BY candidate_window_start DESC
    """), {"ids": list(aoi_version_ids)})
    changes = defaultdict(lambda: {"candidates": [], "corroborations": []})
    for r in rows:
        meta = r.metadata or {}
        quality = meta.get("evidence_quality") or {}
        spatial = meta.get("spatial_evidence") or None
        changes[r.av]["candidates"].append({
            "stream": r.sensor_stream, "features": list(r.features or []),
            "window": [month(r.candidate_window_start), month(r.candidate_window_end)],
            "algorithm": f"{r.algorithm} v{r.algorithm_version}",
            "grade": quality.get("grade"), "reasons": quality.get("reasons") or [],
            "confounder": bool(meta.get("confounders")),
            "regions": spatial and {k: spatial.get(k) for k in ("region_count", "evidence_cell_count", "cell_count_total")},
        })
    for r in db.execute(text("""
        SELECT aoi_version_id::text av, state, reference_window_start, reference_window_end
        FROM processing.cross_sensor_corroboration WHERE aoi_version_id::text = ANY(:ids)
        ORDER BY reference_window_start DESC
    """), {"ids": list(aoi_version_ids)}):
        changes[r.av]["corroborations"].append(
            {"state": r.state, "window": [month(r.reference_window_start), month(r.reference_window_end)]})
    return changes


with Session(engine_for(database_url())) as db:
    summary = {}
    for cc, bbox in BBOX.items():
        fc = query_forests(db, bbox, country=cc, classes=sorted(DEFAULT_CLASSES), limit=2000, zoom=8)
        assert not fc["meta"]["truncated"], cc
        ids = [f["properties"]["aoi_version_id"] for f in fc["features"] if f["properties"].get("aoi_version_id")]
        observations = load_observations(db, ids)
        changes = load_changes(db, ids)

        feats, evidence, area, observed, latest, months = [], {}, 0.0, 0, None, set()
        for index, f in enumerate(fc["features"]):
            p = f["properties"]
            av = p.get("aoi_version_id")
            key = str(index)
            lanes = observations.get(av, {})
            done = [row for series in lanes.values() for row in series if row[1] in OBSERVED]
            if done:
                observed += 1
                months.update(row[0] for row in done)
                latest = max([latest or "", *(row[0] for row in done)])
            area += p.get("geometry_area_ha") or 0
            g = f["geometry"]
            g["coordinates"] = rnd(g["coordinates"])
            feats.append({"type": "Feature", "geometry": g, "properties": {
                "key": key, "name": p["name"], "class": p["commercial_class"],
                "areaHa": round(p.get("geometry_area_ha") or 0), "observed": bool(done)}})
            if lanes or av in changes:
                evidence[key] = {**lanes, **({"change": changes[av]} if av in changes else {})}
        (OUT / f"{cc.lower()}-forests.geojson").write_text(
            json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
        (OUT / f"{cc.lower()}-evidence.json").write_text(
            json.dumps({"features": FEATURES, "forests": evidence}, separators=(",", ":")))
        summary[cc] = {"polygons": len(feats), "observed": observed, "areaHa": round(area),
                       "latestMonth": latest, "months": sorted(months),
                       "classes": sorted({f["properties"]["class"] for f in feats}),
                       "withChangeEvidence": sum(1 for e in evidence.values() if "change" in e)}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({cc: {k: v for k, v in s.items() if k != "months"} | {"monthCount": len(s["months"])}
                      for cc, s in summary.items()}, indent=2))
