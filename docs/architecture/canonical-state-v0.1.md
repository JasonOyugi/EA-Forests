# Canonical State v0.1

## Repository audit and implementation plan

The audit started on local `main` at `a13ec97`. Upstream `main` was fetched and its
`62f4f7b` price-bridge documentation commit was merged before implementation.
There were no existing database models, migrations, persistence repositories, or
architecture ADRs for canonical state. Existing ADRs address publication/content/hosting.

The FastAPI backend runs site classification, commercial forest viability,
roundwood production, clonal nursery economics, genetics, and currency services
directly from Pydantic payloads. NumPy/pandas calculations and frontend JSON are
currently separate. `app.check_backend` exercises health and models, including
live NASA POWER and optional Earth Engine. The asset registration page is a
placeholder. Maps and market pages read JSON; they do not own persistent identity.

| Existing source | Audit finding | Canonical mapping |
| --- | --- | --- |
| `processors.json` | 86 records; incomplete numeric grades, several explicit dummy records, source URLs, vintage, precision/confidence, display offsets | Separate organisation, facility, procurement grouping, taxon and grade identities; reported/synthetic assertions, price and specification history; provenance-aware geometry |
| `nurseries.json` | 167 records; USD header, persistent source IDs, variety-level capacity/price bands; demonstration data | Organisation/facility, taxon/material identities and supply relationships; synthetic quarantine where marked; unmapped bands retained in raw record |
| `large-commercial-forests.json` | 13 records; first records explicitly contain dummy areas, volumes and prices | Estate identities, reported inventory groups, area/volume assertions; synthetic quarantine; no mutable standing-volume columns |
| `central-forest-reserves.json` | 661 records; KML field mapping; five mix registry data with dummy analytics | Reserve parcel identities; registry claims, area conversion, centroid observations; whole mixed records quarantined pending reviewed field-level separation |
| `services/genetics.py` | Existing genus/species/hybrid catalogue and stable variety IDs | Catalogue evidence, taxa, hybrid-parent relationships, preserved ID aliases; nursery variety labels remain unresolved material types |
| `public/data/trial-sites/` | Registry, performance summaries, derived climate profiles and placeholders | Future provider/field importers use the same source, observation, geometry, model and artifact interfaces; these datasets are not promoted to canonical measurements in this migration |
| Site classification providers | NASA POWER, Earth Engine and SoilGrids; buffering, aggregation and source-specific units | Preserve provider, period, method and geometry when adding provider ingestion; current endpoints remain compatible |
| Roundwood model | Legacy tree-DBH grading; default buyer specifications and UGX/USD 3700 fallback; `buyer_specs` adapter silently fills absent fields | New strict snapshot adapter invokes unchanged `simulate_grade_yields`; no implicit missing-grade fallback or canonical FX conversion |
| Commercial viability/nursery models | Editable assumptions and financial outputs, no lineage persistence | Existing scenario interfaces retained; model registry ready for additional adapters |

Before edits, the file-level plan was: `app/db` for schema/transactions;
`app/domain` for units/value semantics; `migrations` for frozen PostgreSQL DDL;
`services/evidence`, `ingestion`, and `state` for the pipeline; `api/canonical.py`
for domain endpoints; tests/demo/Compose and this documentation. Existing backend
services were not reorganised. SQLAlchemy Core statements use explicit transaction
boundaries rather than an additional repository abstraction with no current purpose.

## Principles and ontology

Stable identity, evidence, claims, measurements, inferred state, structural
parameters, commercial calculations and decisions are distinct relational objects.
UUID4 is supported directly by Python/PostgreSQL and avoids a custom UUID7 generator.
Names and aliases never constitute automatic organisation deduplication.
Only an exact `(dataset, source record key, role)` resolves import identity.

The PostgreSQL schemas are `core`, `geo`, `biology`, `forestry`, `market`,
`operations`, `evidence`, `observations`, `belief`, `models`, `commercial`,
`verification`, `decision`, and `audit`. See [the ER diagram](canonical-state-er.md).

Forestry supports optional portfolio/estate/parcel/stand/plot/tree relationships.
Absent hierarchy levels are not fabricated. Management events and harvested logs
are separate objects; log variables include SED, LED, length, moisture, density,
volume and mass. A source's species inventory grouping is not represented as a
surveyed stand. Operator jobs link crews, equipment and realised observations;
routes have ordered legs with observation references for distance, payload, time
and cost. Quantity evidence retains its canonical variable and unit.

Market identity separates organisations, facilities, processing lines, procurement
programmes and grades. Imported procurement programmes are explicitly labelled
source groupings, not claims that a formal programme was independently verified.
Capacity types distinguish installed, operational, target, observed and procurement
quantities. Narrative capacity is retained as text; `450 t/month` is not guessed
into an annual or daily numerical value.

