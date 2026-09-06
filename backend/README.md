# EA Forests Models Backend

## Run on this Windows machine without Docker

If PowerShell says `docker` is not recognized, the Docker instructions below do
not apply until Docker is installed. This workspace already has a portable
PostgreSQL/PostGIS server and the populated `ea_forests_import` database.
These commands reuse that installation; the ignored runtime is not included in
a fresh clone.

From the repository root, check the database:

```powershell
& .\backend\.cache\canonical-runtime\pgsql\bin\pg_isready.exe -h 127.0.0.1 -p 55433
```

If it reports **no response**, start it:

```powershell
& .\backend\.cache\canonical-runtime\pgsql\bin\pg_ctl.exe -D .\backend\.cache\canonical-runtime\pgdata -l .\backend\.cache\canonical-runtime\postgres.log -o '-h 127.0.0.1 -p 55433' -w start
```

Start the backend in one PowerShell terminal and leave it running:

```powershell
cd backend
$env:PYTHONDONTWRITEBYTECODE='1'
$env:EARTH_ENGINE_PROJECT='ee-oyugijason'
$env:CANONICAL_DATABASE_URL='postgresql+psycopg://ea_forests@127.0.0.1:55433/ea_forests_import'
$env:CANONICAL_ARTIFACT_ROOT='.cache/canonical-artifacts'
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```powershell
cd vite-version
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>. Verify the backend through the frontend proxy with
`Invoke-RestMethod http://127.0.0.1:5173/api/health`; it should return `status: ok`.
If either service is already running, reuse it instead of starting another copy.
Use Ctrl+C in its terminal to stop it. The canonical administrative API still
requires the private token described below. No migrations or re-import are needed
to reuse this populated database.

## Canonical State v0.1

Canonical persistence is additive. Existing model endpoints still work with manual
payloads without PostgreSQL. The new administrative API uses PostgreSQL/PostGIS,
SQLAlchemy 2, Alembic and a private local artifact directory.

For a fresh database with Docker installed and running, from the repository root
(Compose starts the database only; start the backend and frontend separately):

```powershell
docker compose -f compose.canonical.yml up -d
cd backend
uv sync
$env:CANONICAL_DATABASE_URL='postgresql+psycopg://ea_forests:local-development-only@127.0.0.1:5433/ea_forests'
$env:CANONICAL_ARTIFACT_ROOT='.cache/canonical-artifacts'
uv run alembic upgrade head
uv run python -m app.canonical bootstrap
uv run python -m app.canonical import all
```

Environment variables are read from the process; `.env.example` documents them but
is not automatically loaded. Set a private `CANONICAL_API_TOKEN` to enable
`/api/canonical` routes and send it as `Authorization: Bearer <token>`. The default
API is disabled, with no anonymous access to source facts or model inputs. Raw
artifacts are not exposed by HTTP. These routes are for trusted local administration;
public/multi-tenant access is outside this release.

Imports are transactional and preserve raw bytes and full source records. They do
not modify frontend JSON. Explicit dummy/test/demo records, including mixed CFR
records, enter `legacy-import-quarantine`. Coordinate confidence and unknown price
basis remain visible. Identical file/parser imports are idempotent.

Run the deterministic demonstration in a **separate fresh database**:

```powershell
# From repository root; the Compose service must be running.
docker compose -f compose.canonical.yml exec canonical-db createdb -U ea_forests ea_forests_demo
cd backend
$env:CANONICAL_DATABASE_URL='postgresql+psycopg://ea_forests:local-development-only@127.0.0.1:5433/ea_forests_demo'
uv run alembic upgrade head
uv run python -m app.canonical demo --output .cache/canonical-demo.json
```

The demo imports the actual Shanglong source record, records an experiment-only
threshold/price change, retains historical snapshots, prints lineage and verifies
that stricter G1 thresholds reduce G1 tonnes through the existing roundwood
simulation. Its data and manual stand assumptions are synthetic, not verified prices.

Tests use a **disposable database whose name ends in `_test`**:

```powershell
# From repository root:
docker compose -f compose.canonical.yml exec canonical-db createdb -U ea_forests ea_forests_test
cd backend
$env:CANONICAL_TEST_DATABASE_URL='postgresql+psycopg://ea_forests:local-development-only@127.0.0.1:5433/ea_forests_test'
uv run pytest -q
uv run python -m app.check_backend
```

Tests include migration downgrade/upgrade and database constraints. Never point them
at operational data. Without the test URL, PostgreSQL tests explicitly skip; this
is not evidence of PostGIS validation. `alembic downgrade base` destroys all
canonical schemas and is only for disposable databases or a deliberate backed-up
rollback. Normal upgrades do not destroy source history. Back up PostgreSQL and
the artifact directory together.

For detailed semantics, domain coverage, migration findings, non-goals and next
steps, see [Canonical State architecture](../docs/architecture/canonical-state-v0.1.md)
and [the ER diagram](../docs/architecture/canonical-state-er.md). Canonical price
history never uses the legacy model's fixed 3700 UGX/USD conversion.

