-- Bounded Earth Engine evaluation latency + retry backoff (Uganda S2 history
-- v0.1, Parts 2-4). The August country pass exposed one pathological
-- ~93-minute single evaluation (Kagombe, 30,063 ha) with no demonstrable
-- cause in area, vertex count, acquisition count, or surrounding system load
-- -- see docs/data-provenance/uganda-s2-history-kagombe-investigation.md.
-- This does not "fix" Kagombe; it ensures one pathological job cannot block
-- national processing indefinitely.

-- Backoff: a retry_wait job is not reclaimable again until this passes.
ALTER TABLE processing.eo_job ADD COLUMN retry_not_before TIMESTAMP WITH TIME ZONE;
-- The classified reason of the most recent attempt (e.g. PROVIDER_TIMEOUT,
-- WORK_UNIT_TIMEOUT, PROVIDER_UNAVAILABLE) -- distinct from `error`, which is
-- the free-text message; this is the stable code the backoff/telemetry logic
-- and reports key off.
ALTER TABLE processing.eo_job ADD COLUMN last_reason_code TEXT;

CREATE INDEX ix_eo_job_retry_not_before ON processing.eo_job (status, retry_not_before);

-- Widen the mutable-fields whitelist to include the two new coordination
-- columns, same as the leasing columns added in 0006: the REQUEST identity
-- (everything feeding request_hash) stays immutable.
CREATE OR REPLACE FUNCTION processing.guard_eo_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'eo_job history is append-only: cancel, do not delete'; END IF;
  IF (to_jsonb(OLD)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id','retry_not_before','last_reason_code']) IS DISTINCT FROM
     (to_jsonb(NEW)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id','retry_not_before','last_reason_code']) THEN
    RAISE EXCEPTION 'eo_job request identity is immutable';
  END IF;
  RETURN NEW;
END $$;

-- Per-attempt telemetry/audit (append-only, one row per claim). The generic
-- audit.change_event trigger records THAT eo_job changed and why, but its
-- `details` payload is intentionally shallow (superseded_at only) -- it does
-- not preserve per-attempt runtime/error/outcome. This table is the actual
-- auditable attempt history the reliability policy needs: a timed-out
-- attempt is a separate row, never overwritten by a later successful one.
CREATE TABLE processing.eo_job_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eo_job_id UUID NOT NULL REFERENCES processing.eo_job(id),
    attempt_number INTEGER NOT NULL,
    worker_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT NOT NULL,
    reason_code TEXT,
    error TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT eo_job_attempt_outcome_check CHECK (outcome IN ('succeeded', 'retry_wait', 'failed')),
    CONSTRAINT eo_job_attempt_unique UNIQUE (eo_job_id, attempt_number)
);
CREATE INDEX ix_eo_job_attempt_job ON processing.eo_job_attempt (eo_job_id);

CREATE TRIGGER guard_history BEFORE UPDATE OR DELETE ON processing.eo_job_attempt
    FOR EACH ROW EXECUTE FUNCTION audit.guard_history();
CREATE TRIGGER record_change AFTER INSERT OR UPDATE OR DELETE ON processing.eo_job_attempt
    FOR EACH ROW EXECUTE FUNCTION audit.record_change();
