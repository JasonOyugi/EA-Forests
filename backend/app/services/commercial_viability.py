from __future__ import annotations

import hashlib
import math
from typing import Any

import numpy as np
import pandas as pd

from app.schemas import CommercialForestViabilityRequest


BASE_CURRENCY = "USD"
UGX_PER_USD = 3_700.0


def usd_from_ugx(value: float) -> float:
    return round(float(value) / UGX_PER_USD, 4)


def money_columns_to_usd(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    out = df.copy()
    for column in columns:
        out[column] = out[column].astype(float).map(usd_from_ugx)
    return out


LABOUR_CATEGORIES = pd.DataFrame(
    [
        {
            "labour_code": "L_UNSKILLED",
            "desc": "Casual field worker",
            "wage_min": 5_000,
            "wage_max": 12_000,
        },
        {
            "labour_code": "L_SKILLED",
            "desc": "Experienced field worker",
            "wage_min": 10_000,
            "wage_max": 20_000,
        },
        {
            "labour_code": "L_OPERATOR",
            "desc": "Equipment operator",
            "wage_min": 10_000,
            "wage_max": 30_000,
        },
        {
            "labour_code": "L_SUPERVISOR",
            "desc": "Field supervisor / foreman",
            "wage_min": 15_000,
            "wage_max": 60_000,
        },
        {
            "labour_code": "L_SURVEYOR",
            "desc": "Professional surveyor / forester",
            "wage_min": 30_000,
            "wage_max": 90_000,
        },
    ]
)
LABOUR_CATEGORIES = money_columns_to_usd(
    LABOUR_CATEGORIES,
    ["wage_min", "wage_max"],
)

NON_LABOUR_ITEMS = pd.DataFrame(
    [
        {
            "item_code": "N_SEEDLING",
            "desc": "Seedling delivered",
            "unit": "seedling",
            "price_min": 300,
            "price_max": 400,
        },
        {
            "item_code": "N_HERBICIDE_L",
            "desc": "Herbicide concentrate",
            "unit": "litre",
            "price_min": 15_000,
            "price_max": 30_000,
        },
        {
            "item_code": "N_FERTILISER_KG",
            "desc": "Fertiliser (NPK)",
            "unit": "kg",
            "price_min": 3_000,
            "price_max": 5_000,
        },
        {
            "item_code": "N_DIESEL_L",
            "desc": "Diesel fuel",
            "unit": "litre",
            "price_min": 4_300,
            "price_max": 5_500,
        },
        {
            "item_code": "N_PEG",
            "desc": "Boundary peg",
            "unit": "peg",
            "price_min": 50,
            "price_max": 150,
        },
        {
            "item_code": "N_MARKING_PAINT_L",
            "desc": "Marking paint",
            "unit": "litre",
            "price_min": 15_000,
            "price_max": 40_000,
        },
        {
            "item_code": "N_HAND_TOOL_KIT",
            "desc": "Hand tool kit",
            "unit": "kit",
            "price_min": 50_000,
            "price_max": 100_000,
        },
        {
            "item_code": "N_PPE_SET",
            "desc": "PPE set",
            "unit": "set",
            "price_min": 50_000,
            "price_max": 100_000,
        },
        {
            "item_code": "N_TRUCK_TRIP_LOCAL",
            "desc": "Truck trip (local)",
            "unit": "trip",
            "price_min": 60_000,
            "price_max": 120_000,
        },
        {
            "item_code": "N_PICKUP_TRIP_LOCAL",
            "desc": "Pickup trip",
            "unit": "trip",
            "price_min": 40_000,
            "price_max": 80_000,
        },
        {
            "item_code": "N_MECH_RIP_HA",
            "desc": "Mechanical ripping",
            "unit": "ha",
            "price_min": 200_000,
            "price_max": 330_000,
        },
        {
            "item_code": "N_WATER_M3",
            "desc": "Water delivered",
            "unit": "m3",
            "price_min": 10_000,
            "price_max": 25_000,
        },
        {
            "item_code": "N_CREW_DAYALLOW",
            "desc": "Meals + room per worker-day",
            "unit": "worker_day",
            "price_min": 8_000,
            "price_max": 20_000,
        },
    ]
)
NON_LABOUR_ITEMS = money_columns_to_usd(
    NON_LABOUR_ITEMS,
    ["price_min", "price_max"],
)

SECTION_ORDER = [
    "Site access & boundary",
    "Land preparation",
    "Planting material",
    "Layout & soil work",
    "Planting operations",
    "Labour welfare & ops",
    "Tools, PPE and others",
]


def convex(min_val: float, max_val: float, weight: float) -> float:
    w = float(np.clip(weight, 0.0, 1.0))
    return (1 - w) * float(min_val) + w * float(max_val)


def ceil_half(value: float) -> float:
    return math.ceil(float(value) * 2) / 2.0


def make_cost_code(year: int, section: str, sub_item: str) -> str:
    source = f"{year}|{section}|{sub_item}".encode("utf-8")
    digest = hashlib.sha1(source).hexdigest()[:10].upper()
    return f"C_{digest}"


def build_operation_recipes(rotation_year: int) -> list[dict[str, Any]]:
    if not (4 <= rotation_year <= 15):
        raise ValueError("rotation_year must be between 4 and 15.")

    ops: list[dict[str, Any]] = []
    ops.extend(
        [
            {
                "year": 1,
                "section": "Site access & boundary",
                "sub_item": "Boundary survey & marking",
                "labour_mandays": {
                    "L_SURVEYOR": (0.0, 1.0),
                    "L_UNSKILLED": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_PEG": (0, 60),
                    "N_MARKING_PAINT_L": (0.0, 0.5),
                    "N_PICKUP_TRIP_LOCAL": (0.0, 1.0),
                },
            },
            {
                "year": 1,
                "section": "Site access & boundary",
                "sub_item": "Access path opening",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 5.0),
                    "L_SUPERVISOR": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_TRUCK_TRIP_LOCAL": (0.0, 1.0),
                },
            },
            {
                "year": 1,
                "section": "Site access & boundary",
                "sub_item": "Firebreak establishment",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 5.0),
                    "L_SUPERVISOR": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_PICKUP_TRIP_LOCAL": (0.0, 1.0),
                    "N_DIESEL_L": (0, 7),
                },
            },
            {
                "year": 1,
                "section": "Land preparation",
                "sub_item": "Initial slashing / bush clearing",
                "labour_mandays": {
                    "L_UNSKILLED": (2.0, 5.0),
                    "L_SUPERVISOR": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_PICKUP_TRIP_LOCAL": (0.0, 1.0),
                    "N_DIESEL_L": (0, 8),
                },
            },
            {
                "year": 1,
                "section": "Land preparation",
                "sub_item": "Stumping / root removal",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 5.0),
                    "L_SUPERVISOR": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_TRUCK_TRIP_LOCAL": (0.0, 1.0),
                },
            },
            {
                "year": 1,
                "section": "Land preparation",
                "sub_item": "Pre-plant herbicide",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 1.0),
                    "L_SUPERVISOR": (0.0, 0.25),
                },
                "non_labour_items": {
                    "N_HERBICIDE_L": (0.0, 1.5),
                    "N_PICKUP_TRIP_LOCAL": (0.0, 0.5),
                },
            },
            {
                "year": 1,
                "section": "Land preparation",
                "sub_item": "Mechanical ripping / ploughing",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 1.0),
                },
                "non_labour_items": {
                    "N_MECH_RIP_HA": (0.0, 1.0),
                },
            },
            {
                "year": 1,
                "section": "Planting material",
                "sub_item": "Seedlings (delivered)",
                "labour_mandays": {},
                "non_labour_items": {
                    "N_SEEDLING": (1000, 1300),
                },
            },
            {
                "year": 1,
                "section": "Planting material",
                "sub_item": "Seedling handling & on-site transport",
                "labour_mandays": {
                    "L_UNSKILLED": (0.5, 2.0),
                },
                "non_labour_items": {
                    "N_PICKUP_TRIP_LOCAL": (0.25, 0.75),
                },
            },
            {
                "year": 1,
                "section": "Layout & soil work",
                "sub_item": "Lining & pegging",
                "labour_mandays": {
                    "L_UNSKILLED": (1.0, 2.5),
                    "L_SUPERVISOR": (0.0, 0.5),
                },
                "non_labour_items": {
                    "N_PEG": (0, 260),
                },
            },
            {
                "year": 1,
                "section": "Layout & soil work",
                "sub_item": "Pitting (planting holes)",
                "labour_mandays": {
                    "L_UNSKILLED": (2.0, 5.0),
                    "L_SUPERVISOR": (0.0, 0.5),
                },
                "non_labour_items": {
                    "N_TRUCK_TRIP_LOCAL": (0.25, 0.75),
                },
            },
            {
                "year": 1,
                "section": "Layout & soil work",
                "sub_item": "Fertiliser / soil amendment",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 1.0),
                },
                "non_labour_items": {
                    "N_FERTILISER_KG": (0, 80),
                },
            },
            {
                "year": 1,
                "section": "Planting operations",
                "sub_item": "Planting",
                "labour_mandays": {
                    "L_UNSKILLED": (2.0, 4.0),
                    "L_SUPERVISOR": (0.25, 1.0),
                },
                "non_labour_items": {
                    "N_TRUCK_TRIP_LOCAL": (0.2, 0.8),
                    "N_WATER_M3": (0.0, 1.0),
                },
            },
            {
                "year": 1,
                "section": "Planting operations",
                "sub_item": "Initial watering",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_WATER_M3": (0.0, 2.0),
                },
            },
            {
                "year": 1,
                "section": "Planting operations",
                "sub_item": "Beating-up",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 2.0),
                },
                "non_labour_items": {
                    "N_SEEDLING": (0, int(0.2 * 1111)),
                },
            },
            {
                "year": 1,
                "section": "Silviculture (Y1)",
                "sub_item": "Herbicide for post-plant spot spraying",
                "labour_mandays": {
                    "L_UNSKILLED": (0.0, 1.5),
                    "L_SUPERVISOR": (0.0, 0.25),
                },
                "non_labour_items": {
                    "N_HERBICIDE_L": (0.0, 1.5),
                    "N_PICKUP_TRIP_LOCAL": (0.0, 0.5),
                },
            },
            {
                "year": 1,
                "section": "Silviculture (Y1)",
                "sub_item": "Fuel & oil for brush cutters",
                "labour_mandays": {
                    "L_OPERATOR": (0.0, 1.0),
                },
                "non_labour_items": {
                    "N_DIESEL_L": (0, 15),
                },
            },
            {
                "year": 1,
                "section": "Silviculture (Y1)",
                "sub_item": "Pruning saws & blades",
                "labour_mandays": {},
                "non_labour_items": {
                    "N_HAND_TOOL_KIT": (0.0, 0.5),
                },
            },
            {
                "year": 1,
                "section": "Tools, PPE and others",
                "sub_item": "PPE initial kit",
                "labour_mandays": {},
                "non_labour_items": {
                    "N_PPE_SET": (0.0, 4.0),
                },
            },
            {
                "year": 1,
                "section": "Tools, PPE and others",
                "sub_item": "Hand tools initial purchase",
                "labour_mandays": {},
                "non_labour_items": {
                    "N_HAND_TOOL_KIT": (0.0, 1.5),
                },
            },
            {
                "year": 1,
                "section": "Tools, PPE and others",
                "sub_item": "Tool repair & replacement (Y1)",
                "labour_mandays": {},
                "non_labour_items": {
                    "N_HAND_TOOL_KIT": (0.0, 0.4),
                },
            },
            {
                "year": 1,
                "section": "Tools, PPE and others",
                "sub_item": "Contingency/Safety & compliance",
                "labour_mandays": {},
                "non_labour_items": {},
            },
            {
                "year": 1,
                "section": "Tools, PPE and others",
                "sub_item": "Overhead",
                "labour_mandays": {},
                "non_labour_items": {},
            },
        ]
    )

    for year in range(2, rotation_year + 1):
        ops.extend(
            [
                {
                    "year": year,
                    "section": f"Silviculture (Y{year})",
                    "sub_item": "Herbicide & chemicals",
                    "labour_mandays": {
                        "L_UNSKILLED": (0.0, 1.3),
                        "L_SUPERVISOR": (0.0, 0.2),
                    },
                    "non_labour_items": {
                        "N_HERBICIDE_L": (0.0, 1.3),
                        "N_TRUCK_TRIP_LOCAL": (0.0, 0.4),
                    },
                },
                {
                    "year": year,
                    "section": f"Silviculture (Y{year})",
                    "sub_item": "Fuel & oil for equipment",
                    "labour_mandays": {
                        "L_OPERATOR": (0.0, 0.9),
                    },
                    "non_labour_items": {
                        "N_DIESEL_L": (0, 12),
                    },
                },
                {
                    "year": year,
                    "section": f"Silviculture (Y{year})",
                    "sub_item": "Pruning saws & blades",
                    "labour_mandays": {},
                    "non_labour_items": {
                        "N_HAND_TOOL_KIT": (0.0, 0.2),
                    },
                },
                {
                    "year": year,
                    "section": "Labour welfare & ops",
                    "sub_item": f"Labour transport (Y{year})",
                    "labour_mandays": {},
                    "non_labour_items": {
                        "N_TRUCK_TRIP_LOCAL": (0.0, 0.9),
                    },
                },
                {
                    "year": year,
                    "section": "Tools, PPE and others",
                    "sub_item": f"Tools & PPE replacement (Y{year})",
                    "labour_mandays": {},
                    "non_labour_items": {
                        "N_HAND_TOOL_KIT": (0.0, 0.2),
                        "N_PPE_SET": (0.0, 0.4),
                    },
                },
                {
                    "year": year,
                    "section": "Tools, PPE and others",
                    "sub_item": f"Contingency/Safety & compliance (Y{year})",
                    "labour_mandays": {},
                    "non_labour_items": {},
                },
                {
                    "year": year,
                    "section": "Tools, PPE and others",
                    "sub_item": f"Overhead (Y{year})",
                    "labour_mandays": {},
                    "non_labour_items": {},
                },
            ]
        )

    return ops


