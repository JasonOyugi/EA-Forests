import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.canonical import router as canonical_router
from app.api.eo import router as eo_router
from app.api.eo_public import router as eo_public_router
from app.api.models_registry import ModelRunError, execute_model
from app.api.models_registry import router as models_router

from app.schemas import (
    ClonalEucalyptusNurseryRequest,
    CommercialForestViabilityRequest,
    EarthEngineStatusResponse,
    GeneticsCatalogResponse,
    RoundwoodProductionRequest,
    SiteClassificationRequest,
)
from app.services.clonal_nursery import clonal_nursery_default_library
from app.services.commercial_viability import commercial_forest_viability_default_library
from app.services.currency import get_currency_rates
from app.services.genetics import get_genetics_catalog, list_genetics_varieties
from app.services.roundwood_production import roundwood_production_default_library
from app.services.site_classification import get_earth_engine_status

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

def _split_csv_env(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _allowed_origins() -> list[str]:
    origins = _split_csv_env(os.getenv("ALLOWED_ORIGINS"))
    if origins:
        return origins

    defaults = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]
    for host in _split_csv_env(os.getenv("APP_ORIGIN")):
        defaults.append(host)
    return defaults


app = FastAPI(title="EA Forests Models Backend", version="0.1.0")

# Canonical routes resolve their database lazily; legacy model startup stays database-independent.
app.include_router(canonical_router)
app.include_router(eo_router)
app.include_router(eo_public_router)
app.include_router(models_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/earth-engine/status", response_model=EarthEngineStatusResponse)
def earth_engine_status() -> EarthEngineStatusResponse:
    status = get_earth_engine_status()
    if not status["authenticated"]:
        # The service message carries local setup instructions; keep those in server logs.
        logging.getLogger("ea_forests.models").warning("Earth Engine status: %s", status["message"])
        status["message"] = (
            "Satellite and climate data (Google Earth Engine) is not connected on this server yet."
        )
    return EarthEngineStatusResponse(**status)


@app.get("/api/currency/rates")
def currency_rates() -> dict:
    return get_currency_rates()


@app.get("/api/genetics/catalog", response_model=GeneticsCatalogResponse)
def genetics_catalog() -> GeneticsCatalogResponse:
    return GeneticsCatalogResponse(**get_genetics_catalog())


@app.get("/api/genetics/varieties")
def genetics_varieties() -> list[dict]:
    return list_genetics_varieties()


def _legacy_run(model_id: str, payload, request: Request):
    """Legacy per-model routes return the bare result the existing pages parse."""
    try:
        result, _cached = execute_model(model_id, payload, request)
        return result
    except ModelRunError as exc:
        # Keep the `detail` shape the existing pages read, with a user-safe message.
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@app.post("/api/models/site-classification")
def site_classification(payload: SiteClassificationRequest, request: Request) -> dict:
    return _legacy_run("site-classification", payload, request)


@app.post("/api/models/commercial-forest-viability")
def commercial_forest_viability(payload: CommercialForestViabilityRequest, request: Request) -> dict:
    return _legacy_run("commercial-forest-viability", payload, request)


@app.get("/api/models/commercial-forest-viability/defaults")
def commercial_forest_viability_defaults(rotation_year: int = 8) -> dict:
    try:
        return commercial_forest_viability_default_library(rotation_year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/models/roundwood-production")
def roundwood_production(payload: RoundwoodProductionRequest, request: Request) -> dict:
    return _legacy_run("roundwood-production", payload, request)


@app.get("/api/models/roundwood-production/defaults")
def roundwood_production_defaults() -> dict:
    return roundwood_production_default_library()


@app.post("/api/models/clonal-eucalyptus-nursery")
def clonal_eucalyptus_nursery(payload: ClonalEucalyptusNurseryRequest, request: Request) -> dict:
    return _legacy_run("clonal-eucalyptus-nursery", payload, request)


@app.get("/api/models/clonal-eucalyptus-nursery/defaults")
def clonal_eucalyptus_nursery_defaults() -> dict:
    return clonal_nursery_default_library()
