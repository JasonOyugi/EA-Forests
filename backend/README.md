# EA Forests Models Backend

This backend turns the notebook-driven model workflows into a FastAPI service for the Vite app.

## Setup

```powershell
cd backend
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv sync
```

## Run

```powershell
cd backend
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
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
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -m app.auth_earth_engine
```

That should open the normal browser-based Google flow. If your Earth Engine access is tied to a Cloud project, set `EARTH_ENGINE_PROJECT` before running the command.

The auth helper and backend ignore `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` for Earth Engine by default because stale local proxies can block Google OAuth token refresh. If you intentionally need those proxy variables for Google API calls, set `EA_FORESTS_USE_SYSTEM_PROXY=1` before authenticating or running the backend.

After the browser authentication finishes, stop and restart the backend server so the running process picks up the Earth Engine credentials.

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
