"""Explicit SQLAlchemy 2 Core write model; no mutable biological truth on entities.

Shared constructors only supply mechanical columns. Domain relationships, quantities,
units and integrity are relational. The initial migration contains frozen DDL.
"""

from uuid import uuid4

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Computed,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    MetaData,
    Numeric,
    Table,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TSTZRANGE, UUID

metadata = MetaData(
    naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)
SCHEMAS = (
    "core",
    "geo",
    "biology",
    "forestry",
    "market",
    "operations",
    "evidence",
    "observations",
    "belief",
    "models",
    "commercial",
    "verification",
    "decision",
    "audit",
    "processing",
)


def col(name, typ=Text, nullable=False, **kwargs):
    return Column(name, typ, nullable=nullable, **kwargs)


def fk(name, target, nullable=False, ondelete="RESTRICT", use_alter=False, **kwargs):
    return Column(
        name,
        UUID(as_uuid=True),
        ForeignKey(target, ondelete=ondelete, use_alter=use_alter),
        nullable=nullable,
        **kwargs,
    )


def js(name="metadata", nullable=False):
    return Column(
        name,
        JSONB(none_as_null=True),
        nullable=nullable,
        server_default=None if nullable else text("'{}'::jsonb"),
    )


def ts(name, nullable=False, default=False):
    return Column(
        name,
        DateTime(timezone=True),
        nullable=nullable,
        server_default=text("clock_timestamp()") if default else None,
    )


def choice(name, values, default=None, nullable=False):
    return Column(
        name,
        Text,
        CheckConstraint(f"{name} IN ({','.join(repr(v) for v in values.split())})"),
        nullable=nullable,
        server_default=text(repr(default)) if default else None,
    )


def number(name, nullable=True, minimum=None, maximum=None):
    checks = []
    # PostgreSQL NUMERIC accepts NaN and infinities; exclude those explicitly.
    checks.append(
        CheckConstraint(
            f"{name} NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)"
        )
    )
    if minimum is not None:
        checks.append(CheckConstraint(f"{name} >= {minimum}"))
    if maximum is not None:
        checks.append(CheckConstraint(f"{name} <= {maximum}"))
    return Column(name, Numeric, *checks, nullable=nullable)


def temporal():
    return [
        ts("valid_from", True),
        ts("valid_to", True),
        ts("recorded_at", default=True),
        ts("superseded_at", True),
        Column(
            "valid_period",
            TSTZRANGE,
            Computed("tstzrange(valid_from, valid_to, '[)')", persisted=True),
        ),
        Column(
            "knowledge_period",
            TSTZRANGE,
            Computed("tstzrange(recorded_at, superseded_at, '[)')", persisted=True),
        ),
        CheckConstraint("valid_to IS NULL OR valid_from IS NULL OR valid_from < valid_to"),
        CheckConstraint("superseded_at IS NULL OR recorded_at < superseded_at"),
    ]


def table(namespace, name, *columns, identity=True):
    prefix = (
        [
            Column(
                "id",
                UUID(as_uuid=True),
                primary_key=True,
                default=uuid4,
                server_default=text("gen_random_uuid()"),
            )
        ]
        if identity
        else []
    )
    return Table(name, metadata, *prefix, *columns, schema=namespace)


