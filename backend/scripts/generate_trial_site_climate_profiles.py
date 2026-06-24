from __future__ import annotations

import argparse
import json
import math
import sys
import statistics
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.schemas import SiteClassificationRequest
from app.services.site_classification import run_site_classification

TRIAL_DATA_DIR = ROOT / "vite-version" / "public" / "data" / "trial-sites"
REGISTRY_PATH = TRIAL_DATA_DIR / "trial-site-registry.json"
OUTPUT_PATH = TRIAL_DATA_DIR / "trial-site-climate-profiles.json"
CACHE_PATH = ROOT / "trial_site_climate_profiles_cache.json"

START_YEAR = 2015
END_YEAR = 2024
SOURCE = "terraclimate"
CLIMATE_BUFFER_M = 5000


def finite_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return None


def mean_finite(values: list[Any]) -> float | None:
    numbers = [number for value in values if (number := finite_number(value)) is not None]
    if not numbers:
        return None
    return sum(numbers) / len(numbers)


def round_float(value: float | None, digits: int = 6) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return round(value, digits)


def annual_mean(rows: list[dict[str, Any]], key: str) -> float | None:
    return mean_finite([row.get(key) for row in rows])


def build_long_term_climate(annual_rows: list[dict[str, Any]]) -> dict[str, float | None]:
    annual_ppt = annual_mean(annual_rows, "annual_sum_ppt_mm_terraclimate")
    annual_aet = annual_mean(annual_rows, "annual_sum_aet_mm_terraclimate")
    annual_pet = annual_mean(annual_rows, "annual_sum_pet_mm_terraclimate")
    annual_def = annual_mean(annual_rows, "annual_sum_def_mm_terraclimate")

    return {
        "annual_ppt_mm": round_float(annual_ppt),
        "mean_tmean_c": round_float(annual_mean(annual_rows, "annual_mean_tmean_c_terraclimate")),
        "mean_tmin_c": round_float(annual_mean(annual_rows, "annual_mean_tmin_c_terraclimate")),
        "mean_tmax_c": round_float(annual_mean(annual_rows, "annual_mean_tmax_c_terraclimate")),
        "annual_aet_mm": round_float(annual_aet),
        "annual_pet_mm": round_float(annual_pet),
        "annual_water_deficit_mm": round_float(annual_def),
        "annual_runoff_mm": round_float(annual_mean(annual_rows, "annual_sum_runoff_mm_terraclimate")),
        "mean_soil_water_mm": round_float(annual_mean(annual_rows, "annual_mean_soil_mm_terraclimate")),
        "mean_solar_radiation_w_m2": round_float(annual_mean(annual_rows, "annual_mean_srad_w_m2_terraclimate")),
        "mean_vapor_pressure_kpa": round_float(annual_mean(annual_rows, "annual_mean_vap_kpa_terraclimate")),
        "mean_vpd_kpa": round_float(annual_mean(annual_rows, "annual_mean_vpd_kpa_terraclimate")),
        "mean_wind_10m_ms": round_float(annual_mean(annual_rows, "annual_mean_wind_10m_ms_terraclimate")),
        "mean_pdsi": round_float(annual_mean(annual_rows, "annual_mean_pdsi_terraclimate")),
        "aet_pet_ratio": round_float(None if not annual_aet or not annual_pet else annual_aet / annual_pet),
        "def_pet_ratio": round_float(None if not annual_def or not annual_pet else annual_def / annual_pet),
    }


