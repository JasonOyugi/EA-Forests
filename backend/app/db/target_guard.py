"""Target-database safety guard for operational scripts.

Prints exactly what database a script is about to write to, and can refuse
to proceed if it doesn't match an operator-supplied expectation. This
exists because a single local Postgres server can (and does) host many
similarly-named databases -- see
docs/architecture/CANONICAL_DATABASE_RUNTIME.md for the incident that
motivated it: a database name alone (or even matching row counts) is not
proof of identity.

Routine long-running workers should NOT use this to demand an interactive
prompt -- `require_database` never prompts, it only prints and optionally
raises. Only scripts capable of a major, hard-to-reverse write (imports,
AOI promotion, cohort creation, national enqueue, repair scripts, bulk
change generation) should call it with a caller-supplied `--expected-database`.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.engine import Engine


@dataclass(frozen=True)
class DatabaseTarget:
    host: str
    port: int
    database: str
    alembic_revision: str | None
    entity_count: int
    aoi_count: int


class DatabaseMismatchError(RuntimeError):
    """Raised by require_database when --expected-database does not match."""


def _safe_count(conn, table: str) -> int:
    exists = conn.execute(text(f"SELECT to_regclass('{table}') IS NOT NULL")).scalar()
    if not exists:
        return 0
    return conn.execute(text(f"SELECT count(*) FROM {table}")).scalar() or 0


def describe_target(engine: Engine) -> DatabaseTarget:
    """Read-only. Resolves what CANONICAL_DATABASE_URL actually points at,
    from the live connection -- never from the URL string alone (a stale
    process can hold a different database than its own env now shows)."""
    url = engine.url
    with engine.connect() as conn:
        alembic_revision = None
        has_alembic = conn.execute(
            text("SELECT to_regclass('public.alembic_version') IS NOT NULL")
        ).scalar()
        if has_alembic:
            alembic_revision = conn.execute(
                text("SELECT version_num FROM public.alembic_version")
            ).scalar()

        entity_count = _safe_count(conn, "core.entity")
        aoi_count = _safe_count(conn, "geo.aoi")

    return DatabaseTarget(
        host=url.host or "",
        port=url.port or 0,
        database=url.database or "",
        alembic_revision=alembic_revision,
        entity_count=entity_count,
        aoi_count=aoi_count,
    )


def format_banner(target: DatabaseTarget, *, label: str = "Target database") -> str:
    lines = [
        f"{label}:",
        f"  host:port   = {target.host}:{target.port}",
        f"  database    = {target.database}",
        f"  alembic     = {target.alembic_revision or '(no alembic_version table)'}",
        f"  core.entity = {target.entity_count}",
        f"  geo.aoi     = {target.aoi_count}",
    ]
    return "\n".join(lines)


def require_database(
    engine: Engine, expected: str | None, *, label: str = "Target database"
) -> DatabaseTarget:
    """Print the resolved target and, if `expected` is given, refuse to
    proceed unless it matches exactly. Call this once, before any write.
    Never prompts -- raises DatabaseMismatchError on mismatch so the
    caller's script exits non-zero before touching data.
    """
    target = describe_target(engine)
    print(format_banner(target, label=label), file=sys.stderr)

    if expected is not None and target.database != expected:
        raise DatabaseMismatchError(
            f"Refusing to proceed: connected to database {target.database!r}, "
            f"but --expected-database {expected!r} was given. Pass the correct "
            "--expected-database, or fix CANONICAL_DATABASE_URL. See "
            "docs/architecture/CANONICAL_DATABASE_RUNTIME.md."
        )

    return target


def add_expected_database_argument(parser) -> None:
    """Add the standard --expected-database flag to an argparse parser."""
    parser.add_argument(
        "--expected-database",
        default=None,
        metavar="NAME",
        help=(
            "Refuse to run unless CANONICAL_DATABASE_URL resolves to exactly "
            "this database name. Strongly recommended for any script that "
            "writes. See docs/architecture/CANONICAL_DATABASE_RUNTIME.md."
        ),
    )
