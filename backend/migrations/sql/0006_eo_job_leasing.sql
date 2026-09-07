-- Crash-safe job leasing/fencing (EO country-pass Part 6). Still one worker
-- for this pass; this is recovery safety, not new concurrency.
ALTER TABLE processing.eo_job ADD COLUMN lease_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE processing.eo_job ADD COLUMN fencing_token INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE processing.eo_job ADD COLUMN worker_id TEXT;

CREATE INDEX ix_eo_job_claimable ON processing.eo_job (status, lease_expires_at);

-- Widen the mutable-fields whitelist: lease/fencing/worker columns are
-- legitimate coordination state, same as status/attempts/timestamps: the
-- REQUEST identity (everything feeding request_hash) stays immutable.
CREATE OR REPLACE FUNCTION processing.guard_eo_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'eo_job history is append-only: cancel, do not delete'; END IF;
  IF (to_jsonb(OLD)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id']) IS DISTINCT FROM
     (to_jsonb(NEW)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata','lease_expires_at','fencing_token','worker_id']) THEN
    RAISE EXCEPTION 'eo_job request identity is immutable';
  END IF;
  RETURN NEW;
END $$;
