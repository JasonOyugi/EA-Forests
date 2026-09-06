import hashlib
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from app.db import schema as s
from app.domain.values import FactCreate
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.facts import create_fact
from app.services.state.registry import audit_context, bootstrap, ensure_variable, insert_row

PARSER_VERSION = "market-json/0.1"
REPOSITORY = Path(__file__).resolve().parents[4]
DATA_ROOT = REPOSITORY / "vite-version/src/app/shop/data/market-databases"
DATASETS = ("processors", "nurseries", "large-commercial-forests", "central-forest-reserves")


def numeric(value):
    if value is None or isinstance(value, bool) or (isinstance(value, str) and not value.strip()):
        return None
    try:
        number = Decimal(str(value))
    except InvalidOperation:
        return None
    return number if number.is_finite() else None


def synthetic_record(record):
    # Deliberately conservative for mixed real/dummy records; split verified portions only after review.
    return bool(
        re.search(r"\b(dummy|synthetic|demonstration)\b|\btest[_ -]", json.dumps(record).lower())
    )


class MarketImporter:
    def __init__(self, session, store=None):
        self.session = session
        self.store = store or LocalArtifactStore()
        self.worlds = bootstrap(session)
        self.seed_genetics_catalogue()

    def seed_genetics_catalogue(self):
        from app.services import genetics

        marker = "EA Forests genetics catalogue"
        if self.session.scalar(select(s.source.c.id).where(s.source.c.title == marker)):
            return
        catalogue = genetics.get_genetics_catalog()
        content = Path(genetics.__file__).read_bytes()
        uri, digest = self.store.put(content)
        source = insert_row(
            self.session,
            s.source,
            source_type="internal_catalogue",
            title=marker,
            access="public",
            data_class="REPORTED",
            uri="backend/app/services/genetics.py",
        )
        ingest = insert_row(
            self.session,
            s.raw_ingest,
            source_id=source["id"],
            batch_id=uuid4(),
            artifact_uri=uri,
            content_hash=digest,
            original_filename="genetics.py",
            media_type="text/x-python",
            parser_version="genetics-catalogue/0.1",
        )
        evidence = insert_row(
            self.session,
            s.evidence_item,
            source_id=source["id"],
            raw_ingest_id=ingest["id"],
            kind="catalogue",
            data_class="REPORTED",
            raw_record=catalogue,
            locator={"callable": "get_genetics_catalog"},
        )
        for genus in catalogue["genera"]:
            self.taxon(genus["scientific_name"], evidence, "genus")
            for variety in genus["varieties"]:
                taxon = self.taxon(variety["scientific_name"], evidence)
                insert_row(
                    self.session,
                    s.entity_alias,
                    entity_id=taxon["entity_id"],
                    alias=variety["id"],
                    source_id=source["id"],
                    resolution_method="existing_genetics_catalogue_id",
                )
                if variety["is_hybrid"]:
                    for name in variety["parent_species"]:
                        ancestor = self.taxon(f"{variety['genus']} {name}", evidence)
                        insert_row(
                            self.session,
                            s.taxon_parent,
                            hybrid_taxon_id=taxon["id"],
                            parent_taxon_id=ancestor["id"],
                        )

    def identity(self, dataset, key, role, name, entity_type, evidence):
        existing = (
            self.session.execute(
                select(s.external_identity).where(
                    s.external_identity.c.dataset == dataset,
                    s.external_identity.c.source_record_key == key,
                    s.external_identity.c.role == role,
                )
            )
            .mappings()
            .first()
        )
        if existing:
            return existing["entity_id"]
        entity = insert_row(
            self.session,
            s.entity,
            entity_type=entity_type,
            canonical_name=name,
            metadata={"source_dataset": dataset, "source_record_key": key},
        )
        insert_row(
            self.session,
            s.external_identity,
            dataset=dataset,
            source_record_key=key,
            role=role,
            entity_id=entity["id"],
            evidence_item_id=evidence["id"],
        )
        insert_row(
            self.session,
            s.entity_alias,
            entity_id=entity["id"],
            alias=name,
            source_id=evidence["source_id"],
            resolution_method="exact_source_record_identity",
        )
        return entity["id"]

    def subtype(self, table, entity_id, **fields):
        existing = (
            self.session.execute(select(table).where(table.c.entity_id == entity_id))
            .mappings()
            .first()
        )
        return (
            dict(existing)
            if existing
            else insert_row(self.session, table, entity_id=entity_id, **fields)
        )

    def taxon(self, name, evidence, rank="species"):
        # Catalogue keys are taxonomic identities, never organisation name guesses.
        key = name.lower().replace(" × ", " x ")
        existing = (
            self.session.execute(select(s.taxon).where(s.taxon.c.catalogue_key == key))
            .mappings()
            .first()
        )
        if existing:
            return dict(existing)
        entity = insert_row(self.session, s.entity, entity_type="taxon", canonical_name=name)
        parent_id = None
        if rank != "genus":
            parent_id = self.session.scalar(
                select(s.taxon.c.id).where(s.taxon.c.catalogue_key == name.split()[0].lower())
            )
        return insert_row(
            self.session,
            s.taxon,
            entity_id=entity["id"],
            catalogue_key=key,
            scientific_name=name,
            parent_taxon_id=parent_id,
            rank="hybrid" if " x " in key else rank,
            source_id=evidence["source_id"],
            evidence_item_id=evidence["id"],
        )

    def claim(
        self,
        subject,
        key,
        value,
        evidence,
        world_id,
        epistemic,
        *,
        unit=None,
        data_type="numeric",
        metadata=None,
    ):
        ensure_variable(
            self.session,
            key,
            unit,
            data_type=data_type,
            minimum=0 if data_type == "numeric" else None,
        )
        kwargs = {
            "subject_entity_id": subject,
            "variable_key": key,
            "world_id": world_id,
            "source_id": evidence["source_id"],
            "evidence_item_id": evidence["id"],
            "epistemic_class": epistemic,
            "method": "repository_json_report",
            "unit": unit,
            "metadata": {"valid_time_unknown": True, **(metadata or {})},
        }
        if data_type == "numeric":
            number = numeric(value)
            kwargs.update(
                {"numeric_value": number} if number is not None else {"missingness": "NOT_REPORTED"}
            )
        elif value is None or value == "":
            kwargs["missingness"] = "NOT_REPORTED"
        else:
            kwargs[f"{data_type}_value"] = value
        return create_fact(
            self.session,
            "assertion",
            FactCreate(**kwargs),
            actor="repository-importer",
            reason="Preserve repository source claim",
        )

    def geometry(self, entity_id, record, evidence, world_id):
        lon, lat = numeric(record.get("lon")), numeric(record.get("lat"))
        if lon is None or lat is None:
            return None
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError(
                "Out-of-range source coordinates; raw ingest retained on successful retry"
            )
        origin = record.get("source", {})
        precision = (
            record.get("Coordinate precision")
            or origin.get("coordinatePrecision")
            or "Unknown source precision"
        )
        confidence = record.get("Coordinate confidence") or origin.get("coordinateConfidence")
        description = str(precision).lower()
        method = (
            "display_offset"
            if record.get("Display offset km") or "display offset" in description
            else (
                "centroid_estimate"
                if "centroid" in description or record.get("Geometry type") == "Polygon"
                else "reported_coordinate"
            )
        )
        return insert_row(
            self.session,
            s.geometry_observation,
            entity_id=entity_id,
            world_id=world_id,
            geometry=f"SRID=4326;POINT({lon} {lat})",
            method=method,
            precision_description=precision,
            confidence=confidence,
            source_id=evidence["source_id"],
            evidence_item_id=evidence["id"],
            metadata={
                "coordinate_audit": record.get("Coordinate audit"),
                "original_coordinate": record.get("Original coordinate"),
                "display_offset_km": record.get("Display offset km"),
                "source_geometry_type": record.get("Geometry type"),
                "note": "Source JSON supplies a point, not the original polygon; numeric precision is unknown",
            },
        )

    def processor(self, dataset, key, name, record, evidence, world_id, epistemic):
        org_entity = self.identity(dataset, key, "organisation", name, "organisation", evidence)
        org = self.subtype(s.organisation, org_entity, organisation_kind="processor")
        facility_entity = self.identity(dataset, key, "facility", name, "facility", evidence)
        facility = self.subtype(
            s.facility, facility_entity, organisation_id=org["id"], facility_type="processor"
        )
        programme_entity = self.identity(
            dataset,
            key,
            "procurement",
            f"{name} procurement (source grouping)",
            "procurement_programme",
            evidence,
        )
        programme = self.subtype(
            s.procurement_programme,
            programme_entity,
            facility_id=facility["id"],
            name="Repository specifications",
        )
        self.geometry(facility_entity, record, evidence, world_id)
        facts = []
        for species, spec in record.get("buyer_specs", {}).items():
            taxon = self.taxon(
                {"euc": "Eucalyptus", "pine": "Pinus"}.get(species, species), evidence, rank="genus"
            )
            for code in ("g1", "g2", "g3", "reject"):
                grade_entity = self.identity(
                    dataset,
                    key,
                    f"{species}:{code}",
                    f"{name} {species} {code}",
                    "processor_grade",
                    evidence,
                )
                self.subtype(
                    s.grade_definition,
                    grade_entity,
                    procurement_programme_id=programme["id"],
                    taxon_id=taxon["id"],
                    code=code,
                )
                if code != "reject":
                    thresholds = spec.get("grades", {}).get(code, {})
                    diameter = self.claim(
                        grade_entity,
                        "processor.grade.legacy_min_dbh",
                        thresholds.get("dbh_min"),
                        evidence,
                        world_id,
                        epistemic,
                        unit="cm",
                        metadata={"source_field": "dbh_min", "diameter_basis": "legacy_dbh"},
                    )
                    length = self.claim(
                        grade_entity,
                        "processor.grade.min_length",
                        thresholds.get("h_min"),
                        evidence,
                        world_id,
                        epistemic,
                        unit="m",
                        metadata={
                            "source_field": "h_min",
                            "interpretation": "legacy minimum height/length",
                        },
                    )
                    facts.extend([diameter["id"], length["id"]])
                mode = spec.get("price_mode")
                if mode in ("per_tonne", "per_m3"):
                    # UGX is an explicit repository legacy convention, not an exchange-rate conversion.
                    price_unit = "UGX/tonne" if mode == "per_tonne" else "UGX/m3"
                    variable = (
                        "market.roundwood.price.ugx_per_tonne"
                        if mode == "per_tonne"
                        else "market.roundwood.price.ugx_per_m3"
                    )
                    price = self.claim(
                        grade_entity,
                        variable,
                        spec.get("prices", {}).get(code),
                        evidence,
                        world_id,
                        epistemic,
                        unit=price_unit,
                        metadata={
                            "currency_interpretation": "legacy repository UGX convention",
                            "basis": "unknown",
                        },
                    )
                    facts.append(price["id"])
        capacity = self.claim(
            facility_entity,
            "processor.installed_capacity_report",
            record.get("Roundwood input capacity"),
            evidence,
            world_id,
            epistemic,
            data_type="text",
            metadata={"not_parsed": "Narrative units/periods need source review"},
        )
        insert_row(
            self.session,
            s.demand_observation,
            subject_entity_id=facility_entity,
            world_id=world_id,
            demand_type="installed_capacity",
            assertion_id=capacity["id"],
        )
        self.claim(
            facility_entity,
            "facility.products",
            record.get("Products"),
            evidence,
            world_id,
            epistemic,
            data_type="text",
        )
        return {
            "entity_id": facility_entity,
            "programme_id": programme["id"],
            "world_id": world_id,
            "assertion_ids": facts,
        }

    def forest(self, dataset, key, name, record, evidence, world_id, epistemic):
        reserve = dataset == "central-forest-reserves"
        entity_id = self.identity(
            dataset, key, "asset", name, "reserve" if reserve else "estate", evidence
        )
        self.subtype(s.parcel if reserve else s.estate, entity_id)
        self.geometry(entity_id, record, evidence, world_id)
        facts = []
        if reserve:
            gross = numeric(record.get("area_km2"))
            facts.append(
                self.claim(
                    entity_id,
                    "forest.area",
                    None if gross is None else gross * 100,
                    evidence,
                    world_id,
                    epistemic,
                    unit="ha",
                    metadata={"source_field": "area_km2", "conversion": "km2 * 100"},
                )["id"]
            )
            # The source converts total reserve area into 'plantable'; preserve as a claim, never as measured availability.
            self.claim(
                entity_id,
                "forest.reported_plantable_area",
                record.get("plantable_area_ha"),
                evidence,
                world_id,
                epistemic,
                unit="ha",
                metadata={
                    "warning": "Source may equate total reserve area with plantable area; requires verification"
                },
            )
            for field, key_suffix in [
                ("authority", "authority"),
                ("verification", "verification"),
                ("concession_status", "concession_status"),
            ]:
                self.claim(
                    entity_id,
                    f"forest.reserve.{key_suffix}",
                    record.get(field),
                    evidence,
                    world_id,
                    epistemic,
                    data_type="text",
                )
        else:
            facts.append(
                self.claim(
                    entity_id,
                    "forest.area",
                    record.get("Plantation size (ha)"),
                    evidence,
                    world_id,
                    epistemic,
                    unit="ha",
                )["id"]
            )
            for species, spec in record.get("forest_specs", {}).items():
                # An inventory group is conceptual, not a fabricated surveyed stand.
                group = self.identity(
                    dataset,
                    key,
                    f"inventory:{species}",
                    f"{name} {species} reported inventory",
                    "inventory_group",
                    evidence,
                )
                for variable, value, unit in [
                    ("forest.area", spec.get("area_ha"), "ha"),
                    ("forest.standing_volume", spec.get("standing_volume_m3"), "m3"),
                ]:
                    facts.append(
                        self.claim(
                            group, variable, value, evidence, world_id, epistemic, unit=unit
                        )["id"]
                    )
        return {"entity_id": entity_id, "world_id": world_id, "assertion_ids": facts}

    def nursery(self, dataset, key, name, record, evidence, world_id, epistemic):
        org_entity = self.identity(dataset, key, "organisation", name, "organisation", evidence)
        org = self.subtype(s.organisation, org_entity, organisation_kind="nursery")
        entity_id = self.identity(dataset, key, "facility", name, "facility", evidence)
        facility = self.subtype(
            s.facility, entity_id, organisation_id=org["id"], facility_type="nursery"
        )
        self.geometry(entity_id, record, evidence, world_id)
        self.claim(
            entity_id,
            "nursery.capacity",
            record.get("totalCapacity"),
            evidence,
            world_id,
            epistemic,
            unit="trees",
        )
        for genus in record.get("genera", []):
            for variety in genus.get("varieties", []):
                taxon = self.taxon(variety["species"], evidence)
                role = f"material:{variety['species']}:{variety['variety']}"
                material_entity = self.identity(
                    dataset,
                    key,
                    role,
                    f"{name}: {variety['species']} {variety['variety']}",
                    "genetic_material",
                    evidence,
                )
                material = self.subtype(
                    s.genetic_material,
                    material_entity,
                    taxon_id=taxon["id"],
                    kind="unknown",
                    identifier=str(variety["variety"]),
                    source_id=evidence["source_id"],
                    evidence_item_id=evidence["id"],
                    metadata={
                        "classification_note": "Variety label retained; clone/provenance identity not independently resolved"
                    },
                )
                insert_row(
                    self.session,
                    s.nursery_material,
                    facility_id=facility["id"],
                    genetic_material_id=material["id"],
                    evidence_item_id=evidence["id"],
                )
                self.claim(
                    material_entity,
                    "nursery.capacity",
                    variety.get("capacity"),
                    evidence,
                    world_id,
                    epistemic,
                    unit="trees",
                )
                self.claim(
                    material_entity,
                    "nursery.seedling.price",
                    variety.get("price", {}).get("perSeedling"),
                    evidence,
                    world_id,
                    epistemic,
                    unit="USD/seedling",
                    metadata={
                        "currency_source": "nurseries.json currency header",
                        "other_quantity_bands": "retained in raw record",
                    },
                )
        return {"entity_id": entity_id, "world_id": world_id, "assertion_ids": []}

    def import_file(self, path: Path, *, only: str | None = None):
        dataset = path.stem
        if dataset not in DATASETS:
            raise ValueError("Unsupported repository dataset")
        audit_context(
            self.session,
            "repository-importer",
            f"Import {dataset} without upgrading source certainty",
        )
        content = path.read_bytes()
        document = json.loads(content.decode("utf-8-sig"))
        uri, digest = self.store.put(content)
        parser = PARSER_VERSION + (f":record:{only}" if only else ":all")
        previous = (
            self.session.execute(
                select(s.raw_ingest).where(
                    s.raw_ingest.c.content_hash == digest,
                    s.raw_ingest.c.parser_version == parser,
                    s.raw_ingest.c.original_filename == path.name,
                )
            )
            .mappings()
            .first()
        )
        if previous:
            return {
                "dataset": dataset,
                "already_imported": True,
                "raw_ingest_id": previous["id"],
                "records": [],
            }
        source = insert_row(
            self.session,
            s.source,
            source_type="repository_dataset",
            title=path.name,
            uri=path.relative_to(REPOSITORY).as_posix()
            if path.is_relative_to(REPOSITORY)
            else path.name,
            publisher="EA Forests repository",
            access="restricted",
            data_class="UNKNOWN",
            data_vintage=document.get("lastUpdated") if dataset == "nurseries" else None,
            metadata={
                "raw_bytes_sha256": digest,
                "original_sources": "Preserved in individual raw evidence records",
            },
        )
        ingest = insert_row(
            self.session,
            s.raw_ingest,
            source_id=source["id"],
            batch_id=uuid4(),
            artifact_uri=uri,
            content_hash=digest,
            original_filename=path.name,
            media_type="application/json",
            parser_version=parser,
        )
        rows = (
            [(r["id"], r) for r in document["nurseries"]]
            if dataset == "nurseries"
            else list(document.items())
        )
        if only:
            rows = [(key, row) for key, row in rows if key == only]
            if not rows:
                raise ValueError(f"Source record not found: {only}")
        results = []
        for key, record in rows:
            is_synthetic = synthetic_record(record)
            world_id = self.worlds["legacy-import-quarantine" if is_synthetic else "production"][
                "id"
            ]
            epistemic = "SYNTHETIC" if is_synthetic else "REPORTED"
            evidence = insert_row(
                self.session,
                s.evidence_item,
                source_id=source["id"],
                raw_ingest_id=ingest["id"],
                kind="json_record",
                data_class=epistemic,
                locator={
                    "json_key": key,
                    "epistemic_class": epistemic,
                    "original_source": record.get("Source")
                    or record.get("Data source")
                    or record.get("source"),
                    "data_vintage": record.get("Data vintage")
                    or record.get("source", {}).get("dataVintage"),
                },
                raw_record=record,
                content_hash=hashlib.sha256(
                    json.dumps(record, sort_keys=True).encode()
                ).hexdigest(),
            )
            name = record.get("name", key)
            handler = (
                self.processor
                if dataset == "processors"
                else self.nursery
                if dataset == "nurseries"
                else self.forest
            )
            results.append(
                {
                    "source_key": key,
                    **handler(dataset, key, name, record, evidence, world_id, epistemic),
                }
            )
        return {
            "dataset": dataset,
            "already_imported": False,
            "raw_ingest_id": ingest["id"],
            "records": results,
        }
