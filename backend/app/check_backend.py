from __future__ import annotations

import argparse
import sys
from typing import Any

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post(path, json=payload)
    require(
        response.status_code < 400,
        f"{path} returned {response.status_code}: {response.text}",
    )
    return response.json()


def check_health() -> None:
    response = client.get("/api/health")
    require(response.status_code == 200, f"Health returned {response.status_code}.")
    require(response.json().get("status") == "ok", "Health payload was not ok.")
    print("ok health")


def check_commercial_viability() -> None:
    payload = {
        "rotation_year": 8,
        "thinning": "yes",
        "qty_weight": 1,
        "wage_weight": 1,
        "labour_mix": "skilled",
        "skilled_factor": 0.75,
        "d1": 0.85,
        "d2": 0.75,
        "initial_trees_per_ha": 1111,
        "area_ha": 1,
        "thinnings": {"4": 0.30, "7": 0.30},
        "price_thinning_tree": {"4": 5000, "7": 8000},
        "final_harvest_year": 8,
        "price_final_tree": 35000,
        "discount_rate": 0.15,
    }
    result = post_json("/api/models/commercial-forest-viability", payload)
    require(result["cashflow_rows"], "Commercial viability returned no cashflow rows.")
    require(result["metrics"]["NPV_per_ha"] is not None, "Commercial viability returned no NPV.")
    print("ok commercial-forest-viability")


def check_roundwood() -> None:
    payload = {
        "lon": 35.02,
        "lat": 0.42,
        "processor_count": 1,
        "n_draws": 1000,
        "rng_seed": 7,
    }
    result = post_json("/api/models/roundwood-production", payload)
    require(result["processors"], "Roundwood returned no processor results.")
    require(result["rankings"], "Roundwood returned no rankings.")
    print("ok roundwood-production")


def check_site_classification_nasa() -> None:
    payload = {
        "site_id": "backend_check_nasa",
        "lon": 35.02,
        "lat": 0.42,
        "start_year": 2023,
        "end_year": 2023,
        "sources": ["nasa_power"],
        "data_types": ["dynamic"],
        "dynamic_metric_groups": ["temperature", "water"],
        "static_metric_groups": [],
        "summary_levels": ["monthly", "annual"],
        "agreement_families": ["precipitation", "mean_temperature"],
        "climate_buffer_m": 5000,
        "topo_buffer_m": 300,
        "min_overlap": 12,
    }
    result = post_json("/api/models/site-classification", payload)
    require(not result["errors"], f"NASA site classification errors: {result['errors']}")
    require(
        len(result["source_tables"].get("nasa_power", [])) == 12,
        "NASA site classification did not return 12 monthly rows.",
    )
    print("ok site-classification nasa_power")


def check_earth_engine(require_ee: bool) -> None:
    status_response = client.get("/api/earth-engine/status")
    require(
        status_response.status_code == 200,
        f"Earth Engine status returned {status_response.status_code}: {status_response.text}",
    )
    status = status_response.json()

    if not status.get("authenticated"):
        message = status.get("message", "Earth Engine is not authenticated.")
        if require_ee:
            raise AssertionError(message)
        print(f"skip earth-engine-backed model: {message}")
        return

    payload = {
        "site_id": "backend_check_ee",
        "lon": 35.02,
        "lat": 0.42,
        "start_year": 2023,
        "end_year": 2023,
        "sources": ["terraclimate"],
        "data_types": ["dynamic"],
        "dynamic_metric_groups": ["temperature", "water"],
        "static_metric_groups": [],
        "summary_levels": ["monthly"],
        "agreement_families": ["precipitation"],
        "climate_buffer_m": 5000,
        "topo_buffer_m": 300,
        "min_overlap": 12,
    }
    result = post_json("/api/models/site-classification", payload)
    require(not result["errors"], f"Earth Engine site classification errors: {result['errors']}")
    require(
        result["source_tables"].get("terraclimate"),
        "Earth Engine site classification returned no TerraClimate rows.",
    )
    print("ok site-classification earth-engine")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run backend model smoke checks.")
    parser.add_argument(
        "--require-ee",
        action="store_true",
        help="Fail if Earth Engine is not authenticated and live-probe ready.",
    )
    args = parser.parse_args(argv)

    checks = [
        check_health,
        check_commercial_viability,
        check_roundwood,
        check_site_classification_nasa,
        lambda: check_earth_engine(args.require_ee),
    ]

    try:
        for check in checks:
            check()
    except Exception as exc:
        print(f"failed backend check: {exc}", file=sys.stderr)
        return 1

    print("all requested backend checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