world = table(
    "core",
    "world",
    col("name", unique=True),
    choice("kind", "production scenario simulation experiment"),
    col("allow_synthetic", Boolean, server_default=text("false")),
    col("synthetic_permission_reason", nullable=True),
    ts("created_at", default=True),
    CheckConstraint("NOT allow_synthetic OR length(synthetic_permission_reason) > 0"),
)
entity = table(
    "core",
    "entity",
    col("entity_type", index=True),
    col("canonical_name"),
    choice("status", "active unresolved retired", "active"),
    ts("created_at", default=True),
    ts("retired_at", True),
    js(),
)
source = table(
    "evidence",
    "source",
    col("source_type"),
    col("title"),
    col("publisher", nullable=True),
    col("uri", nullable=True),
    choice("access", "public restricted confidential", "restricted"),
    choice("data_class", "REPORTED OBSERVED ASSUMED DERIVED SYNTHETIC UNKNOWN", "UNKNOWN"),
    col("data_vintage", nullable=True),
    ts("captured_at", default=True),
    js(),
)
raw_ingest = table(
    "evidence",
    "raw_ingest",
    fk("source_id", "evidence.source.id"),
    col("batch_id", UUID(as_uuid=True)),
    col("artifact_uri"),
    col("content_hash"),
    col("original_filename"),
    col("media_type"),
    ts("imported_at", default=True),
    col("parser_version"),
    js(),
    UniqueConstraint(
        "source_id",
        "content_hash",
        "parser_version",
        "original_filename",
        name="uq_raw_ingest_source_content_parser_filename",
    ),
    UniqueConstraint("id", "source_id"),
)
evidence_item = table(
    "evidence",
    "evidence_item",
    fk("source_id", "evidence.source.id"),
    fk("raw_ingest_id", "evidence.raw_ingest.id", True),
    col("kind"),
    choice("data_class", "OBSERVED REPORTED ASSUMED DERIVED SYNTHETIC UNKNOWN", "UNKNOWN"),
    js("locator"),
    col("content_hash", nullable=True),
    js("raw_record", True),
    ts("recorded_at", default=True),
    UniqueConstraint("id", "source_id"),
    ForeignKeyConstraint(
        ["raw_ingest_id", "source_id"], ["evidence.raw_ingest.id", "evidence.raw_ingest.source_id"]
    ),
)
entity_alias = table(
    "core",
    "entity_alias",
    fk("entity_id", "core.entity.id"),
    col("alias", index=True),
    fk("source_id", "evidence.source.id", True),
    number("resolution_confidence", minimum=0, maximum=1),
    col("resolution_method"),
    ts("created_at", default=True),
)
external_identity = table(
    "core",
    "external_identity",
    col("dataset"),
    col("source_record_key"),
    col("role"),
    fk("entity_id", "core.entity.id"),
    fk("evidence_item_id", "evidence.evidence_item.id"),
    UniqueConstraint("dataset", "source_record_key", "role"),
)
unit = table(
    "observations",
    "unit",
    col("symbol", primary_key=True),
    col("dimension"),
    number("scale", False, 0),
    identity=False,
)
variable_definition = table(
    "observations",
    "variable_definition",
    col("key", unique=True),
    col("name"),
    col("description"),
    choice("data_type", "numeric text boolean categorical structured datetime"),
    Column("canonical_unit", Text, ForeignKey("observations.unit.symbol"), nullable=True),
    number("minimum"),
    number("maximum"),
    js("valid_domain"),
    js(),
    CheckConstraint("data_type <> 'numeric' OR canonical_unit IS NOT NULL"),
    CheckConstraint("minimum IS NULL OR maximum IS NULL OR minimum <= maximum"),
)
variable_alias = table(
    "observations",
    "variable_alias",
    col("alias", primary_key=True),
    fk("variable_definition_id", "observations.variable_definition.id"),
    identity=False,
)


def provenance():
    return [
        fk("source_id", "evidence.source.id"),
        fk("evidence_item_id", "evidence.evidence_item.id"),
        ForeignKeyConstraint(
            ["evidence_item_id", "source_id"],
            ["evidence.evidence_item.id", "evidence.evidence_item.source_id"],
        ),
    ]


geometry_observation = table(
    "geo",
    "geometry_observation",
    fk("entity_id", "core.entity.id"),
    fk("world_id", "core.world.id"),
    Column("geometry", Geometry("GEOMETRY", srid=4326, spatial_index=False), nullable=False),
    col("original_srid", Integer, server_default=text("4326")),
    choice(
        "method",
        "surveyed gps official_kml digitised remote_sensing geocoded reported_coordinate centroid_estimate display_offset repository_derived",
    ),
    number("precision_m", minimum=0),
    col("precision_description"),
    col("confidence", nullable=True),
    ts("observed_at", True),
    *provenance(),
    *temporal(),
    js(),
    CheckConstraint("ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)"),
    CheckConstraint("ST_CoveredBy(geometry, ST_MakeEnvelope(-180,-90,180,90,4326))"),
)
Index("ix_geometry_observation_geometry", geometry_observation.c.geometry, postgresql_using="gist")

