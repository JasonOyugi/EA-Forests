from __future__ import annotations

import calendar
import math
import os
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd
import requests

try:
    import ee
except Exception:  # pragma: no cover - dependency install decides this at runtime
    ee = None

from app.schemas import SiteClassificationRequest
from app.earth_engine import (
    USE_SYSTEM_PROXY_ENV,
    configure_earth_engine_network,
    earth_engine_project,
)

MONTH_NAMES = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}

DEFAULT_SOURCES = [
    "terraclimate",
    "chirps",
    "nasa_power",
    "era5_land_ee",
]
DEFAULT_DATA_TYPES = ["dynamic", "static"]
DEFAULT_DYNAMIC_METRIC_GROUPS = [
    "temperature",
    "water",
    "demand_stress",
    "radiation_wind",
]
DEFAULT_STATIC_METRIC_GROUPS = ["topography", "soil"]
DEFAULT_SUMMARY_LEVELS = ["full", "monthly", "annual"]
DEFAULT_AGREEMENT_FAMILIES = [
    "precipitation",
    "mean_temperature",
    "minimum_temperature",
    "maximum_temperature",
    "potential_evapotranspiration",
    "actual_evapotranspiration",
    "water_deficit",
    "vpd",
    "radiation",
    "wind",
    "soil_water",
]

DYNAMIC_METRIC_GROUPS = {
    "temperature": ["tmean", "tmin", "tmax", "temperature"],
    "water": ["ppt", "precip", "rain", "aet", "runoff", "soil_mm", "soil_water"],
    "demand_stress": ["pet", "def", "vpd", "pdsi", "aridity", "aet_pet", "water_deficit"],
    "radiation_wind": ["srad", "solar", "radiation", "wind", "rh", "vap"],
}

STATIC_METRIC_GROUPS = {
    "topography": ["elevation", "slope", "aspect"],
    "soil": ["soil", "clay", "sand", "silt", "carbon", "soc", "ph", "cec", "bulk_density", "bdod", "nitrogen", "water_content", "coarse_fragments"],
}

ID_COLUMNS = [
    "site_id",
    "source",
    "lon",
    "lat",
    "date",
    "year",
    "month",
    "month_name",
    "climate_buffer_m",
    "native_resolution",
    "extraction_method",
]

NASA_POWER_PARAMETER_MAP = {
    "PRECTOTCORR": "ppt_mm_nasa_power",
    "T2M": "tmean_c_nasa_power",
    "T2M_MIN": "tmin_c_nasa_power",
    "T2M_MAX": "tmax_c_nasa_power",
    "RH2M": "rh2m_pct_nasa_power",
    "WS2M": "wind_2m_ms_nasa_power",
    "ALLSKY_SFC_SW_DWN": "srad_kwh_m2_day_nasa_power",
}

TC_BANDS = {
    "aet": {"name": "aet_mm", "mult": 0.1},
    "def": {"name": "def_mm", "mult": 0.1},
    "pdsi": {"name": "pdsi", "mult": 0.01},
    "pet": {"name": "pet_mm", "mult": 0.1},
    "pr": {"name": "ppt_mm", "mult": 1.0},
    "ro": {"name": "runoff_mm", "mult": 1.0},
    "soil": {"name": "soil_mm", "mult": 0.1},
    "srad": {"name": "srad_w_m2", "mult": 0.1},
    "swe": {"name": "swe_mm", "mult": 1.0},
    "tmmn": {"name": "tmin_c", "mult": 0.1},
    "tmmx": {"name": "tmax_c", "mult": 0.1},
    "vap": {"name": "vap_kpa", "mult": 0.001},
    "vpd": {"name": "vpd_kpa", "mult": 0.01},
    "vs": {"name": "wind_10m_ms", "mult": 0.01},
}

COMPARABLE_FAMILIES = {
    "precipitation": ["ppt_mm_"],
    "mean_temperature": ["tmean_c_"],
    "minimum_temperature": ["tmin_c_"],
    "maximum_temperature": ["tmax_c_"],
    "potential_evapotranspiration": ["pet_mm_"],
    "actual_evapotranspiration": ["aet_mm_"],
    "water_deficit": ["def_mm_", "water_deficit"],
    "vpd": ["vpd_kpa_"],
    "radiation": ["srad_"],
    "wind": ["wind_"],
    "soil_water": ["soil_mm_", "soil_water"],
}


class EarthEngineAuthenticationError(RuntimeError):
    """Raised when Earth Engine is required but unavailable."""


EARTH_ENGINE_DYNAMIC_SOURCES = {"terraclimate", "chirps", "era5_land_ee"}
EARTH_ENGINE_STATIC_GROUPS = {"topography"}
EARTH_ENGINE_AUTH_COMMAND = (
    "`$env:EARTH_ENGINE_PROJECT='ee-oyugijason'; "
    "uv run python -m app.auth_earth_engine`"
)


def external_get(url: str, **kwargs: Any) -> requests.Response:
    """Fetch public APIs directly unless system proxy use is explicitly enabled."""
    use_system_proxy = os.getenv(USE_SYSTEM_PROXY_ENV, "").lower() in {
        "1",
        "true",
        "yes",
    }
    with requests.Session() as session:
        session.trust_env = use_system_proxy
        return session.get(url, **kwargs)


