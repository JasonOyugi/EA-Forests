"""Print the current national EO backfill health (observatory v1, section
11) without manual SQL. Read-only; safe to run at any time.

Usage:
    uv run python scripts/eo_ops_status.py
    uv run python scripts/eo_ops_status.py --collection-key COPERNICUS/S1_GRD
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.ops_status import backfill_status


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection-key", default=None)
    args = parser.parse_args()

    engine = engine_for(os.environ["CANONICAL_DATABASE_URL"])
    with Session(engine) as db:
        status = backfill_status(db, collection_key=args.collection_key)
    print(json.dumps(status, indent=2, default=str))


if __name__ == "__main__":
    main()
