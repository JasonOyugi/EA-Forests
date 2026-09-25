-- Separates EO execution cohort membership from canonical ingestion (multi-
-- sensor observatory v1, section 1). Every prior national backfill
-- (scripts/run_uganda_national_history.py) re-ran ingest_cfr_polygons() for
-- the full CFR estate on every single sensor invocation -- redundant once
-- canonical geometry already exists, and the direct cause of the verified
-- PostgreSQL advisory-lock contention when the S1 and S2 backfills ran
-- concurrently (both re-ingesting the same 656 CFRs at once).
--
-- processing.eo_cohort/eo_cohort_member is a FROZEN SNAPSHOT of which AOI
-- versions a sensor backfill should execute against -- it names existing
-- geo.aoi_version rows, it never creates or duplicates canonical geometry.
-- A backfill for a given cohort (country, cohort_key, definition_version)
-- reads this table instead of touching entity/aoi/aoi_version/evidence at
-- all. Refreshing membership (e.g. after a real geometry correction) means
-- freezing a NEW definition_version, never mutating an existing one --
-- membership rows are append-only, consistent with the rest of this schema.
CREATE TABLE processing.eo_cohort (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID NOT NULL REFERENCES core.world(id),
    country TEXT NOT NULL,
    cohort_key TEXT NOT NULL,
    definition_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_eo_cohort_identity UNIQUE (country, cohort_key, definition_version)
);

CREATE TABLE processing.eo_cohort_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES processing.eo_cohort(id),
    entity_id UUID NOT NULL REFERENCES core.entity(id),
    aoi_id UUID NOT NULL REFERENCES geo.aoi(id),
    aoi_version_id UUID NOT NULL REFERENCES geo.aoi_version(id),
    source_record_key TEXT NOT NULL,
    -- Snapshot of geo.aoi_version.geometry_hash at freeze time, so a later
    -- comparison against the AOI's then-current hash can detect drift
    -- (the AOI version was superseded after this cohort was frozen)
    -- without joining back through geo.aoi_version for every read.
    geometry_hash TEXT NOT NULL,
    eligibility_status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_eo_cohort_member_identity UNIQUE (cohort_id, source_record_key)
);

CREATE INDEX ix_eo_cohort_member_cohort_id_ref ON processing.eo_cohort_member (cohort_id);
CREATE INDEX ix_eo_cohort_member_aoi_version_id_ref ON processing.eo_cohort_member (aoi_version_id);
