"""One-off runner: ingest all Uganda CFR polygons into CANONICAL_DATABASE_URL
and write the raw per-record ingestion results to a JSON file.

Usage (PowerShell):
    $env:CANONICAL_DATABASE_URL = '...'
    uv run python scripts/run_cfr_ingestion.py --output .cache/cfr-ingestion-results.json
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons
from app.services.state.registry import bootstrap


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
        report = ingest_cfr_polygons(db, store)
        db.commit()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {len(report['records'])} records to {args.output}")


if __name__ == "__main__":
    main()