def validate_lon_lat(lon: float, lat: float) -> tuple[float, float]:
    lon = float(lon)
    lat = float(lat)

    if not (-180 <= lon <= 180):
        raise ValueError(f"Longitude must be between -180 and 180. Received {lon}.")
    if not (-90 <= lat <= 90):
        raise ValueError(f"Latitude must be between -90 and 90. Received {lat}.")

    return lon, lat


def normalise_list(values: list[str] | None, default: list[str]) -> list[str]:
    if not values:
        return list(default)
    return list(dict.fromkeys(values))


def validate_year_range(start_year: int, end_year: int, min_year: int | None = None) -> tuple[int, int]:
    start_year = int(start_year)
    end_year = int(end_year)

    if start_year > end_year:
        raise ValueError("start_year must be <= end_year.")
    if min_year is not None and start_year < min_year:
        raise ValueError(f"start_year must be >= {min_year}. Received {start_year}.")

    return start_year, end_year


def month_sequence(start_year: int, end_year: int) -> list[tuple[int, int]]:
    return [(year, month) for year in range(start_year, end_year + 1) for month in range(1, 13)]


def make_date_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["year"] = out["year"].astype(int)
    out["month"] = out["month"].astype(int)
    out["month_name"] = out["month"].map(MONTH_NAMES)
    out["date"] = pd.to_datetime(
        out["year"].astype(str) + "-" + out["month"].astype(str).str.zfill(2) + "-01"
    )
    return out


def numeric_metric_columns(df: pd.DataFrame) -> list[str]:
    return [
        column
        for column in df.select_dtypes(include=[np.number]).columns
        if column not in {"lon", "lat", "year", "month", "climate_buffer_m"}
    ]


def safe_getinfo(obj: Any) -> Any:
    try:
        return obj.getInfo()
    except Exception as exc:  # pragma: no cover - network/auth driven
        # Include the original exception message to aid diagnostics.
        raise RuntimeError(
            f"Earth Engine request failed: {exc}. Check authentication, dataset availability, coordinates, date range, and band names."
        ) from exc


def uses_earth_engine(
    sources: list[str],
    data_types: list[str],
    static_metric_groups: list[str],
) -> bool:
    dynamic_requires_ee = "dynamic" in data_types and any(
        source in EARTH_ENGINE_DYNAMIC_SOURCES for source in sources
    )
    static_requires_ee = "static" in data_types and any(
        group in EARTH_ENGINE_STATIC_GROUPS for group in static_metric_groups
    )
    return dynamic_requires_ee or static_requires_ee


@lru_cache(maxsize=1)
def ensure_earth_engine_initialized() -> bool:
    if ee is None:
        raise EarthEngineAuthenticationError(
            "earthengine-api is not installed. Run `uv sync` inside the backend folder first."
        )

    configure_earth_engine_network()
    project = earth_engine_project()

    try:
        if project:
            ee.Initialize(project=project)
        else:
            ee.Initialize()
        return True
    except Exception as exc:  # pragma: no cover - interactive/auth driven
        project_hint = (
            " Set EARTH_ENGINE_PROJECT to the Google Cloud project with Earth Engine "
            "access before authenticating and before running the backend."
            if not earth_engine_project()
            else ""
        )
        raise EarthEngineAuthenticationError(
            "Earth Engine is not authenticated for the backend yet. Run "
            f"{EARTH_ENGINE_AUTH_COMMAND} in the backend folder, "
            f"complete the browser popup, then restart the backend and retry.{project_hint} "
            f"Details: {exc}"
        ) from exc


def verify_earth_engine_ready() -> bool:
    ensure_earth_engine_initialized()

    try:
        probe_value = safe_getinfo(ee.Number(1))
    except Exception as exc:  # pragma: no cover - network/auth driven
        ensure_earth_engine_initialized.cache_clear()
        project_hint = (
            " If your Earth Engine access is tied to a Google Cloud project, "
            "set EARTH_ENGINE_PROJECT before authenticating and before running the backend."
            if not earth_engine_project()
            else ""
        )
        raise EarthEngineAuthenticationError(
            "Earth Engine initialized, but a live backend request failed. Run "
            f"{EARTH_ENGINE_AUTH_COMMAND} in the backend folder, complete the browser popup, "
            f"restart the backend, then retry.{project_hint} Details: {exc}"
        ) from exc

    try:
        probe_matches = int(probe_value) == 1
    except (TypeError, ValueError):
        probe_matches = False

    if not probe_matches:
        raise EarthEngineAuthenticationError(
            "Earth Engine live probe returned an unexpected response. Restart the backend and retry."
        )

    return True


def site_geometry(lon: float, lat: float, buffer_m: int):
    ensure_earth_engine_initialized()
    point = ee.Geometry.Point([float(lon), float(lat)])
    return point.buffer(float(buffer_m)) if buffer_m > 0 else point


def exclusive_end_date_for_year(end_year: int):
    ensure_earth_engine_initialized()
    return ee.Date.fromYMD(int(end_year) + 1, 1, 1)


def terraclimate_collection():
    ensure_earth_engine_initialized()
    return ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")