# Stable analysis-area identity (EO observation architecture section 6, decision D3).
# An AOI never stores geometry itself; it names one geometry-owning entity and,
# optionally, the distinct canonical asset/stand/plot the analysis is about.
aoi = table(
    "geo",
    "aoi",
    fk("world_id", "core.world.id"),
    fk("geometry_owner_entity_id", "core.entity.id"),
    fk("subject_entity_id", "core.entity.id", True),
    col("name", nullable=True),
    col("analysis_scope"),
    ts("created_at", default=True),
    js(),
)
# Immutable boundary selection. Corrections append a new revision; they never
# rewrite a prior geometry_observation_id or area_m2.
aoi_version = table(
    "geo",
    "aoi_version",
    fk("aoi_id", "geo.aoi.id"),
    fk("world_id", "core.world.id"),
    Column("revision", Integer, nullable=False),
    fk("geometry_observation_id", "geo.geometry_observation.id"),
    col("geometry_hash"),
    col("normalization_version"),
    number("area_m2"),
    js("bounds"),
    fk("predecessor_aoi_version_id", "geo.aoi_version.id", True),
    col("correction_reason", nullable=True),
    *provenance(),
    *temporal(),
    js(),
    UniqueConstraint("aoi_id", "revision", name="uq_aoi_version_aoi_id_revision"),
    CheckConstraint("area_m2 > 0"),
)


def fact(name):
    return table(
        "observations",
        name,
        fk("subject_entity_id", "core.entity.id"),
        fk("variable_definition_id", "observations.variable_definition.id"),
        fk("world_id", "core.world.id"),
        number("numeric_value"),
        col("text_value", nullable=True),
        col("boolean_value", Boolean, True),
        col("categorical_value", nullable=True),
        js("structured_value", True),
        ts("datetime_value", True),
        Column("unit", Text, ForeignKey("observations.unit.symbol")),
        choice(
            "missingness",
            "UNKNOWN NOT_APPLICABLE NOT_MEASURED NOT_REPORTED WITHHELD CONFIDENTIAL",
            nullable=True,
        ),
        choice(
            "epistemic_class",
            "OBSERVED REPORTED DERIVED INFERRED ASSUMED FORECAST SCENARIO SYNTHETIC UNKNOWN",
        ),
        col("method"),
        col("sampling_protocol", nullable=True),
        ts("observed_at", True),
        fk("observer_entity_id", "core.entity.id", True),
        fk("geometry_observation_id", "geo.geometry_observation.id", True),
        *provenance(),
        js("uncertainty"),
        choice("quality_status", "unreviewed accepted flagged rejected", "unreviewed"),
        choice("status", "active superseded contradicted verified", "active"),
        *temporal(),
        js(),
        CheckConstraint(
            "num_nonnulls(numeric_value,text_value,boolean_value,categorical_value,structured_value,datetime_value) = CASE WHEN missingness IS NULL THEN 1 ELSE 0 END"
        ),
        CheckConstraint("numeric_value IS NULL OR unit IS NOT NULL"),
        CheckConstraint("length(method) > 0"),
        CheckConstraint("epistemic_class NOT IN ('INFERRED','DERIVED','FORECAST')"),
        # Derived data belongs in snapshots; provider processed measurements may be OBSERVED with method.
    )


observation = fact("observation")
assertion = fact("assertion")

