"""Canonical State v0.1: frozen schema, constraints, triggers and views."""

from pathlib import Path

from alembic import context, op

revision = "0001_canonical_state"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    root = Path(__file__).resolve().parents[1] / "sql"
    for name in ("0001_schema.sql", "0001_guards.sql"):
        # PostgreSQL's driver executes this migration transactionally, including function bodies.
        sql = (root / name).read_text(encoding="utf-8")
        if context.is_offline_mode():
            op.get_context().impl.static_output(sql)
        else:
            op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    # Intentionally destructive, only for disposable databases or after backup.
    # Never drop PostGIS: other application schemas may use it.
    for name in (
        "audit",
        "decision",
        "verification",
        "commercial",
        "models",
        "belief",
        "observations",
        "operations",
        "market",
        "forestry",
        "biology",
        "geo",
        "evidence",
        "core",
    ):
        op.execute(f'DROP SCHEMA "{name}" CASCADE')