This backend turns the notebook-driven model workflows into a FastAPI service for the Vite app.

## Setup

```powershell
cd backend
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA-Forests\.uv-cache'
uv sync
```

## Run

```powershell
cd backend
$env:EARTH_ENGINE_PROJECT='ee-oyugijason'
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA-Forests\.uv-cache'
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, run the frontend:

```powershell
cd vite-version
npm run dev -- --host 127.0.0.1 --port 5173
```

Then open:

```text
http://localhost:5173/
```

The Vite config proxies `/api` requests to `http://127.0.0.1:8000`, so the frontend can call the backend with relative URLs such as `/api/models/site-classification`.

NASA POWER and SoilGrids are public HTTPS APIs. The backend calls them directly by default so local proxy environment variables do not break model runs. If you intentionally need to use your system proxy for those APIs, set:

```powershell
$env:EA_FORESTS_USE_SYSTEM_PROXY='1'
```

## Earth Engine authentication

If you want TerraClimate, CHIRPS, ERA5-Land, or SRTM-backed static topography, authenticate Earth Engine first:

```powershell
cd backend
$env:EARTH_ENGINE_PROJECT='ee-oyugijason'
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -m app.auth_earth_engine
```

Keep `EARTH_ENGINE_PROJECT` set when starting the backend too, or set it permanently for your Windows user:

```powershell
[Environment]::SetEnvironmentVariable('EARTH_ENGINE_PROJECT', 'ee-oyugijason', 'User')
```

The auth helper and backend ignore `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` for Earth Engine by default because stale local proxies can block Google OAuth token refresh. If you intentionally need those proxy variables for Google API calls, set `EA_FORESTS_USE_SYSTEM_PROXY=1` before authenticating or running the backend.

After the browser authentication finishes, stop and restart the backend server so the running process picks up the Earth Engine credentials and `EARTH_ENGINE_PROJECT`.

To confirm the current terminal is ready before starting the backend:

```powershell
echo $env:EARTH_ENGINE_PROJECT
```

It should print:

```text
ee-oyugijason
```

To check Earth Engine from the backend without starting the server:

```powershell
cd backend
$env:EARTH_ENGINE_PROJECT='ee-oyugijason'
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -c "from app.services.site_classification import get_earth_engine_status; import json; print(json.dumps(get_earth_engine_status(), indent=2))"
```

The site-classification page checks `GET /api/earth-engine/status`. That endpoint now performs a small live Earth Engine probe, so a green badge means the backend can make an authenticated EE request, not just that `ee.Initialize()` returned. When you select TerraClimate, CHIRPS, ERA5-Land, or static topography and Earth Engine is not authenticated, the page shows this command and a status recheck button before you run the model.

If you do not want to authenticate Earth Engine yet, run only NASA POWER dynamic data and/or SoilGrids soil data. Those providers do not use Earth Engine.

## Endpoints

- `GET /api/health`
- `GET /api/earth-engine/status`
- `POST /api/models/site-classification`
- `POST /api/models/commercial-forest-viability`
- `POST /api/models/roundwood-production`

## Quick backend checks

Run all repeatable backend smoke checks without manually starting the server:

```powershell
cd backend
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -m app.check_backend
```

That verifies health, commercial viability, roundwood production, and NASA POWER site classification. It also checks Earth Engine status and skips the EE-backed model if EE is not authenticated.

After authenticating Earth Engine, require the EE-backed TerraClimate model to pass too:

```powershell
cd backend
$env:EARTH_ENGINE_PROJECT='ee-oyugijason'
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -m app.check_backend --require-ee
```

Manual endpoint checks are below if you want to inspect API responses directly.

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Site classification:

```powershell
$payload = @{
  site_id = "manual_test"
  lon = 35.02
  lat = 0.42
  start_year = 2023
  end_year = 2023
  sources = @("nasa_power")
  data_types = @("dynamic")
  dynamic_metric_groups = @("temperature", "water")
  static_metric_groups = @()
  summary_levels = @("monthly", "annual")
  agreement_families = @("precipitation", "mean_temperature")
  climate_buffer_m = 5000
  topo_buffer_m = 300
  min_overlap = 12
} | ConvertTo-Json

Invoke-RestMethod http://127.0.0.1:8000/api/models/site-classification -Method Post -ContentType "application/json" -Body $payload
```

Silvicultural models:

```powershell
$payload = @{
  rotation_year = 8
  thinning = "yes"
  qty_weight = 1
  wage_weight = 1
  labour_mix = "skilled"
  skilled_factor = 0.75
  d1 = 0.85
  d2 = 0.75
  initial_trees_per_ha = 1111
  area_ha = 1
  thinnings = @{ "4" = 0.30; "7" = 0.30 }
  price_thinning_tree = @{ "4" = 5000; "7" = 8000 }
  final_harvest_year = 8
  price_final_tree = 35000
  discount_rate = 0.15
} | ConvertTo-Json

Invoke-RestMethod http://127.0.0.1:8000/api/models/commercial-forest-viability -Method Post -ContentType "application/json" -Body $payload
```