# Stable biology identities. Hybrid parents remain relational.
taxon = table(
    "biology",
    "taxon",
    fk("entity_id", "core.entity.id", unique=True),
    col("catalogue_key", nullable=True, unique=True),
    col("scientific_name"),
    choice("rank", "genus species hybrid unknown"),
    fk("parent_taxon_id", "biology.taxon.id", True),
    *provenance(),
)
taxon_parent = table(
    "biology",
    "taxon_parent",
    fk("hybrid_taxon_id", "biology.taxon.id"),
    fk("parent_taxon_id", "biology.taxon.id"),
    UniqueConstraint("hybrid_taxon_id", "parent_taxon_id"),
    CheckConstraint("hybrid_taxon_id <> parent_taxon_id"),
)
genetic_material = table(
    "biology",
    "genetic_material",
    fk("entity_id", "core.entity.id", unique=True),
    fk("taxon_id", "biology.taxon.id"),
    choice("kind", "provenance family clone seed_lot unknown"),
    col("identifier"),
    fk("parent_material_id", "biology.genetic_material.id", True),
    *provenance(),
    js(),
)

# Optional hierarchy: no fabricated parents are required.
asset_portfolio = table(
    "forestry",
    "asset_portfolio",
    fk("entity_id", "core.entity.id", unique=True),
    fk("owner_entity_id", "core.entity.id", True),
)
estate = table(
    "forestry",
    "estate",
    fk("entity_id", "core.entity.id", unique=True),
    fk("portfolio_id", "forestry.asset_portfolio.id", True),
    fk("manager_entity_id", "core.entity.id", True),
)
parcel = table(
    "forestry",
    "parcel",
    fk("entity_id", "core.entity.id", unique=True),
    fk("estate_id", "forestry.estate.id", True),
    col("registry_identifier", nullable=True),
)
stand = table(
    "forestry",
    "stand",
    fk("entity_id", "core.entity.id", unique=True),
    fk("parcel_id", "forestry.parcel.id", True),
    fk("estate_id", "forestry.estate.id", True),
    fk("genetic_material_id", "biology.genetic_material.id", True),
    fk("manager_entity_id", "core.entity.id", True),
)
plot = table(
    "forestry",
    "plot",
    fk("entity_id", "core.entity.id", unique=True),
    fk("stand_id", "forestry.stand.id", True),
    col("protocol", nullable=True),
)
tree = table(
    "forestry",
    "tree",
    fk("entity_id", "core.entity.id", unique=True),
    fk("plot_id", "forestry.plot.id", True),
    fk("stand_id", "forestry.stand.id", True),
    fk("genetic_material_id", "biology.genetic_material.id", True),
    col("tag", nullable=True),
)
management_event = table(
    "forestry",
    "management_event",
    fk("subject_entity_id", "core.entity.id"),
    fk("world_id", "core.world.id"),
    col("event_type"),
    ts("event_at"),
    fk("geometry_observation_id", "geo.geometry_observation.id", True),
    number("affected_area_ha", minimum=0),
    col("method"),
    js("intensity"),
    js("inputs"),
    fk("operator_entity_id", "core.entity.id", True),
    fk("cost_observation_id", "observations.observation.id", True),
    *provenance(),
    *temporal(),
)
harvest_event = table(
    "forestry",
    "harvest_event",
    fk("management_event_id", "forestry.management_event.id", unique=True),
    fk("stand_id", "forestry.stand.id", True),
    col("harvest_system", nullable=True),
)
log = table(
    "forestry",
    "log",
    fk("entity_id", "core.entity.id", unique=True),
    fk("tree_id", "forestry.tree.id", True),
    fk("harvest_event_id", "forestry.harvest_event.id", True),
    fk("genetic_material_id", "biology.genetic_material.id", True),
)
log_observation = table(
    "forestry",
    "log_observation",
    fk("log_id", "forestry.log.id"),
    fk("observation_id", "observations.observation.id", unique=True),
)

