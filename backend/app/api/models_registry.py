"""Standard model API: one registry and run contract over the existing model services.

GET  /api/models                   registry (id, name, inputs, status, runtime needs)
GET  /api/models/{model_id}        one registry entry, including its JSON input schema
POST /api/models/{model_id}/run    validate, then run synchronously (fast models) or queue a job
GET  /api/model-runs/{run_id}      queued | running | completed | failed

The model math lives unchanged in `app.services.*`; this module only adds validation, a result
cache, per-client rate limiting, timeouts, provenance labels and user-safe errors. The legacy
`/api/models/<name>` routes in `app.main` call `execute_model` too, so both paths share them.

Runs and cached results are held in process memory. That suits one long-lived instance (Cloud
Run with min-instances=1) or short serverless runs; it is not a shared store across instances.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
import uuid
from collections import OrderedDict, deque
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from dataclasses import dataclass, field
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

from app.schemas import (
    ClonalEucalyptusNurseryRequest,
    CommercialForestViabilityRequest,
    RoundwoodProductionRequest,
    SiteClassificationRequest,
)
from app.services.clonal_nursery import run_clonal_eucalyptus_nursery
from app.services.commercial_viability import run_commercial_forest_viability
from app.services.roundwood_production import run_roundwood_production
from app.services.site_classification import (
    EarthEngineAuthenticationError,
    get_earth_engine_status,
    run_site_classification,
)

logger = logging.getLogger("ea_forests.models")

Status = Literal["LIVE", "BETA", "COMING SOON"]
Provenance = Literal["OBSERVED", "DERIVED", "MODELLED", "INFERRED", "UNRESOLVED"]


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


CACHE_MAX_ENTRIES = _env_int("MODEL_CACHE_MAX_ENTRIES", 256)
CACHE_TTL_SECONDS = _env_int("MODEL_CACHE_TTL_SECONDS", 6 * 60 * 60)
RATE_LIMIT_RUNS = _env_int("MODEL_RATE_LIMIT_RUNS", 30)
RATE_LIMIT_WINDOW_SECONDS = _env_int("MODEL_RATE_LIMIT_WINDOW_SECONDS", 60)
MAX_WORKERS = _env_int("MODEL_MAX_WORKERS", 4)


@dataclass(frozen=True)
class ModelSpec:
    model_id: str
    display_name: str
    description: str
    request_model: type[BaseModel]
    runner: Callable[[Any], dict]
    version: str
    requires_earth_engine: bool
    expected_seconds: str
    execution: Literal["sync", "async"]
    timeout_seconds: int
    # Configured status; `requires_earth_engine` models are downgraded at runtime when EE is down.
    status: Status
    provenance: list[Provenance]
    frontend_path: str
    limitations: list[str] = field(default_factory=list)


MODELS: dict[str, ModelSpec] = {
    spec.model_id: spec
    for spec in [
        ModelSpec(
            model_id="commercial-forest-viability",
            display_name="Commercial forest viability",
            description="Silviculture costs, thinning and final-harvest revenue, and rotation "
            "cashflow metrics (NPV, payback) for a plantation scenario.",
            request_model=CommercialForestViabilityRequest,
            runner=run_commercial_forest_viability,
            version="1",
            requires_earth_engine=False,
            expected_seconds="<2",
            execution="sync",
            timeout_seconds=30,
            status="LIVE",
            provenance=["MODELLED"],
            frontend_path="/models/model-2",
            limitations=["Cost and price libraries are regional defaults unless edited."],
        ),
        ModelSpec(
            model_id="roundwood-production",
            display_name="Roundwood production",
            description="Harvest, extraction, loading and haulage cost to the nearest processors "
            "for a stand at a chosen coordinate, ranked by netback.",
            request_model=RoundwoodProductionRequest,
            runner=run_roundwood_production,
            version="1",
            requires_earth_engine=False,
            expected_seconds="5-60 (road routing per processor)",
            execution="sync",
            timeout_seconds=90,
            status="LIVE",
            provenance=["MODELLED", "DERIVED"],
            frontend_path="/models/model-3",
            limitations=[
                (
                    "Road distances come from the public OSRM router; when it is unavailable the "
                    "model uses a labelled straight-line x road-factor estimate instead."
                ),
            ],
        ),
        ModelSpec(
            model_id="clonal-eucalyptus-nursery",
            display_name="Clonal eucalyptus nursery",
            description="Capex, opex, production and financial returns for a clonal eucalyptus "
            "nursery business.",
            request_model=ClonalEucalyptusNurseryRequest,
            runner=run_clonal_eucalyptus_nursery,
            version="1",
            requires_earth_engine=False,
            expected_seconds="<3",
            execution="sync",
            timeout_seconds=30,
            status="LIVE",
            provenance=["MODELLED"],
            frontend_path="/models/clonal-eucalyptus-nursery",
        ),
        ModelSpec(
            model_id="site-classification",
            display_name="Site-species analysis (climate & terrain)",
            description="Climate and terrain profile for a coordinate from TerraClimate, CHIRPS, "
            "ERA5-Land and other sources, compared across sources for site-species screening.",
            request_model=SiteClassificationRequest,
            runner=run_site_classification,
            version="1",
            requires_earth_engine=True,
            expected_seconds="60-180 (Earth Engine)",
            execution="async",
            timeout_seconds=300,
            status="BETA",
            provenance=["OBSERVED", "DERIVED"],
            frontend_path="/models/site-species-analysis",
            limitations=[
                "Needs a server-side Earth Engine service identity; unavailable until configured.",
                "Point-based: analyses a coordinate plus climate buffer (max 50 km), not a drawn AOI.",
            ],
        ),
    ]
}


class ModelRunError(Exception):
    """A run failure that is safe to show to users."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


