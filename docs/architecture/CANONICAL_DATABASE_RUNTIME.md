# Canonical database runtime

Date: 2026-09-11. Branch `feature/uganda-cfr-s2-history`.

## The incident this document exists to prevent

While resolving canonical identity for the three Asset Intelligence
reference assets (Kampimpini/Kapimpini, Namavundu, Mbooni South), a
read-only query against the database named in `backend/.env`
(`ea_forests_import`) found real `core.entity` rows for all three but
**zero rows in `geo.aoi` for any entity in that database** -- suggesting
none of the three, nor anything else, had ever been promoted to a
canonical AOI.

That was true of `ea_forests_import`, but false of the product. The
running backend (started outside the tracked launcher; see "Stale/manual
backend" below) was connected to a different database,
`ea_forests_uganda_country_pass`, which already held real, polygon-backed
AOIs, AOI versions, EO cohort membership, and tens of thousands of EO job
and observation rows for exactly these entities. Only one Postgres
*server* is running locally, but that server hosts eleven
non-template EA Forests databases -- `.env`'s declared name is not, by
itself, evidence of which one the running product actually uses.

**Core rule: do not run an operational script (migration, import,
promotion, or any script that mutates `core`/`geo`/`processing`/
`observations`) until the target database name has been printed and
verified against the running system, not assumed from `.env`, a script
default, or a database's name.**

## The one Postgres server

A single, portable, repo-bundled Postgres instance runs locally:

- Executable: `backend/.cache/canonical-runtime/pgsql/bin/postgres.exe`
- Data directory: `backend/.cache/canonical-runtime/pgdata`
- Listening on `127.0.0.1:55433` (`max_connections = 100`)
- Started/stopped by `scripts/dev.ps1` (`npm run system:start` /
  `system:stop`), or manually.

Docker is a documented alternative (`backend/.env.example`'s
`127.0.0.1:5433` option) but was **not running** when this document was
written -- `docker ps` failed to reach the daemon. Do not assume the
Docker path is live; check `docker ps` first.

## Databases on that one server (verified 2026-09-11, read-only)

| database | alembic head | core.entity | geo.aoi | geo.aoi_version | eo_cohort | eo_cohort_member | eo_job | eo_series | eo_observation | change_candidate | classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ea_forests_uganda_country_pass` | `0012_corroboration_semantics` | 1930 | 1893 | 1893 | 4 | 2279 | 27339 | 5668 | 27192 | 71 | **operational** |
| `ea_forests_import` | `0012_corroboration_semantics` | 3537 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | import staging (entity/geometry only, never promoted) |
| `ea_forests_cfr_inventory` | `0004_geometry_method` | 698 | 656 | 656 | -- | -- | -- | -- | -- | -- | historical snapshot (earlier CFR-only promotion attempt; older schema, different UUIDs than the operational DB) |
| `ea_forests_eo_pilot` | `0006_eo_job_leasing` | 41 | 4 | 4 | -- | -- | 6 | 4 | 6 | -- | historical pilot (small, older schema) |
| `ea_forests_acceptance` | `0002_integrity` | 48 | no table | no table | -- | -- | -- | -- | -- | -- | seed/acceptance fixture |
| `ea_forests_demo` | `0001_canonical_state` | 48 | no table | no table | -- | -- | -- | -- | -- | -- | seed/demo fixture |
| `ea_forests_demo_v01` | `0002_integrity` | 48 | no table | no table | -- | -- | -- | -- | -- | -- | seed/demo fixture |
| `ea_forests_ci_test` | `0012_corroboration_semantics` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | disposable/test (schema-only) |
| `ea_forests_test` | `0008_spatial_read_indexes` | 0 | 0 | 0 | -- | -- | 0 | 0 | 0 | -- | disposable/test (schema-only, older) |
| `ea_forests_startup_20260910_test` | `0011_change_assessment_domain` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | disposable/test (onboarding-script test) |
| `ea_forests_startup_agent_test` | `0011_change_assessment_domain` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | disposable/test (onboarding-script test) |

`--` = table does not exist yet at that schema revision (pre-`0003_geo_aoi`
or pre-`0005_eo_pipeline`).

`ea_forests_cfr_inventory` deserves a specific warning: it has a similar
entity/AOI count to part of the operational database's Uganda slice (656
CFRs in both), which makes it tempting to assume they are the same data.
**They are not** -- distinct entity and world UUIDs, an older schema
revision, and no processing/observations schema at all. Matching entity
counts is not evidence of matching identity; only UUID/world_id equality
is.

## Operational EO database

- Host/port: `127.0.0.1:55433`
- Database: **`ea_forests_uganda_country_pass`**
- Evidence: real polygon-backed AOIs across all three ingested countries
  (`analysis_scope` = `uganda_cfr_commercial_eo_mvp` x656,
  `kenya_forest_candidate_eo_mvp` x666, `tanzania_forest_candidate_eo_mvp`
  x571), four EO cohorts (`uganda-cfr-observation-cohort`,
  `kenya-forest-observation-cohort`, `kenya-gazetted-forest-eo-cohort`,
  `tanzania-forest-observation-cohort`), 27,339 EO jobs, 27,192 EO
  observations, 71 change candidates. Confirmed live via the running
  backend's own `/api/canonical/spatial-assets` and
  `/api/canonical/eo/observations` responses, not just a database count.

## Web app database vs operational EO database: the divergence, and its cause

`backend/.env` declared `CANONICAL_DATABASE_URL` pointing at
`ea_forests_import`, and `scripts/dev.ps1`'s own fallback default (used
when `CANONICAL_DATABASE_URL` is unset) also resolves to
`ea_forests_import`. Neither matches the operational database above.

The backend process actually answering `http://127.0.0.1:8000` at the time
of this investigation was, however, correctly connected to
`ea_forests_uganda_country_pass` -- confirmed by its live API responses.
The reason: **that process was not the one the launcher is tracking.**
`.cache/dev/backend.process.json` (written by `scripts/dev.ps1`) recorded a
PID that was no longer running; the actual listener on port 8000 was a
different PID, started outside `system:start` (its Python interpreter path
was a `uv`-managed install under
`%APPDATA%\uv\python\...`, not `backend/.venv`), evidently with
`CANONICAL_DATABASE_URL` already set to `ea_forests_uganda_country_pass` in
that shell's own environment before uvicorn started -- which takes
precedence over `backend/.env` (`python-dotenv`'s default `override=False`
never replaces an already-set variable). A second, fully inert process
(same command line, `backend/.venv`'s own python.exe, not bound to the
port) was also present -- almost certainly an earlier manual start attempt
that failed to bind and was never cleaned up.

**Resolution applied:** `backend/.env`'s `CANONICAL_DATABASE_URL` now
points at `ea_forests_uganda_country_pass`, and `backend/.env.example`'s
commented alternative and its Docker default were updated with an explicit
warning not to trust either without verifying against the running system
first. The already-running backend process was left untouched -- it does
not need fixing, and restarting it was unnecessary for this fix and out of
scope for this change (editing `backend/.env`, which is gitignored and not
read again until the next process start, does not affect it).

## API session model (a related misreading, corrected)

`backend/.env.example` reads: "Canonical routes are disabled unless this
local administrative token is configured." Read in isolation, this
suggests a blank `CANONICAL_API_TOKEN` means the canonical API is fully
unusable, and an earlier report in this project incorrectly concluded
that from it. The actual behavior, confirmed live: `system:start` (and any
`uvicorn app.main:app` start of this codebase) generates a private,
process-only admin token when `CANONICAL_API_TOKEN` is blank, and a
browser obtains a short-lived (2 hour) `HttpOnly` session cookie via
`POST /api/canonical/session/bootstrap`, gated by CORS to specific known
frontend dev-server origins (`http://127.0.0.1:5173`/`5174`/`4173` and
their `localhost` equivalents by default, or `ALLOWED_ORIGINS`/
`APP_ORIGIN` if set). A request from any other origin -- including an ad
hoc test dev server on a non-default port -- gets a `403`/`401` from the
bootstrap and session-gated routes, which looks identical to "the API is
disabled" if you don't check the Origin. It is not disabled; it is
Origin-gated. `.env.example`'s comment has been clarified.

## Verifying before you run anything operational

Before a migration, import, or promotion script:

```powershell
npm run system:status                 # confirms the launcher-tracked process and readiness
curl http://127.0.0.1:8000/api/ready  # {"status":"ok","checks":{"database":"ok",...}}
```

Neither of these prints the database *name*. To get the name with
certainty, either read it from the environment of the process that is
actually serving `:8000` (not `backend/.env` -- a running process may
predate the file's current content, as happened here), or add the safety
guard described below so operational scripts print and require
confirmation of the target database themselves.

## Recommended safety guard (not yet implemented)

A shared helper for EO/admin scripts that, before any write, prints:

- database host, port, database name
- current alembic head
- `core.entity` / `geo.aoi` row counts

and, for scripts capable of major writes, requires either an interactive
confirmation or an explicit `--expected-database <name>` flag that must
match the connection's `current_database()` before proceeding. Routine
long-running workers (EO job leasing, etc.) should **not** require an
interactive prompt -- only scripts a human runs directly and infrequently
(migrations, promotions, imports) need the guard.
