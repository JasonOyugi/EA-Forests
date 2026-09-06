# Canonical State v0.1 validation and handoff

Validated locally on 2026-09-05 using PostgreSQL 17.11, PostGIS 3.6.2,
SQLAlchemy 2.0.52, psycopg 3.3.5 and Python 3.12. The repository's current
`origin/main` was incorporated before implementation. No frontend/source JSON
or legacy model calculation was changed.

## Results

| Check | Result |
| --- | --- |
| `pytest -q` with a real PostgreSQL/PostGIS test database | **44 passed** |
| Alembic upgrades, downgrade to base, and recreation | Passed |
| `alembic check` against the populated import database | No new upgrade operations detected |
| Offline migration SQL generation | Passed |
| Ruff checks and formatting for new Python code | Passed |
| Existing `python -m app.check_backend` | Health, commercial viability, roundwood, live NASA POWER and live Earth Engine passed |
| Legacy defaults, commercial viability and nursery API regressions | Passed in pytest |
| Full repository import | 927 source records imported |
| Repeat full import | All four datasets detected as already imported; no new imports |
| Processor evidence → snapshots → changed grade yields | Passed in tests and committed standalone demo |
| Delete/rebuild derived state from retained model run | Passed; source observations and run lineage retained |
| Atomic concurrent artifact publication | Passed |

Integration tests cover real PostGIS polygons/points, display-offset exclusion,
unit and provenance constraints, synthetic/scenario restrictions, immutable
history, bitemporal interval splitting, missing values, ambiguous aliases,
posterior/model/world lineage, price history, invalidation, derived-state rebuilding,
API evidence registration, authenticated access and confidential-source redaction.
The migration roundtrip only runs against a disposable database ending in `_test`.

## Imported data

| Dataset | Source records | Reported | Synthetic/quarantined |
| --- | ---: | ---: | ---: |
| Processors | 86 | 81 | 5 |
| Nurseries | 167 | 162 | 5 |
| Large commercial forests | 13 | 8 | 5 |
| Central forest reserves | 661 | 656 | 5 |
| **Total** | **927** | **907** | **20** |

The populated import database contains 2,300 entities, 2,280 aliases, 5 raw
ingests (including the genetics catalogue source), 928 evidence items, 5,305
assertions and 927 geometry observations. It includes 48 taxa, 259 genetic-material
identities, 253 facilities, 13 estates, 661 reserve parcels, 516 specification
projections and 15 numeric price projections. Missing/unspecified prices remain
missing or in raw evidence rather than becoming zero-priced opportunities.

There are 5,048 `REPORTED` assertions in the production world and 257 `SYNTHETIC`
assertions in the quarantine experiment world. Reported does **not** mean verified.
All full-import source records and original bytes remain recoverable.

## Demonstration

The existing Shanglong record is explicitly synthetic. The demo therefore runs
in an experiment world. It changes a G1 legacy DBH threshold from 30 to 40 cm
and a price from UGX 125,000/t to UGX 140,000/t, effective July 1 and learned at
execution time. Query validity is July 15; knowledge times straddle the update.

With identical stand assumptions and RNG seed 7, the existing roundwood
`simulate_grade_yields` component returns:

| Output | Before | After |
| --- | ---: | ---: |
| G1 tonnes | 132.80162719122742 | 28.14497591295281 |
| G1 price assertion, UGX/t | 125,000 | 140,000 |

Old snapshots remain queryable. The old summary is rebuilt and compared to its
manifest. Both downstream runs identify their state snapshot, model version,
code/environment bundle, inputs and seed. G2/G3 thresholds missing from the
repository record are declared experiment assumptions. No source JSON edits,
model-code edits, silent FX conversion or Bayesian claims are involved.

## Local runtime created for validation

Docker/PostgreSQL/WSL were absent from this Windows environment. Official portable
PostgreSQL/PostGIS binaries were downloaded into the ignored
`backend/.cache/canonical-runtime/` directory. The server binds only to
`127.0.0.1:55433`; it is a local validation cluster, with local trust authentication.
Do not expose this validation cluster to a network.

- Populated import database: `ea_forests_import`.
- Final standalone demonstration database: `ea_forests_demo_v01`.
- Disposable integration database: `ea_forests_test`.
- Database role: `ea_forests`.
- Artifacts: `backend/.cache/canonical-artifacts/`.
- Final demonstration report: `backend/.cache/canonical-demo-v0.1.json`.
- Test/import/smoke logs: `backend/.cache/canonical-*.log`.

To inspect the imported state with the backend, set:

```powershell
$env:CANONICAL_DATABASE_URL='postgresql+psycopg://ea_forests@127.0.0.1:55433/ea_forests_import'
```

The API still requires a private `CANONICAL_API_TOKEN`; no token was committed or
automatically enabled. For normal reproducible development, use
`compose.canonical.yml` and the instructions in `backend/README.md`. The Docker
Compose path is supplied but was not itself run on this Docker-free machine.

To stop the portable validation server from the repository root:

```powershell
& backend/.cache/canonical-runtime/pgsql/bin/pg_ctl.exe -D backend/.cache/canonical-runtime/pgdata stop -m fast
```

## Deliberate limits and next work

The implementation supplies 60 relational tables across 14 namespaces, evidence
and observation services, immutable temporal history, model/parameter lineage,
world isolation, explicit state rebuilding, domain APIs and current-state views.
Operator/route, commercial matching/opportunity, verification and decision tables
are foundations; their complete business workflows are not implemented.

Deferred: Bayesian updating, optimal transport/control, calibrated discrepancy,
EVSI, automatic recomputation, production stand-state resolution, field/provider
importers, nursery/planting batches, public/multi-tenant authorisation, and large
Parquet sample generation. Unknown source dates, approximate coordinates and
unverified claims remain material limitations. Backups must include PostgreSQL
and artifacts; decisions and downstream runs intentionally prevent deleting their
referenced state snapshots.

The recommended next implementation is a verified processor-intake and field
inventory importer with explicit protocols and price basis/currency, followed by
a production supply-state adapter and an evidence-selection policy.