organisation = table(
    "market",
    "organisation",
    fk("entity_id", "core.entity.id", unique=True),
    col("organisation_kind", nullable=True),
)
facility = table(
    "market",
    "facility",
    fk("entity_id", "core.entity.id", unique=True),
    fk("organisation_id", "market.organisation.id", True),
    col("facility_type"),
)
processing_line = table(
    "market",
    "processing_line",
    fk("entity_id", "core.entity.id", unique=True),
    fk("facility_id", "market.facility.id"),
    col("process_type"),
)
procurement_programme = table(
    "market",
    "procurement_programme",
    fk("entity_id", "core.entity.id", unique=True),
    fk("facility_id", "market.facility.id"),
    fk("processing_line_id", "market.processing_line.id", True),
    col("name"),
)
grade_definition = table(
    "market",
    "grade_definition",
    fk("entity_id", "core.entity.id", unique=True),
    fk("procurement_programme_id", "market.procurement_programme.id"),
    fk("taxon_id", "biology.taxon.id"),
    col("code"),
    UniqueConstraint("procurement_programme_id", "taxon_id", "code"),
)
processor_specification = table(
    "market",
    "processor_specification",
    fk("grade_definition_id", "market.grade_definition.id"),
    fk("world_id", "core.world.id"),
    fk("accepted_material_id", "biology.genetic_material.id", True),
    number("min_sed_cm", minimum=0),
    number("max_sed_cm", minimum=0),
    number("min_led_cm", minimum=0),
    number("max_led_cm", minimum=0),
    number("min_length_m", minimum=0),
    number("max_length_m", minimum=0),
    number("max_taper_cm_per_m", minimum=0),
    number("max_moisture_fraction", minimum=0, maximum=1),
    col("diameter_basis", server_default=text("'unknown'")),
    col("quality_requirements", nullable=True),
    col("certification_requirements", nullable=True),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    *provenance(),
    *temporal(),
    CheckConstraint("num_nonnulls(assertion_id,observation_id) = 1"),
    CheckConstraint("min_sed_cm <= max_sed_cm"),
    CheckConstraint("min_led_cm <= max_led_cm"),
    CheckConstraint("min_length_m <= max_length_m"),
)

price_observation = table(
    "market",
    "price_observation",
    fk("subject_entity_id", "core.entity.id"),
    fk("procurement_programme_id", "market.procurement_programme.id", True),
    fk("grade_definition_id", "market.grade_definition.id", True),
    fk("taxon_id", "biology.taxon.id", True),
    fk("world_id", "core.world.id"),
    number("amount", False, 0),
    choice("currency", "UGX USD"),
    Column("unit", Text, ForeignKey("observations.unit.symbol"), nullable=False),
    choice("basis", "delivered factory_gate roadside standing_tree nursery_gate unknown"),
    number("quantity_min", minimum=0),
    number("quantity_max", minimum=0),
    col("payment_terms", nullable=True),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    *provenance(),
    *temporal(),
    CheckConstraint("num_nonnulls(assertion_id,observation_id) = 1"),
    CheckConstraint("unit LIKE currency || '/%'"),
    CheckConstraint("quantity_min <= quantity_max"),
)
demand_observation = table(
    "market",
    "demand_observation",
    fk("subject_entity_id", "core.entity.id"),
    fk("world_id", "core.world.id"),
    choice(
        "demand_type",
        "installed_capacity operational_capacity target_throughput observed_throughput desired_procurement committed_procurement unfilled_demand",
    ),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    CheckConstraint("num_nonnulls(assertion_id,observation_id) = 1"),
)
nursery_material = table(
    "market",
    "nursery_material",
    fk("facility_id", "market.facility.id"),
    fk("genetic_material_id", "biology.genetic_material.id"),
    fk("evidence_item_id", "evidence.evidence_item.id"),
    UniqueConstraint("facility_id", "genetic_material_id", "evidence_item_id"),
)

