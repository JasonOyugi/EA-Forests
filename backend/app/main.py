from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import EarthEngineStatusResponse, SiteClassificationRequest
from app.services.site_classification import get_earth_engine_status, run_site_classification

app = FastAPI(title="EA Forests Models Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
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


@app.post("/api/models/site-classification")
def site_classification(payload: SiteClassificationRequest) -> dict:
    return run_site_classification(payload)
