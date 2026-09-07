"""Sentinel-2 vertical slice: processing lineage + EO observation/feature store."""

from pathlib import Path

from alembic import context, op

revision = "0005_eo_pipeline"
down_revision = "0004_geometry_method"
branch_labels = None
depends_on = None


def upgrade():
    sql = (
        Path(__file__).resolve().parents[1] / "sql" / "0005_eo_observation_pipeline.sql"
    ).read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    # Intentionally destructive, only for disposable databases or after backup.
    op.execute("DROP VIEW observations.latest_eo_observation")
    op.execute("DROP TABLE processing.eo_job")
    op.execute("DROP TABLE observations.eo_feature_value")
    op.execute("DROP TABLE observations.eo_feature_set")
    op.execute("DROP TABLE observations.eo_observation")
    op.execute("DROP TABLE observations.eo_series")
    op.execute("DROP TABLE processing.input")
    op.execute("DROP TABLE processing.run")
    op.execute("DROP TABLE processing.version")
    op.execute("DROP TABLE evidence.eo_source_item")
    op.execute("DROP SCHEMA processing CASCADE")