operator = table(
    "operations",
    "operator",
    fk("entity_id", "core.entity.id", unique=True),
    fk("organisation_id", "market.organisation.id", True),
)
crew = table(
    "operations",
    "crew",
    fk("entity_id", "core.entity.id", unique=True),
    fk("operator_id", "operations.operator.id", True),
)
equipment = table(
    "operations",
    "equipment",
    fk("entity_id", "core.entity.id", unique=True),
    fk("operator_id", "operations.operator.id", True),
    col("equipment_class"),
)
job = table(
    "operations",
    "job",
    fk("entity_id", "core.entity.id", unique=True),
    fk("world_id", "core.world.id"),
    col("activity"),
    fk("subject_entity_id", "core.entity.id", True),
    fk("operator_id", "operations.operator.id", True),
    fk("crew_id", "operations.crew.id", True),
    fk("geometry_observation_id", "geo.geometry_observation.id", True),
    ts("started_at", True),
    ts("completed_at", True),
    col("terrain", nullable=True),
    col("weather", nullable=True),
    col("status"),
    *provenance(),
    js(),
)
job_equipment = table(
    "operations",
    "job_equipment",
    fk("job_id", "operations.job.id"),
    fk("equipment_id", "operations.equipment.id"),
    UniqueConstraint("job_id", "equipment_id"),
)
job_observation = table(
    "operations",
    "job_observation",
    fk("job_id", "operations.job.id"),
    fk("observation_id", "observations.observation.id", unique=True),
)
route = table(
    "operations",
    "route",
    fk("entity_id", "core.entity.id", unique=True),
    fk("world_id", "core.world.id"),
    fk("origin_entity_id", "core.entity.id"),
    fk("destination_entity_id", "core.entity.id"),
    col("method"),
    *provenance(),
    *temporal(),
)
route_leg = table(
    "operations",
    "route_leg",
    fk("route_id", "operations.route.id"),
    col("sequence", Integer),
    col("mode"),
    fk("origin_entity_id", "core.entity.id", True),
    fk("destination_entity_id", "core.entity.id", True),
    col("road_class", nullable=True),
    col("season", nullable=True),
    fk("distance_observation_id", "observations.observation.id", True),
    fk("payload_observation_id", "observations.observation.id", True),
    fk("travel_time_observation_id", "observations.observation.id", True),
    fk("cost_observation_id", "observations.observation.id", True),
    js("restrictions"),
    UniqueConstraint("route_id", "sequence"),
    CheckConstraint("sequence >= 0"),
)