# ---------------------------------------------------------------------------------------------
# Result cache (LRU + TTL) and rate limiting
# ---------------------------------------------------------------------------------------------

_cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()
_cache_lock = threading.Lock()


def cache_key(spec: ModelSpec, payload: BaseModel) -> str:
    """Model id + model version + canonical parameters; bump `version` to invalidate."""
    canonical = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{spec.model_id}:{spec.version}:{canonical}".encode()).hexdigest()


def _cache_get(key: str) -> dict | None:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        stored_at, value = entry
        if time.monotonic() - stored_at > CACHE_TTL_SECONDS:
            _cache.pop(key, None)
            return None
        _cache.move_to_end(key)
        return value


def _cache_put(key: str, value: dict) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic(), value)
        _cache.move_to_end(key)
        while len(_cache) > CACHE_MAX_ENTRIES:
            _cache.popitem(last=False)


def clear_cache(model_id: str | None = None) -> int:
    """Explicit invalidation. Keys are hashed, so a per-model clear drops everything."""
    with _cache_lock:
        removed = len(_cache)
        _cache.clear()
    logger.info("model cache cleared (%s entries, requested for %s)", removed, model_id or "all")
    return removed


_rate_windows: dict[str, deque[float]] = {}
_rate_lock = threading.Lock()


def _client_id(request: Request | None) -> str:
    if request is None:
        return "internal"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request | None) -> None:
    client = _client_id(request)
    now = time.monotonic()
    with _rate_lock:
        window = _rate_windows.setdefault(client, deque())
        while window and now - window[0] > RATE_LIMIT_WINDOW_SECONDS:
            window.popleft()
        if len(window) >= RATE_LIMIT_RUNS:
            raise ModelRunError(
                429, "rate_limited", "Too many model runs from this connection. Try again in a minute."
            )
        window.append(now)


# ---------------------------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------------------------

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="model-run")


