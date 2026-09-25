-- Corrects a real terminology error: Sentinel-1 ascending and descending
-- are different acquisition/viewing STREAMS of the SAME instrument
-- (Sentinel-1 C-band SAR), not different instruments or sensor families.
-- The original 0011 vocabulary let "S1 ascending + S1 descending agree"
-- satisfy MULTI_SENSOR_SUPPORTED, which overstates the evidence (this is
-- what actually happened for the real Musamya candidate). This migration
-- replaces the state vocabulary with one that names the distinction
-- explicitly and enforces it at the CHECK-constraint level, so the
-- schema itself cannot again claim cross-sensor support from two streams
-- of one sensor family.
--
-- Forward migration only -- 0011 is already published and is not
-- rewritten. Existing rows under the retired vocabulary (the real
-- Musamya corroboration) are reclassified below FROM REAL DATA (each
-- row's actual member candidates' sensor_stream values) -- not hardcoded
-- to "Musamya" specifically, so this also correctly reclassifies any
-- other pre-migration row without needing to know its name in advance.
-- This has to happen in this same migration, between adding the new
-- columns and adding the new state CHECK constraint: Postgres validates
-- a newly added CHECK against every existing row, and the real Musamya
-- row's old state ('MULTI_SENSOR_SUPPORTED') is not in the new
-- vocabulary, so the ADD CONSTRAINT below would fail outright otherwise
-- (confirmed live: it did, on the first attempt).
ALTER TABLE processing.cross_sensor_corroboration
    DROP CONSTRAINT cross_sensor_corroboration_state_check;

ALTER TABLE processing.cross_sensor_corroboration
    ADD COLUMN distinct_stream_count INTEGER,
    ADD COLUMN distinct_sensor_family_count INTEGER,
    ADD COLUMN distinct_modality_count INTEGER;

WITH member_family AS (
    SELECT
        m.corroboration_id,
        cc.sensor_stream,
        CASE WHEN cc.sensor_stream IN ('s1_ascending', 's1_descending') THEN 'sentinel-1'
             WHEN cc.sensor_stream = 's2_optical' THEN 'sentinel-2'
             ELSE cc.sensor_stream END AS sensor_family,
        CASE WHEN cc.sensor_stream IN ('s1_ascending', 's1_descending') THEN 'radar'
             WHEN cc.sensor_stream = 's2_optical' THEN 'optical'
             ELSE 'unknown' END AS modality
    FROM processing.cross_sensor_corroboration_member m
    JOIN processing.change_candidate cc ON cc.id = m.change_candidate_id
),
agg AS (
    SELECT
        corroboration_id,
        count(DISTINCT sensor_stream) AS distinct_stream_count,
        count(DISTINCT sensor_family) AS distinct_sensor_family_count,
        count(DISTINCT modality) AS distinct_modality_count
    FROM member_family
    GROUP BY corroboration_id
)
UPDATE processing.cross_sensor_corroboration c
SET distinct_stream_count = agg.distinct_stream_count,
    distinct_sensor_family_count = agg.distinct_sensor_family_count,
    distinct_modality_count = agg.distinct_modality_count,
    state = CASE
        WHEN agg.distinct_stream_count = 1 THEN 'SINGLE_STREAM'
        WHEN agg.distinct_modality_count >= 2 THEN 'CROSS_MODALITY_SUPPORTED'
        WHEN agg.distinct_sensor_family_count >= 2 THEN 'CROSS_SENSOR_SUPPORTED'
        ELSE 'WITHIN_SENSOR_MULTI_STREAM_SUPPORTED'
    END,
    metadata = c.metadata || jsonb_build_object(
        'reclassified_from_state', c.state,
        'reclassification_reason',
        'migration 0012: S1 ascending+descending is one sensor family (Sentinel-1), not multiple sensors'
    )
FROM agg
WHERE c.id = agg.corroboration_id
  AND c.state IN ('OPTICAL_ONLY', 'SAR_ASC_ONLY', 'SAR_DESC_ONLY', 'MULTI_SENSOR_SUPPORTED');

ALTER TABLE processing.cross_sensor_corroboration
    ADD CONSTRAINT cross_sensor_corroboration_state_check CHECK (state IN (
        'SINGLE_STREAM',
        'WITHIN_SENSOR_MULTI_STREAM_SUPPORTED',
        'CROSS_SENSOR_SUPPORTED',
        'CROSS_MODALITY_SUPPORTED',
        'SENSOR_DISAGREEMENT',
        'INSUFFICIENT_COMMON_SUPPORT',
        'INSUFFICIENT_EVIDENCE'
    ));

-- The counts are the evidence for the classification, not decoration --
-- enforce the relationship the state name promises, at the schema level,
-- so a future caller cannot mislabel two S1 streams as cross-sensor again.
ALTER TABLE processing.cross_sensor_corroboration
    ADD CONSTRAINT ck_corroboration_single_stream
        CHECK (state <> 'SINGLE_STREAM' OR distinct_stream_count = 1),
    ADD CONSTRAINT ck_corroboration_within_sensor
        CHECK (state <> 'WITHIN_SENSOR_MULTI_STREAM_SUPPORTED'
            OR (distinct_stream_count >= 2 AND distinct_sensor_family_count = 1)),
    ADD CONSTRAINT ck_corroboration_cross_sensor
        CHECK (state <> 'CROSS_SENSOR_SUPPORTED' OR distinct_sensor_family_count >= 2),
    ADD CONSTRAINT ck_corroboration_cross_modality
        CHECK (state <> 'CROSS_MODALITY_SUPPORTED' OR distinct_modality_count >= 2);
