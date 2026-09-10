"""Change-assessment domain foundation: change_candidate, cross_sensor_corroboration, and their lineage/membership join tables."""

from pathlib import Path

from alembic import context, op

revision = "0011_change_assessment_domain"
down_revision = "0010_eo_cohort"
branch_labels = None
depends_on = None


def upgrade():
    sql = (
        Path(__file__).resolve().parents[1] / "sql" / "0011_change_assessment_domain.sql"
    ).read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_table("cross_sensor_corroboration_member", schema="processing")
    op.drop_table("cross_sensor_corroboration", schema="processing")
    op.drop_table("change_candidate_source_observation", schema="processing")
    op.drop_table("change_candidate", schema="processing")
