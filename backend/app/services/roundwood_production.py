from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import requests

from app.schemas import RoundwoodProductionRequest


BASE_CURRENCY = "USD"
UGX_PER_USD = 3_700.0


def usd_from_ugx(value: float) -> float:
    return round(float(value) / UGX_PER_USD, 4)


def money_columns_to_usd(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    out = df.copy()
    for column in columns:
        out[column] = out[column].astype(float).map(usd_from_ugx)
    return out


SECTION_ORDER = [
    "Mensuration",
    "Felling",
    "Extraction",
    "Loading",
    "Haulage",
    "Regulatory & Admin",
    "Miscellaneous",
    "Revenue",
]


STANDARD_EUC_SPEC = {
    "grades": {
        "g1": {"dbh_min": 30.0, "h_min": 2.7},
        "g2": {"dbh_min": 20.0, "h_min": 2.7},
        "g3": {"dbh_min": 15.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 125_000, "g2": 115_000, "g3": 105_000, "reject": 0},
}

STANDARD_PINE_SPEC = {
    "grades": {
        "g1": {"dbh_min": 25.0, "h_min": 2.7},
        "g2": {"dbh_min": 20.0, "h_min": 2.7},
        "g3": {"dbh_min": 15.0, "h_min": 0.0},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 135_000, "g2": 125_000, "g3": 115_000, "reject": 0},
}

PREMIUM_EUC_SPEC = {
    "grades": {
        "g1": {"dbh_min": 30.0, "h_min": 2.7},
        "g2": {"dbh_min": 20.0, "h_min": 2.7},
        "g3": {"dbh_min": 15.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 145_000, "g2": 135_000, "g3": 125_000, "reject": 0},
}

PREMIUM_PINE_SPEC = {
    "grades": {
        "g1": {"dbh_min": 30.0, "h_min": 2.7},
        "g2": {"dbh_min": 20.0, "h_min": 2.7},
        "g3": {"dbh_min": 15.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 175_000, "g2": 165_000, "g3": 155_000, "reject": 0},
}

LARGE_LOG_EUC_SPEC = {
    "grades": {
        "g1": {"dbh_min": 40.0, "h_min": 2.7},
        "g2": {"dbh_min": 30.0, "h_min": 2.7},
        "g3": {"dbh_min": 20.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 125_000, "g2": 120_000, "g3": 115_000, "reject": 0},
}

LARGE_LOG_PINE_SPEC = {
    "grades": {
        "g1": {"dbh_min": 40.0, "h_min": 2.7},
        "g2": {"dbh_min": 30.0, "h_min": 2.7},
        "g3": {"dbh_min": 20.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 175_000, "g2": 165_000, "g3": 155_000, "reject": 0},
}

CFID_EUC_SPEC = {
    "grades": {
        "g1": {"dbh_min": 40.0, "h_min": 2.7},
        "g2": {"dbh_min": 30.0, "h_min": 2.7},
        "g3": {"dbh_min": 20.0, "h_min": 2.7},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 0, "g2": 0, "g3": 0, "reject": 0},
}

CFID_PINE_SPEC = {
    "grades": {
        "g1": {"dbh_min": 14.0, "h_min": 2.6},
        "g2": {"dbh_min": 9.0, "h_min": 2.6},
        "g3": {"dbh_min": 4.0, "h_min": 2.6},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 170_000, "g2": 0, "g3": 0, "reject": 0},
}


def processor(lon: float, lat: float, euc_spec: dict[str, Any], pine_spec: dict[str, Any]):
    return {"lon": lon, "lat": lat, "buyer_specs": {"euc": euc_spec, "pine": pine_spec}}


CHINESE_PROCESSORS = {
    "Shanglong Industry Company": processor(31.6226227, 1.0989088, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "Golden Homes factory": processor(31.894878, -0.138642, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "(Timber Paper) Sino-Uganda Mbale Industrial Park": processor(34.1382243, 1.0758414, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "Evergreen wood": processor(32.4077845, 0.258846, PREMIUM_EUC_SPEC, PREMIUM_PINE_SPEC),
    "Brother wood": processor(32.8081847, 0.2253216, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "Honghai PLY": processor(32.8245749, 0.3714341, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "Zhong Ding Construction Materials": processor(32.36385, 0.4393071, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "Zhong Bang Wood": processor(32.0203333, -0.0235833, LARGE_LOG_EUC_SPEC, LARGE_LOG_PINE_SPEC),
    "Acacia Wood factory": processor(31.36237, 0.658842, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
    "CFID factory": processor(32.2329796, 0.7449337, CFID_EUC_SPEC, CFID_PINE_SPEC),
    "Guo Hau factory": processor(30.444508, -0.582692, STANDARD_EUC_SPEC, STANDARD_PINE_SPEC),
}


def processor_prices_to_usd(processor_db: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for name, data in processor_db.items():
        out[name] = {
            "lon": data["lon"],
            "lat": data["lat"],
            "buyer_specs": {},
        }
        for species, spec in data["buyer_specs"].items():
            out[name]["buyer_specs"][species] = {
                "grades": {
                    grade: dict(values)
                    for grade, values in spec["grades"].items()
                },
                "price_mode": spec["price_mode"],
                "prices": {
                    grade: usd_from_ugx(price)
                    for grade, price in spec["prices"].items()
                },
            }
    return out


CHINESE_PROCESSORS = processor_prices_to_usd(CHINESE_PROCESSORS)


def copy_processor_db() -> dict[str, Any]:
    return {
        name: {
            "lon": float(data["lon"]),
            "lat": float(data["lat"]),
            "buyer_specs": {
                species: {
                    "grades": {
                        grade: dict(values)
                        for grade, values in spec["grades"].items()
                    },
                    "price_mode": spec["price_mode"],
                    "prices": dict(spec["prices"]),
                }
                for species, spec in data["buyer_specs"].items()
            },
        }
        for name, data in CHINESE_PROCESSORS.items()
    }


def buyer_specs_to_rows(processor_db: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for processor_name, data in processor_db.items():
        for species, spec in data["buyer_specs"].items():
            for grade in ["g1", "g2", "g3"]:
                rows.append(
                    {
                        "processor": processor_name,
                        "species": species,
                        "price_mode": spec["price_mode"],
                        "grade": grade,
                        "dbh_min": float(spec["grades"][grade]["dbh_min"]),
                        "h_min": float(spec["grades"][grade]["h_min"]),
                        "price": float(spec["prices"][grade]),
                    }
                )
            rows.append(
                {
                    "processor": processor_name,
                    "species": species,
                    "price_mode": spec["price_mode"],
                    "grade": "reject",
                    "dbh_min": 0.0,
                    "h_min": 0.0,
                    "price": float(spec["prices"].get("reject", 0)),
                }
            )
    return rows


def processor_db_from_buyer_specs(rows: list[dict[str, Any]]) -> dict[str, Any]:
    processor_db = copy_processor_db()
    if not rows:
        return processor_db

    for row in rows:
        processor_name = str(row.get("processor", "")).strip()
        species = str(row.get("species", "")).strip()
        grade = str(row.get("grade", "")).strip().lower()
        if processor_name not in processor_db or species not in {"euc", "pine"} or grade not in {"g1", "g2", "g3", "reject"}:
            continue
        spec = processor_db[processor_name]["buyer_specs"].setdefault(
            species,
            {"grades": {}, "price_mode": "per_tonne", "prices": {"g1": 0, "g2": 0, "g3": 0, "reject": 0}},
        )
        price_mode = str(row.get("price_mode", spec["price_mode"]))
        if price_mode in {"per_m3", "per_tonne"}:
            spec["price_mode"] = price_mode
        spec["prices"][grade] = float(row.get("price", 0) or 0)
        if grade != "reject":
            spec["grades"][grade] = {
                "dbh_min": float(row.get("dbh_min", 0) or 0),
                "h_min": float(row.get("h_min", 0) or 0),
            }
    return processor_db


def quantity_library_to_rows(qty_lib: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    def walk(section: str, node: dict[str, Any], prefix: list[str]) -> None:
        for key, value in node.items():
            if isinstance(value, tuple):
                rows.append(
                    {
                        "section": section,
                        "path": ".".join(prefix + [key]),
                        "qty_min": float(value[0]),
                        "qty_max": float(value[1]),
                    }
                )
            elif isinstance(value, dict):
                walk(section, value, prefix + [key])

    for section, node in qty_lib.items():
        walk(section, node, [])
    return rows


def quantity_library_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    qty_lib = retail_quantity_library()
    if not rows:
        return qty_lib
    for row in rows:
        section = str(row.get("section", "")).strip()
        path = str(row.get("path", "")).strip()
        if section not in qty_lib or not path:
            continue
        parts = path.split(".")
        cursor = qty_lib[section]
        for part in parts[:-1]:
            if part not in cursor or not isinstance(cursor[part], dict):
                cursor[part] = {}
            cursor = cursor[part]
        cursor[parts[-1]] = (float(row.get("qty_min", 0) or 0), float(row.get("qty_max", 0) or 0))
    return qty_lib


def coerce_retail_library_df(rows: list[dict[str, Any]], default: pd.DataFrame, key: str, numeric_columns: list[str]) -> pd.DataFrame:
    if not rows:
        return default.copy()
    df = pd.DataFrame(rows)
    missing = set(default.columns) - set(df.columns)
    if missing:
        raise ValueError(f"{key} library is missing required column(s): {sorted(missing)}")
    df = df[list(default.columns)].copy()
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="raise")
    if df.duplicated(key).any():
        duplicates = df[df.duplicated(key, keep=False)][key].tolist()
        raise ValueError(f"Duplicate {key}(s): {duplicates}")
    return df


def external_get(url: str, **kwargs: Any) -> requests.Response:
    with requests.Session() as session:
        session.trust_env = False
        return session.get(url, **kwargs)


def _clip01(x: float, name: str = "x") -> float:
    if x is None or not np.isfinite(x):
        raise ValueError(f"{name} must be a finite number in [0, 1]. Got: {x}")
    return float(min(1.0, max(0.0, float(x))))


def _lin_interp(minv: float, maxv: float, lam: float) -> float:
    return (1.0 - float(lam)) * float(minv) + float(lam) * float(maxv)


def _effort_q(q_min: float, q_max: float, v: float) -> float:
    return _lin_interp(q_min, q_max, v)


def _prod_q(q_min: float, q_max: float, v: float) -> float:
    return _lin_interp(q_max, q_min, v)


def _ceil(x: float) -> int:
    return int(math.ceil(float(x)))


def _ceil_half(x: float) -> int:
    return int(math.ceil(2.0 * float(x)))


def _require_keys(d: dict[str, Any], keys: list[str], name: str = "scenario") -> None:
    missing = [key for key in keys if key not in d]
    if missing:
        raise KeyError(f"Missing keys in {name}: {missing}")


def equip_label(equipment: str, regime: str) -> str:
    suffix = "Rent" if regime == "rented" else "Maintenance"
    return f"{equipment.replace('_', ' ').title()} {suffix}"


def _safe_pos(x: float, name: str) -> float:
    x = float(x)
    if not np.isfinite(x) or x <= 0:
        raise ValueError(f"{name} must be finite and > 0. Got: {x}")
    return x


def _safe_nonneg(x: float, name: str) -> float:
    x = float(x)
    if not np.isfinite(x) or x < 0:
        raise ValueError(f"{name} must be finite and >= 0. Got: {x}")
    return x


def validate_lon_lat(lon: float, lat: float) -> tuple[float, float]:
    lon = float(lon)
    lat = float(lat)
    if not (-180 <= lon <= 180):
        raise ValueError(f"Longitude must be between -180 and 180. Received {lon}.")
    if not (-90 <= lat <= 90):
        raise ValueError(f"Latitude must be between -90 and 90. Received {lat}.")
    return lon, lat


def retail_labour_categories() -> pd.DataFrame:
    return money_columns_to_usd(
        pd.DataFrame(
        [
            {"labour_code": "L_CHAINSAW_OPERATOR", "desc": "Chainsaw operator", "wage_min": 10_000, "wage_max": 18_000},
            {"labour_code": "L_CHAINSAW_ASSIST", "desc": "Chainsaw assistant", "wage_min": 5_000, "wage_max": 12_000},
            {"labour_code": "L_EXTRACTION_CREW", "desc": "Manual extraction crew", "wage_min": 5_000, "wage_max": 12_000},
            {"labour_code": "L_LOADING_CREW", "desc": "Manual loading crew", "wage_min": 5_000, "wage_max": 12_000},
            {"labour_code": "L_MACHINE_OPERATOR", "desc": "Tractor/loader/truck operator", "wage_min": 10_000, "wage_max": 35_000},
            {"labour_code": "L_HARVESTER_OPERATOR", "desc": "Harvester operator", "wage_min": 25_000, "wage_max": 60_000},
            {"labour_code": "L_FORESTER", "desc": "Professional forester", "wage_min": 25_000, "wage_max": 80_000},
            {"labour_code": "L_MENSURATION_ASSIST", "desc": "Mensuration assistant", "wage_min": 5_000, "wage_max": 12_000},
            {"labour_code": "L_SUPERVISOR", "desc": "Harvest supervisor/clerk", "wage_min": 20_000, "wage_max": 50_000},
        ]
        ),
        ["wage_min", "wage_max"],
    )


def retail_nonlab_items() -> pd.DataFrame:
    return money_columns_to_usd(
        pd.DataFrame(
        [
            {"item_code": "N_NFA_PERMIT", "desc": "Quarterly NFA permit", "unit": "permit", "price_min": 200_000, "price_max": 200_000},
            {"item_code": "N_FUEL_L", "desc": "Diesel/petrol fuel", "unit": "litre", "price_min": 4_500, "price_max": 5_500},
            {"item_code": "N_CHAIN_OIL_L", "desc": "Chainsaw chain oil", "unit": "litre", "price_min": 10_000, "price_max": 25_000},
            {"item_code": "N_CREW_DAYALLOW", "desc": "Crew daily allowance", "unit": "day", "price_min": 5_000, "price_max": 15_000},
            {"item_code": "N_RENT_CHAINSAW", "desc": "Chainsaw rental", "unit": "day", "price_min": 25_000, "price_max": 60_000},
            {"item_code": "N_RENT_TRACTOR", "desc": "Extraction tractor rental", "unit": "day", "price_min": 150_000, "price_max": 350_000},
            {"item_code": "N_RENT_BELL_LOGGER", "desc": "Bell logger/skidder rental", "unit": "day", "price_min": 250_000, "price_max": 600_000},
            {"item_code": "N_RENT_LOADER", "desc": "Loader rental", "unit": "day", "price_min": 200_000, "price_max": 500_000},
            {"item_code": "N_RENT_HARVESTER", "desc": "Harvester rental", "unit": "day", "price_min": 800_000, "price_max": 1_800_000},
            {"item_code": "N_RENT_TRUCK", "desc": "Truck rental", "unit": "day", "price_min": 200_000, "price_max": 500_000},
            {"item_code": "N_MAINT_CHAINSAW", "desc": "Chainsaw maintenance", "unit": "day", "price_min": 3_000, "price_max": 10_000},
            {"item_code": "N_MAINT_TRACTOR", "desc": "Tractor maintenance", "unit": "day", "price_min": 15_000, "price_max": 40_000},
            {"item_code": "N_MAINT_BELL_LOGGER", "desc": "Bell logger maintenance", "unit": "day", "price_min": 25_000, "price_max": 70_000},
            {"item_code": "N_MAINT_LOADER", "desc": "Loader maintenance", "unit": "day", "price_min": 20_000, "price_max": 60_000},
            {"item_code": "N_MAINT_HARVESTER", "desc": "Harvester maintenance", "unit": "day", "price_min": 60_000, "price_max": 150_000},
            {"item_code": "N_MAINT_TRUCK", "desc": "Truck maintenance", "unit": "day", "price_min": 20_000, "price_max": 80_000},
            {"item_code": "N_MISC_LUMPSUM", "desc": "Miscellaneous lump sum", "unit": "lump", "price_min": 0, "price_max": 500_000},
        ]
        ),
        ["price_min", "price_max"],
    )


def retail_quantity_library() -> dict[str, Any]:
    return {
        "mensuration": {
            "forester_days_per_ha": (0.10, 1.0),
            "mensuration_assistant_days_per_ha": (0.00, 1.0),
            "fuel_L_per_ha": (0.0, 5.0),
        },
        "felling": {
            "chainsaw": {
                "stems_per_crew_day": (80, 300),
                "fuel_L_per_crew_day": (3.5, 8.0),
                "chain_oil_L_per_crew_day": (0.3, 1.2),
            },
            "harvester": {
                "stems_per_machine_day": (400, 1_200),
                "fuel_L_per_machine_day": (80, 160),
            },
        },
        "extraction": {
            "manual": {"crew_days_per_ha": (1.0, 4.0), "fuel_L_per_m3": (0.0, 0.0)},
            "tractor": {"machine_op_days_per_ha": (0.4, 1.6), "fuel_L_per_m3": (0.6, 1.8)},
            "bell_logger": {"machine_op_days_per_ha": (0.6, 2.0), "fuel_L_per_m3": (0.8, 2.4)},
        },
        "loading": {
            "manual": {"crew_days_per_trip": (0.5, 1.5)},
            "machine": {"machine_op_days_per_trip": (0.15, 0.6), "fuel_L_per_trip": (4.0, 15.0)},
        },
        "haulage": {
            "machine_op_days_per_trip": (0.15, 0.6),
            "fuel_L_per_km": (0.3, 0.7),
        },
        "regulatory": {
            "permit_ha_covered": (1, 200),
            "supervisor_days_per_ha": (0.0, 0.4),
        },
        "misc": {
            "admin_days_per_ha": (0.0, 0.6),
            "misc_lumpsum_per_ha": (0.0, 1.0),
        },
    }


def validate_controls(ctrl: dict[str, Any]) -> None:
    allowed = {
        "felling_method": {"chainsaw", "harvester"},
        "extraction_method": {"manual", "tractor", "bell_logger"},
        "loading_method": {"manual", "machine"},
        "equipment_regime": {"owned", "rented"},
        "price_mode": {"per_m3", "per_tonne"},
    }
    for key, values in allowed.items():
        if ctrl[key] not in values:
            raise ValueError(f"{key} must be in {values}")


def _make_wage_lookup(labour_df: pd.DataFrame):
    if labour_df.duplicated("labour_code").any():
        duplicates = labour_df[labour_df.duplicated("labour_code", keep=False)]["labour_code"].tolist()
        raise ValueError(f"Duplicate labour_code(s): {duplicates}")

    def wage(labour_code: str, lam_wage: float) -> float:
        row = labour_df.loc[labour_df["labour_code"] == labour_code]
        if row.empty:
            raise KeyError(f"Unknown labour_code: {labour_code}")
        values = row.iloc[0]
        return _lin_interp(values["wage_min"], values["wage_max"], lam_wage)

    return wage


def _make_price_lookup(nonlab_df: pd.DataFrame):
    if nonlab_df.duplicated("item_code").any():
        duplicates = nonlab_df[nonlab_df.duplicated("item_code", keep=False)]["item_code"].tolist()
        raise ValueError(f"Duplicate item_code(s): {duplicates}")

    def price(item_code: str, lam_price: float) -> float:
        row = nonlab_df.loc[nonlab_df["item_code"] == item_code]
        if row.empty:
            raise KeyError(f"Unknown item_code: {item_code}")
        values = row.iloc[0]
        return _lin_interp(values["price_min"], values["price_max"], lam_price)

    return price


def labour_cost(days: float, labour_code: str, wage_fn, lam_wage: float, allowance_price: float) -> float:
    wage = wage_fn(labour_code, lam_wage)
    return _ceil(days) * wage + 0.5 * _ceil_half(days) * allowance_price


def equip_day_cost(days: float, equipment: str, regime: str, price_fn, lam_price: float) -> float:
    code_map = {
        ("chainsaw", "rented"): "N_RENT_CHAINSAW",
        ("tractor", "rented"): "N_RENT_TRACTOR",
        ("bell_logger", "rented"): "N_RENT_BELL_LOGGER",
        ("loader", "rented"): "N_RENT_LOADER",
        ("harvester", "rented"): "N_RENT_HARVESTER",
        ("truck", "rented"): "N_RENT_TRUCK",
        ("chainsaw", "owned"): "N_MAINT_CHAINSAW",
        ("tractor", "owned"): "N_MAINT_TRACTOR",
        ("bell_logger", "owned"): "N_MAINT_BELL_LOGGER",
        ("loader", "owned"): "N_MAINT_LOADER",
        ("harvester", "owned"): "N_MAINT_HARVESTER",
        ("truck", "owned"): "N_MAINT_TRUCK",
    }
    key = (equipment, regime)
    if key not in code_map:
        raise KeyError(f"Unknown equipment/regime combination: {key}")
    return _ceil(days) * price_fn(code_map[key], lam_price)


def _tree_volume_m3(dbh_cm: np.ndarray, h_m: np.ndarray, form_factor: float) -> np.ndarray:
    dbh_m = dbh_cm / 100.0
    basal_area = math.pi * (dbh_m / 2.0) ** 2
    return float(form_factor) * basal_area * h_m


def _draw_normal_pos(rng, mean: float, std: float, n: int, min_val: float, name: str) -> np.ndarray:
    mean = float(mean)
    std = float(std)
    if std < 0:
        raise ValueError(f"{name} std must be >= 0. Got: {std}")
    values = rng.normal(loc=mean, scale=std, size=int(n))
    values = np.where(np.isfinite(values), values, mean)
    return np.maximum(values, float(min_val))


def _assign_grade(dbh_cm: float, h_m: float, thresholds: dict[str, float]) -> str:
    if dbh_cm >= thresholds["g1_dbh_min"] and h_m >= thresholds["g1_h_min"]:
        return "G1"
    if dbh_cm >= thresholds["g2_dbh_min"] and h_m >= thresholds["g2_h_min"]:
        return "G2"
    if dbh_cm >= thresholds["g3_dbh_min"] and h_m >= thresholds["g3_h_min"]:
        return "G3"
    return "Reject"


def simulate_grade_yields(
    scenario: dict[str, Any],
    *,
    form_factor: float = 0.45,
    n_draws: int = 50_000,
    rng_seed: int = 7,
) -> dict[str, Any]:
    area_ha = float(scenario.get("harvest_area_ha", 1.0))
    stems_per_ha = _safe_pos(scenario["stems_per_ha"], "stems_per_ha")
    total_stems = int(round(area_ha * stems_per_ha))
    if total_stems <= 0:
        raise ValueError("Total stems must be > 0.")

    thresholds = {
        "g1_dbh_min": float(scenario.get("g1_dbh_min", 18.0)),
        "g1_h_min": float(scenario.get("g1_h_min", 20.0)),
        "g2_dbh_min": float(scenario.get("g2_dbh_min", 14.0)),
        "g2_h_min": float(scenario.get("g2_h_min", 18.0)),
        "g3_dbh_min": float(scenario.get("g3_dbh_min", 10.0)),
        "g3_h_min": float(scenario.get("g3_h_min", 14.0)),
    }
    losses = {
        "G1": float(scenario.get("loss_g1", 0.0)),
        "G2": float(scenario.get("loss_g2", 0.0)),
        "G3": float(scenario.get("loss_g3", 0.0)),
        "Reject": float(scenario.get("loss_reject", 0.0)),
    }
    for grade, loss in losses.items():
        if loss < 0 or loss > 1:
            raise ValueError(f"{grade} loss must be in [0, 1]. Got: {loss}")

    rng = np.random.default_rng(int(rng_seed))
    n = int(min(max(1000, n_draws), max(1000, total_stems)))

    dbh = _draw_normal_pos(rng, _safe_pos(scenario["mean_tree_dbh"], "mean_tree_dbh"), _safe_nonneg(scenario["std_tree_dbh"], "std_tree_dbh"), n, 1.0, "DBH(cm)")
    height = _draw_normal_pos(rng, _safe_pos(scenario["mean_tree_h"], "mean_tree_h"), _safe_nonneg(scenario["std_tree_h"], "std_tree_h"), n, 1.0, "H(m)")
    density = _draw_normal_pos(rng, _safe_pos(scenario["mean_tree_density"], "mean_tree_density"), _safe_nonneg(scenario["std_tree_density"], "std_tree_density"), n, 0.05, "density(t/m3)")

    tree_volume = np.maximum(_tree_volume_m3(dbh, height, form_factor=form_factor), 0.0)
    grades = np.array([_assign_grade(float(d), float(h), thresholds) for d, h in zip(dbh, height)], dtype=object)

    volume_by_grade = {grade: 0.0 for grade in ["G1", "G2", "G3", "Reject"]}
    tonnes_by_grade = {grade: 0.0 for grade in ["G1", "G2", "G3", "Reject"]}
    stems_by_grade = {grade: 0.0 for grade in ["G1", "G2", "G3", "Reject"]}

    scale = float(total_stems) / float(n)
    for grade in volume_by_grade:
        mask = grades == grade
        volume_by_grade[grade] = float(np.sum(tree_volume[mask])) * (1.0 - losses[grade]) * scale
        tonnes_by_grade[grade] = float(np.sum(density[mask] * tree_volume[mask])) * (1.0 - losses[grade]) * scale
        stems_by_grade[grade] = float(np.sum(mask)) * scale

    total_volume = sum(volume_by_grade.values())
    total_tonnes = sum(tonnes_by_grade.values())

    return {
        "V_del_by_grade": volume_by_grade,
        "T_del_by_grade": tonnes_by_grade,
        "stems_by_grade": stems_by_grade,
        "V_tot_del": total_volume,
        "T_tot_del": total_tonnes,
        "mean_tree_volume_m3": total_volume / float(total_stems),
        "N_tot": total_stems,
    }


def compute_retail_cost_breakdown(
    scenario: dict[str, Any],
    labour_df: pd.DataFrame,
    nonlab_df: pd.DataFrame,
    qty_lib: dict[str, Any],
    *,
    V_tot_m3: float,
    N_tot: float,
) -> pd.DataFrame:
    _require_keys(
        scenario,
        [
            "felling_method",
            "extraction_method",
            "loading_method",
            "equipment_regime",
            "v_mensuration",
            "v_felling",
            "v_extraction",
            "v_loading",
            "v_regulatory",
            "v_misc",
            "lambda_wage",
            "lambda_price",
            "p_allowance",
            "p_permit",
        ],
    )
    validate_controls(scenario)

    area_ha = float(scenario.get("harvest_area_ha", 1.0))
    if area_ha <= 0:
        raise ValueError("harvest_area_ha must be > 0.")

    wage_fn = _make_wage_lookup(labour_df)
    price_fn = _make_price_lookup(nonlab_df)
    lambda_wage = _clip01(scenario["lambda_wage"], "lambda_wage")
    lambda_price = _clip01(scenario["lambda_price"], "lambda_price")
    allowance_row = nonlab_df.loc[nonlab_df.item_code == "N_CREW_DAYALLOW"].iloc[0]
    allowance_price = _lin_interp(allowance_row.price_min, allowance_row.price_max, _clip01(scenario["p_allowance"], "p_allowance"))

    v_mens = _clip01(scenario["v_mensuration"], "v_mensuration")
    v_fell = _clip01(scenario["v_felling"], "v_felling")
    v_extr = _clip01(scenario["v_extraction"], "v_extraction")
    v_load = _clip01(scenario["v_loading"], "v_loading")
    v_misc = _clip01(scenario["v_misc"], "v_misc")
    p_permit = _clip01(scenario["p_permit"], "p_permit")
    regime = scenario["equipment_regime"]

    rows: list[dict[str, Any]] = []

    def add(section: str, sub_item: str, cost: float) -> None:
        rows.append({"section": section, "sub_item": sub_item, "cost": float(cost)})

    q_m = qty_lib["mensuration"]
    add("Mensuration", "Forester labour", labour_cost(area_ha * _effort_q(*q_m["forester_days_per_ha"], v_mens), "L_FORESTER", wage_fn, lambda_wage, allowance_price))
    add("Mensuration", "Assistant labour", labour_cost(area_ha * _effort_q(*q_m["mensuration_assistant_days_per_ha"], v_mens), "L_MENSURATION_ASSIST", wage_fn, lambda_wage, allowance_price))
    add("Mensuration", "Fuel", area_ha * _effort_q(*q_m["fuel_L_per_ha"], v_mens) * price_fn("N_FUEL_L", lambda_price))

    q_f = qty_lib["felling"][scenario["felling_method"]]
    if scenario["felling_method"] == "chainsaw":
        crew_days = float(N_tot) / _prod_q(*q_f["stems_per_crew_day"], v_fell)
        add("Felling", "Chainsaw operator labour", labour_cost(crew_days, "L_CHAINSAW_OPERATOR", wage_fn, lambda_wage, allowance_price))
        add("Felling", "Chainsaw assistant labour", labour_cost(crew_days, "L_CHAINSAW_ASSIST", wage_fn, lambda_wage, allowance_price))
        add("Felling", equip_label("chainsaw", regime), equip_day_cost(crew_days, "chainsaw", regime, price_fn, lambda_price))
        add("Felling", "Fuel", crew_days * _effort_q(*q_f["fuel_L_per_crew_day"], v_fell) * price_fn("N_FUEL_L", lambda_price))
        add("Felling", "Chain oil", crew_days * _effort_q(*q_f["chain_oil_L_per_crew_day"], v_fell) * price_fn("N_CHAIN_OIL_L", lambda_price))
    else:
        machine_days = float(N_tot) / _prod_q(*q_f["stems_per_machine_day"], v_fell)
        add("Felling", "Harvester operator labour", labour_cost(machine_days, "L_HARVESTER_OPERATOR", wage_fn, lambda_wage, allowance_price))
        add("Felling", equip_label("harvester", regime), equip_day_cost(machine_days, "harvester", regime, price_fn, lambda_price))
        add("Felling", "Fuel", machine_days * _effort_q(*q_f["fuel_L_per_machine_day"], v_fell) * price_fn("N_FUEL_L", lambda_price))

    q_e = qty_lib["extraction"][scenario["extraction_method"]]
    if scenario["extraction_method"] == "manual":
        add("Extraction", "Manual extraction labour", labour_cost(area_ha * _effort_q(*q_e["crew_days_per_ha"], v_extr), "L_EXTRACTION_CREW", wage_fn, lambda_wage, allowance_price))
    else:
        op_days = area_ha * _effort_q(*q_e["machine_op_days_per_ha"], v_extr)
        add("Extraction", "Machine operator labour", labour_cost(op_days, "L_MACHINE_OPERATOR", wage_fn, lambda_wage, allowance_price))
        add("Extraction", equip_label(scenario["extraction_method"], regime), equip_day_cost(op_days, scenario["extraction_method"], regime, price_fn, lambda_price))
        add("Extraction", "Fuel", float(V_tot_m3) * _effort_q(*q_e["fuel_L_per_m3"], v_extr) * price_fn("N_FUEL_L", lambda_price))

    q_l = qty_lib["loading"][scenario["loading_method"]]
    payload_ref = max(float(scenario.get("payload_direct_m3", scenario.get("payload_node_to_factory_m3", 10.0))), 1e-9)
    trips_ref = float(math.ceil(float(V_tot_m3) / payload_ref))
    if scenario["loading_method"] == "manual":
        crew_days = trips_ref * _effort_q(*q_l["crew_days_per_trip"], v_load)
        add("Loading", "Manual loading labour", labour_cost(crew_days, "L_LOADING_CREW", wage_fn, lambda_wage, allowance_price))
    else:
        op_days = trips_ref * _effort_q(*q_l["machine_op_days_per_trip"], v_load)
        add("Loading", "Machine operator labour", labour_cost(op_days, "L_MACHINE_OPERATOR", wage_fn, lambda_wage, allowance_price))
        add("Loading", equip_label("loader", regime), equip_day_cost(op_days, "loader", regime, price_fn, lambda_price))
        add("Loading", "Fuel", trips_ref * _effort_q(*q_l["fuel_L_per_trip"], v_load) * price_fn("N_FUEL_L", lambda_price))

    q_r = qty_lib["regulatory"]
    ha_per_permit = _lin_interp(q_r["permit_ha_covered"][1], q_r["permit_ha_covered"][0], p_permit)
    add("Regulatory & Admin", "Permit fees", math.ceil(area_ha / ha_per_permit) * price_fn("N_NFA_PERMIT", lambda_price))
    add("Regulatory & Admin", "Supervisor labour", labour_cost(area_ha * _lin_interp(*q_r["supervisor_days_per_ha"], p_permit), "L_SUPERVISOR", wage_fn, lambda_wage, allowance_price))

    q_x = qty_lib["misc"]
    add("Miscellaneous", "Admin/support labour", labour_cost(area_ha * _effort_q(*q_x["admin_days_per_ha"], v_misc), "L_SUPERVISOR", wage_fn, lambda_wage, allowance_price))
    add("Miscellaneous", "Miscellaneous lump sum", area_ha * _effort_q(*q_x["misc_lumpsum_per_ha"], v_misc) * price_fn("N_MISC_LUMPSUM", lambda_price))

    df = pd.DataFrame(rows)
    df["section"] = pd.Categorical(df["section"], categories=SECTION_ORDER, ordered=True)
    return df.sort_values(["section", "cost"], ascending=[True, False]).reset_index(drop=True)


def add_haulage_costs(
    scenario: dict[str, Any],
    V_tot_m3: float,
    qty_lib: dict[str, Any],
    wage_fn,
    price_fn,
    lambda_wage: float,
    lambda_price: float,
    allowance_price: float,
    regime: str,
    add,
) -> None:
    v_haulage = _clip01(scenario["v_haulage"], "v_haulage")
    q_h = qty_lib["haulage"]

    def haul_leg(label: str, distance_km: float, payload_m3: float) -> None:
        payload_m3 = max(float(payload_m3), 1e-9)
        trips = math.ceil(float(V_tot_m3) / payload_m3)
        op_days = trips * _effort_q(*q_h["machine_op_days_per_trip"], v_haulage)
        fuel_l = (trips * float(distance_km)) * _effort_q(*q_h["fuel_L_per_km"], v_haulage)
        add("Haulage", f"Truck operator labour ({label})", labour_cost(op_days, "L_MACHINE_OPERATOR", wage_fn, lambda_wage, allowance_price))
        add("Haulage", f"{equip_label('truck', regime)} ({label})", equip_day_cost(op_days, "truck", regime, price_fn, lambda_price))
        add("Haulage", f"Fuel ({label})", fuel_l * price_fn("N_FUEL_L", lambda_price))

    if int(scenario.get("agg_node", 0)) == 1:
        _require_keys(scenario, ["forest_to_node_km", "node_to_factory_km", "payload_forest_to_node_m3", "payload_node_to_factory_m3"], "scenario (aggregation)")
        haul_leg("forest to node", scenario["forest_to_node_km"], scenario["payload_forest_to_node_m3"])
        haul_leg("node to factory", scenario["node_to_factory_km"], scenario["payload_node_to_factory_m3"])
    else:
        _require_keys(scenario, ["factory_distance_km", "payload_direct_m3"], "scenario (direct)")
        haul_leg("direct", scenario["factory_distance_km"], scenario["payload_direct_m3"])


def compute_grade_revenue_breakdown(scenario: dict[str, Any], sim: dict[str, Any]) -> pd.DataFrame:
    price_mode = scenario["price_mode"]
    prices = {
        "G1": float(scenario.get("price_g1", 0.0)),
        "G2": float(scenario.get("price_g2", 0.0)),
        "G3": float(scenario.get("price_g3", 0.0)),
        "Reject": float(scenario.get("price_reject", 0.0)),
    }
    for grade, price in prices.items():
        if price < 0:
            raise ValueError(f"{grade} price must be >= 0. Got: {price}")

    qty_by = sim["V_del_by_grade"] if price_mode == "per_m3" else sim["T_del_by_grade"]
    unit = "m3" if price_mode == "per_m3" else "tonne"
    price_col = "price_usd_per_m3" if price_mode == "per_m3" else "price_usd_per_tonne"

    rows = []
    for grade in ["G1", "G2", "G3", "Reject"]:
        qty = float(qty_by.get(grade, 0.0))
        rows.append(
            {
                "section": "Revenue",
                "sub_item": f"Roundwood sales ({grade})",
                "grade": grade,
                "qty_delivered": qty,
                "unit": unit,
                price_col: prices[grade],
                "cashflow": qty * prices[grade],
            }
        )
    return pd.DataFrame(rows)


def compute_hh_grade_cashflow(
    scenario: dict[str, Any],
    labour_df: pd.DataFrame,
    nonlab_df: pd.DataFrame,
    qty_lib: dict[str, Any],
    *,
    form_factor: float = 0.45,
    n_draws: int = 50_000,
    rng_seed: int = 7,
) -> dict[str, Any]:
    _require_keys(
        scenario,
        [
            "felling_method",
            "extraction_method",
            "loading_method",
            "equipment_regime",
            "v_mensuration",
            "v_felling",
            "v_extraction",
            "v_loading",
            "v_haulage",
            "v_regulatory",
            "v_misc",
            "lambda_wage",
            "lambda_price",
            "p_allowance",
            "p_permit",
            "stems_per_ha",
            "mean_tree_dbh",
            "mean_tree_h",
            "std_tree_dbh",
            "std_tree_h",
            "mean_tree_density",
            "std_tree_density",
            "price_mode",
            "price_g1",
            "price_g2",
            "price_g3",
            "price_reject",
            "agg_node",
        ],
    )
    validate_controls(scenario)

    sim = simulate_grade_yields(scenario, form_factor=form_factor, n_draws=n_draws, rng_seed=rng_seed)
    total_volume_m3 = float(sim["V_tot_del"])
    total_stems = float(sim["N_tot"])

    wage_fn = _make_wage_lookup(labour_df)
    price_fn = _make_price_lookup(nonlab_df)
    lambda_wage = _clip01(scenario["lambda_wage"], "lambda_wage")
    lambda_price = _clip01(scenario["lambda_price"], "lambda_price")
    allowance_row = nonlab_df.loc[nonlab_df.item_code == "N_CREW_DAYALLOW"].iloc[0]
    allowance_price = _lin_interp(allowance_row.price_min, allowance_row.price_max, _clip01(scenario["p_allowance"], "p_allowance"))

    cost_df = compute_retail_cost_breakdown(
        scenario=scenario,
        labour_df=labour_df,
        nonlab_df=nonlab_df,
        qty_lib=qty_lib,
        V_tot_m3=total_volume_m3,
        N_tot=total_stems,
    )

    rows = cost_df.to_dict("records")

    def add(section: str, sub_item: str, cost: float) -> None:
        rows.append({"section": section, "sub_item": sub_item, "cost": float(cost)})

    add_haulage_costs(
        scenario=scenario,
        V_tot_m3=total_volume_m3,
        qty_lib=qty_lib,
        wage_fn=wage_fn,
        price_fn=price_fn,
        lambda_wage=lambda_wage,
        lambda_price=lambda_price,
        allowance_price=allowance_price,
        regime=scenario["equipment_regime"],
        add=add,
    )
    cost_df = pd.DataFrame(rows)
    cost_df["section"] = pd.Categorical(cost_df["section"], categories=SECTION_ORDER, ordered=True)
    cost_df = cost_df.sort_values(["section", "cost"], ascending=[True, False]).reset_index(drop=True)

    revenue_df = compute_grade_revenue_breakdown(scenario, sim)
    cost_cf = cost_df.copy()
    cost_cf["cashflow"] = -cost_cf["cost"].astype(float)
    cost_cf = cost_cf[["section", "sub_item", "cashflow"]]
    revenue_cf = revenue_df[["section", "sub_item", "cashflow"]].copy()
    cashflow_df = pd.concat([cost_cf, revenue_cf], ignore_index=True)
    cashflow_df["section"] = pd.Categorical(cashflow_df["section"], categories=SECTION_ORDER, ordered=True)
    cashflow_df = cashflow_df.sort_values(["section", "cashflow"], ascending=[True, True]).reset_index(drop=True)

    return {
        "cost_df": cost_df,
        "revenue_df": revenue_df,
        "cashflow_df": cashflow_df,
        "sim": sim,
        "profit_usd": float(cashflow_df["cashflow"].sum()),
    }


def dataframe_to_records(df: pd.DataFrame | None, digits: int = 2) -> list[dict[str, Any]]:
    if df is None or df.empty:
        return []
    out = df.copy()
    for column in out.columns:
        if isinstance(out[column].dtype, pd.CategoricalDtype):
            out[column] = out[column].astype(str)
    out = out.replace({np.nan: None, np.inf: None, -np.inf: None})
    for column in out.columns:
        if pd.api.types.is_float_dtype(out[column]):
            out[column] = out[column].map(lambda value: round(float(value), digits) if value is not None else None)
    return out.to_dict(orient="records")


def roundwood_production_default_library() -> dict[str, Any]:
    processor_db = copy_processor_db()
    return {
        "base_currency": BASE_CURRENCY,
        "library": {
            "processor_catalog": processor_catalog(processor_db),
            "buyer_specs": buyer_specs_to_rows(processor_db),
            "labour_categories": dataframe_to_records(retail_labour_categories()),
            "non_labour_items": dataframe_to_records(retail_nonlab_items()),
            "quantity_library": quantity_library_to_rows(retail_quantity_library()),
            "section_order": SECTION_ORDER,
        },
    }


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    earth_radius_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def processor_catalog(processor_db: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    db = processor_db or CHINESE_PROCESSORS
    rows = []
    for name, data in db.items():
        rows.append(
            {
                "name": name,
                "lon": data["lon"],
                "lat": data["lat"],
                "species": sorted(data["buyer_specs"].keys()),
            }
        )
    return rows


def osrm_route(
    lon1: float,
    lat1: float,
    lon2: float,
    lat2: float,
    timeout: int = 20,
) -> dict[str, Any]:
    response = external_get(
        "https://router.project-osrm.org/route/v1/driving/"
        f"{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson",
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    routes = payload.get("routes", [])
    if not routes:
        raise ValueError("OSRM returned no route.")

    route = routes[0]
    coords = route.get("geometry", {}).get("coordinates", [])
    if not coords:
        raise ValueError("OSRM returned a route without geometry.")

    route_latlon = [[float(lat), float(lon)] for lon, lat in coords]
    return {
        "distance_km": float(route["distance"]) / 1000.0,
        "duration_min": float(route["duration"]) / 60.0,
        "route_latlon": route_latlon,
    }


def nearest_processors(
    payload: RoundwoodProductionRequest,
    processor_db: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    db = processor_db or CHINESE_PROCESSORS
    lon, lat = validate_lon_lat(payload.lon, payload.lat)
    requested_names = [name for name in payload.processor_names if name]
    unknown = [name for name in requested_names if name not in db]
    warnings = [f"Unknown processor skipped: {name}" for name in unknown]
    allowed_names = set(requested_names) - set(unknown) if requested_names else set(db.keys())

    straight_line_candidates = []
    for name, data in db.items():
        if name not in allowed_names:
            continue
        straight_km = haversine_km(lon, lat, data["lon"], data["lat"])
        straight_line_candidates.append(
            {
                "name": name,
                "lon": data["lon"],
                "lat": data["lat"],
                "straight_line_km": straight_km,
                "buyer_specs": data["buyer_specs"],
            }
        )

    straight_line_candidates.sort(key=lambda row: row["straight_line_km"])
    if requested_names:
        routing_candidates = straight_line_candidates
    else:
        routing_candidates = straight_line_candidates[: min(len(straight_line_candidates), 12)]

    candidates = []
    for candidate in routing_candidates:
        try:
            routed = osrm_route(lon, lat, candidate["lon"], candidate["lat"])
            candidates.append(
                {
                    **candidate,
                    "road_km": routed["distance_km"],
                    "duration_min": routed["duration_min"],
                    "route_latlon": routed["route_latlon"],
                    "route_source": "osrm",
                }
            )
        except Exception as exc:
            fallback_road_km = candidate["straight_line_km"] * payload.road_distance_factor
            warnings.append(
                f"Routing fallback for {candidate['name']}: {exc}"
            )
            candidates.append(
                {
                    **candidate,
                    "road_km": fallback_road_km,
                    "duration_min": None,
                    "route_latlon": [[lat, lon], [candidate["lat"], candidate["lon"]]],
                    "route_source": "fallback_distance_factor",
                }
            )

    candidates.sort(key=lambda row: row["road_km"])
    if not requested_names:
        candidates = candidates[: payload.processor_count]
    if not candidates:
        raise ValueError("No valid processors were available for this request.")
    return candidates, warnings


def _species_specs_to_scenario_overrides(spec: dict[str, Any]) -> dict[str, Any]:
    out = {
        "price_mode": spec["price_mode"],
        "price_g1": float(spec["prices"]["g1"]),
        "price_g2": float(spec["prices"]["g2"]),
        "price_g3": float(spec["prices"]["g3"]),
        "price_reject": float(spec["prices"]["reject"]),
    }
    for grade in ["g1", "g2", "g3"]:
        out[f"{grade}_dbh_min"] = float(spec["grades"][grade]["dbh_min"])
        out[f"{grade}_h_min"] = float(spec["grades"][grade]["h_min"])
    return out


def _scenario_from_payload(payload: RoundwoodProductionRequest) -> dict[str, Any]:
    return {
        "felling_method": payload.felling_method,
        "extraction_method": payload.extraction_method,
        "loading_method": payload.loading_method,
        "equipment_regime": payload.equipment_regime,
        "v_mensuration": payload.v_mensuration,
        "v_felling": payload.v_felling,
        "v_extraction": payload.v_extraction,
        "v_loading": payload.v_loading,
        "v_haulage": payload.v_haulage,
        "v_regulatory": payload.v_regulatory,
        "v_misc": payload.v_misc,
        "lambda_wage": payload.lambda_wage,
        "lambda_price": payload.lambda_price,
        "p_allowance": payload.p_allowance,
        "p_permit": payload.p_permit,
        "harvest_area_ha": payload.harvest_area_ha,
        "species": payload.species,
        "stems_per_ha": payload.stems_per_ha,
        "mean_tree_dbh": payload.mean_tree_dbh,
        "std_tree_dbh": payload.std_tree_dbh,
        "mean_tree_h": payload.mean_tree_h,
        "std_tree_h": payload.std_tree_h,
        "mean_tree_density": payload.mean_tree_density,
        "std_tree_density": payload.std_tree_density,
        "g1_dbh_min": payload.g1_dbh_min,
        "g1_h_min": payload.g1_h_min,
        "g2_dbh_min": payload.g2_dbh_min,
        "g2_h_min": payload.g2_h_min,
        "g3_dbh_min": payload.g3_dbh_min,
        "g3_h_min": payload.g3_h_min,
        "loss_g1": payload.loss_g1,
        "loss_g2": payload.loss_g2,
        "loss_g3": payload.loss_g3,
        "loss_reject": payload.loss_reject,
        "price_mode": payload.price_mode,
        "price_g1": payload.price_g1,
        "price_g2": payload.price_g2,
        "price_g3": payload.price_g3,
        "price_reject": payload.price_reject,
        "agg_node": 1 if payload.haulage_mode == "aggregation" else 0,
        "forest_to_node_km": payload.forest_to_node_km,
        "payload_direct_m3": payload.payload_direct_m3,
        "payload_forest_to_node_m3": payload.payload_forest_to_node_m3,
        "payload_node_to_factory_m3": payload.payload_node_to_factory_m3,
    }


def _apply_processor_distance(scenario: dict[str, Any], road_km: float) -> dict[str, Any]:
    if int(scenario.get("agg_node", 0)) == 1:
        scenario["node_to_factory_km"] = float(road_km)
    else:
        scenario["factory_distance_km"] = float(road_km)
    return scenario


def _grade_rows(scenario: dict[str, Any], sim: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    price_mode = scenario["price_mode"]
    revenue_quantity = sim["V_del_by_grade"] if price_mode == "per_m3" else sim["T_del_by_grade"]
    unit = "m3" if price_mode == "per_m3" else "tonne"
    for grade in ["G1", "G2", "G3", "Reject"]:
        key = grade.lower()
        price_key = "price_reject" if grade == "Reject" else f"price_{key}"
        qty = float(revenue_quantity.get(grade, 0.0))
        rows.append(
            {
                "grade": grade,
                "stems": sim["stems_by_grade"].get(grade, 0.0),
                "delivered_m3": sim["V_del_by_grade"].get(grade, 0.0),
                "delivered_tonnes": sim["T_del_by_grade"].get(grade, 0.0),
                "revenue_qty": qty,
                "revenue_unit": unit,
                "price": float(scenario.get(price_key, 0.0)),
                "revenue": qty * float(scenario.get(price_key, 0.0)),
            }
        )
    return rows


def _section_summary(cost_df: pd.DataFrame, cashflow_df: pd.DataFrame) -> list[dict[str, Any]]:
    rows = []
    for section in SECTION_ORDER:
        cost = float(cost_df.loc[cost_df["section"].astype(str) == section, "cost"].sum())
        cashflow = float(cashflow_df.loc[cashflow_df["section"].astype(str) == section, "cashflow"].sum())
        revenue = cashflow if section == "Revenue" else 0.0
        if cost != 0 or cashflow != 0 or revenue != 0:
            rows.append({"section": section, "cost": cost, "revenue": revenue, "cashflow": cashflow})
    return rows


def _round_value(value: Any, digits: int = 2) -> Any:
    if isinstance(value, (float, np.floating)):
        if not np.isfinite(value):
            return None
        return round(float(value), digits)
    if isinstance(value, (int, np.integer)):
        return int(value)
    return value


def _round_records(rows: list[dict[str, Any]], digits: int = 2) -> list[dict[str, Any]]:
    return [{key: _round_value(value, digits) for key, value in row.items()} for row in rows]


def _result_for_processor(
    payload: RoundwoodProductionRequest,
    processor_row: dict[str, Any],
    index: int,
    labour_df: pd.DataFrame,
    nonlab_df: pd.DataFrame,
    qty_lib: dict[str, Any],
) -> dict[str, Any] | None:
    scenario = _scenario_from_payload(payload)
    warning = None
    spec = processor_row["buyer_specs"].get(payload.species)

    if payload.use_processor_specs:
        if spec is None:
            return None
        scenario.update(_species_specs_to_scenario_overrides(spec))
    else:
        spec = {
            "price_mode": scenario["price_mode"],
            "prices": {
                "g1": scenario["price_g1"],
                "g2": scenario["price_g2"],
                "g3": scenario["price_g3"],
                "reject": scenario["price_reject"],
            },
            "grades": {
                "g1": {"dbh_min": scenario["g1_dbh_min"], "h_min": scenario["g1_h_min"]},
                "g2": {"dbh_min": scenario["g2_dbh_min"], "h_min": scenario["g2_h_min"]},
                "g3": {"dbh_min": scenario["g3_dbh_min"], "h_min": scenario["g3_h_min"]},
            },
        }
        warning = "Custom buyer specs were used instead of processor-specific specs."

    _apply_processor_distance(scenario, processor_row["road_km"])
    out = compute_hh_grade_cashflow(
        scenario=scenario,
        labour_df=labour_df,
        nonlab_df=nonlab_df,
        qty_lib=qty_lib,
        form_factor=payload.form_factor,
        n_draws=payload.n_draws,
        rng_seed=payload.rng_seed + index,
    )

    cost_df = out["cost_df"]
    revenue_df = out["revenue_df"]
    cashflow_df = out["cashflow_df"]
    sim = out["sim"]
    total_cost = float(cost_df["cost"].sum())
    total_revenue = float(revenue_df["cashflow"].sum())
    profit = float(out["profit_usd"])

    return {
        "processor": processor_row["name"],
        "processor_lat": processor_row["lat"],
        "processor_lon": processor_row["lon"],
        "species": payload.species,
        "straight_line_km": round(float(processor_row["straight_line_km"]), 2),
        "road_km": round(float(processor_row["road_km"]), 2),
        "duration_min": round(float(processor_row["duration_min"]), 1)
        if processor_row["duration_min"] is not None
        else None,
        "route_source": processor_row["route_source"],
        "route_latlon": processor_row["route_latlon"],
        "distance_method": (
            "Road distance and traced route came from OSRM, matching the notebook workflow."
            if processor_row["route_source"] == "osrm"
            else "Routing fell back to a straight-line estimate multiplied by the fallback road factor."
        ),
        "warning": warning,
        "buyer_spec": spec,
        "scenario": scenario,
        "metrics": {
            "profit_usd": round(profit, 2),
            "total_cost_usd": round(total_cost, 2),
            "total_revenue_usd": round(total_revenue, 2),
            "margin_pct": round((profit / total_revenue) * 100, 2) if total_revenue else None,
            "delivered_volume_m3": round(float(sim["V_tot_del"]), 2),
            "delivered_tonnes": round(float(sim["T_tot_del"]), 2),
            "total_stems": int(sim["N_tot"]),
            "mean_tree_volume_m3": round(float(sim["mean_tree_volume_m3"]), 4),
        },
        "grade_rows": _round_records(_grade_rows(scenario, sim), 2),
        "section_summary": _round_records(_section_summary(cost_df, cashflow_df), 2),
        "cost_rows": dataframe_to_records(cost_df),
        "revenue_rows": dataframe_to_records(revenue_df),
        "cashflow_rows": dataframe_to_records(cashflow_df),
    }


def build_assumptions(payload: RoundwoodProductionRequest) -> list[str]:
    distance_text = (
        "Aggregation haulage uses the selected forest-to-node distance plus map-derived node-to-factory distance."
        if payload.haulage_mode == "aggregation"
        else "Direct haulage uses the map-derived forest-to-factory distance."
    )
    return [
        "Roundwood costs follow the notebook H&H operation library: mensuration, felling, extraction, loading, haulage, regulatory/admin, and miscellaneous blocks.",
        "Merchantable volume and tonnes are simulated from DBH, height, and density distributions, then assigned to buyer grades by DBH and height thresholds.",
        "Processor-specific buyer specs override grade thresholds and USD prices when enabled.",
        distance_text,
        "Road distance and route geometry are requested from OSRM first; the fallback road factor is only used if routing is unavailable.",
    ]


def run_roundwood_production(payload: RoundwoodProductionRequest) -> dict[str, Any]:
    lon, lat = validate_lon_lat(payload.lon, payload.lat)
    processor_db = processor_db_from_buyer_specs(payload.buyer_specs)
    processors, warnings = nearest_processors(payload, processor_db)
    labour_df = coerce_retail_library_df(
        payload.labour_categories,
        retail_labour_categories(),
        "labour_code",
        ["wage_min", "wage_max"],
    )
    nonlab_df = coerce_retail_library_df(
        payload.non_labour_items,
        retail_nonlab_items(),
        "item_code",
        ["price_min", "price_max"],
    )
    qty_lib = quantity_library_from_rows(payload.quantity_library)

    processor_results = []
    for index, processor_row in enumerate(processors, start=1):
        result = _result_for_processor(payload, processor_row, index, labour_df, nonlab_df, qty_lib)
        if result is None:
            warnings.append(f"{processor_row['name']} skipped because it has no buyer specs for {payload.species}.")
            continue
        if result["warning"]:
            warnings.append(f"{processor_row['name']}: {result['warning']}")
        processor_results.append(result)

    processor_results.sort(key=lambda row: row["metrics"]["profit_usd"], reverse=True)
    if not processor_results:
        raise ValueError("No processor scenarios could be run with the selected species and inputs.")

    rankings = [
        {
            "rank": index,
            "processor": row["processor"],
            "road_km": row["road_km"],
            "profit_usd": row["metrics"]["profit_usd"],
            "total_revenue_usd": row["metrics"]["total_revenue_usd"],
            "total_cost_usd": row["metrics"]["total_cost_usd"],
            "delivered_volume_m3": row["metrics"]["delivered_volume_m3"],
            "delivered_tonnes": row["metrics"]["delivered_tonnes"],
        }
        for index, row in enumerate(processor_results, start=1)
    ]

    return {
        "request": payload.model_dump(),
        "base_currency": BASE_CURRENCY,
        "coordinate": {"lon": lon, "lat": lat},
        "assumptions": build_assumptions(payload),
        "warnings": warnings,
        "rankings": rankings,
        "processors": processor_results,
        "library": {
            "processor_catalog": processor_catalog(processor_db),
            "buyer_specs": buyer_specs_to_rows(processor_db),
            "labour_categories": dataframe_to_records(labour_df),
            "non_labour_items": dataframe_to_records(nonlab_df),
            "quantity_library": quantity_library_to_rows(qty_lib),
            "section_order": SECTION_ORDER,
        },
    }
