from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    ClonalEucalyptusNurseryRequest,
    CommercialForestViabilityRequest,
    EarthEngineStatusResponse,
    RoundwoodProductionRequest,
    SiteClassificationRequest,
)
from app.services.clonal_nursery import (
    clonal_nursery_default_library,
    run_clonal_eucalyptus_nursery,
)
from app.services.commercial_viability import run_commercial_forest_viability
from app.services.currency import get_currency_rates
from app.services.roundwood_production import run_roundwood_production
from app.services.site_classification import (
    EarthEngineAuthenticationError,
    get_earth_engine_status,
    run_site_classification,
)

app = FastAPI(title="EA Forests Models Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/earth-engine/status", response_model=EarthEngineStatusResponse)
def earth_engine_status() -> EarthEngineStatusResponse:
    return EarthEngineStatusResponse(**get_earth_engine_status())


@app.get("/api/currency/rates")
def currency_rates() -> dict:
    return get_currency_rates()


@app.post("/api/models/site-classification")
def site_classification(payload: SiteClassificationRequest) -> dict:
    try:
        return run_site_classification(payload)
    except EarthEngineAuthenticationError as exc:
        raise HTTPException(status_code=424, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/models/commercial-forest-viability")
def commercial_forest_viability(payload: CommercialForestViabilityRequest) -> dict:
    try:
        return run_commercial_forest_viability(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/models/roundwood-production")
def roundwood_production(payload: RoundwoodProductionRequest) -> dict:
    try:
        return run_roundwood_production(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/models/clonal-eucalyptus-nursery")
def clonal_eucalyptus_nursery(payload: ClonalEucalyptusNurseryRequest) -> dict:
    try:
        return run_clonal_eucalyptus_nursery(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/models/clonal-eucalyptus-nursery/defaults")
def clonal_eucalyptus_nursery_defaults() -> dict:
    return clonal_nursery_default_library()