def latest_terraclimate_year_month() -> dict[str, Any]:
    latest = terraclimate_collection().sort("system:time_start", False).first()
    latest_date = ee.Date(latest.get("system:time_start"))
    return {
        "year": int(safe_getinfo(latest_date.get("year"))),
        "month": int(safe_getinfo(latest_date.get("month"))),
        "date": safe_getinfo(latest_date.format("YYYY-MM-dd")),
    }


def validate_terraclimate_years(start_year: int, end_year: int) -> tuple[int, int]:
    start_year, end_year = validate_year_range(start_year, end_year, min_year=1958)
    latest = latest_terraclimate_year_month()
    if end_year > latest["year"]:
        raise ValueError(
            f"Latest TerraClimate image available is {latest['date']} so end_year must be <= {latest['year']}."
        )
    return start_year, end_year


def scaled_terraclimate_image(img):
    scaled_bands = [
        img.select(raw_band).multiply(meta["mult"]).rename(meta["name"]).toFloat()
        for raw_band, meta in TC_BANDS.items()
    ]
    scaled = ee.Image.cat(scaled_bands)
    tmean = scaled.select("tmin_c").add(scaled.select("tmax_c")).divide(2).rename("tmean_c").toFloat()
    return (
        scaled.addBands(tmean)
        .copyProperties(img, img.propertyNames())
        .set("system:time_start", img.get("system:time_start"))
    )


def extract_terraclimate_monthly(
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    climate_buffer_m: int,
    scale_m: float = 4638.3,
) -> pd.DataFrame:
    lon, lat = validate_lon_lat(lon, lat)
    start_year, end_year = validate_terraclimate_years(start_year, end_year)

    geom = site_geometry(lon, lat, climate_buffer_m)
    start = ee.Date.fromYMD(start_year, 1, 1)
    end = exclusive_end_date_for_year(end_year)
    collection = terraclimate_collection().filterDate(start, end).map(scaled_terraclimate_image)
    selected_columns = [meta["name"] for meta in TC_BANDS.values()] + ["tmean_c"]

    def image_to_feature(img):
        vals = img.select(selected_columns).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geom,
            scale=scale_m,
            maxPixels=1e13,
            bestEffort=True,
            tileScale=4,
        )
        date = ee.Date(img.get("system:time_start"))
        return ee.Feature(
            None,
            vals.combine(
                ee.Dictionary(
                    {
                        "year": date.get("year"),
                        "month": date.get("month"),
                        "date": date.format("YYYY-MM-dd"),
                        "lon": lon,
                        "lat": lat,
                        "climate_buffer_m": climate_buffer_m,
                    }
                ),
                overwrite=True,
            ),
        )

    records = [feature["properties"] for feature in safe_getinfo(collection.map(image_to_feature))["features"]]
    df = pd.DataFrame(records)
    if df.empty:
        raise ValueError("No TerraClimate records returned for this site and year range.")

    df["year"] = df["year"].astype(int)
    df["month"] = df["month"].astype(int)
    df["month_name"] = df["month"].map(MONTH_NAMES)
    return df.sort_values(["year", "month"]).reset_index(drop=True)


def get_terraclimate_monthly_wrapper(
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    site_id: str,
    climate_buffer_m: int,
) -> pd.DataFrame:
    df = extract_terraclimate_monthly(lon, lat, start_year, end_year, climate_buffer_m).copy()
    df["site_id"] = site_id
    df["source"] = "terraclimate"
    df["native_resolution"] = "approx 4 km"
    df["extraction_method"] = "TerraClimate monthly data via Google Earth Engine; spatial mean over buffer"

    rename_map = {
        "ppt_mm": "ppt_mm_terraclimate",
        "tmean_c": "tmean_c_terraclimate",
        "tmin_c": "tmin_c_terraclimate",
        "tmax_c": "tmax_c_terraclimate",
        "aet_mm": "aet_mm_terraclimate",
        "pet_mm": "pet_mm_terraclimate",
        "def_mm": "def_mm_terraclimate",
        "runoff_mm": "runoff_mm_terraclimate",
        "soil_mm": "soil_mm_terraclimate",
        "srad_w_m2": "srad_w_m2_terraclimate",
        "vap_kpa": "vap_kpa_terraclimate",
        "vpd_kpa": "vpd_kpa_terraclimate",
        "wind_10m_ms": "wind_10m_ms_terraclimate",
        "pdsi": "pdsi_terraclimate",
        "swe_mm": "swe_mm_terraclimate",
    }
    df = df.rename(columns=rename_map)
    front = ["site_id", "source", "lon", "lat", "date", "year", "month", "month_name"]
    other = [column for column in df.columns if column not in front]
    return df[front + other].sort_values(["year", "month"]).reset_index(drop=True)