def _run_spec(spec: ModelSpec, payload: BaseModel) -> dict:
    try:
        return spec.runner(payload)
    except EarthEngineAuthenticationError as exc:
        logger.warning("Earth Engine unavailable for %s: %s", spec.model_id, exc)
        raise ModelRunError(
            424,
            "earth_engine_unavailable",
            "Satellite and climate data (Google Earth Engine) is not available on this server "
            "yet, so this analysis cannot run. No estimate has been substituted.",
        ) from exc
    except ValueError as exc:
        # Model services raise ValueError for input combinations they reject; messages are
        # written for users (e.g. "harvest_area_ha must be positive").
        raise ModelRunError(400, "invalid_input", str(exc)) from exc
    except ModelRunError:
        raise
    except Exception as exc:
        logger.exception("model %s failed", spec.model_id)
        raise ModelRunError(
            500, "model_failed", "The model could not complete this run. Please try again."
        ) from exc


def execute_model(
    model_id: str, payload: BaseModel, request: Request | None = None
) -> tuple[dict, bool]:
    """Run a model synchronously with cache, rate limit and timeout. Returns (result, cached)."""
    spec = get_spec(model_id)
    key = cache_key(spec, payload)
    cached = _cache_get(key)
    if cached is not None:
        return cached, True

    check_rate_limit(request)
    started = time.monotonic()
    future = _executor.submit(_run_spec, spec, payload)
    try:
        result = future.result(timeout=spec.timeout_seconds)
    except FutureTimeout as exc:
        logger.error("model %s timed out after %ss", model_id, spec.timeout_seconds)
        raise ModelRunError(
            504, "timeout", "The model took too long to respond. Please try again shortly."
        ) from exc
    logger.info("model %s completed in %.2fs", model_id, time.monotonic() - started)
    _cache_put(key, result)
    return result, False


def get_spec(model_id: str) -> ModelSpec:
    spec = MODELS.get(model_id)
    if spec is None:
        raise ModelRunError(404, "unknown_model", f"No model called '{model_id}'.")
    return spec


_ee_status_memo: dict[str, Any] = {"checked_at": 0.0, "authenticated": False}
EE_STATUS_TTL_SECONDS = 60


def _earth_engine_authenticated() -> bool:
    # Initialisation only caches success, so memoise failures too rather than retrying on
    # every registry read.
    if time.monotonic() - _ee_status_memo["checked_at"] > EE_STATUS_TTL_SECONDS:
        status = get_earth_engine_status(live_probe=False)
        _ee_status_memo.update(checked_at=time.monotonic(), authenticated=bool(status.get("authenticated")))
    return _ee_status_memo["authenticated"]


def runtime_status(spec: ModelSpec) -> tuple[Status, str | None]:
    if not spec.requires_earth_engine:
        return spec.status, None
    if not _earth_engine_authenticated():
        return "COMING SOON", "Earth Engine service identity is not configured on this server."
    return spec.status, None


def result_provenance(spec: ModelSpec, result: dict) -> list[str]:
    labels: list[str] = list(spec.provenance)
    processors = result.get("processors") if isinstance(result, dict) else None
    if isinstance(processors, list) and any(
        isinstance(p, dict) and p.get("route_source") == "fallback_distance_factor"
        for p in processors
    ):
        labels.append("INFERRED")
    if isinstance(result, dict) and result.get("errors"):
        labels.append("UNRESOLVED")
    return list(dict.fromkeys(labels))


def describe(spec: ModelSpec, *, include_schema: bool = False) -> dict:
    status, reason = runtime_status(spec)
    entry = {
        "model_id": spec.model_id,
        "display_name": spec.display_name,
        "description": spec.description,
        "version": spec.version,
        "status": status,
        "status_reason": reason,
        "requires_earth_engine": spec.requires_earth_engine,
        "expected_seconds": spec.expected_seconds,
        "execution": spec.execution,
        "provenance": spec.provenance,
        "frontend_path": spec.frontend_path,
        "limitations": spec.limitations,
    }
    if include_schema:
        entry["input_schema"] = spec.request_model.model_json_schema()
    return entry


