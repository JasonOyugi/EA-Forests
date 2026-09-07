-- Bounded AOI contract (EO observation architecture section 6, decision D3).
-- geo.aoi is a stable analysis-area identity; geo.aoi_version is its immutable
-- boundary selection, exactly one geometry_observation per version. Neither
-- table stores geometry itself.
CREATE TABLE geo.aoi (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	world_id UUID NOT NULL,
	geometry_owner_entity_id UUID NOT NULL,
	subject_entity_id UUID,
	name TEXT,
	analysis_scope TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT pk_aoi PRIMARY KEY (id)
)
;

CREATE TABLE geo.aoi_version (
	id UUID DEFAULT gen_random_uuid() NOT NULL,
	aoi_id UUID NOT NULL,
	world_id UUID NOT NULL,
	revision INTEGER NOT NULL,
	geometry_observation_id UUID NOT NULL,
	geometry_hash TEXT NOT NULL,
	normalization_version TEXT NOT NULL,
	area_m2 NUMERIC CHECK (area_m2 NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
	bounds JSONB DEFAULT '{}'::jsonb NOT NULL,
	predecessor_aoi_version_id UUID,
	correction_reason TEXT,
	source_id UUID NOT NULL,
	evidence_item_id UUID NOT NULL,
	valid_from TIMESTAMP WITH TIME ZONE,
	valid_to TIMESTAMP WITH TIME ZONE,
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL,
	superseded_at TIMESTAMP WITH TIME ZONE,
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED,
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED,
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT pk_aoi_version PRIMARY KEY (id),
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to),
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at),
	CONSTRAINT uq_aoi_version_aoi_id_revision UNIQUE (aoi_id, revision),
	CHECK (area_m2 > 0)
)
;

ALTER TABLE geo.aoi ADD CONSTRAINT fk_aoi_geometry_owner_entity_id_entity FOREIGN KEY(geometry_owner_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi ADD CONSTRAINT fk_aoi_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi ADD CONSTRAINT fk_aoi_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_aoi_id_aoi FOREIGN KEY(aoi_id) REFERENCES geo.aoi (id) ON DELETE RESTRICT;
ALTER TABLE geo.aoi_version ADD CONSTRAINT fk_aoi_version_predecessor_aoi_version_id_aoi_version FOREIGN KEY(predecessor_aoi_version_id) REFERENCES geo.aoi_version (id) ON DELETE RESTRICT;

CREATE INDEX ix_aoi_geometry_owner_entity_id_ref ON geo.aoi (geometry_owner_entity_id);
CREATE INDEX ix_aoi_subject_entity_id_ref ON geo.aoi (subject_entity_id);
CREATE INDEX ix_aoi_world_id_ref ON geo.aoi (world_id);
CREATE INDEX ix_aoi_version_aoi_id_ref ON geo.aoi_version (aoi_id);
CREATE INDEX ix_aoi_version_world_id_ref ON geo.aoi_version (world_id);
CREATE INDEX ix_aoi_version_geometry_observation_id_ref ON geo.aoi_version (geometry_observation_id);
CREATE INDEX ix_aoi_version_source_id_ref ON geo.aoi_version (source_id);
CREATE INDEX ix_aoi_version_evidence_item_id_ref ON geo.aoi_version (evidence_item_id);
CREATE INDEX ix_aoi_version_predecessor_aoi_version_id_ref ON geo.aoi_version (predecessor_aoi_version_id);
CREATE INDEX ix_aoi_version_temporal ON geo.aoi_version USING gist (valid_period, knowledge_period);
CREATE INDEX ix_aoi_version_current ON geo.aoi_version (aoi_id, recorded_at) WHERE superseded_at IS NULL;

-- Same immutability/audit conventions as 0001_guards.sql's generic installer,
-- written out explicitly because that installer only ran once, against the
-- table inventory that existed at the 0001 migration.
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON geo.aoi FOR EACH ROW EXECUTE FUNCTION audit.guard_history('immutable');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON geo.aoi FOR EACH ROW EXECUTE FUNCTION audit.record_change();
CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON geo.aoi_version FOR EACH ROW EXECUTE FUNCTION audit.guard_history('temporal');
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON geo.aoi_version FOR EACH ROW EXECUTE FUNCTION audit.record_change();

-- AOI/version/geometry/world agreement (composite guards, per section 6).
CREATE TRIGGER world_aoi_version_aoi BEFORE INSERT OR UPDATE ON geo.aoi_version FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('aoi_id', 'geo.aoi');
CREATE TRIGGER world_aoi_version_geometry BEFORE INSERT OR UPDATE ON geo.aoi_version FOR EACH ROW
  EXECUTE FUNCTION core.check_world_reference('geometry_observation_id', 'geo.geometry_observation');

CREATE VIEW geo.latest_aoi_version AS
 SELECT DISTINCT ON (aoi_id) * FROM geo.aoi_version
 WHERE knowledge_period @> clock_timestamp() AND valid_period @> clock_timestamp()
 ORDER BY aoi_id, recorded_at DESC, id;
