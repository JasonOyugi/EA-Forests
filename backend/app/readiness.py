"""Readiness of the complete local system, distinct from model-only liveness."""

import os
from pathlib import Path

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text

from app.db.session import database_url, engine_for
from app.security import admin_enabled


def system_readiness() -> dict:
    checks = {"admin": "ok" if admin_enabled() else "not_configured"}
    root = Path(os.getenv("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    checks["artifacts"] = "ok" if root.is_dir() and os.access(root, os.W_OK) else "unavailable"
    if not os.getenv("CANONICAL_DATABASE_URL"):
        checks["database"] = "not_configured"
    else:
        try:
            config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
            scripts = ScriptDirectory.from_config(config)
            with engine_for(database_url()).connect() as connection:
                # Bound readiness probes even if a migration currently holds a lock.
                connection.execute(text("SET LOCAL statement_timeout = '5000'"))
                connection.execute(text("SELECT PostGIS_Version()"))
                current = set(MigrationContext.configure(connection).get_current_heads())
                checks["database"] = "ok"
                checks["schema"] = "ok" if current == set(scripts.get_heads()) else "migration_required"
        except Exception:
            # Connection exceptions can contain credentials and private paths.
            checks["database"] = "unavailable"
    return {"status": "ok" if all(v == "ok" for v in checks.values()) else "not_ready", "checks": checks}
