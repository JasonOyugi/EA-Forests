"""EO country-pass Part 3: repeat the exact same scientific recipe (same AOI
version, same pinned S2 item IDs, same QA profile, same grid, same
composite, same feature formula, same weighting) twice and record the
disagreement, instead of comparing against a structurally different
algorithm (sample() vs reduceRegion() have different boundary-pixel rules --
see uganda-sentinel2-pilot-report.md -- so that comparison validated the
wrong thing). This is the real same-recipe tolerance check.
"""

import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.ee_provider import (
    COLLECTION_KEY,
    QA_PROFILE_CORE,
    EarthEngineProvider,
)
from app.services.eo.pipeline import load_exact_geometry

AOI_VERSION_ID = os.environ.get("SPOT_CHECK_AOI_VERSION_ID")
WINDOW_START = datetime(2026, 8, 1, tzinfo=UTC)
WINDOW_END = datetime(2026, 9, 1, tzinfo=UTC)


def main():
    if not AOI_VERSION_ID:
        raise SystemExit("Set SPOT_CHECK_AOI_VERSION_ID")
    engine = engine_for(os.environ["CANONICAL_DATABASE_URL"])
    with Session(engine) as db:
        geometry, _world_id, _bounds = load_exact_geometry(db, AOI_VERSION_ID)

    provider = EarthEngineProvider()
    manifest = provider.discover(geometry, COLLECTION_KEY, WINDOW_START, WINDOW_END)

    run_a = provider.extract(geometry, manifest, "s2-sr-optical-v1", "1", QA_PROFILE_CORE, "1")
    run_b = provider.extract(geometry, manifest, "s2-sr-optical-v1", "1", QA_PROFILE_CORE, "1")

    report = {"outcome_a": run_a.outcome, "outcome_b": run_b.outcome, "features": []}
    max_relative_diff = 0.0
    for fa, fb in zip(run_a.features, run_b.features, strict=True):
        assert fa.feature_key == fb.feature_key
        diff = abs((fa.value or 0) - (fb.value or 0))
        relative = diff / abs(fa.value) if fa.value else 0.0
        max_relative_diff = max(max_relative_diff, relative)
        report["features"].append(
            {
                "feature": fa.feature_key,
                "value_a": fa.value,
                "value_b": fb.value,
                "abs_diff": diff,
                "relative_diff": relative,
                "valid_pixel_count_a": fa.valid_pixel_count,
                "valid_pixel_count_b": fb.valid_pixel_count,
            }
        )
    report["max_relative_diff"] = max_relative_diff
    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