def zscore_profiles(
    profiles: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, dict[str, float]]]:
    keys = sorted(
        {
            key
            for profile in profiles
            for key, value in (profile.get("long_term_climate") or {}).items()
            if finite_number(value) is not None
        }
    )
    scaler: dict[str, dict[str, float]] = {}

    for key in keys:
        values = [
            number
            for profile in profiles
            if (number := finite_number((profile.get("long_term_climate") or {}).get(key))) is not None
        ]
        if len(values) < 2:
            continue
        mean_value = statistics.fmean(values)
        std_value = statistics.pstdev(values)
        if std_value <= 0:
            continue
        scaler[key] = {"mean": round(mean_value, 8), "std": round(std_value, 8)}

    for profile in profiles:
        raw = profile.get("long_term_climate") or {}
        profile["scaled_climate_vector"] = {
            key: round((number - params["mean"]) / params["std"], 6)
            for key, params in scaler.items()
            if (number := finite_number(raw.get(key))) is not None
        }

    return profiles, scaler


def load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {}
    return json.loads(CACHE_PATH.read_text(encoding="utf-8"))


def save_cache(cache: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")


def run_profile_for_site(site: dict[str, Any]) -> dict[str, Any]:
    payload = SiteClassificationRequest(
        site_id=site["site_id"],
        lon=site["longitude"],
        lat=site["latitude"],
        start_year=START_YEAR,
        end_year=END_YEAR,
        sources=[SOURCE],
        data_types=["dynamic"],
        dynamic_metric_groups=["temperature", "water", "demand_stress", "radiation_wind"],
        static_metric_groups=[],
        summary_levels=["annual"],
        agreement_families=["precipitation"],
        climate_buffer_m=CLIMATE_BUFFER_M,
        topo_buffer_m=300,
        min_overlap=12,
    )
    result = run_site_classification(payload)
    if result.get("errors"):
        raise RuntimeError(f"{site['site_id']} returned classifier errors: {result['errors']}")

    annual_rows = result["source_summaries"][SOURCE]["annual"]
    if len(annual_rows) != (END_YEAR - START_YEAR + 1):
        raise RuntimeError(f"{site['site_id']} returned {len(annual_rows)} annual rows.")

    long_term_climate = build_long_term_climate(annual_rows)
    missing = [key for key, value in long_term_climate.items() if value is None]
    if missing:
        raise RuntimeError(f"{site['site_id']} has missing climate metrics: {', '.join(missing)}")

    return {
        **site,
        "climate_profile_status": "available_site_classifier_earthengine",
        "climate_profile_source": SOURCE,
        "climate_profile_year_range": {"start_year": START_YEAR, "end_year": END_YEAR},
        "climate_buffer_m": CLIMATE_BUFFER_M,
        "long_term_climate": long_term_climate,
        "trial_period_climate": None,
        "trial_period_anomaly": None,
        "scaled_climate_vector": None,
        "extraction_method": "Existing backend site-classification model using TerraClimate via Google Earth Engine; annual means over 2015-2024.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate trial-site climate profiles with the backend Earth Engine site classifier."
    )
    parser.add_argument("--refresh", action="store_true", help="Ignore cached per-site classifier responses.")
    args = parser.parse_args()

    sites = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    cache = {} if args.refresh else load_cache()
    profiles: list[dict[str, Any]] = []

    for index, site in enumerate(sites, start=1):
        site_id = site["site_id"]
        if site_id in cache:
            print(f"[{index}/{len(sites)}] cached {site_id}")
            profiles.append(cache[site_id])
            continue

        print(f"[{index}/{len(sites)}] running {site_id}")
        profile = run_profile_for_site(site)
        cache[site_id] = profile
        save_cache(cache)
        profiles.append(profile)

    profiles, scaler = zscore_profiles(profiles)
    metadata = {
        "climate_profile_status": "available_site_classifier_earthengine",
        "source": SOURCE,
        "start_year": START_YEAR,
        "end_year": END_YEAR,
        "climate_buffer_m": CLIMATE_BUFFER_M,
        "scaler": scaler,
    }

    OUTPUT_PATH.write_text(json.dumps(profiles, indent=2) + "\n", encoding="utf-8")
    (TRIAL_DATA_DIR / "trial-site-climate-profile-metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"wrote {OUTPUT_PATH}")
    print(f"wrote {TRIAL_DATA_DIR / 'trial-site-climate-profile-metadata.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
