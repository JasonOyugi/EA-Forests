"""Read-only: print the resolved canonical database target.

Run this before any operational script (import, promotion, cohort
creation, national enqueue, repair, bulk change generation) to confirm
what CANONICAL_DATABASE_URL actually resolves to on the live connection --
not what a config file or script default merely declares. See
docs/architecture/CANONICAL_DATABASE_RUNTIME.md for why this distinction
matters.

Usage:
    uv run python scripts/db_status.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import engine_for
from app.db.target_guard import describe_target, format_banner


def main() -> None:
    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    target = describe_target(engine)
    print(format_banner(target, label="Canonical database status"))


if __name__ == "__main__":
    main()