## Temporal semantics

Meaningful evidence/claim/history tables use timezone-aware `timestamptz` bounds
and generated `[from,to)` PostgreSQL `tstzrange` columns. `valid_period` concerns
the real world; `knowledge_period` concerns what the system knew. Bounds may be
unbounded when the original source supplies no effective date. This is an explicit
unknown, not a claim that a price applied forever. Snapshots expose that uncertainty
as `valid_time_unknown`; data-vintage strings are preserved without inventing dates.

`recorded_at` is assigned at ingestion, never taken from the file's vintage.
Canonical APIs cannot set or backdate it. A supersession locks the original row,
closes its knowledge interval exactly once, inserts a replacement, and carries the
old claim forward outside the replacement's valid interval. All resulting rows
share one knowledge boundary. Old values, evidence and valid intervals are not
changed. The operation is transactional. A second correction of an already closed
row fails; the caller must correct the current revision instead.

Independent contradictory sources may coexist. There is no global exclusion
constraint pretending only one source can be correct. The default snapshot policy
selects the latest recorded eligible value per subject/variable, records competing
IDs in diagnostics, and exposes the selected epistemic class. Explicit selection
is supported when recency is unsuitable. This policy **is not Bayesian inference**
and is not an assessment of which source is more credible.

## Evidence, values, geometry and uncertainty

Source records retain access restrictions, publisher/URI, vintage, capture time
and metadata. Raw ingest records reference SHA-256-addressed original file bytes,
filename/media type, batch and parser version. Evidence items preserve the entire
original JSON record, source locator and their own epistemic class. Composite
foreign keys ensure evidence, ingest and source IDs agree. Raw artifacts are
private; they are never web-served. The local store checks content hashes on read.
An S3-compatible implementation can replace the `ArtifactStore` protocol.

Observations and assertions are separately typed. Each value has exactly one of:
numeric, text, boolean, categorical, datetime or structured content; alternatively,
it has an explicit missingness reason. Numeric observations require a registered
variable and canonical unit. Registry aliases map `DBH`, `dbh`, and `dbh_cm` to
`tree.dbh`; ambiguous labels such as `Diameter` require deliberate registration.
Units use Decimal scale factors. There is no density-based volume/mass conversion
or automatic currency exchange. UGX prices remain UGX. Unknown price basis stays
`unknown`. The existing legacy 3700 FX fallback is scenario behaviour only.

`OBSERVED`, `REPORTED`, `DERIVED`, `INFERRED`, `ASSUMED`, `FORECAST`, `SCENARIO`,
`SYNTHETIC`, and `UNKNOWN` remain distinct. Inferred/derived/forecast values must
use model snapshots, not the fact API. Processed environmental measurements can
be observations with their provider processing method; model predictions are
inferred snapshots. Assertions cannot be labelled measured `OBSERVED`; observations
cannot be labelled reported `REPORTED`. Missing is never coerced to zero.

Uncertainty supports standard error, standard deviation, intervals, distribution
family and measurement precision. Model runs separately store measurement-noise
and model-discrepancy configuration. Posterior/parameter summary JSON can contain
mean/median/std/p05/p50/p95; v0.1 does not invent those quantities from a source
point value. Particle arrays and large analytical outputs belong in content-addressed
artifacts, with Parquet appropriate for future tabular outputs. No particle table
or artificial Bayesian mathematics is implemented.

PostGIS geometries are valid, nonempty EPSG:4326 objects with original SRID,
method, numeric or descriptive precision, confidence and source provenance.
An input point is never converted into an invented polygon. CFR coordinates are
centroid estimates when the source describes a polygon but supplies only lon/lat.
Display offsets remain recoverable but are excluded from the current geometry view.
The processor JSON's `dbh_min` remains a **legacy tree-DBH threshold**; canonical
log `min_sed_cm` stays null unless genuinely supplied as small-end diameter.

## Lineage, worlds and rebuilding

Model definitions have immutable versions with git SHA, actual code hash,
archived code bytes, component path and configuration schema version. A dirty
checkout is distinguishable by its code hash. Runs record complete inputs,
configuration, RNG seed, timestamps, status and artifacts. Terminal runs cannot
be changed; evidence inputs are relational, immutable run links.

State snapshots reference posteriors, which reference the generating model run
and version. Composite foreign keys prevent mismatched run/version/world tuples.
A deferred database constraint requires posterior evidence lineage before commit.
Completed lineage cannot accept new members. State values retain input IDs, units,
epistemic class and uncertainty. New facts create invalidation records for affected
existing snapshots across observations **and** assertions. Recalculation is explicit;
v0.1 does not run a background scheduler.

