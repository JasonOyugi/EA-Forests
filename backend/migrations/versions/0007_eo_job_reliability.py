"""Bounded EE evaluation latency: retry backoff + per-attempt audit trail (Uganda S2 history v0.1, Parts 2-4)."""

from pathlib import Path

from alembic import context, op

revision = "0007_eo_job_reliability"
down_revision = "0006_eo_job_leasing"
branch_labels = None
depends_on = None


def upgrade():
    sql = (Path(__file__).resolve().parents[1] / "sql" / "0007_eo_job_reliability.sql").read_text(
        encoding="utf-8"
    )
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_table("eo_job_attempt", schema="processing")
    op.drop_index("ix_eo_job_retry_not_before", table_name="eo_job", schema="processing")
    op.drop_column("eo_job", "last_reason_code", schema="processing")
    op.drop_column("eo_job", "retry_not_before", schema="processing")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION processing.guard_eo_job() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'eo_job history is append-only: cancel, do not delete'; END IF;
          IF (to_jsonb(OLD)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id']) IS DISTINCT FROM
             (to_jsonb(NEW)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id']) THEN
            RAISE EXCEPTION 'eo_job request identity is immutable';
          END IF;
          RETURN NEW;
        END $$;
        """
    )
