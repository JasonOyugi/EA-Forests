-- Sentinel-2 vertical slice: deterministic processing lineage (D16) and the
-- immutable EO observation/feature store (EO observation architecture
-- sections 7, 8, 12). processing.* is never a model posterior; it is kept
-- structurally separate from models.model_version/model_run.
CREATE SCHEMA processing;

CREATE TABLE evidence.eo_source_item (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	provider_key TEXT NOT NULL,
	collection_key TEXT NOT NULL,
	item_id TEXT NOT NULL,
	sensing_start TIMESTAMP WITH TIME ZONE NOT NULL,
	sensing_end TIMESTAMP WITH TIME ZONE,
	platform TEXT,
	processing_baseline TEXT,
	properties JSONB DEFAULT '{}'::jsonb NOT NULL,
	discovered_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT pk_eo_source_item PRIMARY KEY (id),
	CONSTRAINT uq_eo_source_item_identity UNIQUE (provider_key, collection_key, item_id)
)
;

CREATE TABLE processing.version (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	recipe_key TEXT NOT NULL,
	recipe_version TEXT NOT NULL,
	code_hash TEXT NOT NULL,
	git_commit_sha TEXT,
	environment JSONB DEFAULT '{}'::jsonb NOT NULL,
	configuration_schema_version TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT pk_version PRIMARY KEY (id),
	CONSTRAINT uq_processing_version_identity UNIQUE (recipe_key, recipe_version, code_hash)
)
;

CREATE TABLE processing.run (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	processing_version_id UUID NOT NULL,
	world_id UUID NOT NULL,
	configuration JSONB DEFAULT '{}'::jsonb NOT NULL,
	started_at TIMESTAMP WITH TIME ZONE,
	completed_at TIMESTAMP WITH TIME ZONE,
	outcome TEXT CHECK (outcome IN ('success','partial','no_observation','failed')),
	reason_codes JSONB DEFAULT '{}'::jsonb NOT NULL,
	output_manifest_hash TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT pk_run PRIMARY KEY (id)
)
;

CREATE TABLE processing.input (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	processing_run_id UUID NOT NULL,
	input_kind TEXT NOT NULL CHECK (input_kind IN ('aoi_version','source_item')),
	aoi_version_id UUID,
	eo_source_item_id UUID,
	role TEXT NOT NULL,
	CONSTRAINT pk_input PRIMARY KEY (id),
	CHECK (num_nonnulls(aoi_version_id,eo_source_item_id) = 1)
)
;

CREATE TABLE observations.eo_series (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	aoi_version_id UUID NOT NULL,
	world_id UUID NOT NULL,
	provider_key TEXT NOT NULL,
	collection_key TEXT NOT NULL,
	recipe_key TEXT NOT NULL,
	recipe_version TEXT NOT NULL,
	qa_profile_key TEXT NOT NULL,
	qa_profile_version TEXT NOT NULL,
	statistics_profile TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT pk_eo_series PRIMARY KEY (id),
	CONSTRAINT uq_eo_series_identity UNIQUE (aoi_version_id, provider_key, collection_key, recipe_key, recipe_version, qa_profile_key, qa_profile_version, statistics_profile)
)
;

