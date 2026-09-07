"""Bounded AOI contract: geo.aoi and geo.aoi_version (EO observation architecture section 6)."""

from pathlib import Path

from alembic import context, op

revision = "0003_geo_aoi"
down_revision = "0002_integrity"
branch_labels = None
depends_on = None


def upgrade():
    sql = (Path(__file__).resolve().parents[1] / "sql" / "0003_geo_aoi.sql").read_text(
        encoding="utf-8"
    )
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    # Intentionally destructive, only for disposable databases or after backup.
    op.execute("DROP VIEW geo.latest_aoi_version")
    op.execute("DROP TABLE geo.aoi_version")
    op.execute("DROP TABLE geo.aoi")
