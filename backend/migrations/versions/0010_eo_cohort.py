"""processing.eo_cohort / eo_cohort_member -- freeze EO execution cohorts separately from canonical ingestion."""

from pathlib import Path

from alembic import context, op

revision = "0010_eo_cohort"
down_revision = "0009_eo_job_provider_collection"
branch_labels = None
depends_on = None


def upgrade():
    sql = (Path(__file__).resolve().parents[1] / "sql" / "0010_eo_cohort.sql").read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_table("eo_cohort_member", schema="processing")
    op.drop_table("eo_cohort", schema="processing")
