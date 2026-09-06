-- Frozen Canonical State v0.1 DDL.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA core;

CREATE SCHEMA geo;

CREATE SCHEMA biology;

CREATE SCHEMA forestry;

CREATE SCHEMA market;

CREATE SCHEMA operations;

CREATE SCHEMA evidence;

CREATE SCHEMA observations;

CREATE SCHEMA belief;

CREATE SCHEMA models;

CREATE SCHEMA commercial;

CREATE SCHEMA verification;

CREATE SCHEMA decision;

CREATE SCHEMA audit;


CREATE TABLE core.world (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	name TEXT NOT NULL, 
	kind TEXT NOT NULL CHECK (kind IN ('production','scenario','simulation','experiment')), 
	allow_synthetic BOOLEAN DEFAULT false NOT NULL, 
	synthetic_permission_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_world PRIMARY KEY (id), 
	CHECK (NOT allow_synthetic OR length(synthetic_permission_reason) > 0), 
	CONSTRAINT uq_world_name UNIQUE (name)
)

;


CREATE TABLE core.entity (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_type TEXT NOT NULL, 
	canonical_name TEXT NOT NULL, 
	status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active','unresolved','retired')), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	retired_at TIMESTAMP WITH TIME ZONE, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_entity PRIMARY KEY (id)
)

;


CREATE TABLE evidence.source (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	source_type TEXT NOT NULL, 
	title TEXT NOT NULL, 
	publisher TEXT, 
	uri TEXT, 
	access TEXT DEFAULT 'restricted' NOT NULL CHECK (access IN ('public','restricted','confidential')), 
	data_class TEXT DEFAULT 'UNKNOWN' NOT NULL CHECK (data_class IN ('REPORTED','OBSERVED','ASSUMED','DERIVED','SYNTHETIC','UNKNOWN')), 
	data_vintage TEXT, 
	captured_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_source PRIMARY KEY (id)
)

;


CREATE TABLE evidence.raw_ingest (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	source_id UUID NOT NULL, 
	batch_id UUID NOT NULL, 
	artifact_uri TEXT NOT NULL, 
	content_hash TEXT NOT NULL, 
	original_filename TEXT NOT NULL, 
	media_type TEXT NOT NULL, 
	imported_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	parser_version TEXT NOT NULL, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_raw_ingest PRIMARY KEY (id), 
	CONSTRAINT uq_raw_ingest_content_hash_parser_version_original_filename UNIQUE (content_hash, parser_version, original_filename), 
	CONSTRAINT uq_raw_ingest_id_source_id UNIQUE (id, source_id)
)

;


CREATE TABLE evidence.evidence_item (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	source_id UUID NOT NULL, 
	raw_ingest_id UUID, 
	kind TEXT NOT NULL, 
	data_class TEXT DEFAULT 'UNKNOWN' NOT NULL CHECK (data_class IN ('OBSERVED','REPORTED','ASSUMED','DERIVED','SYNTHETIC','UNKNOWN')), 
	locator JSONB DEFAULT '{}'::jsonb NOT NULL, 
	content_hash TEXT, 
	raw_record JSONB, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_evidence_item PRIMARY KEY (id), 
	CONSTRAINT uq_evidence_item_id_source_id UNIQUE (id, source_id)
)

;