def operation_recipes_to_rows(ops: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, op in enumerate(ops):
        base = {
            "operation_id": index,
            "year": int(op["year"]),
            "section": str(op["section"]),
            "sub_item": str(op["sub_item"]),
        }
        if not op.get("labour_mandays") and not op.get("non_labour_items"):
            rows.append({**base, "input_type": "operation", "code": "", "qty_min": 0.0, "qty_max": 0.0})
        for code, values in op.get("labour_mandays", {}).items():
            rows.append({**base, "input_type": "labour", "code": code, "qty_min": float(values[0]), "qty_max": float(values[1])})
        for code, values in op.get("non_labour_items", {}).items():
            rows.append({**base, "input_type": "non_labour", "code": code, "qty_min": float(values[0]), "qty_max": float(values[1])})
    return rows


def operation_recipes_from_rows(rows: list[dict[str, Any]], rotation_year: int) -> list[dict[str, Any]]:
    if not rows:
        return build_operation_recipes(rotation_year)

    grouped: dict[tuple[int, str, str], dict[str, Any]] = {}
    for row in rows:
        year = int(row.get("year", 0))
        if year < 1 or year > rotation_year:
            continue
        section = str(row.get("section", "")).strip()
        sub_item = str(row.get("sub_item", "")).strip()
        if not section or not sub_item:
            continue
        key = (year, section, sub_item)
        op = grouped.setdefault(
            key,
            {"year": year, "section": section, "sub_item": sub_item, "labour_mandays": {}, "non_labour_items": {}},
        )
        input_type = str(row.get("input_type", "")).strip()
        code = str(row.get("code", "")).strip()
        if input_type == "operation" or not code:
            continue
        qty_min = float(row.get("qty_min", 0) or 0)
        qty_max = float(row.get("qty_max", 0) or 0)
        if input_type == "labour":
            op["labour_mandays"][code] = (qty_min, qty_max)
        elif input_type == "non_labour":
            op["non_labour_items"][code] = (qty_min, qty_max)

    return sorted(grouped.values(), key=lambda op: (int(op["year"]), str(op["section"]), str(op["sub_item"])))


def thinning_discount_factor(
    year: int,
    rotation_year: int,
    thinning: str = "no",
    d1: float = 0.85,
    d2: float = 0.75,
    start1_year: int = 4,
    start2_year: int = 7,
    trigger1_rotation: int = 6,
    trigger2_rotation: int = 9,
) -> float:
    if thinning != "yes":
        return 1.0
    if rotation_year >= trigger2_rotation and year >= start2_year:
        return float(d2)
    if rotation_year >= trigger1_rotation and year >= start1_year:
        return float(d1)
    return 1.0


def is_maintenance_row(year: int, section: str) -> bool:
    if year <= 1:
        return False
    if section.startswith("Silviculture"):
        return True
    return section in {"Labour welfare & ops", "Tools, PPE and others"}


def _coerce_library_df(rows: list[dict[str, Any]], default: pd.DataFrame, key: str, numeric_columns: list[str]) -> pd.DataFrame:
    if not rows:
        return default.copy()
    df = pd.DataFrame(rows)
    required = set(default.columns)
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{key} is missing required column(s): {sorted(missing)}")
    df = df[list(default.columns)].copy()
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="raise")
    if df.duplicated(key).any():
        duplicates = df[df.duplicated(key, keep=False)][key].tolist()
        raise ValueError(f"Duplicate {key}(s): {duplicates}")
    return df


