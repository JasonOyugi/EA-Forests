import subprocess
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import schema as s
from app.domain.units import UNITS
from app.services.evidence.artifacts import LocalArtifactStore


def insert_row(session, table, **values):
    return dict(session.execute(table.insert().values(**values).returning(table)).mappings().one())


def audit_context(session, actor: str, reason: str):
    from sqlalchemy import text

    if not actor.strip() or not reason.strip():
        raise ValueError("Canonical writes require actor and reason")
    session.execute(
        text(
            "SELECT set_config('canonical.actor', :actor, true), set_config('canonical.reason', :reason, true)"
        ),
        {"actor": actor, "reason": reason},
    )


def ensure_variable(
    session, key, unit=None, data_type="numeric", minimum=None, maximum=None, description=None
):
    row = (
        session.execute(select(s.variable_definition).where(s.variable_definition.c.key == key))
        .mappings()
        .first()
    )
    if row:
        if row["canonical_unit"] != unit or row["data_type"] != data_type:
            raise ValueError(f"Variable definition conflict for {key}")
        return dict(row)
    return insert_row(
        session,
        s.variable_definition,
        key=key,
        name=key.replace(".", " "),
        description=description or key,
        data_type=data_type,
        canonical_unit=unit,
        minimum=minimum,
        maximum=maximum,
    )


def bootstrap(session):
    """Idempotent registries. No synthetic values are seeded in production."""
    audit_context(session, "canonical-bootstrap", "Install Canonical State v0.1 registries")
    for symbol, (dimension, scale) in UNITS.items():
        session.execute(
            insert(s.unit)
            .values(symbol=symbol, dimension=dimension, scale=scale)
            .on_conflict_do_nothing()
        )
    from sqlalchemy import text

    session.execute(text("SELECT pg_advisory_xact_lock(782621041)"))
    worlds = {}
    for name, kind in [("production", "production"), ("legacy-import-quarantine", "experiment")]:
        session.execute(insert(s.world).values(name=name, kind=kind).on_conflict_do_nothing())
        worlds[name] = dict(
            session.execute(select(s.world).where(s.world.c.name == name)).mappings().one()
        )
    definitions = [
        ("tree.dbh", "cm", 0, None),
        ("tree.height", "m", 0, None),
        ("stand.survival_fraction", "fraction", 0, 1),
        ("stand.stems_per_ha", "trees/ha", 0, None),
        ("forest.area", "ha", 0, None),
        ("forest.reported_plantable_area", "ha", 0, None),
        ("forest.standing_volume", "m3", 0, None),
        ("log.small_end_diameter", "cm", 0, None),
        ("log.large_end_diameter", "cm", 0, None),
        ("log.length", "m", 0, None),
        ("log.moisture_fraction", "fraction", 0, 1),
        ("log.density", "kg/m3", 0, None),
        ("log.volume", "m3", 0, None),
        ("log.mass", "kg", 0, None),
        ("processor.grade.min_sed", "cm", 0, None),
        ("processor.grade.legacy_min_dbh", "cm", 0, None),
        ("processor.grade.min_length", "m", 0, None),
        ("market.roundwood.price.ugx_per_tonne", "UGX/tonne", 0, None),
        ("market.roundwood.price.ugx_per_m3", "UGX/m3", 0, None),
        ("market.roundwood.price.usd_per_tonne", "USD/tonne", 0, None),
        ("market.roundwood.price.usd_per_m3", "USD/m3", 0, None),
        ("market.diesel.price", "UGX/L", 0, None),
        ("market.exchange.ugx_per_usd", "UGX/USD", 0, None),
        ("nursery.capacity", "trees", 0, None),
        ("nursery.seedling.price", "USD/seedling", 0, None),
        ("operator.extraction.productivity", "tonne/day", 0, None),
        ("processor.accepted_intake", "tonne", 0, None),
        ("operator.haulage.cost", "UGX/tonne", 0, None),
        ("job.distance", "km", 0, None),
        ("job.hours", "hour", 0, None),
        ("job.fuel", "L", 0, None),
        ("job.wages", "UGX", 0, None),
    ]
    for key, unit, minimum, maximum in definitions:
        ensure_variable(session, key, unit, minimum=minimum, maximum=maximum)
    for key in (
        "forest.reserve.authority",
        "forest.reserve.legal_status",
        "forest.reserve.verification",
        "forest.reserve.concession_status",
        "processor.installed_capacity_report",
        "facility.products",
    ):
        ensure_variable(session, key, data_type="text")
    for alias, key in [("DBH", "tree.dbh"), ("dbh", "tree.dbh"), ("dbh_cm", "tree.dbh")]:
        variable_id = session.scalar(
            select(s.variable_definition.c.id).where(s.variable_definition.c.key == key)
        )
        session.execute(
            insert(s.variable_alias)
            .values(alias=alias, variable_definition_id=variable_id)
            .on_conflict_do_nothing()
        )
    return worlds


def register_model(session, key: str, code_path: Path, purpose: str, store=None):
    store = store or LocalArtifactStore()
    import json
    import platform
    from importlib.metadata import version as package_version

    root = Path(__file__).resolve().parents[4]
    environment = {
        "python": platform.python_version(),
        "packages": {
            name: package_version(name)
            for name in ("numpy", "pandas", "pydantic", "sqlalchemy", "psycopg")
        },
    }
    lock = root / "backend/uv.lock"
    if lock.exists():
        environment["dependency_lock_artifact_uri"] = store.put(lock.read_bytes())[0]
    # Archive the code closure, including adapters, schemas and helper modules.
    # A helper or locked-environment change must not masquerade as the same model version.
    bundle = {
        "format": "backend-python-bundle/0.1",
        "environment": environment,
        "files": {
            path.relative_to(root).as_posix(): path.read_text(encoding="utf8")
            for path in sorted((root / "backend/app").rglob("*.py"))
        },
    }
    uri, digest = store.put(json.dumps(bundle, sort_keys=True, ensure_ascii=False).encode("utf8"))
    definition = (
        session.execute(select(s.model_definition).where(s.model_definition.c.key == key))
        .mappings()
        .first()
    )
    if not definition:
        definition = insert_row(session, s.model_definition, key=key, name=key, purpose=purpose)
    existing = (
        session.execute(
            select(s.model_version).where(
                s.model_version.c.model_definition_id == definition["id"],
                s.model_version.c.version == "0.1",
                s.model_version.c.code_hash == digest,
            )
        )
        .mappings()
        .first()
    )
    if existing:
        return dict(existing)
    root = Path(__file__).resolve().parents[4]
    try:
        sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.SubprocessError):
        sha = None
    return insert_row(
        session,
        s.model_version,
        model_definition_id=definition["id"],
        environment=environment,
        version="0.1",
        git_commit_sha=sha,
        code_path=str(code_path.relative_to(root)),
        code_hash=digest,
        code_artifact_uri=uri,
        configuration_schema_version="0.1",
        configuration_schema={
            "measurement_noise": "explicit metadata; no Bayesian update in v0.1",
            "model_discrepancy": "separate from measurement noise",
        },
    )