CREATE TABLE core.entity_alias (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	alias TEXT NOT NULL, 
	source_id UUID, 
	resolution_confidence NUMERIC CHECK (resolution_confidence NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (resolution_confidence >= 0) CHECK (resolution_confidence <= 1), 
	resolution_method TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_entity_alias PRIMARY KEY (id)
)

;


CREATE TABLE core.external_identity (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	dataset TEXT NOT NULL, 
	source_record_key TEXT NOT NULL, 
	role TEXT NOT NULL, 
	entity_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	CONSTRAINT pk_external_identity PRIMARY KEY (id), 
	CONSTRAINT uq_external_identity_dataset_source_record_key_role UNIQUE (dataset, source_record_key, role)
)

;


CREATE TABLE observations.unit (
	symbol TEXT NOT NULL, 
	dimension TEXT NOT NULL, 
	scale NUMERIC NOT NULL CHECK (scale NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (scale >= 0), 
	CONSTRAINT pk_unit PRIMARY KEY (symbol)
)

;


CREATE TABLE observations.variable_definition (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	key TEXT NOT NULL, 
	name TEXT NOT NULL, 
	description TEXT NOT NULL, 
	data_type TEXT NOT NULL CHECK (data_type IN ('numeric','text','boolean','categorical','structured','datetime')), 
	canonical_unit TEXT, 
	minimum NUMERIC CHECK (minimum NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	maximum NUMERIC CHECK (maximum NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	valid_domain JSONB DEFAULT '{}'::jsonb NOT NULL, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_variable_definition PRIMARY KEY (id), 
	CHECK (data_type <> 'numeric' OR canonical_unit IS NOT NULL), 
	CHECK (minimum IS NULL OR maximum IS NULL OR minimum <= maximum), 
	CONSTRAINT uq_variable_definition_key UNIQUE (key)
)

;


CREATE TABLE observations.variable_alias (
	alias TEXT NOT NULL, 
	variable_definition_id UUID NOT NULL, 
	CONSTRAINT pk_variable_alias PRIMARY KEY (alias)
)

;


CREATE TABLE geo.geometry_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	geometry geometry(GEOMETRY,4326) NOT NULL, 
	original_srid INTEGER DEFAULT 4326 NOT NULL, 
	method TEXT NOT NULL CHECK (method IN ('surveyed','gps','official_kml','digitised','remote_sensing','geocoded','reported_coordinate','centroid_estimate','display_offset')), 
	precision_m NUMERIC CHECK (precision_m NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (precision_m >= 0), 
	precision_description TEXT NOT NULL, 
	confidence TEXT, 
	observed_at TIMESTAMP WITH TIME ZONE, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_geometry_observation PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CHECK (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)), 
	CHECK (ST_CoveredBy(geometry, ST_MakeEnvelope(-180,-90,180,90,4326)))
)

;


CREATE TABLE observations.observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	subject_entity_id UUID NOT NULL, 
	variable_definition_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	numeric_value NUMERIC CHECK (numeric_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	text_value TEXT, 
	boolean_value BOOLEAN, 
	categorical_value TEXT, 
	structured_value JSONB, 
	datetime_value TIMESTAMP WITH TIME ZONE, 
	unit TEXT, 
	missingness TEXT CHECK (missingness IN ('UNKNOWN','NOT_APPLICABLE','NOT_MEASURED','NOT_REPORTED','WITHHELD','CONFIDENTIAL')), 
	epistemic_class TEXT NOT NULL CHECK (epistemic_class IN ('OBSERVED','REPORTED','DERIVED','INFERRED','ASSUMED','FORECAST','SCENARIO','SYNTHETIC','UNKNOWN')), 
	method TEXT NOT NULL, 
	sampling_protocol TEXT, 
	observed_at TIMESTAMP WITH TIME ZONE, 
	observer_entity_id UUID, 
	geometry_observation_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	uncertainty JSONB DEFAULT '{}'::jsonb NOT NULL, 
	quality_status TEXT DEFAULT 'unreviewed' NOT NULL CHECK (quality_status IN ('unreviewed','accepted','flagged','rejected')), 
	status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active','superseded','contradicted','verified')), 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_observation PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CHECK (num_nonnulls(numeric_value,text_value,boolean_value,categorical_value,structured_value,datetime_value) = CASE WHEN missingness IS NULL THEN 1 ELSE 0 END), 
	CHECK (numeric_value IS NULL OR unit IS NOT NULL), 
	CHECK (length(method) > 0), 
	CHECK (epistemic_class NOT IN ('INFERRED','DERIVED','FORECAST'))
)

;


CREATE TABLE observations.assertion (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	subject_entity_id UUID NOT NULL, 
	variable_definition_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	numeric_value NUMERIC CHECK (numeric_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	text_value TEXT, 
	boolean_value BOOLEAN, 
	categorical_value TEXT, 
	structured_value JSONB, 
	datetime_value TIMESTAMP WITH TIME ZONE, 
	unit TEXT, 
	missingness TEXT CHECK (missingness IN ('UNKNOWN','NOT_APPLICABLE','NOT_MEASURED','NOT_REPORTED','WITHHELD','CONFIDENTIAL')), 
	epistemic_class TEXT NOT NULL CHECK (epistemic_class IN ('OBSERVED','REPORTED','DERIVED','INFERRED','ASSUMED','FORECAST','SCENARIO','SYNTHETIC','UNKNOWN')), 
	method TEXT NOT NULL, 
	sampling_protocol TEXT, 
	observed_at TIMESTAMP WITH TIME ZONE, 
	observer_entity_id UUID, 
	geometry_observation_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	uncertainty JSONB DEFAULT '{}'::jsonb NOT NULL, 
	quality_status TEXT DEFAULT 'unreviewed' NOT NULL CHECK (quality_status IN ('unreviewed','accepted','flagged','rejected')), 
	status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active','superseded','contradicted','verified')), 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_assertion PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CHECK (num_nonnulls(numeric_value,text_value,boolean_value,categorical_value,structured_value,datetime_value) = CASE WHEN missingness IS NULL THEN 1 ELSE 0 END), 
	CHECK (numeric_value IS NULL OR unit IS NOT NULL), 
	CHECK (length(method) > 0), 
	CHECK (epistemic_class NOT IN ('INFERRED','DERIVED','FORECAST'))
)

;


CREATE TABLE biology.taxon (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	catalogue_key TEXT, 
	scientific_name TEXT NOT NULL, 
	rank TEXT NOT NULL CHECK (rank IN ('genus','species','hybrid','unknown')), 
	parent_taxon_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	CONSTRAINT pk_taxon PRIMARY KEY (id), 
	CONSTRAINT uq_taxon_entity_id UNIQUE (entity_id), 
	CONSTRAINT uq_taxon_catalogue_key UNIQUE (catalogue_key)
)

;


CREATE TABLE biology.taxon_parent (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	hybrid_taxon_id UUID NOT NULL, 
	parent_taxon_id UUID NOT NULL, 
	CONSTRAINT pk_taxon_parent PRIMARY KEY (id), 
	CONSTRAINT uq_taxon_parent_hybrid_taxon_id_parent_taxon_id UNIQUE (hybrid_taxon_id, parent_taxon_id), 
	CHECK (hybrid_taxon_id <> parent_taxon_id)
)

;


CREATE TABLE biology.genetic_material (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	taxon_id UUID NOT NULL, 
	kind TEXT NOT NULL CHECK (kind IN ('provenance','family','clone','seed_lot','unknown')), 
	identifier TEXT NOT NULL, 
	parent_material_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_genetic_material PRIMARY KEY (id), 
	CONSTRAINT uq_genetic_material_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.asset_portfolio (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	owner_entity_id UUID, 
	CONSTRAINT pk_asset_portfolio PRIMARY KEY (id), 
	CONSTRAINT uq_asset_portfolio_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.estate (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	portfolio_id UUID, 
	manager_entity_id UUID, 
	CONSTRAINT pk_estate PRIMARY KEY (id), 
	CONSTRAINT uq_estate_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.parcel (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	estate_id UUID, 
	registry_identifier TEXT, 
	CONSTRAINT pk_parcel PRIMARY KEY (id), 
	CONSTRAINT uq_parcel_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.stand (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	parcel_id UUID, 
	estate_id UUID, 
	genetic_material_id UUID, 
	manager_entity_id UUID, 
	CONSTRAINT pk_stand PRIMARY KEY (id), 
	CONSTRAINT uq_stand_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.plot (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	stand_id UUID, 
	protocol TEXT, 
	CONSTRAINT pk_plot PRIMARY KEY (id), 
	CONSTRAINT uq_plot_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.tree (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	plot_id UUID, 
	stand_id UUID, 
	genetic_material_id UUID, 
	tag TEXT, 
	CONSTRAINT pk_tree PRIMARY KEY (id), 
	CONSTRAINT uq_tree_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.management_event (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	subject_entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	event_type TEXT NOT NULL, 
	event_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	geometry_observation_id UUID, 
	affected_area_ha NUMERIC CHECK (affected_area_ha NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (affected_area_ha >= 0), 
	method TEXT NOT NULL, 
	intensity JSONB DEFAULT '{}'::jsonb NOT NULL, 
	inputs JSONB DEFAULT '{}'::jsonb NOT NULL, 
	operator_entity_id UUID, 
	cost_observation_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	CONSTRAINT pk_management_event PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at)
)

;


CREATE TABLE forestry.harvest_event (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	management_event_id UUID NOT NULL, 
	stand_id UUID, 
	harvest_system TEXT, 
	CONSTRAINT pk_harvest_event PRIMARY KEY (id), 
	CONSTRAINT uq_harvest_event_management_event_id UNIQUE (management_event_id)
)

;


CREATE TABLE forestry.log (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	tree_id UUID, 
	harvest_event_id UUID, 
	genetic_material_id UUID, 
	CONSTRAINT pk_log PRIMARY KEY (id), 
	CONSTRAINT uq_log_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE forestry.log_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	log_id UUID NOT NULL, 
	observation_id UUID NOT NULL, 
	CONSTRAINT pk_log_observation PRIMARY KEY (id), 
	CONSTRAINT uq_log_observation_observation_id UNIQUE (observation_id)
)

;


CREATE TABLE market.organisation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	organisation_kind TEXT, 
	CONSTRAINT pk_organisation PRIMARY KEY (id), 
	CONSTRAINT uq_organisation_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE market.facility (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	organisation_id UUID, 
	facility_type TEXT NOT NULL, 
	CONSTRAINT pk_facility PRIMARY KEY (id), 
	CONSTRAINT uq_facility_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE market.processing_line (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	facility_id UUID NOT NULL, 
	process_type TEXT NOT NULL, 
	CONSTRAINT pk_processing_line PRIMARY KEY (id), 
	CONSTRAINT uq_processing_line_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE market.procurement_programme (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	facility_id UUID NOT NULL, 
	processing_line_id UUID, 
	name TEXT NOT NULL, 
	CONSTRAINT pk_procurement_programme PRIMARY KEY (id), 
	CONSTRAINT uq_procurement_programme_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE market.grade_definition (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	procurement_programme_id UUID NOT NULL, 
	taxon_id UUID NOT NULL, 
	code TEXT NOT NULL, 
	CONSTRAINT pk_grade_definition PRIMARY KEY (id), 
	CONSTRAINT uq_grade_definition_procurement_programme_id_taxon_id_code UNIQUE (procurement_programme_id, taxon_id, code), 
	CONSTRAINT uq_grade_definition_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE market.processor_specification (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	grade_definition_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	accepted_material_id UUID, 
	min_sed_cm NUMERIC CHECK (min_sed_cm NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (min_sed_cm >= 0), 
	max_sed_cm NUMERIC CHECK (max_sed_cm >= 0) CHECK (max_sed_cm NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	min_led_cm NUMERIC CHECK (min_led_cm NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (min_led_cm >= 0), 
	max_led_cm NUMERIC CHECK (max_led_cm NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (max_led_cm >= 0), 
	min_length_m NUMERIC CHECK (min_length_m NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (min_length_m >= 0), 
	max_length_m NUMERIC CHECK (max_length_m NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (max_length_m >= 0), 
	max_taper_cm_per_m NUMERIC CHECK (max_taper_cm_per_m NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (max_taper_cm_per_m >= 0), 
	max_moisture_fraction NUMERIC CHECK (max_moisture_fraction NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (max_moisture_fraction >= 0) CHECK (max_moisture_fraction <= 1), 
	diameter_basis TEXT DEFAULT 'unknown' NOT NULL, 
	quality_requirements TEXT, 
	certification_requirements TEXT, 
	assertion_id UUID, 
	observation_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	CONSTRAINT pk_processor_specification PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CHECK (num_nonnulls(assertion_id,observation_id) = 1), 
	CHECK (min_sed_cm <= max_sed_cm), 
	CHECK (min_led_cm <= max_led_cm), 
	CHECK (min_length_m <= max_length_m)
)

;


CREATE TABLE market.price_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	subject_entity_id UUID NOT NULL, 
	procurement_programme_id UUID, 
	grade_definition_id UUID, 
	taxon_id UUID, 
	world_id UUID NOT NULL, 
	amount NUMERIC NOT NULL CHECK (amount >= 0) CHECK (amount NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	currency TEXT NOT NULL CHECK (currency IN ('UGX','USD')), 
	unit TEXT NOT NULL, 
	basis TEXT NOT NULL CHECK (basis IN ('delivered','factory_gate','roadside','standing_tree','nursery_gate','unknown')), 
	quantity_min NUMERIC CHECK (quantity_min NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (quantity_min >= 0), 
	quantity_max NUMERIC CHECK (quantity_max >= 0) CHECK (quantity_max NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	payment_terms TEXT, 
	assertion_id UUID, 
	observation_id UUID, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	CONSTRAINT pk_price_observation PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CHECK (num_nonnulls(assertion_id,observation_id) = 1), 
	CHECK (unit LIKE currency || '/%'), 
	CHECK (quantity_min <= quantity_max)
)

;


CREATE TABLE market.demand_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	subject_entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	demand_type TEXT NOT NULL CHECK (demand_type IN ('installed_capacity','operational_capacity','target_throughput','observed_throughput','desired_procurement','committed_procurement','unfilled_demand')), 
	assertion_id UUID, 
	observation_id UUID, 
	CONSTRAINT pk_demand_observation PRIMARY KEY (id), 
	CHECK (num_nonnulls(assertion_id,observation_id) = 1)
)

;


CREATE TABLE market.nursery_material (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	facility_id UUID NOT NULL, 
	genetic_material_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	CONSTRAINT pk_nursery_material PRIMARY KEY (id), 
	CONSTRAINT uq_nursery_material_facility_id_genetic_material_id_evi_c7e9 UNIQUE (facility_id, genetic_material_id, evidence_item_id)
)

;


CREATE TABLE operations.operator (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	organisation_id UUID, 
	CONSTRAINT pk_operator PRIMARY KEY (id), 
	CONSTRAINT uq_operator_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE operations.crew (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	operator_id UUID, 
	CONSTRAINT pk_crew PRIMARY KEY (id), 
	CONSTRAINT uq_crew_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE operations.equipment (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	operator_id UUID, 
	equipment_class TEXT NOT NULL, 
	CONSTRAINT pk_equipment PRIMARY KEY (id), 
	CONSTRAINT uq_equipment_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE operations.job (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	activity TEXT NOT NULL, 
	subject_entity_id UUID, 
	operator_id UUID, 
	crew_id UUID, 
	geometry_observation_id UUID, 
	started_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	terrain TEXT, 
	weather TEXT, 
	status TEXT NOT NULL, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	metadata JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_job PRIMARY KEY (id), 
	CONSTRAINT uq_job_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE operations.job_equipment (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	job_id UUID NOT NULL, 
	equipment_id UUID NOT NULL, 
	CONSTRAINT pk_job_equipment PRIMARY KEY (id), 
	CONSTRAINT uq_job_equipment_job_id_equipment_id UNIQUE (job_id, equipment_id)
)

;


CREATE TABLE operations.job_observation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	job_id UUID NOT NULL, 
	observation_id UUID NOT NULL, 
	CONSTRAINT pk_job_observation PRIMARY KEY (id), 
	CONSTRAINT uq_job_observation_observation_id UNIQUE (observation_id)
)

;


CREATE TABLE operations.route (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	origin_entity_id UUID NOT NULL, 
	destination_entity_id UUID NOT NULL, 
	method TEXT NOT NULL, 
	source_id UUID NOT NULL, 
	evidence_item_id UUID NOT NULL, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_to TIMESTAMP WITH TIME ZONE, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	superseded_at TIMESTAMP WITH TIME ZONE, 
	valid_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED, 
	knowledge_period TSTZRANGE GENERATED ALWAYS AS (tstzrange(recorded_at, superseded_at, '[)')) STORED, 
	CONSTRAINT pk_route PRIMARY KEY (id), 
	CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to), 
	CHECK (superseded_at IS NULL OR recorded_at < superseded_at), 
	CONSTRAINT uq_route_entity_id UNIQUE (entity_id)
)

;


CREATE TABLE operations.route_leg (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	route_id UUID NOT NULL, 
	sequence INTEGER NOT NULL, 
	mode TEXT NOT NULL, 
	origin_entity_id UUID, 
	destination_entity_id UUID, 
	road_class TEXT, 
	season TEXT, 
	distance_observation_id UUID, 
	payload_observation_id UUID, 
	travel_time_observation_id UUID, 
	cost_observation_id UUID, 
	restrictions JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_route_leg PRIMARY KEY (id), 
	CONSTRAINT uq_route_leg_route_id_sequence UNIQUE (route_id, sequence), 
	CHECK (sequence >= 0)
)

;


CREATE TABLE models.model_definition (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	key TEXT NOT NULL, 
	name TEXT NOT NULL, 
	purpose TEXT NOT NULL, 
	CONSTRAINT pk_model_definition PRIMARY KEY (id), 
	CONSTRAINT uq_model_definition_key UNIQUE (key)
)

;


CREATE TABLE models.model_version (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	model_definition_id UUID NOT NULL, 
	version TEXT NOT NULL, 
	git_commit_sha TEXT, 
	code_path TEXT NOT NULL, 
	code_hash TEXT NOT NULL, 
	code_artifact_uri TEXT NOT NULL, 
	configuration_schema_version TEXT NOT NULL, 
	configuration_schema JSONB DEFAULT '{}'::jsonb NOT NULL, 
	environment JSONB DEFAULT '{}'::jsonb NOT NULL, 
	status TEXT DEFAULT 'experimental' NOT NULL CHECK (status IN ('active','deprecated','experimental')), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_model_version PRIMARY KEY (id), 
	CONSTRAINT uq_model_version_model_definition_id_version_code_hash UNIQUE (model_definition_id, version, code_hash)
)

;


CREATE TABLE models.model_run (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	model_version_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	input_state_snapshot_id UUID, 
	inputs JSONB DEFAULT '{}'::jsonb NOT NULL, 
	configuration JSONB DEFAULT '{}'::jsonb NOT NULL, 
	rng_seed INTEGER, 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending','running','completed','failed')), 
	artifact_uri TEXT, 
	diagnostics JSONB DEFAULT '{}'::jsonb NOT NULL, 
	error JSONB DEFAULT '{}'::jsonb NOT NULL, 
	measurement_noise JSONB DEFAULT '{}'::jsonb NOT NULL, 
	model_discrepancy JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_model_run PRIMARY KEY (id), 
	CONSTRAINT uq_model_run_id_model_version_id_world_id UNIQUE (id, model_version_id, world_id)
)

;


CREATE TABLE models.parameter_definition (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	key TEXT NOT NULL, 
	block TEXT NOT NULL CHECK (block IN ('growth','bucking','market','cost','observation_error','model_discrepancy')), 
	description TEXT NOT NULL, 
	unit TEXT, 
	prior_distribution JSONB DEFAULT '{}'::jsonb NOT NULL, 
	source_id UUID NOT NULL, 
	model_version_id UUID NOT NULL, 
	CONSTRAINT pk_parameter_definition PRIMARY KEY (id), 
	CONSTRAINT uq_parameter_definition_key UNIQUE (key)
)

;


CREATE TABLE models.run_input (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	model_run_id UUID NOT NULL, 
	assertion_id UUID, 
	observation_id UUID, 
	geometry_observation_id UUID, 
	CONSTRAINT pk_run_input PRIMARY KEY (id), 
	CHECK (num_nonnulls(assertion_id,observation_id,geometry_observation_id) = 1)
)

;


CREATE TABLE belief.posterior_snapshot (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	parent_snapshot_id UUID, 
	world_id UUID NOT NULL, 
	model_version_id UUID NOT NULL, 
	model_run_id UUID NOT NULL, 
	state_type TEXT NOT NULL, 
	summary JSONB DEFAULT '{}'::jsonb NOT NULL, 
	artifact_uri TEXT, 
	diagnostics JSONB DEFAULT '{}'::jsonb NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_posterior_snapshot PRIMARY KEY (id), 
	CONSTRAINT uq_posterior_snapshot_id_model_version_id_world_id UNIQUE (id, model_version_id, world_id)
)

;


CREATE TABLE belief.state_snapshot (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	entity_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	posterior_snapshot_id UUID NOT NULL, 
	model_version_id UUID NOT NULL, 
	state_type TEXT NOT NULL, 
	as_of TIMESTAMP WITH TIME ZONE NOT NULL, 
	known_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	summary JSONB DEFAULT '{}'::jsonb NOT NULL, 
	artifact_uri TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_state_snapshot PRIMARY KEY (id)
)

;


CREATE TABLE belief.snapshot_input (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	posterior_snapshot_id UUID NOT NULL, 
	assertion_id UUID, 
	observation_id UUID, 
	geometry_observation_id UUID, 
	CONSTRAINT pk_snapshot_input PRIMARY KEY (id), 
	CHECK (num_nonnulls(assertion_id,observation_id,geometry_observation_id) = 1), 
	CONSTRAINT uq_snapshot_input_posterior_snapshot_id_assertion_id UNIQUE (posterior_snapshot_id, assertion_id), 
	CONSTRAINT uq_snapshot_input_posterior_snapshot_id_observation_id UNIQUE (posterior_snapshot_id, observation_id), 
	CONSTRAINT uq_snapshot_input_posterior_snapshot_id_geometry_observation_id UNIQUE (posterior_snapshot_id, geometry_observation_id)
)

;


CREATE TABLE belief.parameter_posterior (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	parameter_definition_id UUID NOT NULL, 
	posterior_snapshot_id UUID NOT NULL, 
	scope_type TEXT NOT NULL, 
	scope_entity_id UUID, 
	scope_qualifiers JSONB DEFAULT '{}'::jsonb NOT NULL, 
	summary JSONB DEFAULT '{}'::jsonb NOT NULL, 
	evidence_count INTEGER NOT NULL, 
	artifact_uri TEXT, 
	CONSTRAINT pk_parameter_posterior PRIMARY KEY (id), 
	CHECK (evidence_count >= 0), 
	CHECK (scope_type = 'global' OR scope_entity_id IS NOT NULL)
)

;


CREATE TABLE belief.invalidation (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	state_snapshot_id UUID NOT NULL, 
	assertion_id UUID, 
	observation_id UUID, 
	reason TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_invalidation PRIMARY KEY (id), 
	CHECK (num_nonnulls(assertion_id,observation_id) = 1)
)

;


CREATE TABLE commercial.match_run (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	model_run_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	state_snapshot_id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_match_run PRIMARY KEY (id)
)

;


CREATE TABLE commercial.match_candidate (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	match_run_id UUID NOT NULL, 
	world_id UUID NOT NULL, 
	supply_entity_id UUID NOT NULL, 
	supply_state_snapshot_id UUID NOT NULL, 
	buyer_state_snapshot_id UUID NOT NULL, 
	procurement_programme_id UUID NOT NULL, 
	operator_id UUID, 
	route_id UUID, 
	compatibility_probability NUMERIC CHECK (compatibility_probability >= 0) CHECK (compatibility_probability <= 1) CHECK (compatibility_probability NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	expected_quantity NUMERIC CHECK (expected_quantity NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (expected_quantity >= 0), 
	quantity_unit TEXT, 
	delivered_cost NUMERIC CHECK (delivered_cost NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	buyer_value NUMERIC CHECK (buyer_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	surplus NUMERIC CHECK (surplus NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	money_unit TEXT, 
	grade_distribution JSONB DEFAULT '{}'::jsonb NOT NULL, 
	binding_constraint TEXT, 
	rank INTEGER, 
	uncertainty JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_match_candidate PRIMARY KEY (id), 
	CHECK (expected_quantity IS NULL OR quantity_unit IS NOT NULL), 
	CHECK (num_nonnulls(delivered_cost,buyer_value,surplus)=0 OR money_unit IS NOT NULL)
)

;


CREATE TABLE commercial.opportunity (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	world_id UUID NOT NULL, 
	state_snapshot_id UUID NOT NULL, 
	match_candidate_id UUID, 
	entity_id UUID NOT NULL, 
	status TEXT DEFAULT 'discovered' NOT NULL CHECK (status IN ('discovered','needs_verification','verified','buyer_engaged','negotiating','contracted','fulfilled','closed')), 
	description TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_opportunity PRIMARY KEY (id)
)

;


CREATE TABLE decision.decision (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	world_id UUID NOT NULL, 
	decision_type TEXT NOT NULL, 
	context JSONB DEFAULT '{}'::jsonb NOT NULL, 
	state_snapshot_id UUID NOT NULL, 
	objective TEXT NOT NULL, 
	risk_configuration JSONB DEFAULT '{}'::jsonb NOT NULL, 
	available_actions JSONB DEFAULT '{}'::jsonb NOT NULL, 
	selected_action JSONB DEFAULT '{}'::jsonb NOT NULL, 
	owner_entity_id UUID, 
	decided_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_decision PRIMARY KEY (id)
)

;


CREATE TABLE verification.task (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	world_id UUID NOT NULL, 
	target_entity_id UUID NOT NULL, 
	variable_definition_id UUID, 
	target_uncertainty TEXT, 
	reason TEXT NOT NULL, 
	decision_id UUID, 
	opportunity_id UUID, 
	expected_information_value NUMERIC CHECK (expected_information_value >= 0) CHECK (expected_information_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	expected_decision_value NUMERIC CHECK (expected_decision_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)), 
	estimated_cost NUMERIC CHECK (estimated_cost NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) CHECK (estimated_cost >= 0), 
	currency TEXT, 
	priority INTEGER DEFAULT 0 NOT NULL, 
	sampling_plan JSONB DEFAULT '{}'::jsonb NOT NULL, 
	status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open','assigned','in_progress','completed','cancelled')), 
	assignee_entity_id UUID, 
	due_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	CONSTRAINT pk_task PRIMARY KEY (id), 
	CHECK (num_nonnulls(estimated_cost,expected_decision_value)=0 OR currency IN ('UGX','USD'))
)

;


CREATE TABLE verification.result (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	task_id UUID NOT NULL, 
	observation_id UUID NOT NULL, 
	CONSTRAINT pk_result PRIMARY KEY (id), 
	CONSTRAINT uq_result_task_id_observation_id UNIQUE (task_id, observation_id)
)

;


CREATE TABLE audit.change_event (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	table_name TEXT NOT NULL, 
	record_id UUID NOT NULL, 
	action TEXT NOT NULL, 
	actor TEXT NOT NULL, 
	reason TEXT NOT NULL, 
	superseded_record_id UUID, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp() NOT NULL, 
	details JSONB DEFAULT '{}'::jsonb NOT NULL, 
	CONSTRAINT pk_change_event PRIMARY KEY (id)
)

;

CREATE INDEX ix_entity_entity_type ON core.entity (entity_type);

ALTER TABLE evidence.raw_ingest ADD CONSTRAINT fk_raw_ingest_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

CREATE INDEX ix_raw_ingest_source_id_ref ON evidence.raw_ingest (source_id);

ALTER TABLE evidence.evidence_item ADD CONSTRAINT fk_evidence_item_raw_ingest_id_raw_ingest FOREIGN KEY(raw_ingest_id) REFERENCES evidence.raw_ingest (id) ON DELETE RESTRICT;

ALTER TABLE evidence.evidence_item ADD CONSTRAINT fk_evidence_item_raw_ingest_id_source_id_raw_ingest FOREIGN KEY(raw_ingest_id, source_id) REFERENCES evidence.raw_ingest (id, source_id);

ALTER TABLE evidence.evidence_item ADD CONSTRAINT fk_evidence_item_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

CREATE INDEX ix_evidence_item_raw_ingest_id_ref ON evidence.evidence_item (raw_ingest_id);

CREATE INDEX ix_evidence_item_source_id_ref ON evidence.evidence_item (source_id);

ALTER TABLE core.entity_alias ADD CONSTRAINT fk_entity_alias_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE core.entity_alias ADD CONSTRAINT fk_entity_alias_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

CREATE INDEX ix_entity_alias_alias ON core.entity_alias (alias);

CREATE INDEX ix_entity_alias_entity_id_ref ON core.entity_alias (entity_id);

CREATE INDEX ix_entity_alias_source_id_ref ON core.entity_alias (source_id);

ALTER TABLE core.external_identity ADD CONSTRAINT fk_external_identity_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE core.external_identity ADD CONSTRAINT fk_external_identity_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

CREATE INDEX ix_external_identity_entity_id_ref ON core.external_identity (entity_id);

CREATE INDEX ix_external_identity_evidence_item_id_ref ON core.external_identity (evidence_item_id);

ALTER TABLE observations.variable_definition ADD CONSTRAINT fk_variable_definition_canonical_unit_unit FOREIGN KEY(canonical_unit) REFERENCES observations.unit (symbol);

CREATE INDEX ix_variable_definition_canonical_unit_ref ON observations.variable_definition (canonical_unit);

ALTER TABLE observations.variable_alias ADD CONSTRAINT fk_variable_alias_variable_definition_id_variable_definition FOREIGN KEY(variable_definition_id) REFERENCES observations.variable_definition (id) ON DELETE RESTRICT;

CREATE INDEX ix_variable_alias_variable_definition_id_ref ON observations.variable_alias (variable_definition_id);

ALTER TABLE geo.geometry_observation ADD CONSTRAINT fk_geometry_observation_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE geo.geometry_observation ADD CONSTRAINT fk_geometry_observation_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE geo.geometry_observation ADD CONSTRAINT fk_geometry_observation_evidence_item_id_source_id_evid_7d24 FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE geo.geometry_observation ADD CONSTRAINT fk_geometry_observation_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE geo.geometry_observation ADD CONSTRAINT fk_geometry_observation_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_geometry_observation_current ON geo.geometry_observation (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_geometry_observation_entity_id_ref ON geo.geometry_observation (entity_id);

CREATE INDEX ix_geometry_observation_evidence_item_id_ref ON geo.geometry_observation (evidence_item_id);

CREATE INDEX ix_geometry_observation_geometry ON geo.geometry_observation USING gist (geometry);

CREATE INDEX ix_geometry_observation_source_id_ref ON geo.geometry_observation (source_id);

CREATE INDEX ix_geometry_observation_temporal ON geo.geometry_observation USING gist (valid_period, knowledge_period);

CREATE INDEX ix_geometry_observation_world_id_ref ON geo.geometry_observation (world_id);

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_observer_entity_id_entity FOREIGN KEY(observer_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_unit_unit FOREIGN KEY(unit) REFERENCES observations.unit (symbol);

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_variable_definition_id_variable_definition FOREIGN KEY(variable_definition_id) REFERENCES observations.variable_definition (id) ON DELETE RESTRICT;

ALTER TABLE observations.observation ADD CONSTRAINT fk_observation_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_observation_current ON observations.observation (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_observation_evidence_item_id_ref ON observations.observation (evidence_item_id);

CREATE INDEX ix_observation_geometry_observation_id_ref ON observations.observation (geometry_observation_id);

CREATE INDEX ix_observation_observer_entity_id_ref ON observations.observation (observer_entity_id);

CREATE INDEX ix_observation_source_id_ref ON observations.observation (source_id);

CREATE INDEX ix_observation_subject_entity_id_ref ON observations.observation (subject_entity_id);

CREATE INDEX ix_observation_temporal ON observations.observation USING gist (valid_period, knowledge_period);

CREATE INDEX ix_observation_unit_ref ON observations.observation (unit);

CREATE INDEX ix_observation_variable_definition_id_ref ON observations.observation (variable_definition_id);

CREATE INDEX ix_observation_world_id_ref ON observations.observation (world_id);

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_observer_entity_id_entity FOREIGN KEY(observer_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_unit_unit FOREIGN KEY(unit) REFERENCES observations.unit (symbol);

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_variable_definition_id_variable_definition FOREIGN KEY(variable_definition_id) REFERENCES observations.variable_definition (id) ON DELETE RESTRICT;

ALTER TABLE observations.assertion ADD CONSTRAINT fk_assertion_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_assertion_current ON observations.assertion (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_assertion_evidence_item_id_ref ON observations.assertion (evidence_item_id);

CREATE INDEX ix_assertion_geometry_observation_id_ref ON observations.assertion (geometry_observation_id);

CREATE INDEX ix_assertion_observer_entity_id_ref ON observations.assertion (observer_entity_id);

CREATE INDEX ix_assertion_source_id_ref ON observations.assertion (source_id);

CREATE INDEX ix_assertion_subject_entity_id_ref ON observations.assertion (subject_entity_id);

CREATE INDEX ix_assertion_temporal ON observations.assertion USING gist (valid_period, knowledge_period);

CREATE INDEX ix_assertion_unit_ref ON observations.assertion (unit);

CREATE INDEX ix_assertion_variable_definition_id_ref ON observations.assertion (variable_definition_id);

CREATE INDEX ix_assertion_world_id_ref ON observations.assertion (world_id);

ALTER TABLE biology.taxon ADD CONSTRAINT fk_taxon_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE biology.taxon ADD CONSTRAINT fk_taxon_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE biology.taxon ADD CONSTRAINT fk_taxon_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE biology.taxon ADD CONSTRAINT fk_taxon_parent_taxon_id_taxon FOREIGN KEY(parent_taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

ALTER TABLE biology.taxon ADD CONSTRAINT fk_taxon_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

CREATE INDEX ix_taxon_entity_id_ref ON biology.taxon (entity_id);

CREATE INDEX ix_taxon_evidence_item_id_ref ON biology.taxon (evidence_item_id);

CREATE INDEX ix_taxon_parent_taxon_id_ref ON biology.taxon (parent_taxon_id);

CREATE INDEX ix_taxon_source_id_ref ON biology.taxon (source_id);

ALTER TABLE biology.taxon_parent ADD CONSTRAINT fk_taxon_parent_hybrid_taxon_id_taxon FOREIGN KEY(hybrid_taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

ALTER TABLE biology.taxon_parent ADD CONSTRAINT fk_taxon_parent_parent_taxon_id_taxon FOREIGN KEY(parent_taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

CREATE INDEX ix_taxon_parent_hybrid_taxon_id_ref ON biology.taxon_parent (hybrid_taxon_id);

CREATE INDEX ix_taxon_parent_parent_taxon_id_ref ON biology.taxon_parent (parent_taxon_id);

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_parent_material_id_genetic_material FOREIGN KEY(parent_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE biology.genetic_material ADD CONSTRAINT fk_genetic_material_taxon_id_taxon FOREIGN KEY(taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

CREATE INDEX ix_genetic_material_entity_id_ref ON biology.genetic_material (entity_id);

CREATE INDEX ix_genetic_material_evidence_item_id_ref ON biology.genetic_material (evidence_item_id);

CREATE INDEX ix_genetic_material_parent_material_id_ref ON biology.genetic_material (parent_material_id);

CREATE INDEX ix_genetic_material_source_id_ref ON biology.genetic_material (source_id);

CREATE INDEX ix_genetic_material_taxon_id_ref ON biology.genetic_material (taxon_id);

ALTER TABLE forestry.asset_portfolio ADD CONSTRAINT fk_asset_portfolio_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.asset_portfolio ADD CONSTRAINT fk_asset_portfolio_owner_entity_id_entity FOREIGN KEY(owner_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

CREATE INDEX ix_asset_portfolio_entity_id_ref ON forestry.asset_portfolio (entity_id);

CREATE INDEX ix_asset_portfolio_owner_entity_id_ref ON forestry.asset_portfolio (owner_entity_id);

ALTER TABLE forestry.estate ADD CONSTRAINT fk_estate_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.estate ADD CONSTRAINT fk_estate_manager_entity_id_entity FOREIGN KEY(manager_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.estate ADD CONSTRAINT fk_estate_portfolio_id_asset_portfolio FOREIGN KEY(portfolio_id) REFERENCES forestry.asset_portfolio (id) ON DELETE RESTRICT;

CREATE INDEX ix_estate_entity_id_ref ON forestry.estate (entity_id);

CREATE INDEX ix_estate_manager_entity_id_ref ON forestry.estate (manager_entity_id);

CREATE INDEX ix_estate_portfolio_id_ref ON forestry.estate (portfolio_id);

ALTER TABLE forestry.parcel ADD CONSTRAINT fk_parcel_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.parcel ADD CONSTRAINT fk_parcel_estate_id_estate FOREIGN KEY(estate_id) REFERENCES forestry.estate (id) ON DELETE RESTRICT;

CREATE INDEX ix_parcel_entity_id_ref ON forestry.parcel (entity_id);

CREATE INDEX ix_parcel_estate_id_ref ON forestry.parcel (estate_id);

ALTER TABLE forestry.stand ADD CONSTRAINT fk_stand_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.stand ADD CONSTRAINT fk_stand_estate_id_estate FOREIGN KEY(estate_id) REFERENCES forestry.estate (id) ON DELETE RESTRICT;

ALTER TABLE forestry.stand ADD CONSTRAINT fk_stand_genetic_material_id_genetic_material FOREIGN KEY(genetic_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

ALTER TABLE forestry.stand ADD CONSTRAINT fk_stand_manager_entity_id_entity FOREIGN KEY(manager_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.stand ADD CONSTRAINT fk_stand_parcel_id_parcel FOREIGN KEY(parcel_id) REFERENCES forestry.parcel (id) ON DELETE RESTRICT;

CREATE INDEX ix_stand_entity_id_ref ON forestry.stand (entity_id);

CREATE INDEX ix_stand_estate_id_ref ON forestry.stand (estate_id);

CREATE INDEX ix_stand_genetic_material_id_ref ON forestry.stand (genetic_material_id);

CREATE INDEX ix_stand_manager_entity_id_ref ON forestry.stand (manager_entity_id);

CREATE INDEX ix_stand_parcel_id_ref ON forestry.stand (parcel_id);

ALTER TABLE forestry.plot ADD CONSTRAINT fk_plot_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.plot ADD CONSTRAINT fk_plot_stand_id_stand FOREIGN KEY(stand_id) REFERENCES forestry.stand (id) ON DELETE RESTRICT;

CREATE INDEX ix_plot_entity_id_ref ON forestry.plot (entity_id);

CREATE INDEX ix_plot_stand_id_ref ON forestry.plot (stand_id);

ALTER TABLE forestry.tree ADD CONSTRAINT fk_tree_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.tree ADD CONSTRAINT fk_tree_genetic_material_id_genetic_material FOREIGN KEY(genetic_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

ALTER TABLE forestry.tree ADD CONSTRAINT fk_tree_plot_id_plot FOREIGN KEY(plot_id) REFERENCES forestry.plot (id) ON DELETE RESTRICT;

ALTER TABLE forestry.tree ADD CONSTRAINT fk_tree_stand_id_stand FOREIGN KEY(stand_id) REFERENCES forestry.stand (id) ON DELETE RESTRICT;

CREATE INDEX ix_tree_entity_id_ref ON forestry.tree (entity_id);

CREATE INDEX ix_tree_genetic_material_id_ref ON forestry.tree (genetic_material_id);

CREATE INDEX ix_tree_plot_id_ref ON forestry.tree (plot_id);

CREATE INDEX ix_tree_stand_id_ref ON forestry.tree (stand_id);

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_cost_observation_id_observation FOREIGN KEY(cost_observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_geometry_observation_id_geometry_ob_b1c7 FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_operator_entity_id_entity FOREIGN KEY(operator_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.management_event ADD CONSTRAINT fk_management_event_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_management_event_cost_observation_id_ref ON forestry.management_event (cost_observation_id);

CREATE INDEX ix_management_event_current ON forestry.management_event (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_management_event_evidence_item_id_ref ON forestry.management_event (evidence_item_id);

CREATE INDEX ix_management_event_geometry_observation_id_ref ON forestry.management_event (geometry_observation_id);

CREATE INDEX ix_management_event_operator_entity_id_ref ON forestry.management_event (operator_entity_id);

CREATE INDEX ix_management_event_source_id_ref ON forestry.management_event (source_id);

CREATE INDEX ix_management_event_subject_entity_id_ref ON forestry.management_event (subject_entity_id);

CREATE INDEX ix_management_event_temporal ON forestry.management_event USING gist (valid_period, knowledge_period);

CREATE INDEX ix_management_event_world_id_ref ON forestry.management_event (world_id);

ALTER TABLE forestry.harvest_event ADD CONSTRAINT fk_harvest_event_management_event_id_management_event FOREIGN KEY(management_event_id) REFERENCES forestry.management_event (id) ON DELETE RESTRICT;

ALTER TABLE forestry.harvest_event ADD CONSTRAINT fk_harvest_event_stand_id_stand FOREIGN KEY(stand_id) REFERENCES forestry.stand (id) ON DELETE RESTRICT;

CREATE INDEX ix_harvest_event_management_event_id_ref ON forestry.harvest_event (management_event_id);

CREATE INDEX ix_harvest_event_stand_id_ref ON forestry.harvest_event (stand_id);

ALTER TABLE forestry.log ADD CONSTRAINT fk_log_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE forestry.log ADD CONSTRAINT fk_log_genetic_material_id_genetic_material FOREIGN KEY(genetic_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

ALTER TABLE forestry.log ADD CONSTRAINT fk_log_harvest_event_id_harvest_event FOREIGN KEY(harvest_event_id) REFERENCES forestry.harvest_event (id) ON DELETE RESTRICT;

ALTER TABLE forestry.log ADD CONSTRAINT fk_log_tree_id_tree FOREIGN KEY(tree_id) REFERENCES forestry.tree (id) ON DELETE RESTRICT;

CREATE INDEX ix_log_entity_id_ref ON forestry.log (entity_id);

CREATE INDEX ix_log_genetic_material_id_ref ON forestry.log (genetic_material_id);

CREATE INDEX ix_log_harvest_event_id_ref ON forestry.log (harvest_event_id);

CREATE INDEX ix_log_tree_id_ref ON forestry.log (tree_id);

ALTER TABLE forestry.log_observation ADD CONSTRAINT fk_log_observation_log_id_log FOREIGN KEY(log_id) REFERENCES forestry.log (id) ON DELETE RESTRICT;

ALTER TABLE forestry.log_observation ADD CONSTRAINT fk_log_observation_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

CREATE INDEX ix_log_observation_log_id_ref ON forestry.log_observation (log_id);

CREATE INDEX ix_log_observation_observation_id_ref ON forestry.log_observation (observation_id);

ALTER TABLE market.organisation ADD CONSTRAINT fk_organisation_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

CREATE INDEX ix_organisation_entity_id_ref ON market.organisation (entity_id);

ALTER TABLE market.facility ADD CONSTRAINT fk_facility_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.facility ADD CONSTRAINT fk_facility_organisation_id_organisation FOREIGN KEY(organisation_id) REFERENCES market.organisation (id) ON DELETE RESTRICT;

CREATE INDEX ix_facility_entity_id_ref ON market.facility (entity_id);

CREATE INDEX ix_facility_organisation_id_ref ON market.facility (organisation_id);

ALTER TABLE market.processing_line ADD CONSTRAINT fk_processing_line_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.processing_line ADD CONSTRAINT fk_processing_line_facility_id_facility FOREIGN KEY(facility_id) REFERENCES market.facility (id) ON DELETE RESTRICT;

CREATE INDEX ix_processing_line_entity_id_ref ON market.processing_line (entity_id);

CREATE INDEX ix_processing_line_facility_id_ref ON market.processing_line (facility_id);

ALTER TABLE market.procurement_programme ADD CONSTRAINT fk_procurement_programme_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.procurement_programme ADD CONSTRAINT fk_procurement_programme_facility_id_facility FOREIGN KEY(facility_id) REFERENCES market.facility (id) ON DELETE RESTRICT;

ALTER TABLE market.procurement_programme ADD CONSTRAINT fk_procurement_programme_processing_line_id_processing_line FOREIGN KEY(processing_line_id) REFERENCES market.processing_line (id) ON DELETE RESTRICT;

CREATE INDEX ix_procurement_programme_entity_id_ref ON market.procurement_programme (entity_id);

CREATE INDEX ix_procurement_programme_facility_id_ref ON market.procurement_programme (facility_id);

CREATE INDEX ix_procurement_programme_processing_line_id_ref ON market.procurement_programme (processing_line_id);

ALTER TABLE market.grade_definition ADD CONSTRAINT fk_grade_definition_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.grade_definition ADD CONSTRAINT fk_grade_definition_procurement_programme_id_procuremen_1a49 FOREIGN KEY(procurement_programme_id) REFERENCES market.procurement_programme (id) ON DELETE RESTRICT;

ALTER TABLE market.grade_definition ADD CONSTRAINT fk_grade_definition_taxon_id_taxon FOREIGN KEY(taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

CREATE INDEX ix_grade_definition_entity_id_ref ON market.grade_definition (entity_id);

CREATE INDEX ix_grade_definition_procurement_programme_id_ref ON market.grade_definition (procurement_programme_id);

CREATE INDEX ix_grade_definition_taxon_id_ref ON market.grade_definition (taxon_id);

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_accepted_material_id_genetic_dae6 FOREIGN KEY(accepted_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_evidence_item_id_source_id_e_4cea FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_grade_definition_id_grade_definition FOREIGN KEY(grade_definition_id) REFERENCES market.grade_definition (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE market.processor_specification ADD CONSTRAINT fk_processor_specification_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_processor_specification_accepted_material_id_ref ON market.processor_specification (accepted_material_id);

CREATE INDEX ix_processor_specification_assertion_id_ref ON market.processor_specification (assertion_id);

CREATE INDEX ix_processor_specification_current ON market.processor_specification (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_processor_specification_evidence_item_id_ref ON market.processor_specification (evidence_item_id);

CREATE INDEX ix_processor_specification_grade_definition_id_ref ON market.processor_specification (grade_definition_id);

CREATE INDEX ix_processor_specification_observation_id_ref ON market.processor_specification (observation_id);

CREATE INDEX ix_processor_specification_source_id_ref ON market.processor_specification (source_id);

CREATE INDEX ix_processor_specification_temporal ON market.processor_specification USING gist (valid_period, knowledge_period);

CREATE INDEX ix_processor_specification_world_id_ref ON market.processor_specification (world_id);

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_grade_definition_id_grade_definition FOREIGN KEY(grade_definition_id) REFERENCES market.grade_definition (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_procurement_programme_id_procureme_254e FOREIGN KEY(procurement_programme_id) REFERENCES market.procurement_programme (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_taxon_id_taxon FOREIGN KEY(taxon_id) REFERENCES biology.taxon (id) ON DELETE RESTRICT;

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_unit_unit FOREIGN KEY(unit) REFERENCES observations.unit (symbol);

ALTER TABLE market.price_observation ADD CONSTRAINT fk_price_observation_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_price_observation_assertion_id_ref ON market.price_observation (assertion_id);

CREATE INDEX ix_price_observation_current ON market.price_observation (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_price_observation_evidence_item_id_ref ON market.price_observation (evidence_item_id);

CREATE INDEX ix_price_observation_grade_definition_id_ref ON market.price_observation (grade_definition_id);

CREATE INDEX ix_price_observation_observation_id_ref ON market.price_observation (observation_id);

CREATE INDEX ix_price_observation_procurement_programme_id_ref ON market.price_observation (procurement_programme_id);

CREATE INDEX ix_price_observation_source_id_ref ON market.price_observation (source_id);

CREATE INDEX ix_price_observation_subject_entity_id_ref ON market.price_observation (subject_entity_id);

CREATE INDEX ix_price_observation_taxon_id_ref ON market.price_observation (taxon_id);

CREATE INDEX ix_price_observation_temporal ON market.price_observation USING gist (valid_period, knowledge_period);

CREATE INDEX ix_price_observation_unit_ref ON market.price_observation (unit);

CREATE INDEX ix_price_observation_world_id_ref ON market.price_observation (world_id);

ALTER TABLE market.demand_observation ADD CONSTRAINT fk_demand_observation_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE market.demand_observation ADD CONSTRAINT fk_demand_observation_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE market.demand_observation ADD CONSTRAINT fk_demand_observation_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE market.demand_observation ADD CONSTRAINT fk_demand_observation_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_demand_observation_assertion_id_ref ON market.demand_observation (assertion_id);

CREATE INDEX ix_demand_observation_observation_id_ref ON market.demand_observation (observation_id);

CREATE INDEX ix_demand_observation_subject_entity_id_ref ON market.demand_observation (subject_entity_id);

CREATE INDEX ix_demand_observation_world_id_ref ON market.demand_observation (world_id);

ALTER TABLE market.nursery_material ADD CONSTRAINT fk_nursery_material_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE market.nursery_material ADD CONSTRAINT fk_nursery_material_facility_id_facility FOREIGN KEY(facility_id) REFERENCES market.facility (id) ON DELETE RESTRICT;

ALTER TABLE market.nursery_material ADD CONSTRAINT fk_nursery_material_genetic_material_id_genetic_material FOREIGN KEY(genetic_material_id) REFERENCES biology.genetic_material (id) ON DELETE RESTRICT;

CREATE INDEX ix_nursery_material_evidence_item_id_ref ON market.nursery_material (evidence_item_id);

CREATE INDEX ix_nursery_material_facility_id_ref ON market.nursery_material (facility_id);

CREATE INDEX ix_nursery_material_genetic_material_id_ref ON market.nursery_material (genetic_material_id);

ALTER TABLE operations.operator ADD CONSTRAINT fk_operator_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.operator ADD CONSTRAINT fk_operator_organisation_id_organisation FOREIGN KEY(organisation_id) REFERENCES market.organisation (id) ON DELETE RESTRICT;

CREATE INDEX ix_operator_entity_id_ref ON operations.operator (entity_id);

CREATE INDEX ix_operator_organisation_id_ref ON operations.operator (organisation_id);

ALTER TABLE operations.crew ADD CONSTRAINT fk_crew_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.crew ADD CONSTRAINT fk_crew_operator_id_operator FOREIGN KEY(operator_id) REFERENCES operations.operator (id) ON DELETE RESTRICT;

CREATE INDEX ix_crew_entity_id_ref ON operations.crew (entity_id);

CREATE INDEX ix_crew_operator_id_ref ON operations.crew (operator_id);

ALTER TABLE operations.equipment ADD CONSTRAINT fk_equipment_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.equipment ADD CONSTRAINT fk_equipment_operator_id_operator FOREIGN KEY(operator_id) REFERENCES operations.operator (id) ON DELETE RESTRICT;

CREATE INDEX ix_equipment_entity_id_ref ON operations.equipment (entity_id);

CREATE INDEX ix_equipment_operator_id_ref ON operations.equipment (operator_id);

ALTER TABLE operations.job ADD CONSTRAINT fk_job_crew_id_crew FOREIGN KEY(crew_id) REFERENCES operations.crew (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE operations.job ADD CONSTRAINT fk_job_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_operator_id_operator FOREIGN KEY(operator_id) REFERENCES operations.operator (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_subject_entity_id_entity FOREIGN KEY(subject_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.job ADD CONSTRAINT fk_job_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_job_crew_id_ref ON operations.job (crew_id);

CREATE INDEX ix_job_entity_id_ref ON operations.job (entity_id);

CREATE INDEX ix_job_evidence_item_id_ref ON operations.job (evidence_item_id);

CREATE INDEX ix_job_geometry_observation_id_ref ON operations.job (geometry_observation_id);

CREATE INDEX ix_job_operator_id_ref ON operations.job (operator_id);

CREATE INDEX ix_job_source_id_ref ON operations.job (source_id);

CREATE INDEX ix_job_subject_entity_id_ref ON operations.job (subject_entity_id);

CREATE INDEX ix_job_world_id_ref ON operations.job (world_id);

ALTER TABLE operations.job_equipment ADD CONSTRAINT fk_job_equipment_equipment_id_equipment FOREIGN KEY(equipment_id) REFERENCES operations.equipment (id) ON DELETE RESTRICT;

ALTER TABLE operations.job_equipment ADD CONSTRAINT fk_job_equipment_job_id_job FOREIGN KEY(job_id) REFERENCES operations.job (id) ON DELETE RESTRICT;

CREATE INDEX ix_job_equipment_equipment_id_ref ON operations.job_equipment (equipment_id);

CREATE INDEX ix_job_equipment_job_id_ref ON operations.job_equipment (job_id);

ALTER TABLE operations.job_observation ADD CONSTRAINT fk_job_observation_job_id_job FOREIGN KEY(job_id) REFERENCES operations.job (id) ON DELETE RESTRICT;

ALTER TABLE operations.job_observation ADD CONSTRAINT fk_job_observation_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

CREATE INDEX ix_job_observation_job_id_ref ON operations.job_observation (job_id);

CREATE INDEX ix_job_observation_observation_id_ref ON operations.job_observation (observation_id);

ALTER TABLE operations.route ADD CONSTRAINT fk_route_destination_entity_id_entity FOREIGN KEY(destination_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.route ADD CONSTRAINT fk_route_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.route ADD CONSTRAINT fk_route_evidence_item_id_evidence_item FOREIGN KEY(evidence_item_id) REFERENCES evidence.evidence_item (id) ON DELETE RESTRICT;

ALTER TABLE operations.route ADD CONSTRAINT fk_route_evidence_item_id_source_id_evidence_item FOREIGN KEY(evidence_item_id, source_id) REFERENCES evidence.evidence_item (id, source_id);

ALTER TABLE operations.route ADD CONSTRAINT fk_route_origin_entity_id_entity FOREIGN KEY(origin_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.route ADD CONSTRAINT fk_route_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE operations.route ADD CONSTRAINT fk_route_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_route_current ON operations.route (recorded_at) WHERE superseded_at IS NULL;

CREATE INDEX ix_route_destination_entity_id_ref ON operations.route (destination_entity_id);

CREATE INDEX ix_route_entity_id_ref ON operations.route (entity_id);

CREATE INDEX ix_route_evidence_item_id_ref ON operations.route (evidence_item_id);

CREATE INDEX ix_route_origin_entity_id_ref ON operations.route (origin_entity_id);

CREATE INDEX ix_route_source_id_ref ON operations.route (source_id);

CREATE INDEX ix_route_temporal ON operations.route USING gist (valid_period, knowledge_period);

CREATE INDEX ix_route_world_id_ref ON operations.route (world_id);

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_cost_observation_id_observation FOREIGN KEY(cost_observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_destination_entity_id_entity FOREIGN KEY(destination_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_distance_observation_id_observation FOREIGN KEY(distance_observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_origin_entity_id_entity FOREIGN KEY(origin_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_payload_observation_id_observation FOREIGN KEY(payload_observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_route_id_route FOREIGN KEY(route_id) REFERENCES operations.route (id) ON DELETE RESTRICT;

ALTER TABLE operations.route_leg ADD CONSTRAINT fk_route_leg_travel_time_observation_id_observation FOREIGN KEY(travel_time_observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

CREATE INDEX ix_route_leg_cost_observation_id_ref ON operations.route_leg (cost_observation_id);

CREATE INDEX ix_route_leg_destination_entity_id_ref ON operations.route_leg (destination_entity_id);

CREATE INDEX ix_route_leg_distance_observation_id_ref ON operations.route_leg (distance_observation_id);

CREATE INDEX ix_route_leg_origin_entity_id_ref ON operations.route_leg (origin_entity_id);

CREATE INDEX ix_route_leg_payload_observation_id_ref ON operations.route_leg (payload_observation_id);

CREATE INDEX ix_route_leg_route_id_ref ON operations.route_leg (route_id);

CREATE INDEX ix_route_leg_travel_time_observation_id_ref ON operations.route_leg (travel_time_observation_id);

ALTER TABLE models.model_version ADD CONSTRAINT fk_model_version_model_definition_id_model_definition FOREIGN KEY(model_definition_id) REFERENCES models.model_definition (id) ON DELETE RESTRICT;

CREATE INDEX ix_model_version_model_definition_id_ref ON models.model_version (model_definition_id);

ALTER TABLE models.model_run ADD CONSTRAINT fk_model_run_input_state_snapshot_id_state_snapshot FOREIGN KEY(input_state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE models.model_run ADD CONSTRAINT fk_model_run_model_version_id_model_version FOREIGN KEY(model_version_id) REFERENCES models.model_version (id) ON DELETE RESTRICT;

ALTER TABLE models.model_run ADD CONSTRAINT fk_model_run_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_model_run_input_state_snapshot_id_ref ON models.model_run (input_state_snapshot_id);

CREATE INDEX ix_model_run_model_version_id_ref ON models.model_run (model_version_id);

CREATE INDEX ix_model_run_world_id_ref ON models.model_run (world_id);

ALTER TABLE models.parameter_definition ADD CONSTRAINT fk_parameter_definition_model_version_id_model_version FOREIGN KEY(model_version_id) REFERENCES models.model_version (id) ON DELETE RESTRICT;

ALTER TABLE models.parameter_definition ADD CONSTRAINT fk_parameter_definition_source_id_source FOREIGN KEY(source_id) REFERENCES evidence.source (id) ON DELETE RESTRICT;

ALTER TABLE models.parameter_definition ADD CONSTRAINT fk_parameter_definition_unit_unit FOREIGN KEY(unit) REFERENCES observations.unit (symbol);

CREATE INDEX ix_parameter_definition_model_version_id_ref ON models.parameter_definition (model_version_id);

CREATE INDEX ix_parameter_definition_source_id_ref ON models.parameter_definition (source_id);

CREATE INDEX ix_parameter_definition_unit_ref ON models.parameter_definition (unit);

ALTER TABLE models.run_input ADD CONSTRAINT fk_run_input_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE models.run_input ADD CONSTRAINT fk_run_input_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE models.run_input ADD CONSTRAINT fk_run_input_model_run_id_model_run FOREIGN KEY(model_run_id) REFERENCES models.model_run (id) ON DELETE RESTRICT;

ALTER TABLE models.run_input ADD CONSTRAINT fk_run_input_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

CREATE INDEX ix_run_input_assertion_id_ref ON models.run_input (assertion_id);

CREATE INDEX ix_run_input_geometry_observation_id_ref ON models.run_input (geometry_observation_id);

CREATE INDEX ix_run_input_model_run_id_ref ON models.run_input (model_run_id);

CREATE INDEX ix_run_input_observation_id_ref ON models.run_input (observation_id);

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_model_run_id_model_run FOREIGN KEY(model_run_id) REFERENCES models.model_run (id) ON DELETE RESTRICT;

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_model_run_id_model_version_id_wor_6a0d FOREIGN KEY(model_run_id, model_version_id, world_id) REFERENCES models.model_run (id, model_version_id, world_id);

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_model_version_id_model_version FOREIGN KEY(model_version_id) REFERENCES models.model_version (id) ON DELETE RESTRICT;

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_parent_snapshot_id_posterior_snapshot FOREIGN KEY(parent_snapshot_id) REFERENCES belief.posterior_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE belief.posterior_snapshot ADD CONSTRAINT fk_posterior_snapshot_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_posterior_snapshot_entity_id_ref ON belief.posterior_snapshot (entity_id);

CREATE INDEX ix_posterior_snapshot_model_run_id_ref ON belief.posterior_snapshot (model_run_id);

CREATE INDEX ix_posterior_snapshot_model_version_id_ref ON belief.posterior_snapshot (model_version_id);

CREATE INDEX ix_posterior_snapshot_parent_snapshot_id_ref ON belief.posterior_snapshot (parent_snapshot_id);

CREATE INDEX ix_posterior_snapshot_world_id_ref ON belief.posterior_snapshot (world_id);

ALTER TABLE belief.state_snapshot ADD CONSTRAINT fk_state_snapshot_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE belief.state_snapshot ADD CONSTRAINT fk_state_snapshot_model_version_id_model_version FOREIGN KEY(model_version_id) REFERENCES models.model_version (id) ON DELETE RESTRICT;

ALTER TABLE belief.state_snapshot ADD CONSTRAINT fk_state_snapshot_posterior_snapshot_id_model_version_i_d5f0 FOREIGN KEY(posterior_snapshot_id, model_version_id, world_id) REFERENCES belief.posterior_snapshot (id, model_version_id, world_id);

ALTER TABLE belief.state_snapshot ADD CONSTRAINT fk_state_snapshot_posterior_snapshot_id_posterior_snapshot FOREIGN KEY(posterior_snapshot_id) REFERENCES belief.posterior_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE belief.state_snapshot ADD CONSTRAINT fk_state_snapshot_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_state_scope_time ON belief.state_snapshot (entity_id, world_id, as_of, known_at);

CREATE INDEX ix_state_snapshot_entity_id_ref ON belief.state_snapshot (entity_id);

CREATE INDEX ix_state_snapshot_model_version_id_ref ON belief.state_snapshot (model_version_id);

CREATE INDEX ix_state_snapshot_posterior_snapshot_id_ref ON belief.state_snapshot (posterior_snapshot_id);

CREATE INDEX ix_state_snapshot_world_id_ref ON belief.state_snapshot (world_id);

ALTER TABLE belief.snapshot_input ADD CONSTRAINT fk_snapshot_input_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE belief.snapshot_input ADD CONSTRAINT fk_snapshot_input_geometry_observation_id_geometry_observation FOREIGN KEY(geometry_observation_id) REFERENCES geo.geometry_observation (id) ON DELETE RESTRICT;

ALTER TABLE belief.snapshot_input ADD CONSTRAINT fk_snapshot_input_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE belief.snapshot_input ADD CONSTRAINT fk_snapshot_input_posterior_snapshot_id_posterior_snapshot FOREIGN KEY(posterior_snapshot_id) REFERENCES belief.posterior_snapshot (id) ON DELETE CASCADE;

CREATE INDEX ix_snapshot_input_assertion_id_ref ON belief.snapshot_input (assertion_id);

CREATE INDEX ix_snapshot_input_geometry_observation_id_ref ON belief.snapshot_input (geometry_observation_id);

CREATE INDEX ix_snapshot_input_observation_id_ref ON belief.snapshot_input (observation_id);

CREATE INDEX ix_snapshot_input_posterior_snapshot_id_ref ON belief.snapshot_input (posterior_snapshot_id);

ALTER TABLE belief.parameter_posterior ADD CONSTRAINT fk_parameter_posterior_parameter_definition_id_paramete_ac9b FOREIGN KEY(parameter_definition_id) REFERENCES models.parameter_definition (id) ON DELETE RESTRICT;

ALTER TABLE belief.parameter_posterior ADD CONSTRAINT fk_parameter_posterior_posterior_snapshot_id_posterior_snapshot FOREIGN KEY(posterior_snapshot_id) REFERENCES belief.posterior_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE belief.parameter_posterior ADD CONSTRAINT fk_parameter_posterior_scope_entity_id_entity FOREIGN KEY(scope_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

CREATE INDEX ix_parameter_posterior_parameter_definition_id_ref ON belief.parameter_posterior (parameter_definition_id);

CREATE INDEX ix_parameter_posterior_posterior_snapshot_id_ref ON belief.parameter_posterior (posterior_snapshot_id);

CREATE INDEX ix_parameter_posterior_scope_entity_id_ref ON belief.parameter_posterior (scope_entity_id);

ALTER TABLE belief.invalidation ADD CONSTRAINT fk_invalidation_assertion_id_assertion FOREIGN KEY(assertion_id) REFERENCES observations.assertion (id) ON DELETE RESTRICT;

ALTER TABLE belief.invalidation ADD CONSTRAINT fk_invalidation_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE belief.invalidation ADD CONSTRAINT fk_invalidation_state_snapshot_id_state_snapshot FOREIGN KEY(state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE CASCADE;

CREATE INDEX ix_invalidation_assertion_id_ref ON belief.invalidation (assertion_id);

CREATE INDEX ix_invalidation_observation_id_ref ON belief.invalidation (observation_id);

CREATE INDEX ix_invalidation_state_snapshot_id_ref ON belief.invalidation (state_snapshot_id);

ALTER TABLE commercial.match_run ADD CONSTRAINT fk_match_run_model_run_id_model_run FOREIGN KEY(model_run_id) REFERENCES models.model_run (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_run ADD CONSTRAINT fk_match_run_state_snapshot_id_state_snapshot FOREIGN KEY(state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_run ADD CONSTRAINT fk_match_run_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_match_run_model_run_id_ref ON commercial.match_run (model_run_id);

CREATE INDEX ix_match_run_state_snapshot_id_ref ON commercial.match_run (state_snapshot_id);

CREATE INDEX ix_match_run_world_id_ref ON commercial.match_run (world_id);

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_buyer_state_snapshot_id_state_snapshot FOREIGN KEY(buyer_state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_match_run_id_match_run FOREIGN KEY(match_run_id) REFERENCES commercial.match_run (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_money_unit_unit FOREIGN KEY(money_unit) REFERENCES observations.unit (symbol);

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_operator_id_operator FOREIGN KEY(operator_id) REFERENCES operations.operator (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_procurement_programme_id_procurement_f395 FOREIGN KEY(procurement_programme_id) REFERENCES market.procurement_programme (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_quantity_unit_unit FOREIGN KEY(quantity_unit) REFERENCES observations.unit (symbol);

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_route_id_route FOREIGN KEY(route_id) REFERENCES operations.route (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_supply_entity_id_entity FOREIGN KEY(supply_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_supply_state_snapshot_id_state_snapshot FOREIGN KEY(supply_state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE commercial.match_candidate ADD CONSTRAINT fk_match_candidate_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_match_candidate_buyer_state_snapshot_id_ref ON commercial.match_candidate (buyer_state_snapshot_id);

CREATE INDEX ix_match_candidate_match_run_id_ref ON commercial.match_candidate (match_run_id);

CREATE INDEX ix_match_candidate_money_unit_ref ON commercial.match_candidate (money_unit);

CREATE INDEX ix_match_candidate_operator_id_ref ON commercial.match_candidate (operator_id);

CREATE INDEX ix_match_candidate_procurement_programme_id_ref ON commercial.match_candidate (procurement_programme_id);

CREATE INDEX ix_match_candidate_quantity_unit_ref ON commercial.match_candidate (quantity_unit);

CREATE INDEX ix_match_candidate_route_id_ref ON commercial.match_candidate (route_id);

CREATE INDEX ix_match_candidate_supply_entity_id_ref ON commercial.match_candidate (supply_entity_id);

CREATE INDEX ix_match_candidate_supply_state_snapshot_id_ref ON commercial.match_candidate (supply_state_snapshot_id);

CREATE INDEX ix_match_candidate_world_id_ref ON commercial.match_candidate (world_id);

ALTER TABLE commercial.opportunity ADD CONSTRAINT fk_opportunity_entity_id_entity FOREIGN KEY(entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE commercial.opportunity ADD CONSTRAINT fk_opportunity_match_candidate_id_match_candidate FOREIGN KEY(match_candidate_id) REFERENCES commercial.match_candidate (id) ON DELETE RESTRICT;

ALTER TABLE commercial.opportunity ADD CONSTRAINT fk_opportunity_state_snapshot_id_state_snapshot FOREIGN KEY(state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE commercial.opportunity ADD CONSTRAINT fk_opportunity_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_opportunity_entity_id_ref ON commercial.opportunity (entity_id);

CREATE INDEX ix_opportunity_match_candidate_id_ref ON commercial.opportunity (match_candidate_id);

CREATE INDEX ix_opportunity_state_snapshot_id_ref ON commercial.opportunity (state_snapshot_id);

CREATE INDEX ix_opportunity_world_id_ref ON commercial.opportunity (world_id);

ALTER TABLE decision.decision ADD CONSTRAINT fk_decision_owner_entity_id_entity FOREIGN KEY(owner_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE decision.decision ADD CONSTRAINT fk_decision_state_snapshot_id_state_snapshot FOREIGN KEY(state_snapshot_id) REFERENCES belief.state_snapshot (id) ON DELETE RESTRICT;

ALTER TABLE decision.decision ADD CONSTRAINT fk_decision_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_decision_owner_entity_id_ref ON decision.decision (owner_entity_id);

CREATE INDEX ix_decision_state_snapshot_id_ref ON decision.decision (state_snapshot_id);

CREATE INDEX ix_decision_world_id_ref ON decision.decision (world_id);

ALTER TABLE verification.task ADD CONSTRAINT fk_task_assignee_entity_id_entity FOREIGN KEY(assignee_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE verification.task ADD CONSTRAINT fk_task_currency_unit FOREIGN KEY(currency) REFERENCES observations.unit (symbol);

ALTER TABLE verification.task ADD CONSTRAINT fk_task_decision_id_decision FOREIGN KEY(decision_id) REFERENCES decision.decision (id) ON DELETE RESTRICT;

ALTER TABLE verification.task ADD CONSTRAINT fk_task_opportunity_id_opportunity FOREIGN KEY(opportunity_id) REFERENCES commercial.opportunity (id) ON DELETE RESTRICT;

ALTER TABLE verification.task ADD CONSTRAINT fk_task_target_entity_id_entity FOREIGN KEY(target_entity_id) REFERENCES core.entity (id) ON DELETE RESTRICT;

ALTER TABLE verification.task ADD CONSTRAINT fk_task_variable_definition_id_variable_definition FOREIGN KEY(variable_definition_id) REFERENCES observations.variable_definition (id) ON DELETE RESTRICT;

ALTER TABLE verification.task ADD CONSTRAINT fk_task_world_id_world FOREIGN KEY(world_id) REFERENCES core.world (id) ON DELETE RESTRICT;

CREATE INDEX ix_task_assignee_entity_id_ref ON verification.task (assignee_entity_id);

CREATE INDEX ix_task_currency_ref ON verification.task (currency);

CREATE INDEX ix_task_decision_id_ref ON verification.task (decision_id);

CREATE INDEX ix_task_opportunity_id_ref ON verification.task (opportunity_id);

CREATE INDEX ix_task_target_entity_id_ref ON verification.task (target_entity_id);

CREATE INDEX ix_task_variable_definition_id_ref ON verification.task (variable_definition_id);

CREATE INDEX ix_task_world_id_ref ON verification.task (world_id);

ALTER TABLE verification.result ADD CONSTRAINT fk_result_observation_id_observation FOREIGN KEY(observation_id) REFERENCES observations.observation (id) ON DELETE RESTRICT;

ALTER TABLE verification.result ADD CONSTRAINT fk_result_task_id_task FOREIGN KEY(task_id) REFERENCES verification.task (id) ON DELETE RESTRICT;

CREATE INDEX ix_result_observation_id_ref ON verification.result (observation_id);

CREATE INDEX ix_result_task_id_ref ON verification.result (task_id);