def get_chirps_monthly(
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    site_id: str,
    climate_buffer_m: int,
    scale_m: int = 5566,
) -> pd.DataFrame:
    ensure_earth_engine_initialized()
    lon, lat = validate_lon_lat(lon, lat)
    start_year, end_year = validate_year_range(start_year, end_year, min_year=1981)

    geom = site_geometry(lon, lat, climate_buffer_m)
    chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select("precipitation")
    features = []

    for year, month in month_sequence(start_year, end_year):
        start = ee.Date.fromYMD(year, month, 1)
        end = start.advance(1, "month")
        monthly_img = chirps.filterDate(start, end).sum().rename("ppt_mm_chirps").toFloat()
        vals = monthly_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geom,
            scale=scale_m,
            maxPixels=1e13,
            bestEffort=True,
            tileScale=4,
        )
        features.append(
            ee.Feature(
                None,
                vals.combine(
                    ee.Dictionary(
                        {
                            "site_id": site_id,
                            "source": "chirps",
                            "lon": lon,
                            "lat": lat,
                            "year": year,
                            "month": month,
                            "climate_buffer_m": climate_buffer_m,
                            "native_resolution": "0.05 degree / approx 5 km",
                            "extraction_method": "Daily rainfall summed to monthly total; spatial mean over buffer",
                        }
                    ),
                    overwrite=True,
                ),
            )
        )

    records = [feature["properties"] for feature in safe_getinfo(ee.FeatureCollection(features))["features"]]
    df = make_date_columns(pd.DataFrame(records))
    ordered = [
        "site_id",
        "source",
        "lon",
        "lat",
        "date",
        "year",
        "month",
        "month_name",
        "ppt_mm_chirps",
        "climate_buffer_m",
        "native_resolution",
        "extraction_method",
    ]
    return df[ordered].sort_values(["year", "month"]).reset_index(drop=True)


def era5_land_scaled_image(img):
    total_precip = img.select("total_precipitation_sum").multiply(1000).rename("ppt_mm_era5_land").toFloat()
    temperature = img.select("temperature_2m").subtract(273.15).rename("tmean_c_era5_land").toFloat()
    pet_raw = img.select("potential_evaporation_sum").multiply(-1000).rename("pet_mm_era5_land_raw_sign").toFloat()
    solar = img.select("surface_solar_radiation_downwards_sum").divide(86400).divide(1000000).rename("srad_mj_m2_day_era5_land").toFloat()
    soil = img.select("volumetric_soil_water_layer_1").rename("soil_water_layer1_m3_m3_era5_land").toFloat()

    bands = [total_precip, temperature, pet_raw, solar, soil]

    # Wind components may not be present in all ERA5-Land images.
    # Avoid calling client-side getInfo inside a mapped function; instead try to compute
    # the wind speed server-side and append if the bands exist for the image.
    try:
        wind = (
            img.select("u_component_of_wind_10m")
            .pow(2)
            .add(img.select("v_component_of_wind_10m").pow(2))
            .sqrt()
            .rename("wind_10m_ms_era5_land")
            .toFloat()
        )
        bands.append(wind)
    except Exception:
        # If wind bands are missing for this image, skip adding wind.
        pass

    return ee.Image.cat(bands).copyProperties(img, img.propertyNames()).set("system:time_start", img.get("system:time_start"))


def get_era5_land_monthly_ee(
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    site_id: str,
    climate_buffer_m: int,
    scale_m: int = 11132,
) -> pd.DataFrame:
    ensure_earth_engine_initialized()
    lon, lat = validate_lon_lat(lon, lat)
    start_year, end_year = validate_year_range(start_year, end_year, min_year=1950)

    geom = site_geometry(lon, lat, climate_buffer_m)
    start = ee.Date.fromYMD(start_year, 1, 1)
    end = ee.Date.fromYMD(end_year + 1, 1, 1)
    collection = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").filterDate(start, end).map(era5_land_scaled_image)

    # Iterate month-by-month and reduce each image to avoid mapping Python functions
    # that can trigger client-side operations on mapped arguments.
    records = []

    for year, month in month_sequence(start_year, end_year):
        start_m = ee.Date.fromYMD(year, month, 1)
        end_m = start_m.advance(1, "month")

        monthly_img = collection.filterDate(start_m, end_m).first()

        if monthly_img is None:
            # No image for this month; skip
            continue

        vals = monthly_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geom,
            scale=scale_m,
            maxPixels=1e13,
            bestEffort=True,
            tileScale=4,
        )

        info = safe_getinfo(vals)
        if not info:
            continue

        # Add metadata fields
        info.update(
            {
                "site_id": site_id,
                "source": "era5_land_ee",
                "lon": lon,
                "lat": lat,
                "year": int(year),
                "month": int(month),
                "climate_buffer_m": climate_buffer_m,
                "native_resolution": "approx 9-11 km",
                "extraction_method": "ERA5-Land monthly aggregate via Google Earth Engine; spatial mean over buffer",
            }
        )

        records.append(info)

    df = make_date_columns(pd.DataFrame(records))
    ordered = [
        "site_id",
        "source",
        "lon",
        "lat",
        "date",
        "year",
        "month",
        "month_name",
        "ppt_mm_era5_land",
        "tmean_c_era5_land",
        "pet_mm_era5_land_raw_sign",
        "srad_mj_m2_day_era5_land",
        "soil_water_layer1_m3_m3_era5_land",
        "wind_10m_ms_era5_land",
        "climate_buffer_m",
        "native_resolution",
        "extraction_method",
    ]
    ordered = [column for column in ordered if column in df.columns]
    return df[ordered].sort_values(["year", "month"]).reset_index(drop=True)


