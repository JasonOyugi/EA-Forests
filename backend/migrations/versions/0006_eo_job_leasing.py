"""Crash-safe EO job leasing/fencing (country-pass Part 6)."""

from pathlib import Path

from alembic import context, op

revision = "0006_eo_job_leasing"
down_revision = "0005_eo_pipeline"
branch_labels = None
depends_on = None


def upgrade():
    sql = (Path(__file__).resolve().parents[1] / "sql" / "0006_eo_job_leasing.sql").read_text(
        encoding="utf-8"
    )
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_index("ix_eo_job_claimable", table_name="eo_job", schema="processing")
    op.drop_column("eo_job", "worker_id", schema="processing")
    op.drop_column("eo_job", "fencing_token", schema="processing")
    op.drop_column("eo_job", "lease_expires_at", schema="processing")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION processing.guard_eo_job() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'eo_job history is append-only: cancel, do not delete'; END IF;
          IF (to_jsonb(OLD)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata']) IS DISTINCT FROM
             (to_jsonb(NEW)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata']) THEN
            RAISE EXCEPTION 'eo_job request identity is immutable';
          END IF;
          RETURN NEW;
        END $$;
        """
    )
