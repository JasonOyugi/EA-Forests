"""cross_sensor_corroboration gains sensor-family/modality semantics -- S1 ascending+descending is not cross-sensor.

NOTE: the revision id must stay <= 32 chars -- alembic_version.version_num
is VARCHAR(32) by default. A first attempt at this migration used a longer
id ("0012_corroboration_sensor_family_semantics", 43 chars); it failed at
the version-bookkeeping UPDATE (StringDataRightTruncation) after the DDL
ran, but alembic's per-migration transaction rolled the DDL back too, so
no partial state was left -- confirmed directly, not assumed, before this
shorter id was substituted.
"""

from pathlib import Path

from alembic import context, op

revision = "0012_corroboration_semantics"
down_revision = "0011_change_assessment_domain"
branch_labels = None
depends_on = None


def upgrade():
    sql = (
        Path(__file__).resolve().parents[1] / "sql" / "0012_corroboration_semantics.sql"
    ).read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_constraint("ck_corroboration_cross_modality", "cross_sensor_corroboration", schema="processing")
    op.drop_constraint("ck_corroboration_cross_sensor", "cross_sensor_corroboration", schema="processing")
    op.drop_constraint("ck_corroboration_within_sensor", "cross_sensor_corroboration", schema="processing")
    op.drop_constraint("ck_corroboration_single_stream", "cross_sensor_corroboration", schema="processing")
    op.drop_constraint("cross_sensor_corroboration_state_check", "cross_sensor_corroboration", schema="processing")
    op.drop_column("cross_sensor_corroboration", "distinct_modality_count", schema="processing")
    op.drop_column("cross_sensor_corroboration", "distinct_sensor_family_count", schema="processing")
    op.drop_column("cross_sensor_corroboration", "distinct_stream_count", schema="processing")
    op.create_check_constraint(
        "cross_sensor_corroboration_state_check",
        "cross_sensor_corroboration",
        "state IN ('OPTICAL_ONLY', 'SAR_ASC_ONLY', 'SAR_DESC_ONLY', 'MULTI_SENSOR_SUPPORTED', "
        "'SENSOR_DISAGREEMENT', 'INSUFFICIENT_COMMON_SUPPORT', 'INSUFFICIENT_EVIDENCE')",
        schema="processing",
    )