def get_nasa_power_monthly(
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    site_id: str,
    timeout: int = 90,
) -> pd.DataFrame:
    lon, lat = validate_lon_lat(lon, lat)
    start_year, end_year = validate_year_range(start_year, end_year, min_year=1981)

    response = external_get(
        "https://power.larc.nasa.gov/api/temporal/monthly/point",
        params={
            "parameters": ",".join(NASA_POWER_PARAMETER_MAP.keys()),
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": int(start_year),
            "end": int(end_year),
            "format": "JSON",
        },
        timeout=timeout,
    )
    response.raise_for_status()
    parameter_data = response.json().get("properties", {}).get("parameter", {})
    if not parameter_data:
        raise ValueError("NASA POWER returned no parameter data for the requested site.")

    rows = []
    for year, month in month_sequence(start_year, end_year):
        yyyymm = f"{year}{month:02d}"
        row: dict[str, Any] = {
            "site_id": site_id,
            "source": "nasa_power",
            "lon": lon,
            "lat": lat,
            "year": year,
            "month": month,
            "native_resolution": "POWER point API; source resolution depends on parameter",
            "extraction_method": "NASA POWER monthly point API",
        }
        for raw_name, clean_name in NASA_POWER_PARAMETER_MAP.items():
            value = parameter_data.get(raw_name, {}).get(yyyymm, np.nan)
            row[clean_name] = np.nan if value == -999 else value
        rows.append(row)

    df = make_date_columns(pd.DataFrame(rows))
    ordered = [
        "site_id",
        "source",
        "lon",
        "lat",
        "date",
        "year",
        "month",
        "month_name",
        "ppt_mm_nasa_power",
        "tmean_c_nasa_power",
        "tmin_c_nasa_power",
        "tmax_c_nasa_power",
        "rh2m_pct_nasa_power",
        "wind_2m_ms_nasa_power",
        "srad_kwh_m2_day_nasa_power",
        "native_resolution",
        "extraction_method",
    ]
    return df[ordered].sort_values(["year", "month"]).reset_index(drop=True)


def add_derived_metrics(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "aet_mm_terraclimate" in out.columns and "pet_mm_terraclimate" in out.columns:
        out["aet_pet_ratio_terraclimate"] = out["aet_mm_terraclimate"] / out["pet_mm_terraclimate"].replace(0, np.nan)
    if "def_mm_terraclimate" in out.columns and "pet_mm_terraclimate" in out.columns:
        out["def_pet_ratio_terraclimate"] = out["def_mm_terraclimate"] / out["pet_mm_terraclimate"].replace(0, np.nan)

    rainfall_cols = [column for column in out.columns if column.startswith("ppt_mm_")]
    for column in rainfall_cols:
        suffix = column.replace("ppt_mm_", "")
        out[f"dry_month_lt_50mm_{suffix}"] = np.where(out[column] < 50, 1, 0)
        out[f"dry_month_lt_30mm_{suffix}"] = np.where(out[column] < 30, 1, 0)

    vpd_cols = [column for column in out.columns if column.startswith("vpd_kpa")]
    for column in vpd_cols:
        suffix = column.replace("vpd_kpa_", "")
        out[f"high_vpd_gt_1p5kpa_{suffix}"] = np.where(out[column] > 1.5, 1, 0)

    return out


def filter_columns_by_groups(df: pd.DataFrame, groups: list[str], group_catalog: dict[str, list[str]]) -> pd.DataFrame:
    keep: list[str] = []
    for column in df.columns:
        if column in ID_COLUMNS:
            keep.append(column)
            continue

        lowered = column.lower()
        if any(keyword.lower() in lowered for group in groups for keyword in group_catalog[group]):
            keep.append(column)

    return df[keep].copy() if keep else df.copy()


def extract_source_dynamic_table(
    source: str,
    lon: float,
    lat: float,
    start_year: int,
    end_year: int,
    site_id: str,
    climate_buffer_m: int,
) -> pd.DataFrame:
    if source == "terraclimate":
        df = get_terraclimate_monthly_wrapper(lon, lat, start_year, end_year, site_id, climate_buffer_m)
    elif source == "chirps":
        df = get_chirps_monthly(lon, lat, max(start_year, 1981), end_year, site_id, climate_buffer_m)
    elif source == "nasa_power":
        df = get_nasa_power_monthly(lon, lat, max(start_year, 1981), end_year, site_id)
    elif source == "era5_land_ee":
        df = get_era5_land_monthly_ee(lon, lat, max(start_year, 1950), end_year, site_id, climate_buffer_m)
    else:
        raise ValueError(f"Unknown source '{source}'.")

    return add_derived_metrics(df)


def get_topography_metrics(lon: float, lat: float, topo_buffer_m: int) -> dict[str, Any]:
    ensure_earth_engine_initialized()
    geom = site_geometry(lon, lat, topo_buffer_m)
    elevation = ee.Image("USGS/SRTMGL1_003").rename("elevation_m")
    terrain = ee.Terrain.products(elevation)
    image = elevation.addBands(terrain.select(["slope", "aspect"]))

    values = safe_getinfo(
        image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geom,
            scale=30,
            maxPixels=1e10,
            bestEffort=True,
        )
    )
    return {
        "metric_group": "topography",
        "elevation_m": values.get("elevation_m"),
        "slope_deg": values.get("slope"),
        "aspect_deg": values.get("aspect"),
        "native_resolution": "30 m",
        "extraction_method": "SRTM via Google Earth Engine; spatial mean over buffer",
    }