Unreferenced derived leaf bundles can be deleted; their model run, original evidence,
relational run inputs, manifests and audit remain. `rebuild_from_run` reconstructs
the summary after deletion and checks it against the content-addressed manifest.
It refuses to execute historical runs under different code. Decisions, downstream
runs and descendant posteriors intentionally pin snapshots until their dependencies
are dealt with. This is cache deletion with provenance retention, not evidence deletion.

Worlds are immutable named production/scenario/simulation/experiment contexts.
Cross-world inference links and model/commercial/decision references are rejected
by PostgreSQL triggers, including direct SQL. Synthetic sources/evidence cannot be
relabeled as measured facts. Production rejects scenarios and synthetic data by
default. An explicit synthetic permission requires a reason on world creation;
the default production world never grants it. Imports route synthetic and mixed
records to `legacy-import-quarantine`. Identities are global; epistemic facts and
derived objects carry world identity. There is no implicit world inheritance or
automatic copying of production evidence into experiments.

## Relational versus JSONB policy

Identity, taxonomy, hierarchy, programme/grade, units/variables, quantities,
provenance, model/snapshot/world references, foreign keys and important status/time
filters are relational. JSONB stores source records, extensible locators/metadata,
measurement protocols, inference summaries, model configuration and diagnostics.
The generic fact table is bounded by variable type/unit/domain constraints rather
than a free-form EAV API. Typed domain tables provide relationships and projections.
Specification and price projections reference their authoritative source fact;
current views apply that fact's temporal visibility, preserving history.

## API and privacy

Legacy model endpoints still start and run without a database connection. New
`/api/canonical` routes are a **local administrative API**, disabled unless
`CANONICAL_API_TOKEN` is configured. Bearer authentication protects every route;
there are no anonymous canonical read/write endpoints. Never reuse the sample
development database password on a remotely accessible service.

Useful endpoints cover entities, worlds, evidence metadata, assertions,
observations, supersession, temporal fact queries, snapshot creation/explanation,
model-run inspection, verification tasks and roundwood grade-yield evaluation.
`GET /api/canonical/state/{entity_id}/explain?world_id=...` returns state,
source facts, evidence IDs/hashes, model version/run and posterior lineage.
Private source locators/titles are redacted and raw content has no HTTP endpoint.
Authorised administrators can see underlying facts and model inputs. Public or
multi-tenant access requires a subsequent authorisation design.

## Migration, acceptance and limits

Keep all original JSON and frontend adapters. Importing creates new persistent
identities and claims; it does not rewrite source files or swap existing pages to
database reads. Each record retains unmapped source fields and upstream source
references. Parser/hash/file keys make identical imports idempotent. Changed files
add evidence; they do not silently replace existing observations. Source absence
does not mean deletion. Source-key changes need explicit alias resolution.

The demo imports Shanglong, archives raw bytes, creates identities/specification
claims, builds a snapshot, records a synthetic 30-to-40 cm G1 threshold change and
a dated 125000-to-140000 UGX/t price change, then builds a new snapshot. It checks
historical queries, reconstructs the old snapshot and runs unchanged legacy grade
simulation at the same seed. Incomplete G2/G3 thresholds are supplied as explicit
experiment assumptions. Manual stand distributions cannot feed production through
this adapter. No currency conversion, live routing or default buyer substitution
is needed to demonstrate the causal change.

Deferred: Bayesian calibration, optimal transport/control, EVSI, background
recomputation, transactions/contracts, field collection UIs, live provider ingestion,
production stand-state resolution, nursery/planting batches, calibrated discrepancy,
advanced geometry selection, public auth, and Parquet sample writers. Commercial
candidate/opportunity, operator/job/route, verification and decision tables establish
the relational foundations; this release does not implement all their business workflows.

Next: a verified processor-intake/field-inventory importer with protocols and
unit/currency/basis validation, then a production supply-state adapter and deliberate
source-selection policy calibrated against those observations.

Operational risks: backup the PostgreSQL database **and** artifact directory together;
database-owner privileges can bypass application protections; unknown effective dates
and approximate coordinates must remain visible; actual source verification is still
required before commercial decisions. Docker and native development setups are local
and free. See [backend setup and validation](../../backend/README.md).

Reference choices were checked against [PostgreSQL Windows distribution guidance](https://www.postgresql.org/download/windows/),
[PostGIS installation guidance](https://postgis.net/documentation/getting_started/install_windows/),
and [SQLAlchemy's PostgreSQL/psycopg documentation](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html).