# ---------------------------------------------------------------------------------------------
# Async jobs (in-process)
# ---------------------------------------------------------------------------------------------

_runs: OrderedDict[str, dict] = OrderedDict()
_runs_lock = threading.Lock()
MAX_TRACKED_RUNS = 500


def _store_run(run: dict) -> None:
    with _runs_lock:
        _runs[run["run_id"]] = run
        while len(_runs) > MAX_TRACKED_RUNS:
            _runs.popitem(last=False)


def _update_run(run_id: str, **changes: Any) -> None:
    with _runs_lock:
        if run_id in _runs:
            _runs[run_id].update(changes)


def _job(run_id: str, spec: ModelSpec, payload: BaseModel, key: str) -> None:
    _update_run(run_id, status="running", started_at=time.time())
    try:
        result = _run_spec(spec, payload)
    except ModelRunError as exc:
        _update_run(
            run_id,
            status="failed",
            finished_at=time.time(),
            error={"code": exc.code, "message": exc.message},
        )
        return
    _cache_put(key, result)
    _update_run(
        run_id,
        status="completed",
        finished_at=time.time(),
        result=result,
        provenance=result_provenance(spec, result),
    )


# ---------------------------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------------------------

router = APIRouter(tags=["Models"])


def error_response(exc: ModelRunError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content={"error": {"code": exc.code, "message": exc.message}}
    )


@router.get("/api/models")
def list_models() -> dict:
    return {"models": [describe(spec) for spec in MODELS.values()]}


@router.get("/api/models/{model_id}")
def model_detail(model_id: str):
    try:
        return describe(get_spec(model_id), include_schema=True)
    except ModelRunError as exc:
        return error_response(exc)


@router.post("/api/models/{model_id}/run")
async def run_model(model_id: str, request: Request):
    try:
        spec = get_spec(model_id)
        try:
            body = await request.json()
        except ValueError:
            body = {}
        try:
            payload = spec.request_model.model_validate(body or {})
        except ValidationError as exc:
            fields = ", ".join(".".join(str(p) for p in e["loc"]) for e in exc.errors()[:5])
            raise ModelRunError(422, "invalid_input", f"Check these inputs: {fields}.") from exc

        status, reason = runtime_status(spec)
        if status == "COMING SOON":
            raise ModelRunError(503, "model_unavailable", reason or "This model is not live yet.")

        if spec.execution == "async":
            key = cache_key(spec, payload)
            cached = _cache_get(key)
            run_id = uuid.uuid4().hex
            if cached is not None:
                run = {
                    "run_id": run_id,
                    "model_id": model_id,
                    "status": "completed",
                    "cached": True,
                    "result": cached,
                    "provenance": result_provenance(spec, cached),
                }
                _store_run(run)
                return run
            check_rate_limit(request)
            _store_run({"run_id": run_id, "model_id": model_id, "status": "queued", "cached": False})
            _executor.submit(_job, run_id, spec, payload, key)
            return JSONResponse(
                status_code=202, content={"run_id": run_id, "model_id": model_id, "status": "queued"}
            )

        # Run the blocking model off the event loop.
        from starlette.concurrency import run_in_threadpool

        result, cached = await run_in_threadpool(execute_model, model_id, payload, request)
        return {
            "run_id": uuid.uuid4().hex,
            "model_id": model_id,
            "model_version": spec.version,
            "status": "completed",
            "cached": cached,
            "provenance": result_provenance(spec, result),
            "result": result,
        }
    except ModelRunError as exc:
        return error_response(exc)


@router.get("/api/model-runs/{run_id}")
def model_run(run_id: str):
    with _runs_lock:
        run = dict(_runs[run_id]) if run_id in _runs else None
    if run is None:
        raise HTTPException(404, "Run not found. Runs are kept in memory and may have expired.")
    return run