def get_soil_metrics(lon: float, lat: float) -> tuple[dict[str, Any] | None, str | None]:
    response = external_get(
        "https://rest.isric.org/soilgrids/v2.0/properties/query",
        params=[
            ("lon", lon),
            ("lat", lat),
            ("property", "bdod"),
            ("property", "cec"),
            ("property", "cfvo"),
            ("property", "clay"),
            ("property", "nitrogen"),
            ("property", "phh2o"),
            ("property", "sand"),
            ("property", "silt"),
            ("property", "soc"),
            ("property", "wv0010"),
            ("depth", "0-5cm"),
            ("value", "mean"),
        ],
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    layers = payload.get("properties", {}).get("layers", [])
    if not layers:
        return None, "SoilGrids returned no soil layers for this coordinate."

    mapped: dict[str, Any] = {
        "metric_group": "soil",
        "native_resolution": "SoilGrids point query",
        "extraction_method": "SoilGrids REST query at coordinate",
    }
    property_mapping = {
        "bdod": "bulk_density_cg_cm3",
        "cec": "cec_mmolc_kg",
        "cfvo": "coarse_fragments_cm3_dm3",
        "clay": "clay_g_kg",
        "nitrogen": "nitrogen_g_kg",
        "phh2o": "soil_ph_h2o_x10",
        "sand": "sand_g_kg",
        "silt": "silt_g_kg",
        "soc": "organic_carbon_dg_kg",
        "wv0010": "water_content_pct_at_10kpa",
    }

    for layer in layers:
        name = layer.get("name")
        depths = layer.get("depths", [])
        mean_value = None
        if depths:
            mean_value = depths[0].get("values", {}).get("mean")
        if name in property_mapping:
            mapped[property_mapping[name]] = mean_value

    return mapped, None


def extract_static_table_controlled(
    lon: float,
    lat: float,
    site_id: str,
    static_metric_groups: list[str],
    topo_buffer_m: int,
) -> tuple[pd.DataFrame, list[str]]:
    warnings: list[str] = []
    rows: list[dict[str, Any]] = []

    if "topography" in static_metric_groups:
        topography = get_topography_metrics(lon, lat, topo_buffer_m)
        topography.update({"site_id": site_id, "source": "srtm"})
        rows.append(topography)

    if "soil" in static_metric_groups:
        try:
            soil, warning = get_soil_metrics(lon, lat)
            if warning:
                warnings.append(warning)
            elif soil:
                soil.update({"site_id": site_id, "source": "soilgrids"})
                rows.append(soil)
        except Exception as exc:
            warnings.append(f"Soil metrics could not be loaded: {exc}")

    df = pd.DataFrame(rows)
    if df.empty:
        return df, warnings

    return filter_columns_by_groups(df, static_metric_groups, STATIC_METRIC_GROUPS), warnings


def summarise_monthly_climatology(df: pd.DataFrame) -> pd.DataFrame:
    value_cols = numeric_metric_columns(df)
    if not value_cols:
        return pd.DataFrame()
    return (
        df.groupby(["source", "month", "month_name"], as_index=False)[value_cols]
        .mean()
        .sort_values(["source", "month"])
        .reset_index(drop=True)
    )


def summarise_annual(df: pd.DataFrame) -> pd.DataFrame:
    value_cols = numeric_metric_columns(df)
    if not value_cols:
        return pd.DataFrame()

    sum_keywords = ["ppt", "precip", "rain", "aet", "pet", "def_mm", "runoff", "dry_month"]
    sum_cols = [column for column in value_cols if any(keyword in column.lower() for keyword in sum_keywords)]
    mean_cols = [column for column in value_cols if column not in sum_cols]
    pieces: list[pd.DataFrame] = []

    if sum_cols:
        pieces.append(
            df.groupby(["source", "year"], as_index=False)[sum_cols]
            .sum()
            .rename(columns={column: f"annual_sum_{column}" for column in sum_cols})
        )
    if mean_cols:
        pieces.append(
            df.groupby(["source", "year"], as_index=False)[mean_cols]
            .mean()
            .rename(columns={column: f"annual_mean_{column}" for column in mean_cols})
        )

    out = pieces[0]
    for piece in pieces[1:]:
        out = out.merge(piece, on=["source", "year"], how="outer")
    return out.sort_values(["source", "year"]).reset_index(drop=True)


def export_requested_summaries(df: pd.DataFrame, summary_levels: list[str]) -> dict[str, pd.DataFrame]:
    outputs: dict[str, pd.DataFrame] = {}
    if "full" in summary_levels:
        outputs["full"] = df
    if "monthly" in summary_levels:
        outputs["monthly"] = summarise_monthly_climatology(df)
    if "annual" in summary_levels:
        outputs["annual"] = summarise_annual(df)
    return outputs


def build_controlled_comparison_table(source_tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    base_cols = ["site_id", "lon", "lat", "date", "year", "month", "month_name"]
    comparison: pd.DataFrame | None = None

    for df in source_tables.values():
        if df is None or df.empty:
            continue
        tmp = df[[column for column in df.columns if column in base_cols or column not in ID_COLUMNS]].copy()
        tmp["date"] = pd.to_datetime(tmp["date"])
        comparison = tmp if comparison is None else comparison.merge(tmp, on=base_cols, how="outer")

    if comparison is None:
        return pd.DataFrame()
    return comparison.sort_values(["site_id", "year", "month"]).reset_index(drop=True)


def get_family_columns(df: pd.DataFrame, family: str) -> list[str]:
    patterns = COMPARABLE_FAMILIES[family]
    return [column for column in df.columns if any(pattern in column for pattern in patterns)]


def pairwise_agreement_metrics(x: pd.Series, y: pd.Series) -> dict[str, Any]:
    valid = pd.DataFrame({"x": x, "y": y}).replace([np.inf, -np.inf], np.nan).dropna()
    if len(valid) == 0:
        return {
            "n": 0,
            "correlation": np.nan,
            "mean_x": np.nan,
            "mean_y": np.nan,
            "bias_x_minus_y": np.nan,
            "mean_abs_error": np.nan,
            "rmse": np.nan,
            "mean_pct_difference": np.nan,
        }

    diff = valid["x"] - valid["y"]
    mean_y = valid["y"].mean()
    return {
        "n": len(valid),
        "correlation": valid["x"].corr(valid["y"]) if len(valid) >= 3 else np.nan,
        "mean_x": valid["x"].mean(),
        "mean_y": mean_y,
        "bias_x_minus_y": diff.mean(),
        "mean_abs_error": diff.abs().mean(),
        "rmse": math.sqrt((diff**2).mean()),
        "mean_pct_difference": (
            100 * (valid["x"].mean() - mean_y) / mean_y
            if not pd.isna(mean_y) and mean_y != 0
            else np.nan
        ),
    }


def interpret_agreement(family: str, correlation: float, mean_pct_difference: float, mae: float) -> str:
    if pd.isna(correlation) and pd.isna(mean_pct_difference):
        return "Insufficient overlapping data."
    if family == "precipitation" and not pd.isna(mean_pct_difference):
        absolute_pct = abs(mean_pct_difference)
        if absolute_pct < 10:
            return "Good agreement in rainfall magnitude."
        if absolute_pct < 20:
            return "Moderate rainfall disagreement; acceptable for screening."
        if absolute_pct < 30:
            return "Material rainfall uncertainty; review site classification."
        return "High rainfall disagreement; validate with local or station data."
    if "temperature" in family and not pd.isna(mae):
        if mae < 1:
            return "Good temperature agreement."
        if mae < 2:
            return "Moderate temperature disagreement."
        return "High temperature disagreement; check elevation and grid effects."
    if not pd.isna(correlation):
        if correlation >= 0.85:
            return "Strong temporal agreement."
        if correlation >= 0.65:
            return "Moderate temporal agreement."
        if correlation >= 0.4:
            return "Weak-to-moderate temporal agreement."
        return "Weak temporal agreement."
    return "Agreement uncertain."


def compute_source_agreement_report(comparison_df: pd.DataFrame, families: list[str], min_overlap: int) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for family in families:
        cols = get_family_columns(comparison_df, family)
        if len(cols) < 2:
            continue
        for left_index in range(len(cols)):
            for right_index in range(left_index + 1, len(cols)):
                left_column = cols[left_index]
                right_column = cols[right_index]
                metrics = pairwise_agreement_metrics(comparison_df[left_column], comparison_df[right_column])
                if metrics["n"] < min_overlap:
                    continue
                rows.append(
                    {
                        "metric_family": family,
                        "source_metric_x": left_column,
                        "source_metric_y": right_column,
                        "n_overlap": metrics["n"],
                        "correlation": metrics["correlation"],
                        "mean_x": metrics["mean_x"],
                        "mean_y": metrics["mean_y"],
                        "bias_x_minus_y": metrics["bias_x_minus_y"],
                        "mean_abs_error": metrics["mean_abs_error"],
                        "rmse": metrics["rmse"],
                        "mean_pct_difference": metrics["mean_pct_difference"],
                        "interpretation": interpret_agreement(
                            family,
                            metrics["correlation"],
                            metrics["mean_pct_difference"],
                            metrics["mean_abs_error"],
                        ),
                    }
                )
    if not rows:
        return pd.DataFrame(
            [
                {
                    "metric_family": "none",
                    "source_metric_x": None,
                    "source_metric_y": None,
                    "n_overlap": 0,
                    "correlation": None,
                    "mean_x": None,
                    "mean_y": None,
                    "bias_x_minus_y": None,
                    "mean_abs_error": None,
                    "rmse": None,
                    "mean_pct_difference": None,
                    "interpretation": "No comparable metric pairs found for the selected outputs.",
                }
            ]
        )
    return pd.DataFrame(rows).sort_values(["metric_family", "correlation", "mean_abs_error"], ascending=[True, False, True]).reset_index(drop=True)


def summarize_best_and_worst_agreement(agreement_report: pd.DataFrame) -> pd.DataFrame:
    if agreement_report.empty or "none" in agreement_report["metric_family"].astype(str).values:
        return agreement_report

    valid = agreement_report.dropna(subset=["correlation"]).copy()
    if valid.empty:
        return pd.DataFrame([{"summary": "No valid correlations available."}])

    best = valid.sort_values("correlation", ascending=False).head(10).assign(agreement_rank="highest_agreement")
    worst = valid.sort_values("correlation", ascending=True).head(10).assign(agreement_rank="lowest_agreement")
    deviation = (
        agreement_report.dropna(subset=["mean_pct_difference"])
        .assign(abs_pct_difference=lambda frame: frame["mean_pct_difference"].abs())
        .sort_values("abs_pct_difference", ascending=False)
        .head(10)
        .assign(agreement_rank="largest_mean_percent_deviation")
    )
    return pd.concat([best, worst, deviation], ignore_index=True)


def dataframe_to_records(df: pd.DataFrame | None) -> list[dict[str, Any]]:
    if df is None or df.empty:
        return []
    out = df.copy()
    for column in out.columns:
        if pd.api.types.is_datetime64_any_dtype(out[column]):
            out[column] = out[column].dt.strftime("%Y-%m-%d")
    out = out.replace({np.nan: None, np.inf: None, -np.inf: None})
    return out.to_dict(orient="records")


def get_earth_engine_not_required_status() -> dict[str, Any]:
    return {
        "available": ee is not None,
        "authenticated": False,
        "required": False,
        "message": "Earth Engine was not required for the selected backend inputs.",
    }


def get_earth_engine_status(*, live_probe: bool = True) -> dict[str, Any]:
    if ee is None:
        return {
            "available": False,
            "authenticated": False,
            "required": True,
            "message": "earthengine-api is not installed in the backend environment yet.",
        }

    try:
        if live_probe:
            verify_earth_engine_ready()
            message = "Earth Engine is authenticated and live backend requests are succeeding."
        else:
            ensure_earth_engine_initialized()
            message = "Earth Engine is initialized for backend requests."
        return {
            "available": True,
            "authenticated": True,
            "required": True,
            "message": message,
        }
    except EarthEngineAuthenticationError as exc:
        return {
            "available": True,
            "authenticated": False,
            "required": True,
            "message": str(exc),
        }


def run_site_classification(payload: SiteClassificationRequest) -> dict[str, Any]:
    lon, lat = validate_lon_lat(payload.lon, payload.lat)
    sources = normalise_list(payload.sources, DEFAULT_SOURCES)
    data_types = normalise_list(payload.data_types, DEFAULT_DATA_TYPES)
    dynamic_metric_groups = normalise_list(payload.dynamic_metric_groups, DEFAULT_DYNAMIC_METRIC_GROUPS)
    static_metric_groups = normalise_list(payload.static_metric_groups, DEFAULT_STATIC_METRIC_GROUPS)
    summary_levels = normalise_list(payload.summary_levels, DEFAULT_SUMMARY_LEVELS)
    agreement_families = normalise_list(payload.agreement_families, DEFAULT_AGREEMENT_FAMILIES)
    earth_engine_required = uses_earth_engine(sources, data_types, static_metric_groups)
    earth_engine_status = (
        get_earth_engine_status(live_probe=True)
        if earth_engine_required
        else get_earth_engine_not_required_status()
    )

    if earth_engine_required and not earth_engine_status["authenticated"]:
        raise EarthEngineAuthenticationError(earth_engine_status["message"])

    response: dict[str, Any] = {
        "request": payload.model_dump(),
        "source_tables": {},
        "source_summaries": {},
        "static_table": [],
        "comparison_table": [],
        "agreement_report": [],
        "agreement_ranking": [],
        "warnings": [],
        "errors": [],
        "earth_engine": earth_engine_status,
    }

    source_tables: dict[str, pd.DataFrame] = {}

    if "dynamic" in data_types:
        for source in sources:
            try:
                raw_df = extract_source_dynamic_table(
                    source=source,
                    lon=lon,
                    lat=lat,
                    start_year=payload.start_year,
                    end_year=payload.end_year,
                    site_id=payload.site_id,
                    climate_buffer_m=payload.climate_buffer_m,
                )
                filtered_df = filter_columns_by_groups(raw_df, dynamic_metric_groups, DYNAMIC_METRIC_GROUPS)
                source_tables[source] = filtered_df
                response["source_tables"][source] = dataframe_to_records(filtered_df)
                response["source_summaries"][source] = {
                    level: dataframe_to_records(df)
                    for level, df in export_requested_summaries(filtered_df, summary_levels).items()
                }
            except Exception as exc:
                response["errors"].append({"scope": "dynamic_source", "source": source, "message": str(exc)})

        if source_tables:
            comparison_df = build_controlled_comparison_table(source_tables)
            response["comparison_table"] = dataframe_to_records(comparison_df)
            agreement_report = compute_source_agreement_report(comparison_df, agreement_families, payload.min_overlap)
            response["agreement_report"] = dataframe_to_records(agreement_report)
            response["agreement_ranking"] = dataframe_to_records(summarize_best_and_worst_agreement(agreement_report))

    if "static" in data_types:
        try:
            static_df, static_warnings = extract_static_table_controlled(
                lon=lon,
                lat=lat,
                site_id=payload.site_id,
                static_metric_groups=static_metric_groups,
                topo_buffer_m=payload.topo_buffer_m,
            )
            response["static_table"] = dataframe_to_records(static_df)
            response["warnings"].extend(static_warnings)
        except Exception as exc:
            response["errors"].append({"scope": "static", "message": str(exc)})

    return response