model_definition = table(
    "models", "model_definition", col("key", unique=True), col("name"), col("purpose")
)
model_version = table(
    "models",
    "model_version",
    fk("model_definition_id", "models.model_definition.id"),
    col("version"),
    col("git_commit_sha", nullable=True),
    col("code_path"),
    col("code_hash"),
    col("code_artifact_uri"),
    col("configuration_schema_version"),
    js("configuration_schema"),
    js("environment"),
    choice("status", "active deprecated experimental", "experimental"),
    ts("created_at", default=True),
    UniqueConstraint("model_definition_id", "version", "code_hash"),
)
model_run = table(
    "models",
    "model_run",
    fk("model_version_id", "models.model_version.id"),
    fk("world_id", "core.world.id"),
    fk("input_state_snapshot_id", "belief.state_snapshot.id", True, use_alter=True),
    js("inputs"),
    js("configuration"),
    col("rng_seed", Integer, True),
    ts("started_at", default=True),
    ts("completed_at", True),
    choice("status", "pending running completed failed", "pending"),
    col("artifact_uri", nullable=True),
    js("diagnostics"),
    js("error"),
    js("measurement_noise"),
    js("model_discrepancy"),
    UniqueConstraint("id", "model_version_id", "world_id"),
)
parameter_definition = table(
    "models",
    "parameter_definition",
    col("key", unique=True),
    choice("block", "growth bucking market cost observation_error model_discrepancy"),
    col("description"),
    Column("unit", Text, ForeignKey("observations.unit.symbol"), nullable=True),
    js("prior_distribution"),
    fk("source_id", "evidence.source.id"),
    fk("model_version_id", "models.model_version.id"),
)
run_input = table(
    "models",
    "run_input",
    fk("model_run_id", "models.model_run.id"),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    fk("geometry_observation_id", "geo.geometry_observation.id", True),
    CheckConstraint("num_nonnulls(assertion_id,observation_id,geometry_observation_id) = 1"),
)
posterior_snapshot = table(
    "belief",
    "posterior_snapshot",
    fk("entity_id", "core.entity.id"),
    fk("parent_snapshot_id", "belief.posterior_snapshot.id", True),
    fk("world_id", "core.world.id"),
    fk("model_version_id", "models.model_version.id"),
    fk("model_run_id", "models.model_run.id"),
    col("state_type"),
    js("summary"),
    col("artifact_uri", nullable=True),
    js("diagnostics"),
    ts("created_at", default=True),
    UniqueConstraint("id", "model_version_id", "world_id"),
    ForeignKeyConstraint(
        ["model_run_id", "model_version_id", "world_id"],
        ["models.model_run.id", "models.model_run.model_version_id", "models.model_run.world_id"],
    ),
)
state_snapshot = table(
    "belief",
    "state_snapshot",
    fk("entity_id", "core.entity.id"),
    fk("world_id", "core.world.id"),
    fk("posterior_snapshot_id", "belief.posterior_snapshot.id"),
    fk("model_version_id", "models.model_version.id"),
    col("state_type"),
    ts("as_of"),
    ts("known_at"),
    js("summary"),
    col("artifact_uri", nullable=True),
    ts("created_at", default=True),
    ForeignKeyConstraint(
        ["posterior_snapshot_id", "model_version_id", "world_id"],
        [
            "belief.posterior_snapshot.id",
            "belief.posterior_snapshot.model_version_id",
            "belief.posterior_snapshot.world_id",
        ],
    ),
)
snapshot_input = table(
    "belief",
    "snapshot_input",
    fk("posterior_snapshot_id", "belief.posterior_snapshot.id", ondelete="CASCADE"),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    fk("geometry_observation_id", "geo.geometry_observation.id", True),
    CheckConstraint("num_nonnulls(assertion_id,observation_id,geometry_observation_id) = 1"),
    UniqueConstraint("posterior_snapshot_id", "assertion_id"),
    UniqueConstraint("posterior_snapshot_id", "observation_id"),
    UniqueConstraint("posterior_snapshot_id", "geometry_observation_id"),
)
parameter_posterior = table(
    "belief",
    "parameter_posterior",
    fk("parameter_definition_id", "models.parameter_definition.id"),
    fk("posterior_snapshot_id", "belief.posterior_snapshot.id"),
    col("scope_type"),
    fk("scope_entity_id", "core.entity.id", True),
    js("scope_qualifiers"),
    js("summary"),
    col("evidence_count", Integer),
    col("artifact_uri", nullable=True),
    CheckConstraint("evidence_count >= 0"),
    CheckConstraint("scope_type = 'global' OR scope_entity_id IS NOT NULL"),
)
invalidation = table(
    "belief",
    "invalidation",
    fk("state_snapshot_id", "belief.state_snapshot.id", ondelete="CASCADE"),
    fk("assertion_id", "observations.assertion.id", True),
    fk("observation_id", "observations.observation.id", True),
    col("reason"),
    ts("created_at", default=True),
    CheckConstraint("num_nonnulls(assertion_id,observation_id) = 1"),
)

