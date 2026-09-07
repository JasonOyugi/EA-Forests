"""Emit a small, position-aligned reconciliation lookup for the frontend map.

Aligned by array index against ``ugandaCfrs`` in generated-boundaries.ts (not
by ``id``, because two boundary entries share the id/name "cfr-kabula" and an
id-keyed lookup would silently drop one). This file is a read-only derived
projection of the same reconciliation logic used by the backend ingestion; it
never becomes a second source of truth, and it carries no canonical database
IDs (those are environment-specific and only exist once a real database has
been ingested; the frontend resolves them at runtime through
``GET /api/canonical/spatial-assets?country=UG&spatial_type=reserve``).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.ingestion.cfr_boundaries import load_boundaries, reconcile

OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "vite-version/src/app/shop/data/cfr-reconciliation.json"
)


def main():
    boundaries = load_boundaries()
    rows = reconcile()
    by_index = {row.boundary_index: row for row in rows if row.boundary_index is not None}
    aligned = []
    for index, boundary in enumerate(boundaries):
        row = by_index.get(index)
        aligned.append(
            {
                "boundaryId": boundary["id"],
                "sourceRecordKey": row.source_record_key if row else None,
                "status": row.status if row else "POLYGON_ONLY",
                "reason": row.reason if row else None,
            }
        )
    OUTPUT.write_text(json.dumps(aligned, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(aligned)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