CREATE TABLE observations.eo_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	series_id UUID NOT NULL,
	world_id UUID NOT NULL,
	processing_run_id UUID NOT NULL,
	window_start TIMESTAMP WITH TIME ZONE NOT NULL,
	window_end TIMESTAMP WITH TIME ZONE NOT NULL,
	support_kind TEXT DEFAULT 'composite' NOT NULL CHECK (support_kind IN ('acquisition','composite')),
	outcome TEXT NOT NULL CHECK (outcome IN ('success','partial','no_observation','failed')),
	reason_codes JSONB DEFAULT '{}'::jsonb NOT NULL,
	source_coverage_fraction NUMERIC CHECK (source_coverage_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (source_coverage_fraction >= 0) CHECK (source_coverage_fraction <= 1),
	clear_pixel_fraction NUMERIC CHECK (clear_pixel_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (clear_pixel_fraction >= 0) CHECK (clear_pixel_fraction <= 1),
	usable_observation_fraction NUMERIC CHECK (usable_observation_fraction <= 1) CHECK (usable_observation_fraction >= 0) CHECK (usable_observation_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	acquisition_count INTEGER NOT NULL,
	eligible_acquisition_count INTEGER NOT NULL,
	applied_qa_profile TEXT NOT NULL,
	discovery_manifest JSONB DEFAULT '{}'::jsonb NOT NULL,
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT pk_eo_observation PRIMARY KEY (id),
	CONSTRAINT uq_eo_observation_period_run UNIQUE (series_id, window_start, window_end, processing_run_id),
	CHECK (window_start < window_end)
)
;

CREATE TABLE observations.eo_feature_set (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	eo_observation_id UUID NOT NULL,
	feature_recipe_key TEXT NOT NULL,
	feature_recipe_version TEXT NOT NULL,
	statistics_profile TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT pk_eo_feature_set PRIMARY KEY (id),
	CONSTRAINT uq_eo_feature_set_eo_observation_id UNIQUE (eo_observation_id)
)
;

CREATE TABLE observations.eo_feature_value (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	eo_feature_set_id UUID NOT NULL,
	feature_key TEXT NOT NULL,
	feature_version TEXT NOT NULL,
	value_statistic TEXT DEFAULT 'mean' NOT NULL CHECK (value_statistic IN ('mean')),
	value NUMERIC CHECK (value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	unit TEXT NOT NULL,
	variance NUMERIC CHECK (variance NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	standard_deviation NUMERIC CHECK (standard_deviation NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	valid_pixel_count INTEGER,
	total_pixel_count INTEGER,
	effective_area_m2 NUMERIC CHECK (effective_area_m2 >= 0) CHECK (effective_area_m2 NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	source_coverage_fraction NUMERIC CHECK (source_coverage_fraction >= 0) CHECK (source_coverage_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (source_coverage_fraction <= 1),
	usable_fraction NUMERIC CHECK (usable_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (usable_fraction >= 0) CHECK (usable_fraction <= 1),
	missingness TEXT CHECK (missingness IN ('UNKNOWN','NOT_APPLICABLE','NOT_MEASURED')),
	reason_codes JSONB DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT pk_eo_feature_value PRIMARY KEY (id),
	CONSTRAINT uq_eo_feature_value_identity UNIQUE (eo_feature_set_id, feature_key, feature_version, value_statistic)
)
;

CREATE TABLE processing.eo_job (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	request_hash TEXT NOT NULL,
	world_id UUID NOT NULL,
	aoi_version_id UUID NOT NULL,
	window_start TIMESTAMP WITH TIME ZONE NOT NULL,
	window_end TIMESTAMP WITH TIME ZONE NOT NULL,
	recipe_key TEXT NOT NULL,
	recipe_version TEXT NOT NULL,
	qa_profile_key TEXT NOT NULL,
	qa_profile_version TEXT NOT NULL,
	statistics_profile TEXT NOT NULL,
	status TEXT DEFAULT 'queued' NOT NULL CHECK (status IN ('queued','running','succeeded','retry_wait','failed','cancelled')),
	attempts INTEGER DEFAULT 0 NOT NULL,
	max_attempts INTEGER DEFAULT 3 NOT NULL,
	processing_run_id UUID,
	eo_observation_id UUID,
	requested_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	started_at TIMESTAMP WITH TIME ZONE,
	completed_at TIMESTAMP WITH TIME ZONE,
	error TEXT,
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT pk_eo_job PRIMARY KEY (id),
	CONSTRAINT uq_eo_job_request_hash UNIQUE (request_hash)
)
;

ALTER TABLE processing.run ADD CONSTRAINT fk_run_processing_version_id_version FOREIGN KEY(processing_version_id) REFERENCES processing.version (id) ON DELETE RESTRICT;
ALTER TABLE processing.run ADD CONSTRAINT fk_run_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;
ALTER TABLE processing.input ADD CONSTRAINT fk_input_eo_source_item_id_eo_source_item FOREIGN KEY(eo_source_item_id) REFERENCES evidence.eo_source_item (id) ON DELETE RESTRICT;
ALTER TABLE processing.input ADD CONSTRAINT fk_input_aoi_version_id_aoi_version FOREIGN KEY(aoi_version_id) REFERENCES geo.aoi_version (id) ON DELETE RESTRICT;
ALTER TABLE processing.input ADD CONSTRAINT fk_input_processing_run_id_run FOREIGN KEY(processing_run_id) REFERENCES processing.run (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_series ADD CONSTRAINT fk_eo_series_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_series ADD CONSTRAINT fk_eo_series_aoi_version_id_aoi_version FOREIGN KEY(aoi_version_id) REFERENCES geo.aoi_version (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_observation ADD CONSTRAINT fk_eo_observation_processing_run_id_run FOREIGN KEY(processing_run_id) REFERENCES processing.run (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_observation ADD CONSTRAINT fk_eo_observation_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_observation ADD CONSTRAINT fk_eo_observation_series_id_eo_series FOREIGN KEY(series_id) REFERENCES observations.eo_series (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_feature_set ADD CONSTRAINT fk_eo_feature_set_eo_observation_id_eo_observation FOREIGN KEY(eo_observation_id) REFERENCES observations.eo_observation (id) ON DELETE RESTRICT;
ALTER TABLE observations.eo_feature_value ADD CONSTRAINT fk_eo_feature_value_eo_feature_set_id_eo_feature_set FOREIGN KEY(eo_feature_set_id) REFERENCES observations.eo_feature_set (id) ON DELETE RESTRICT;
ALTER TABLE processing.eo_job ADD CONSTRAINT fk_eo_job_eo_observation_id_eo_observation FOREIGN KEY(eo_observation_id) REFERENCES observations.eo_observation (id) ON DELETE RESTRICT;
ALTER TABLE processing.eo_job ADD CONSTRAINT fk_eo_job_aoi_version_id_aoi_version FOREIGN KEY(aoi_version_id) REFERENCES geo.aoi_version (id) ON DELETE RESTRICT;
ALTER TABLE processing.eo_job ADD CONSTRAINT fk_eo_job_processing_run_id_run FOREIGN KEY(processing_run_id) REFERENCES processing.run (id) ON DELETE RESTRICT;
ALTER TABLE processing.eo_job ADD CONSTRAINT fk_eo_job_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_run_processing_version_id_ref ON processing.run (processing_version_id);
CREATE INDEX ix_run_world_id_ref ON processing.run (world_id);
CREATE INDEX ix_input_processing_run_id_ref ON processing.input (processing_run_id);
CREATE INDEX ix_input_aoi_version_id_ref ON processing.input (aoi_version_id);
CREATE INDEX ix_input_eo_source_item_id_ref ON processing.input (eo_source_item_id);
CREATE INDEX ix_eo_series_aoi_version_id_ref ON observations.eo_series (aoi_version_id);
CREATE INDEX ix_eo_series_world_id_ref ON observations.eo_series (world_id);
CREATE INDEX ix_eo_observation_series_id_ref ON observations.eo_observation (series_id);
CREATE INDEX ix_eo_observation_world_id_ref ON observations.eo_observation (world_id);
CREATE INDEX ix_eo_observation_processing_run_id_ref ON observations.eo_observation (processing_run_id);
CREATE INDEX ix_eo_feature_set_eo_observation_id_ref ON observations.eo_feature_set (eo_observation_id);
CREATE INDEX ix_eo_feature_value_eo_feature_set_id_ref ON observations.eo_feature_value (eo_feature_set_id);
CREATE INDEX ix_eo_job_world_id_ref ON processing.eo_job (world_id);
CREATE INDEX ix_eo_job_aoi_version_id_ref ON processing.eo_job (aoi_version_id);
CREATE INDEX ix_eo_job_processing_run_id_ref ON processing.eo_job (processing_run_id);
CREATE INDEX ix_eo_job_eo_observation_id_ref ON processing.eo_job (eo_observation_id);

-- Immutability/audit, explicit because 0001_guards.sql's generic installer
-- only ran once, against the table inventory that existed at that migration
-- (before the "processing" schema existed).
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON evidence.eo_source_item FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON evidence.eo_source_item FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON processing.version FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON processing.version FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON processing.input FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON processing.input FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON observations.eo_series FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON observations.eo_series FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON observations.eo_observation FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON observations.eo_observation FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON observations.eo_feature_set FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON observations.eo_feature_set FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON observations.eo_feature_value FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON observations.eo_feature_value FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON processing.eo_job FOR EACH ROW EXECUTE FUNCTION audit.record_change();

-- processing.run: a deterministic derivation record (D16), sealed once its
-- outcome is recorded. Mirrors models.guard_run()'s pattern -- outcome,
-- completion time, reason codes and manifest hash may be set once; every
-- other field (version, world, configuration) is immutable from creation.
CREATE FUNCTION processing.guard_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome IS NOT NULL THEN RAISE EXCEPTION 'sealed processing run is immutable'; END IF;
  IF (to_jsonb(OLD)-ARRAY['started_at','outcome','completed_at','reason_codes','output_manifest_hash']) IS DISTINCT FROM
     (to_jsonb(NEW)-ARRAY['started_at','outcome','completed_at','reason_codes','output_manifest_hash']) THEN
    RAISE EXCEPTION 'processing run inputs and configuration are immutable';
  END IF;
  IF NEW.outcome IS NOT NULL AND NEW.completed_at IS NULL THEN RAISE EXCEPTION 'completion timestamp required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_run BEFORE UPDATE ON processing.run FOR EACH ROW EXECUTE FUNCTION processing.guard_run();

-- processing.eo_job: mutable software coordination (queued/running/succeeded/
-- retry_wait/failed/cancelled), never deleted, and its REQUEST identity
-- (everything that feeds request_hash) is immutable even though status,
-- attempts, timestamps, error and result links may change.
CREATE FUNCTION processing.guard_eo_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'eo_job history is append-only: cancel, do not delete'; END IF;
  IF (to_jsonb(OLD)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata']) IS DISTINCT FROM
     (to_jsonb(NEW)-ARRAY['status','attempts','processing_run_id','eo_observation_id','started_at','completed_at','error','metadata']) THEN
    RAISE EXCEPTION 'eo_job request identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_eo_job BEFORE UPDATE OR DELETE ON processing.eo_job FOR EACH ROW EXECUTE FUNCTION processing.guard_eo_job();

-- World agreement across the pipeline (composite guards, EO architecture section 6/12).
CREATE TRIGGER world_input_aoi_version BEFORE INSERT OR UPDATE ON processing.input FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('aoi_version_id', 'geo.aoi_version', 'processing.run', 'processing_run_id');
CREATE TRIGGER world_eo_series_aoi_version BEFORE INSERT OR UPDATE ON observations.eo_series FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('aoi_version_id', 'geo.aoi_version');
CREATE TRIGGER world_eo_observation_series BEFORE INSERT OR UPDATE ON observations.eo_observation FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('series_id', 'observations.eo_series');
CREATE TRIGGER world_eo_observation_run BEFORE INSERT OR UPDATE ON observations.eo_observation FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('processing_run_id', 'processing.run');
CREATE TRIGGER world_eo_job_aoi_version BEFORE INSERT OR UPDATE ON processing.eo_job FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('aoi_version_id', 'geo.aoi_version');

CREATE VIEW observations.latest_eo_observation AS
 SELECT DISTINCT ON (series_id) * FROM observations.eo_observation
 ORDER BY series_id, window_start DESC, recorded_at DESC, id;