match_run = table(
    "commercial",
    "match_run",
    fk("model_run_id", "models.model_run.id"),
    fk("world_id", "core.world.id"),
    fk("state_snapshot_id", "belief.state_snapshot.id"),
    ts("created_at", default=True),
)
match_candidate = table(
    "commercial",
    "match_candidate",
    fk("match_run_id", "commercial.match_run.id"),
    fk("world_id", "core.world.id"),
    fk("supply_entity_id", "core.entity.id"),
    fk("supply_state_snapshot_id", "belief.state_snapshot.id"),
    fk("buyer_state_snapshot_id", "belief.state_snapshot.id"),
    fk("procurement_programme_id", "market.procurement_programme.id"),
    fk("operator_id", "operations.operator.id", True),
    fk("route_id", "operations.route.id", True),
    number("compatibility_probability", minimum=0, maximum=1),
    number("expected_quantity", minimum=0),
    Column("quantity_unit", Text, ForeignKey("observations.unit.symbol")),
    number("delivered_cost"),
    number("buyer_value"),
    number("surplus"),
    Column("money_unit", Text, ForeignKey("observations.unit.symbol")),
    js("grade_distribution"),
    col("binding_constraint", nullable=True),
    col("rank", Integer, True),
    js("uncertainty"),
    CheckConstraint("expected_quantity IS NULL OR quantity_unit IS NOT NULL"),
    CheckConstraint("num_nonnulls(delivered_cost,buyer_value,surplus)=0 OR money_unit IS NOT NULL"),
)
opportunity = table(
    "commercial",
    "opportunity",
    fk("world_id", "core.world.id"),
    fk("state_snapshot_id", "belief.state_snapshot.id"),
    fk("match_candidate_id", "commercial.match_candidate.id", True),
    fk("entity_id", "core.entity.id"),
    choice(
        "status",
        "discovered needs_verification verified buyer_engaged negotiating contracted fulfilled closed",
        "discovered",
    ),
    col("description"),
    ts("created_at", default=True),
)
decision = table(
    "decision",
    "decision",
    fk("world_id", "core.world.id"),
    col("decision_type"),
    js("context"),
    fk("state_snapshot_id", "belief.state_snapshot.id"),
    col("objective"),
    js("risk_configuration"),
    js("available_actions"),
    js("selected_action"),
    fk("owner_entity_id", "core.entity.id", True),
    ts("decided_at", default=True),
)
verification_task = table(
    "verification",
    "task",
    fk("world_id", "core.world.id"),
    fk("target_entity_id", "core.entity.id"),
    fk("variable_definition_id", "observations.variable_definition.id", True),
    col("target_uncertainty", nullable=True),
    col("reason"),
    fk("decision_id", "decision.decision.id", True),
    fk("opportunity_id", "commercial.opportunity.id", True),
    number("expected_information_value", minimum=0),
    number("expected_decision_value"),
    number("estimated_cost", minimum=0),
    Column("currency", Text, ForeignKey("observations.unit.symbol")),
    col("priority", Integer, server_default=text("0")),
    js("sampling_plan"),
    choice("status", "open assigned in_progress completed cancelled", "open"),
    fk("assignee_entity_id", "core.entity.id", True),
    ts("due_at", True),
    ts("created_at", default=True),
    CheckConstraint(
        "num_nonnulls(estimated_cost,expected_decision_value)=0 OR currency IN ('UGX','USD')"
    ),
)
verification_result = table(
    "verification",
    "result",
    fk("task_id", "verification.task.id"),
    fk("observation_id", "observations.observation.id"),
    UniqueConstraint("task_id", "observation_id"),
)
change_event = table(
    "audit",
    "change_event",
    col("table_name"),
    col("record_id", UUID(as_uuid=True)),
    col("action"),
    col("actor"),
    col("reason"),
    col("superseded_record_id", UUID(as_uuid=True), True),
    ts("recorded_at", default=True),
    js("details"),
)

# Foreign key indexes are intentionally systematic; history gets both range and current indexes.
for _table in metadata.tables.values():
    for _column in _table.columns:
        if _column.foreign_keys and not _column.primary_key:
            Index(f"ix_{_table.name}_{_column.name}_ref", _column)
    if "knowledge_period" in _table.c:
        Index(
            f"ix_{_table.name}_temporal",
            _table.c.valid_period,
            _table.c.knowledge_period,
            postgresql_using="gist",
        )
        Index(
            f"ix_{_table.name}_current",
            _table.c.recorded_at,
            postgresql_where=_table.c.superseded_at.is_(None),
        )


def get_table(qualified_name: str) -> Table:
    return metadata.tables[qualified_name]


Index(
    "ix_state_scope_time",
    state_snapshot.c.entity_id,
    state_snapshot.c.world_id,
    state_snapshot.c.as_of,
    state_snapshot.c.known_at,
)

world.append_constraint(
    CheckConstraint(
        "NOT allow_synthetic OR (synthetic_permission_reason IS NOT NULL AND length(trim(synthetic_permission_reason)) > 0)",
        name="ck_world_synthetic_permission",
    )
)
verification_task.append_constraint(
    CheckConstraint(
        "(currency IS NULL OR currency IN ('UGX','USD')) AND (num_nonnulls(estimated_cost,expected_decision_value)=0 OR currency IS NOT NULL)",
        name="ck_verification_money_currency",
    )
)
