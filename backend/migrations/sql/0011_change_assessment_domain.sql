-- Change-assessment domain foundation (observatory v1, section 4). A
-- change_candidate is DERIVED evidence about the OBSERVATION PROCESS
-- changing (a statistic computed over a sensor-specific feature series
-- crossing some threshold between a baseline and candidate window) -- it
-- is never a forest-state observation, and its interpretation_class is
-- deliberately constrained to a single value at this table's own CHECK
-- constraint level: this schema cannot express "HARVEST"/"FIRE"/
-- "DEGRADATION"/"MORTALITY" even if calling code tried to write it.
-- Promoting a candidate to a biological interpretation is a distinct,
-- separately-evidenced act this schema does not perform.
CREATE TABLE processing.change_candidate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES core.entity(id),
    aoi_version_id UUID NOT NULL REFERENCES geo.aoi_version(id),
    world_id UUID NOT NULL REFERENCES core.world(id),

    -- Homogeneous stream identity: never blended (s2_optical / s1_ascending
    -- / s1_descending today; extensible without a migration since this is
    -- data, not a CHECK-constrained enum -- new lanes must not silently
    -- blend with existing ones, which is enforced by application code
    -- computing baseline/candidate windows per-stream, not by this column).
    sensor_stream TEXT NOT NULL,
    features JSONB NOT NULL, -- e.g. ["ndvi"] or ["vv","vh"]; never a single opaque score

    baseline_window_start TIMESTAMPTZ NOT NULL,
    baseline_window_end TIMESTAMPTZ NOT NULL,
    candidate_window_start TIMESTAMPTZ NOT NULL,
    candidate_window_end TIMESTAMPTZ NOT NULL,

    algorithm TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    config_version TEXT NOT NULL,
    method_config JSONB NOT NULL DEFAULT '{}'::jsonb,

    statistic NUMERIC NOT NULL, -- the method's magnitude/test-statistic
    persistence NUMERIC, -- fraction of subsequent periods the signal held, if known

    common_support_fraction NUMERIC CHECK (common_support_fraction IS NULL OR (common_support_fraction >= 0 AND common_support_fraction <= 1)),
    baseline_acquisition_count INTEGER,
    candidate_acquisition_count INTEGER,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retracted')),
    interpretation_class TEXT NOT NULL DEFAULT 'OBSERVATION_CHANGE'
        CHECK (interpretation_class = 'OBSERVATION_CHANGE'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    CHECK (baseline_window_start < baseline_window_end),
    CHECK (candidate_window_start < candidate_window_end),
    CHECK (baseline_window_end <= candidate_window_start)
);
CREATE INDEX ix_change_candidate_entity_id_ref ON processing.change_candidate (entity_id);
CREATE INDEX ix_change_candidate_aoi_version_id_ref ON processing.change_candidate (aoi_version_id);

-- Real, checkable lineage back to the exact observations that produced the
-- statistic -- never a JSON blob of IDs a reader has to trust unverified.
CREATE TABLE processing.change_candidate_source_observation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_candidate_id UUID NOT NULL REFERENCES processing.change_candidate(id),
    eo_observation_id UUID NOT NULL REFERENCES observations.eo_observation(id),
    role TEXT NOT NULL CHECK (role IN ('baseline', 'candidate')),
    CONSTRAINT uq_change_candidate_source_observation UNIQUE (change_candidate_id, eo_observation_id, role)
);

-- Cross-sensor corroboration: a SEPARATE derived object asking whether
-- independent sensor streams show temporally compatible change -- never
-- folded into change_candidate itself, and never a synonym for a confirmed
-- disturbance. "Independent observation processes changed", nothing more.
CREATE TABLE processing.cross_sensor_corroboration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES core.entity(id),
    aoi_version_id UUID NOT NULL REFERENCES geo.aoi_version(id),
    world_id UUID NOT NULL REFERENCES core.world(id),

    reference_window_start TIMESTAMPTZ NOT NULL,
    reference_window_end TIMESTAMPTZ NOT NULL,

    state TEXT NOT NULL CHECK (state IN (
        'OPTICAL_ONLY', 'SAR_ASC_ONLY', 'SAR_DESC_ONLY',
        'MULTI_SENSOR_SUPPORTED', 'SENSOR_DISAGREEMENT',
        'INSUFFICIENT_COMMON_SUPPORT', 'INSUFFICIENT_EVIDENCE'
    )),
    max_temporal_offset_days NUMERIC,

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    CHECK (reference_window_start < reference_window_end)
);
CREATE INDEX ix_cross_sensor_corroboration_entity_id_ref ON processing.cross_sensor_corroboration (entity_id);

CREATE TABLE processing.cross_sensor_corroboration_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corroboration_id UUID NOT NULL REFERENCES processing.cross_sensor_corroboration(id),
    change_candidate_id UUID NOT NULL REFERENCES processing.change_candidate(id),
    CONSTRAINT uq_cross_sensor_corroboration_member UNIQUE (corroboration_id, change_candidate_id)
);
