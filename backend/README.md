# EA Forests Models Backend

This backend turns the site-classification notebook workflow into a FastAPI service.

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

## Earth Engine authentication

If you want TerraClimate, CHIRPS, ERA5-Land, or SRTM-backed static topography, authenticate Earth Engine first:

```powershell
cd backend
$env:UV_CACHE_DIR='c:\Users\JasonOyugi\Downloads\EA_Forests\.uv-cache'
uv run python -m app.auth_earth_engine
```

That should open the normal browser-based Google flow. If your Earth Engine access is tied to a Cloud project, set `EARTH_ENGINE_PROJECT` before running the command.

## Endpoints

- `GET /api/health`
- `GET /api/earth-engine/status`
- `POST /api/models/site-classification`