def _index_libs(
    labour_df: pd.DataFrame | None = None,
    non_labour_df: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    labour_source = labour_df if labour_df is not None else LABOUR_CATEGORIES
    non_labour_source = non_labour_df if non_labour_df is not None else NON_LABOUR_ITEMS
    labour = labour_source.set_index("labour_code")[
        ["wage_min", "wage_max", "desc"]
    ].copy()
    non_labour = non_labour_source.set_index("item_code")[
        ["price_min", "price_max", "desc", "unit"]
    ].copy()
    return labour, non_labour


def compute_costs(
    payload: CommercialForestViabilityRequest,
    labour_df: pd.DataFrame | None = None,
    non_labour_df: pd.DataFrame | None = None,
    operation_recipes: list[dict[str, Any]] | None = None,
) -> pd.DataFrame:
    if payload.labour_mix not in {"unskilled", "skilled"}:
        raise ValueError("labour_mix must be one of {'unskilled','skilled'}")
    if payload.thinning not in {"yes", "no"}:
        raise ValueError("thinning must be one of {'yes','no'}")

    labour_index, non_labour_index = _index_libs(labour_df, non_labour_df)
    allowance_price = convex(
        non_labour_index.loc["N_CREW_DAYALLOW", "price_min"],
        non_labour_index.loc["N_CREW_DAYALLOW", "price_max"],
        payload.wage_weight,
    )

    rows: list[dict[str, Any]] = []
    for op in operation_recipes or build_operation_recipes(payload.rotation_year):
        year = int(op["year"])
        section = str(op["section"])
        sub_item = str(op["sub_item"])

        labour_mandays: dict[str, float] = {}
        for labour_code, (min_qty, max_qty) in op.get("labour_mandays", {}).items():
            mandays = convex(min_qty, max_qty, payload.qty_weight)
            if mandays > 0:
                labour_mandays[labour_code] = mandays

        non_labour_quantities: dict[str, float] = {}
        for item_code, (min_qty, max_qty) in op.get("non_labour_items", {}).items():
            quantity = convex(min_qty, max_qty, payload.qty_weight)
            if quantity > 0:
                non_labour_quantities[item_code] = quantity

        if payload.labour_mix == "skilled" and "L_UNSKILLED" in labour_mandays:
            unskilled_mandays = labour_mandays.pop("L_UNSKILLED")
            labour_mandays["L_SKILLED"] = (
                labour_mandays.get("L_SKILLED", 0.0)
                + payload.skilled_factor * unskilled_mandays
            )

        labour_cost = 0.0
        labour_mandays_total = 0.0
        for labour_code, mandays in labour_mandays.items():
            if labour_code not in labour_index.index:
                raise KeyError(f"Unknown labour_code {labour_code}")
            wage = convex(
                labour_index.loc[labour_code, "wage_min"],
                labour_index.loc[labour_code, "wage_max"],
                payload.wage_weight,
            )
            labour_mandays_total += mandays
            labour_cost += math.ceil(mandays) * wage + ceil_half(mandays) * allowance_price

        non_labour_cost = 0.0
        for item_code, quantity in non_labour_quantities.items():
            if item_code not in non_labour_index.index:
                raise KeyError(f"Unknown item_code {item_code}")
            price = convex(
                non_labour_index.loc[item_code, "price_min"],
                non_labour_index.loc[item_code, "price_max"],
                payload.wage_weight,
            )
            non_labour_cost += quantity * price

        base_cost = labour_cost + non_labour_cost
        discount_factor = 1.0
        if is_maintenance_row(year, section):
            discount_factor = thinning_discount_factor(
                year=year,
                rotation_year=payload.rotation_year,
                thinning=payload.thinning,
                d1=payload.d1,
                d2=payload.d2,
            )

        total_cost = base_cost * discount_factor
        rows.append(
            {
                "year": year,
                "section": section,
                "sub_item": sub_item,
                "cost": total_cost,
                "base_cost": base_cost,
                "discount_factor": discount_factor,
                "labour_cost": labour_cost * discount_factor,
                "non_labour_cost": non_labour_cost * discount_factor,
                "labour_mandays_total": labour_mandays_total,
                "allowance_price": allowance_price,
                "cost_code": make_cost_code(year, section, sub_item),
            }
        )

    return (
        pd.DataFrame(rows)
        .sort_values(["year", "section", "sub_item"])
        .reset_index(drop=True)
    )


def _normalise_schedule(
    schedule: dict[int, float],
    prices: dict[int, float],
    rotation_year: int,
) -> tuple[dict[int, float], dict[int, float], list[str]]:
    warnings: list[str] = []
    normalised_schedule: dict[int, float] = {}
    normalised_prices: dict[int, float] = {}

    for year, fraction in sorted(schedule.items()):
        year_int = int(year)
        fraction_float = float(fraction)
        if year_int < 1 or year_int > rotation_year:
            warnings.append(f"Skipped thinning year {year_int}; it is outside the rotation.")
            continue
        if fraction_float <= 0:
            warnings.append(f"Skipped thinning year {year_int}; removal fraction must be positive.")
            continue
        if fraction_float >= 1:
            warnings.append(
                f"Clipped thinning year {year_int}; removal fraction must be below 1."
            )
            fraction_float = 0.999

        normalised_schedule[year_int] = fraction_float
        normalised_prices[year_int] = max(float(prices.get(year_int, 0.0)), 0.0)

    return normalised_schedule, normalised_prices, warnings


def compute_revenues(
    payload: CommercialForestViabilityRequest,
) -> tuple[pd.DataFrame, list[str]]:
    final_harvest_year = payload.final_harvest_year or payload.rotation_year
    if final_harvest_year > payload.rotation_year:
        raise ValueError("final_harvest_year must be <= rotation_year.")

    warnings: list[str] = []
    thinnings: dict[int, float] = {}
    thinning_prices: dict[int, float] = {}
    if payload.thinning == "yes":
        thinnings, thinning_prices, warnings = _normalise_schedule(
            payload.thinnings,
            payload.price_thinning_tree,
            payload.rotation_year,
        )

    trees = float(payload.initial_trees_per_ha)
    rows: list[dict[str, Any]] = []

    for year in range(1, payload.rotation_year + 1):
        trees_before = trees
        trees_removed = 0.0
        thinning_revenue = 0.0
        final_revenue = 0.0

        if year in thinnings:
            trees_removed = trees * thinnings[year]
            thinning_revenue = trees_removed * thinning_prices[year]
            trees -= trees_removed

        if year == final_harvest_year:
            final_revenue = trees * payload.price_final_tree
            trees = 0.0

        rows.append(
            {
                "year": year,
                "trees_before": trees_before,
                "trees_removed": trees_removed,
                "trees_after": trees,
                "thinning_revenue": thinning_revenue,
                "final_harvest_revenue": final_revenue,
                "revenue": thinning_revenue + final_revenue,
            }
        )

    return pd.DataFrame(rows), warnings


def build_cashflow(
    cost_df: pd.DataFrame,
    revenue_df: pd.DataFrame,
    rotation_year: int,
    area_ha: float,
) -> pd.DataFrame:
    yearly_cost = (
        cost_df.groupby("year")["cost"]
        .sum()
        .reindex(range(1, rotation_year + 1), fill_value=0.0)
    )
    yearly_labour = (
        cost_df.groupby("year")["labour_cost"]
        .sum()
        .reindex(range(1, rotation_year + 1), fill_value=0.0)
    )
    yearly_non_labour = (
        cost_df.groupby("year")["non_labour_cost"]
        .sum()
        .reindex(range(1, rotation_year + 1), fill_value=0.0)
    )
    yearly_revenue = (
        revenue_df.set_index("year")["revenue"]
        .reindex(range(1, rotation_year + 1), fill_value=0.0)
    )

    cashflow_df = pd.DataFrame(
        {
            "year": yearly_cost.index,
            "cost_per_ha": yearly_cost.values,
            "labour_cost_per_ha": yearly_labour.values,
            "non_labour_cost_per_ha": yearly_non_labour.values,
            "revenue_per_ha": yearly_revenue.values,
        }
    )
    cashflow_df["net_cashflow_per_ha"] = (
        cashflow_df["revenue_per_ha"] - cashflow_df["cost_per_ha"]
    )
    cashflow_df["cumulative_cashflow_per_ha"] = cashflow_df[
        "net_cashflow_per_ha"
    ].cumsum()

    for column in [
        "cost",
        "labour_cost",
        "non_labour_cost",
        "revenue",
        "net_cashflow",
        "cumulative_cashflow",
    ]:
        per_ha_column = f"{column}_per_ha"
        cashflow_df[column] = cashflow_df[per_ha_column] * area_ha

    return cashflow_df


def _discounted_value(cashflows: np.ndarray, years: np.ndarray, rate: float) -> float:
    return float(np.sum(cashflows / (1 + rate) ** years))


def _irr(cashflows: np.ndarray, years: np.ndarray) -> float | None:
    if not (np.any(cashflows > 0) and np.any(cashflows < 0)):
        return None

    rates = np.concatenate(
        [
            np.array([-0.999, -0.95, -0.9]),
            np.linspace(-0.8, 2.0, 160),
            np.linspace(2.1, 10.0, 120),
        ]
    )
    previous_rate = float(rates[0])
    previous_value = _discounted_value(cashflows, years, previous_rate)

    for rate in rates[1:]:
        rate = float(rate)
        value = _discounted_value(cashflows, years, rate)
        if not np.isfinite(value) or not np.isfinite(previous_value):
            previous_rate, previous_value = rate, value
            continue
        if value == 0:
            return rate
        if previous_value * value < 0:
            low = previous_rate
            high = rate
            for _ in range(80):
                mid = (low + high) / 2
                mid_value = _discounted_value(cashflows, years, mid)
                if previous_value * mid_value <= 0:
                    high = mid
                    value = mid_value
                else:
                    low = mid
                    previous_value = mid_value
            return (low + high) / 2
        previous_rate, previous_value = rate, value

    return None


def investment_metrics(cashflow_df: pd.DataFrame, discount_rate: float) -> dict[str, Any]:
    cashflows = cashflow_df["net_cashflow_per_ha"].to_numpy(dtype=float)
    years = cashflow_df["year"].to_numpy(dtype=float)
    cumulative = cashflow_df["cumulative_cashflow_per_ha"].to_numpy(dtype=float)

    npv_per_ha = _discounted_value(cashflows, years, discount_rate)
    irr = _irr(cashflows, years)
    payback_year = next(
        (int(years[index]) for index, value in enumerate(cumulative) if value >= 0),
        None,
    )

    total_cost_per_ha = float(cashflow_df["cost_per_ha"].sum())
    total_revenue_per_ha = float(cashflow_df["revenue_per_ha"].sum())
    area_ha = float(cashflow_df["cost"].sum() / total_cost_per_ha) if total_cost_per_ha else 0.0

    return {
        "NPV_per_ha": npv_per_ha,
        "NPV": npv_per_ha * area_ha,
        "IRR": irr,
        "Payback_year": payback_year,
        "Total_cost_per_ha": total_cost_per_ha,
        "Total_revenue_per_ha": total_revenue_per_ha,
        "Total_cost": float(cashflow_df["cost"].sum()),
        "Total_revenue": float(cashflow_df["revenue"].sum()),
    }


def cost_section_summary(cost_df: pd.DataFrame, area_ha: float) -> pd.DataFrame:
    summary = (
        cost_df.groupby(["year", "section"], as_index=False)
        .agg(
            cost_per_ha=("cost", "sum"),
            labour_cost_per_ha=("labour_cost", "sum"),
            non_labour_cost_per_ha=("non_labour_cost", "sum"),
            labour_mandays_total=("labour_mandays_total", "sum"),
        )
        .sort_values(["year", "section"])
        .reset_index(drop=True)
    )
    summary["cost"] = summary["cost_per_ha"] * area_ha
    return summary


def add_total_cost_columns(cost_df: pd.DataFrame, area_ha: float) -> pd.DataFrame:
    out = cost_df.copy()
    for column in ["cost", "base_cost", "labour_cost", "non_labour_cost"]:
        out[f"{column}_per_ha"] = out[column]
        out[column] = out[column] * area_ha
    return out


def dataframe_to_records(df: pd.DataFrame | None, digits: int = 2) -> list[dict[str, Any]]:
    if df is None or df.empty:
        return []
    out = df.copy().replace({np.nan: None, np.inf: None, -np.inf: None})
    for column in out.columns:
        if pd.api.types.is_float_dtype(out[column]):
            out[column] = out[column].map(
                lambda value: round(float(value), digits) if value is not None else None
            )
    return out.to_dict(orient="records")


def commercial_forest_viability_default_library(rotation_year: int = 8) -> dict[str, Any]:
    return {
        "base_currency": BASE_CURRENCY,
        "library": {
            "labour_categories": dataframe_to_records(LABOUR_CATEGORIES),
            "non_labour_items": dataframe_to_records(NON_LABOUR_ITEMS),
            "operation_recipes": operation_recipes_to_rows(build_operation_recipes(rotation_year)),
            "section_order": SECTION_ORDER,
        },
    }


def build_assumptions(payload: CommercialForestViabilityRequest) -> list[str]:
    final_harvest_year = payload.final_harvest_year or payload.rotation_year
    thinning_text = (
        "Thinning discounts and thinning revenues are active."
        if payload.thinning == "yes"
        else "Thinning discounts and thinning revenues are disabled."
    )
    return [
        "Silviculture costs are computed per hectare from the notebook operation library in USD.",
        thinning_text,
        f"Final harvest occurs in year {final_harvest_year}.",
        "NPV discounts annual net cashflow from year 1 through the rotation year.",
    ]


def run_commercial_forest_viability(
    payload: CommercialForestViabilityRequest,
) -> dict[str, Any]:
    labour_df = _coerce_library_df(payload.labour_categories, LABOUR_CATEGORIES, "labour_code", ["wage_min", "wage_max"])
    non_labour_df = _coerce_library_df(payload.non_labour_items, NON_LABOUR_ITEMS, "item_code", ["price_min", "price_max"])
    operation_recipes = operation_recipes_from_rows(payload.operation_recipes, payload.rotation_year)
    cost_df = compute_costs(payload, labour_df, non_labour_df, operation_recipes)
    revenue_df, revenue_warnings = compute_revenues(payload)
    cashflow_df = build_cashflow(
        cost_df=cost_df,
        revenue_df=revenue_df,
        rotation_year=payload.rotation_year,
        area_ha=payload.area_ha,
    )
    metrics = investment_metrics(cashflow_df, payload.discount_rate)
    section_df = cost_section_summary(cost_df, payload.area_ha)
    total_cost_df = add_total_cost_columns(cost_df, payload.area_ha)

    return {
        "request": payload.model_dump(),
        "base_currency": BASE_CURRENCY,
        "assumptions": build_assumptions(payload),
        "warnings": revenue_warnings,
        "cost_rows": dataframe_to_records(total_cost_df),
        "cost_section_summary": dataframe_to_records(section_df),
        "revenue_rows": dataframe_to_records(revenue_df),
        "cashflow_rows": dataframe_to_records(cashflow_df),
        "metrics": {
            key: int(value)
            if isinstance(value, (int, np.integer)) and value is not None
            else round(float(value), 4)
            if isinstance(value, (float, np.floating)) and value is not None
            else value
            for key, value in metrics.items()
        },
        "library": {
            "labour_categories": dataframe_to_records(labour_df),
            "non_labour_items": dataframe_to_records(non_labour_df),
            "operation_recipes": operation_recipes_to_rows(operation_recipes),
            "section_order": SECTION_ORDER,
        },
    }
