from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from app.schemas import ClonalEucalyptusNurseryRequest


BASE_CURRENCY = "USD"


def safe_div(num: float, den: float, default: float = 0.0) -> float:
    return default if den in [0, None] or pd.isna(den) else float(num) / float(den)


def npv(rate: float, cashflows: np.ndarray) -> float:
    years = np.arange(len(cashflows))
    return float(np.sum(cashflows / ((1 + rate) ** years)))


def irr_bisection(
    cashflows: np.ndarray,
    low: float = -0.95,
    high: float = 5.0,
    tol: float = 1e-7,
    max_iter: int = 500,
) -> float | None:
    if not (np.any(cashflows < 0) and np.any(cashflows > 0)):
        return None

    def f(rate: float) -> float:
        return npv(rate, cashflows)

    f_low = f(low)
    f_high = f(high)
    tries = 0
    while f_low * f_high > 0 and tries < 20:
        high *= 2
        f_high = f(high)
        tries += 1

    if f_low * f_high > 0:
        return None

    for _ in range(max_iter):
        mid = (low + high) / 2
        f_mid = f(mid)
        if abs(f_mid) < tol:
            return float(mid)
        if f_low * f_mid < 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid

    return float((low + high) / 2)


def payback_year(cashflows: np.ndarray) -> int | None:
    cumulative = np.cumsum(cashflows)
    for index, value in enumerate(cumulative):
        if value >= 0:
            return int(index)
    return None


def discounted_payback_year(cashflows: np.ndarray, discount_rate: float) -> int | None:
    years = np.arange(len(cashflows))
    discounted = cashflows / ((1 + discount_rate) ** years)
    cumulative = np.cumsum(discounted)
    for index, value in enumerate(cumulative):
        if value >= 0:
            return int(index)
    return None


def _assumption(
    category: str,
    assumption: str,
    value: float,
    unit: str,
    economic_behaviour: str,
    notes: str,
) -> dict[str, Any]:
    return {
        "category": category,
        "assumption": assumption,
        "value": value,
        "unit": unit,
        "economic_behaviour": economic_behaviour,
        "notes": notes,
    }


def default_assumptions() -> pd.DataFrame:
    rows = [
        _assumption("General", "model_years", 10, "years", "model horizon", "Projection length"),
        _assumption("General", "currency", 0, BASE_CURRENCY, "display", "Base calculation currency"),
        _assumption("Finance", "discount_rate", 0.15, "%", "valuation", "Discount rate"),
        _assumption("Finance", "tax_rate", 0.0, "%", "tax", "Simple rural case defaults to no tax"),
        _assumption("Finance", "working_capital_pct_revenue", 0.02, "%", "working capital", "Working capital tied to revenue"),
        _assumption("Finance", "inflation_rate", 0.05, "%", "annual escalation", "Applied to operating costs and replacement CAPEX"),
        _assumption("Finance", "price_growth_rate", 0.02, "%", "annual escalation", "Applied to selling price"),
        _assumption("Site and Scale", "total_land_m2", 20_000, "m2", "capacity", "Total site boundary"),
        _assumption("Site and Scale", "mother_stock_area_m2", 4_000, "m2", "biological supply", "Mother stock / stooling area"),
        _assumption("Site and Scale", "rooting_area_m2", 200, "m2", "physical throughput", "Rooting tunnel or chamber footprint"),
        _assumption("Site and Scale", "shade_area_m2", 350, "m2", "physical throughput", "Shade/acclimatisation area"),
        _assumption("Site and Scale", "hardening_area_m2", 600, "m2", "physical throughput", "Hardening area"),
        _assumption("Site and Scale", "dispatch_and_work_area_m2", 80, "m2", "layout", "Dispatch and working area"),
        _assumption("Site and Scale", "paths_and_service_area_m2", 300, "m2", "layout", "Paths and service area"),
        _assumption("Site and Scale", "operating_months_per_year", 8, "months", "operating intensity", "Active production months"),
        _assumption("Site and Scale", "operating_days_per_month", 24, "days/month", "operating intensity", "Operating days per month"),
        _assumption("Site Works", "site_clearance_labour_days_per_100m2", 0.08, "days/100m2", "site setup", "Clear brush and remove debris"),
        _assumption("Site Works", "site_layout_labour_days_per_100m2", 0.02, "days/100m2", "site setup", "Layout and pegging"),
        _assumption("Site Works", "bed_levelling_labour_days_per_100m2", 0.08, "days/100m2", "site setup", "Bed levelling"),
        _assumption("Site Works", "drainage_m_per_100m2", 0.30, "m/100m2", "site setup", "Drainage channel length"),
        _assumption("Site Works", "drainage_labour_days_per_m", 0.02, "days/m", "site setup", "Drainage digging labour"),
        _assumption("Site Works", "path_gravel_depth_m", 0.0, "m", "site setup", "Optional gravel depth"),
        _assumption("Site Works", "gravel_bulk_density_t_per_m3", 1.6, "t/m3", "site setup", "Gravel density"),
        _assumption("Site Works", "gravel_cost_per_t", 18.0, "USD/t", "site setup", "Gravel material cost"),
        _assumption("Site Works", "fence_length_m", 250, "m", "site setup", "Fence length"),
        _assumption("Site Works", "fence_post_spacing_m", 5.0, "m", "site setup", "Fence post spacing"),
        _assumption("Site Works", "fence_post_cost_each", 0.30, "USD/post", "site setup", "Fence post cost"),
        _assumption("Site Works", "fence_wire_cost_per_m", 0.40, "USD/m", "site setup", "Fence wire/netting cost"),
        _assumption("Site Works", "fence_labour_days_per_m", 0.015, "days/m", "site setup", "Fence installation labour"),
        _assumption("Site Works", "gate_cost_each", 25.0, "USD/gate", "site setup", "Gate cost"),
        _assumption("Site Works", "number_of_gates", 1, "gates", "site setup", "Number of gates"),
        _assumption("Labour", "unskilled_wage_per_day", 3.0, "USD/day", "cash cost", "Unskilled field labour"),
        _assumption("Labour", "skilled_wage_per_day", 3.5, "USD/day", "cash cost", "Skilled nursery labour"),
        _assumption("Labour", "technician_wage_per_day", 6.0, "USD/day", "cash cost", "Technician labour"),
        _assumption("Labour", "supervisor_wage_per_day", 8.0, "USD/day", "cash cost", "Supervisor labour"),
        _assumption("Labour", "daily_allowance_per_worker", 0.0, "USD/day", "cash cost", "Daily allowance"),
        _assumption("Labour", "payroll_burden_pct", 0.0, "%", "labour overhead", "Payroll burden"),
        _assumption("Labour", "family_labour_cash_cost_factor", 0.25, "x", "cash cost", "Cash cost factor for family labour"),
        _assumption("Labour", "share_family_labour_site_setup", 0.70, "%", "cash cost", "Family labour share in site setup"),
        _assumption("Labour", "share_family_labour_operations", 0.50, "%", "cash cost", "Family labour share in operations"),
        _assumption("Structures", "shade_structure_poles_per_100m2", 5, "poles/100m2", "capex", "Shade poles"),
        _assumption("Structures", "shade_pole_cost_each", 0.50, "USD/pole", "capex", "Shade pole cost"),
        _assumption("Structures", "shade_net_cost_per_m2", 0.20, "USD/m2", "capex", "Shade net cost"),
        _assumption("Structures", "shade_structure_wire_rope_cost_per_m2", 0.02, "USD/m2", "capex", "Wire/rope cost"),
        _assumption("Structures", "shade_structure_labour_days_per_100m2", 0.4, "days/100m2", "capex", "Shade installation labour"),
        _assumption("Structures", "low_cost_rooting_tunnel_cost_per_m2_cover", 0.25, "USD/m2", "capex", "Rooting tunnel cover"),
        _assumption("Structures", "rooting_tunnel_frame_cost_per_m2", 0.25, "USD/m2", "capex", "Rooting tunnel frame"),
        _assumption("Structures", "rooting_tunnel_labour_days_per_100m2", 1.2, "days/100m2", "capex", "Rooting tunnel labour"),
        _assumption("Structures", "bench_area_share_rooting", 1.0, "%", "capex", "Rooting area on benches"),
        _assumption("Structures", "bench_cost_per_m2", 0.0, "USD/m2", "capex", "Bench material cost"),
        _assumption("Structures", "hardening_bed_edge_cost_per_m2", 0.10, "USD/m2", "capex", "Hardening bed edging"),
        _assumption("Structures", "mother_stock_bed_edge_cost_per_m2", 0.10, "USD/m2", "capex", "Mother stock bed edging"),
        _assumption("Water", "water_source_connection_cost", 25.0, "USD", "capex", "Water source connection"),
        _assumption("Water", "storage_litres_per_operating_day_buffer", 0.5, "days", "capex", "Storage buffer"),
        _assumption("Water", "tank_cost_per_1000_litres", 20.0, "USD/1000L", "capex", "Tank cost"),
        _assumption("Water", "pump_cost_each", 0.0, "USD/pump", "capex", "Pump cost"),
        _assumption("Water", "number_of_pumps", 0, "pumps", "capex", "Pump count"),
        _assumption("Water", "mainline_length_m", 15, "m", "capex", "Mainline length"),
        _assumption("Water", "mainline_cost_per_m", 0.20, "USD/m", "capex", "Mainline cost"),
        _assumption("Water", "lateral_line_m_per_100m2", 1, "m/100m2", "capex", "Lateral line density"),
        _assumption("Water", "lateral_line_cost_per_m", 0.08, "USD/m", "capex", "Lateral line cost"),
        _assumption("Water", "sprinkler_or_mister_each_per_25m2", 0.0, "emitters/25m2", "capex", "Emitter density"),
        _assumption("Water", "sprinkler_or_mister_cost_each", 0.0, "USD/emitter", "capex", "Emitter cost"),
        _assumption("Water", "water_system_labour_days_per_100m2", 0.08, "days/100m2", "capex", "Water system installation labour"),
        _assumption("Water", "water_cost_per_1000_litres", 0.20, "USD/1000L", "operating cost", "Water cost"),
        _assumption("Water", "pump_power_kwh_per_1000_litres", 0.0, "kWh/1000L", "operating cost", "Pump power"),
        _assumption("Water", "electricity_cost_per_kwh", 0.0, "USD/kWh", "operating cost", "Electricity cost"),
        _assumption("Clonal Pathway", "mother_plants", 26_666, "plants", "biological supply", "Mother plant cap"),
        _assumption("Clonal Pathway", "mother_plant_spacing_m2", 0.15, "m2/plant", "biological supply", "Mother plant spacing"),
        _assumption("Clonal Pathway", "mother_plant_purchase_cost_each", 0.16, "USD/plant", "capex", "Mother plant purchase cost"),
        _assumption("Clonal Pathway", "mother_plant_establishment_labour_days_per_100_plants", 0.50, "days/100 plants", "capex", "Mother plant establishment labour"),
        _assumption("Clonal Pathway", "mother_stock_survival_rate", 0.88, "%", "conversion", "Mother stock establishment survival"),
        _assumption("Clonal Pathway", "shoots_per_mother_per_harvest", 6.0, "shoots/plant/harvest", "biological supply", "Shoots per mother plant per harvest"),
        _assumption("Clonal Pathway", "harvests_per_year", 4, "harvests/year", "biological supply", "Harvest frequency"),
        _assumption("Clonal Pathway", "cutting_selection_rate", 0.80, "%", "conversion", "Reject weak/unusable shoots"),
        _assumption("Clonal Pathway", "rooting_success_rate", 0.50, "%", "conversion", "Rooting success"),
        _assumption("Clonal Pathway", "acclimatisation_survival_rate", 0.85, "%", "conversion", "Post-rooting survival"),
        _assumption("Clonal Pathway", "hardening_survival_rate", 0.88, "%", "conversion", "Hardening survival"),
        _assumption("Clonal Pathway", "saleable_grade_acceptance_rate", 0.85, "%", "conversion", "Final saleable grade"),
        _assumption("Capacity", "rooting_trays", 1_600, "trays", "physical throughput", "Rooting tray count"),
        _assumption("Capacity", "cells_per_rooting_tray", 72, "cells/tray", "physical throughput", "Tray cell count"),
        _assumption("Capacity", "rooting_cycles_per_year", 5.4857, "cycles/year", "physical throughput", "Operating days divided by rooting cycle days"),
        _assumption("Capacity", "rooting_cycle_days", 35, "days", "physical throughput", "Rooting cycle length"),
        _assumption("Capacity", "acclimatisation_cycle_days", 21, "days", "physical throughput", "Acclimatisation cycle length"),
        _assumption("Capacity", "hardening_cycle_days", 35, "days", "physical throughput", "Hardening cycle length"),
        _assumption("Capacity", "shade_plants_per_m2", 100, "plants/m2", "physical throughput", "Shade capacity"),
        _assumption("Capacity", "hardening_plants_per_m2", 75, "plants/m2", "physical throughput", "Hardening capacity"),
        _assumption("Capacity", "base_capacity_utilisation_y1", 0.40, "%", "ramp-up", "Year 1 utilisation"),
        _assumption("Capacity", "steady_state_capacity_utilisation", 0.70, "%", "ramp-up", "Mature utilisation"),
        _assumption("Capacity", "ramp_up_years", 4, "years", "ramp-up", "Years to mature utilisation"),
        _assumption("Market", "market_sales_rate_y1", 0.65, "%", "market demand", "Year 1 sale-through"),
        _assumption("Market", "market_sales_rate", 0.85, "%", "market demand", "Mature sale-through"),
        _assumption("Inputs", "rooting_media_litres_per_tray", 8.5, "litres/tray", "operating cost", "Media volume"),
        _assumption("Inputs", "media_loss_pct", 0.10, "%", "operating cost", "Media loss"),
        _assumption("Inputs", "cocopeat_share", 0.0, "%", "operating cost", "Media recipe"),
        _assumption("Inputs", "compost_share", 0.75, "%", "operating cost", "Media recipe"),
        _assumption("Inputs", "sand_share", 0.25, "%", "operating cost", "Media recipe"),
        _assumption("Inputs", "cocopeat_cost_per_litre", 0.018, "USD/L", "operating cost", "Cocopeat cost"),
        _assumption("Inputs", "compost_cost_per_litre", 0.004, "USD/L", "operating cost", "Compost cost"),
        _assumption("Inputs", "sand_cost_per_litre", 0.003, "USD/L", "operating cost", "Sand cost"),
        _assumption("Inputs", "rooting_hormone_cost_per_1000_cuttings", 1.0, "USD/1000 cuttings", "operating cost", "Rooting hormone"),
        _assumption("Inputs", "tube_or_polybag_cost_each", 0.012, "USD/plant", "operating cost", "Container"),
        _assumption("Inputs", "label_cost_per_1000_plants", 0.05, "USD/1000 plants", "operating cost", "Labels"),
        _assumption("Inputs", "disinfectant_cost_per_1000_cuttings", 0.05, "USD/1000 cuttings", "operating cost", "Disinfectant"),
        _assumption("Inputs", "fungicide_cost_per_1000_plants", 0.10, "USD/1000 plants", "operating cost", "Fungicide"),
        _assumption("Inputs", "fertiliser_cost_per_1000_plants_per_month", 0.15, "USD/1000 plants/month", "operating cost", "Fertiliser"),
        _assumption("Inputs", "packaging_cost_per_1000_sold", 0.20, "USD/1000 sold", "operating cost", "Packaging"),
        _assumption("Water", "mother_stock_litres_per_m2_per_day", 1.4, "L/m2/day", "operating cost", "Mother stock water demand"),
        _assumption("Water", "rooting_litres_per_m2_per_day", 3.0, "L/m2/day", "operating cost", "Rooting water demand"),
        _assumption("Water", "shade_litres_per_m2_per_day", 1.5, "L/m2/day", "operating cost", "Shade water demand"),
        _assumption("Water", "hardening_litres_per_m2_per_day", 1.2, "L/m2/day", "operating cost", "Hardening water demand"),
        _assumption("Labour Productivity", "cuttings_harvested_per_worker_day", 1600, "cuttings/day", "labour productivity", "Harvest productivity"),
        _assumption("Labour Productivity", "cuttings_prepared_per_worker_day", 1100, "cuttings/day", "labour productivity", "Preparation productivity"),
        _assumption("Labour Productivity", "cuttings_stuck_per_worker_day", 1200, "cuttings/day", "labour productivity", "Sticking productivity"),
        _assumption("Labour Productivity", "plants_shifted_per_worker_day", 1400, "plants/day", "labour productivity", "Plant shifting productivity"),
        _assumption("Labour Productivity", "plants_graded_per_worker_day", 1300, "plants/day", "labour productivity", "Grading productivity"),
        _assumption("Labour Productivity", "media_trays_filled_per_worker_day", 200, "trays/day", "labour productivity", "Media filling productivity"),
        _assumption("Labour Productivity", "watering_monitoring_labour_days_per_operating_day", 0.60, "days/day", "labour productivity", "Watering labour"),
        _assumption("Labour Productivity", "mother_stock_maintenance_days_per_100m2_per_month", 0.25, "days/100m2/month", "labour productivity", "Mother stock maintenance"),
        _assumption("Labour Productivity", "weeding_sanitation_days_per_100m2_per_month", 0.20, "days/100m2/month", "labour productivity", "Weeding and sanitation"),
        _assumption("Labour Productivity", "admin_days_per_month", 1.0, "days/month", "labour productivity", "Admin labour"),
        _assumption("Labour Productivity", "security_days_per_month", 0.0, "days/month", "labour productivity", "Security labour"),
        _assumption("Labour Productivity", "technical_supervision_days_per_month", 0.5, "days/month", "labour productivity", "Technical supervision"),
        _assumption("Genetic and Technical Access", "initial_genetic_access_fee", 0.0, "USD", "capex", "Initial access/licensing fee"),
        _assumption("Genetic and Technical Access", "annual_genetic_access_fee", 0.0, "USD/year", "operating cost", "Annual access fee"),
        _assumption("Genetic and Technical Access", "royalty_per_sold_plant", 0.0, "USD/plant", "operating cost", "Royalty per sold plant"),
        _assumption("Genetic and Technical Access", "annual_certification_fee", 0.0, "USD/year", "operating cost", "Certification/audit fee"),
        _assumption("Market", "selling_price_per_plant_y1", 0.14, "USD/plant", "revenue", "Year 1 clonal seedling price"),
        _assumption("Market", "bad_debt_rate", 0.0, "%", "revenue leakage", "Bad debt/revenue leakage"),
        _assumption("Market", "transport_cost_per_1000_sold", 0.0, "USD/1000 sold", "operating cost", "Nursery-paid transport"),
        _assumption("Market", "customer_collection_share", 1.0, "%", "operating cost", "Share collected by customers"),
        _assumption("Maintenance", "maintenance_rate_capex", 0.005, "%", "operating cost", "Maintenance as share of physical CAPEX"),
        _assumption("Maintenance", "small_tools_replacement_pct", 0.0, "%", "operating cost", "Small tools replacement"),
        _assumption("Maintenance", "contingency_pct_initial_capex", 0.05, "%", "capex", "Initial CAPEX contingency"),
    ]
    return pd.DataFrame(rows)


def _coerce_assumption_rows(rows: list[dict[str, Any]]) -> pd.DataFrame:
    assumptions = pd.DataFrame(rows) if rows else default_assumptions()
    required = {"category", "assumption", "value", "unit", "economic_behaviour", "notes"}
    missing = required - set(assumptions.columns)
    if missing:
        raise ValueError(f"assumptions is missing required column(s): {sorted(missing)}")
    assumptions = assumptions[list(default_assumptions().columns)].copy()
    if assumptions.duplicated("assumption").any():
        duplicates = assumptions[assumptions.duplicated("assumption", keep=False)]["assumption"].tolist()
        raise ValueError(f"Duplicate assumption row(s): {duplicates}")
    assumptions["value"] = pd.to_numeric(assumptions["value"], errors="coerce")
    return assumptions


def assumptions_from_payload(payload: ClonalEucalyptusNurseryRequest) -> tuple[pd.DataFrame, dict[str, float]]:
    assumptions = _coerce_assumption_rows(payload.assumptions)
    values = assumptions.set_index("assumption")["value"].to_dict()
    for key, value in payload.model_dump().items():
        if key in values and not isinstance(value, list):
            values[key] = value
            assumptions.loc[assumptions["assumption"] == key, "value"] = value
    return assumptions, values


def derive_layout(A: dict[str, float]) -> dict[str, float | bool]:
    working_area = (
        A["mother_stock_area_m2"]
        + A["rooting_area_m2"]
        + A["shade_area_m2"]
        + A["hardening_area_m2"]
        + A["dispatch_and_work_area_m2"]
    )
    service_area = A["paths_and_service_area_m2"]
    developed_area = working_area + service_area
    spare_or_unused_area = A["total_land_m2"] - developed_area
    return {
        "usable_production_area_m2": working_area,
        "service_area_m2": service_area,
        "developed_area_m2": developed_area,
        "spare_or_unused_land_m2": spare_or_unused_area,
        "service_area_share_of_developed": safe_div(service_area, developed_area),
        "spare_area_share_of_total": safe_div(spare_or_unused_area, A["total_land_m2"], np.nan),
        "layout_is_feasible": spare_or_unused_area >= -1e-9,
    }


def validate_layout(A: dict[str, float]) -> dict[str, float | bool]:
    layout = derive_layout(A)
    if not layout["layout_is_feasible"]:
        raise ValueError(
            f"Layout infeasible: developed area ({layout['developed_area_m2']:.0f} m2) exceeds total land "
            f"({A['total_land_m2']:.0f} m2) by {-layout['spare_or_unused_land_m2']:.0f} m2."
        )
    return layout


def labour_cost(
    A: dict[str, float],
    days: float,
    wage_rate: float,
    family_share: float = 0.0,
    allowance: bool = True,
) -> float:
    cash_days_equiv = days * ((1 - family_share) + family_share * A["family_labour_cash_cost_factor"])
    wage = cash_days_equiv * wage_rate
    allow = cash_days_equiv * A["daily_allowance_per_worker"] if allowance else 0
    return float((wage + allow) * (1 + A["payroll_burden_pct"]))


def estimate_daily_water_demand_litres(A: dict[str, float]) -> float:
    return float(
        A["mother_stock_area_m2"] * A["mother_stock_litres_per_m2_per_day"]
        + A["rooting_area_m2"] * A["rooting_litres_per_m2_per_day"]
        + A["shade_area_m2"] * A["shade_litres_per_m2_per_day"]
        + A["hardening_area_m2"] * A["hardening_litres_per_m2_per_day"]
    )


def build_site_establishment_activities(A: dict[str, float]) -> pd.DataFrame:
    layout = validate_layout(A)
    usable = float(layout["usable_production_area_m2"])
    service = A["paths_and_service_area_m2"]
    total = A["total_land_m2"]
    family_share = A["share_family_labour_site_setup"]
    rows: list[dict[str, Any]] = []

    def add(activity: str, driver: str, quantity: float, unit: str, labour_days: float, labour_type: str, material_cost: float, notes: str) -> None:
        wage = {
            "unskilled": A["unskilled_wage_per_day"],
            "skilled": A["skilled_wage_per_day"],
            "technician": A["technician_wage_per_day"],
            "supervisor": A["supervisor_wage_per_day"],
        }[labour_type]
        lcost = labour_cost(A, labour_days, wage, family_share=family_share)
        rows.append(
            {
                "activity": activity,
                "driver": driver,
                "quantity": quantity,
                "unit": unit,
                "labour_days": labour_days,
                "labour_type": labour_type,
                "labour_cost": lcost,
                "material_cost": material_cost,
                "total_cost": lcost + material_cost,
                "notes": notes,
            }
        )

    add("Clear brush and remove debris", "total land area", total, "m2", total / 100 * A["site_clearance_labour_days_per_100m2"], "unskilled", 0, "Manual clearing by local/family labour")
    add("Layout, pegging and production zone marking", "usable production area", usable, "m2", usable / 100 * A["site_layout_labour_days_per_100m2"], "skilled", 12.0, "String, pegs, measuring tape, and skilled layout labour")
    add("Level production beds and working areas", "usable production area", usable, "m2", usable / 100 * A["bed_levelling_labour_days_per_100m2"], "unskilled", 0, "Manual bed levelling")
    drainage_m = usable / 100 * A["drainage_m_per_100m2"]
    add("Dig shallow drainage channels", "drainage length", drainage_m, "m", drainage_m * A["drainage_labour_days_per_m"], "unskilled", 0, "Drainage is treated as metres of drains")
    gravel_t = service * A["path_gravel_depth_m"] * A["gravel_bulk_density_t_per_m3"]
    add("Construct gravel paths / service strips", "path area and gravel volume", service, "m2", service / 100 * 0.7, "unskilled", gravel_t * A["gravel_cost_per_t"], "Path cost is built from path area and gravel")
    fence_posts = math.ceil(A["fence_length_m"] / A["fence_post_spacing_m"]) + 1
    fence_material = fence_posts * A["fence_post_cost_each"] + A["fence_length_m"] * A["fence_wire_cost_per_m"] + A["number_of_gates"] * A["gate_cost_each"]
    add("Install perimeter fence and gate", "fence length", A["fence_length_m"], "m", A["fence_length_m"] * A["fence_labour_days_per_m"], "unskilled", fence_material, "Fence materials are posts, wire/netting, and gate")
    return pd.DataFrame(rows)


def _asset_row(
    category: str,
    asset: str,
    qty: float,
    unit_cost: float,
    labour_days: float,
    labour_cost_installation: float,
    life_years: float,
    notes: str,
    material_cost: float | None = None,
) -> dict[str, Any]:
    material = float(material_cost if material_cost is not None else qty * unit_cost)
    initial_cost = material + labour_cost_installation
    return {
        "category": category,
        "asset": asset,
        "qty": qty,
        "unit_cost": safe_div(initial_cost, qty, initial_cost),
        "life_years": life_years,
        "replacement_rule": "life" if life_years > 0 else "none",
        "notes": notes,
        "material_cost": material,
        "labour_days_installation": labour_days,
        "labour_cost_installation": labour_cost_installation,
        "initial_cost": initial_cost,
        "is_physical_capex": category not in ["Intangible Access", "Contingency"],
    }


def build_capex_assets_from_assumptions(A: dict[str, float]) -> pd.DataFrame:
    site_activities = build_site_establishment_activities(A)
    rows: list[dict[str, Any]] = []

    def add(asset: str, category: str, qty: float, material_cost: float, labour_days: float, labour_type: str, life_years: float, notes: str) -> None:
        wage = {
            "unskilled": A["unskilled_wage_per_day"],
            "skilled": A["skilled_wage_per_day"],
            "technician": A["technician_wage_per_day"],
            "supervisor": A["supervisor_wage_per_day"],
        }[labour_type]
        lcost = labour_cost(A, labour_days, wage, family_share=A["share_family_labour_site_setup"])
        rows.append(_asset_row(category, asset, qty, safe_div(material_cost, qty), labour_days, lcost, life_years, notes, material_cost))

    add("Site establishment activities", "Site works", 1, float(site_activities["material_cost"].sum()), float(site_activities["labour_days"].sum()), "unskilled", 5, "Sum of clearing, layout, levelling, drainage, paths, and fencing")
    shade_m2 = A["shade_area_m2"]
    shade_material = shade_m2 * A["shade_net_cost_per_m2"] + shade_m2 * A["shade_structure_wire_rope_cost_per_m2"] + (shade_m2 / 100 * A["shade_structure_poles_per_100m2"]) * A["shade_pole_cost_each"]
    add("Shade structure", "Production structure", shade_m2, shade_material, shade_m2 / 100 * A["shade_structure_labour_days_per_100m2"], "skilled", 4, "Posts, shade net, wire/rope, and installation labour")
    rooting_m2 = A["rooting_area_m2"]
    rooting_material = rooting_m2 * (A["low_cost_rooting_tunnel_cost_per_m2_cover"] + A["rooting_tunnel_frame_cost_per_m2"])
    add("Low-cost rooting tunnel / humidity chamber", "Production structure", rooting_m2, rooting_material, rooting_m2 / 100 * A["rooting_tunnel_labour_days_per_100m2"], "skilled", 4, "Low-cost structure for rooting cuttings")
    bench_m2 = rooting_m2 * A["bench_area_share_rooting"]
    add("Rooting benches", "Production equipment", bench_m2, bench_m2 * A["bench_cost_per_m2"], bench_m2 / 100 * 0.9, "skilled", 5, "Benches sized from rooting area")
    add("Hardening beds / bed edging", "Production beds", A["hardening_area_m2"], A["hardening_area_m2"] * A["hardening_bed_edge_cost_per_m2"], A["hardening_area_m2"] / 100 * 0.45, "unskilled", 3, "Simple hardening beds or edging")
    add("Mother stock beds / stooling area", "Mother stock", A["mother_stock_area_m2"], A["mother_stock_area_m2"] * A["mother_stock_bed_edge_cost_per_m2"], A["mother_stock_area_m2"] / 100 * 0.60, "unskilled", 4, "Mother stock bed establishment")
    daily_water_l = estimate_daily_water_demand_litres(A)
    tank_litres = daily_water_l * A["storage_litres_per_operating_day_buffer"]
    tank_cost = (tank_litres / 1000) * A["tank_cost_per_1000_litres"]
    layout = validate_layout(A)
    laterals_m = float(layout["developed_area_m2"]) / 100 * A["lateral_line_m_per_100m2"]
    misters = math.ceil((A["rooting_area_m2"] + A["shade_area_m2"] + A["hardening_area_m2"]) / 25 * A["sprinkler_or_mister_each_per_25m2"])
    water_material = (
        A["water_source_connection_cost"]
        + tank_cost
        + A["number_of_pumps"] * A["pump_cost_each"]
        + A["mainline_length_m"] * A["mainline_cost_per_m"]
        + laterals_m * A["lateral_line_cost_per_m"]
        + misters * A["sprinkler_or_mister_cost_each"]
    )
    add("Water source, storage, pump and distribution", "Water system", 1, water_material, float(layout["developed_area_m2"]) / 100 * A["water_system_labour_days_per_100m2"], "skilled", 5, "Water source, tank, pump, mainlines, laterals, emitters, and labour")
    max_mother_by_area = math.floor(A["mother_stock_area_m2"] / A["mother_plant_spacing_m2"])
    mother_plants = min(A["mother_plants"], max_mother_by_area) if A["mother_plants"] > 0 else max_mother_by_area
    mother_material = mother_plants * A["mother_plant_purchase_cost_each"]
    mother_labour = mother_plants / 100 * A["mother_plant_establishment_labour_days_per_100_plants"]
    add("Mother plant establishment", "Biological capital", mother_plants, mother_material, mother_labour, "skilled", 3, "Mother plants sized by area, spacing, and mother plant cap")
    add("Basic nursery tools and PPE", "Tools", float(layout["developed_area_m2"]), float(layout["developed_area_m2"]) * 0.055, 0.5, "skilled", 2, "Hand tools, pruning shears, buckets, sprayers, gloves, PPE")
    add("Small office/store/chemical lock box", "Facilities", 1, 180.0, 1.5, "skilled", 5, "Low-cost secure storage and administration space")
    if A["initial_genetic_access_fee"] > 0:
        add("Initial genetic access / licensing fee", "Intangible Access", 1, A["initial_genetic_access_fee"], 0, "skilled", 5, "Optional access fee")
    subtotal = sum(row["initial_cost"] for row in rows)
    rows.append(_asset_row("Contingency", "Contingency on initial establishment", 1, subtotal * A["contingency_pct_initial_capex"], 0, 0, 0, "Explicit contingency percentage applied to built-up CAPEX subtotal"))
    return pd.DataFrame(rows)


def default_capex_assets() -> pd.DataFrame:
    _, A = assumptions_from_payload(ClonalEucalyptusNurseryRequest())
    return build_capex_assets_from_assumptions(A)


def capex_assets_from_payload(payload: ClonalEucalyptusNurseryRequest, A: dict[str, float]) -> pd.DataFrame:
    if not payload.capex_assets:
        return build_capex_assets_from_assumptions(A)
    capex_assets = pd.DataFrame(payload.capex_assets)
    required = {"category", "asset", "qty", "unit_cost", "life_years", "replacement_rule", "notes"}
    missing = required - set(capex_assets.columns)
    if missing:
        raise ValueError(f"capex_assets is missing required column(s): {sorted(missing)}")
    capex_assets = capex_assets[["category", "asset", "qty", "unit_cost", "life_years", "replacement_rule", "notes"]].copy()
    for column in ["qty", "unit_cost", "life_years"]:
        capex_assets[column] = pd.to_numeric(capex_assets[column], errors="raise")
    capex_assets["initial_cost"] = capex_assets["qty"] * capex_assets["unit_cost"]
    capex_assets["is_physical_capex"] = ~capex_assets["category"].isin(["Intangible Access", "Contingency"])
    return capex_assets


def ramp_value(year: int, y1: float, mature: float, maturity_year: int = 4) -> float:
    if year <= 1:
        return float(y1)
    if year >= maturity_year:
        return float(mature)
    return float(y1 + (mature - y1) * ((year - 1) / max(maturity_year - 1, 1)))


def build_production_schedule(A: dict[str, float]) -> pd.DataFrame:
    operating_days = A["operating_months_per_year"] * A["operating_days_per_month"]
    max_mother_by_area = math.floor(A["mother_stock_area_m2"] / A["mother_plant_spacing_m2"])
    mother_plants = min(A["mother_plants"], max_mother_by_area) if A["mother_plants"] > 0 else max_mother_by_area
    surviving_mother_plants = mother_plants * A["mother_stock_survival_rate"]
    rooting_cells_per_cycle = A["rooting_trays"] * A["cells_per_rooting_tray"]
    rooting_cycles = A.get("rooting_cycles_per_year") or safe_div(operating_days, A["rooting_cycle_days"])
    shade_capacity_per_cycle = A["shade_area_m2"] * A["shade_plants_per_m2"]
    shade_cycles = safe_div(operating_days, A["acclimatisation_cycle_days"])
    hardening_capacity_per_cycle = A["hardening_area_m2"] * A["hardening_plants_per_m2"]
    hardening_cycles = safe_div(operating_days, A["hardening_cycle_days"])
    rows: list[dict[str, Any]] = []

    for year in range(1, int(A["model_years"]) + 1):
        utilisation = ramp_value(year, A["base_capacity_utilisation_y1"], A["steady_state_capacity_utilisation"], int(A["ramp_up_years"]))
        market_rate = ramp_value(year, A["market_sales_rate_y1"], A["market_sales_rate"], int(A["ramp_up_years"]))
        gross_cuttings = surviving_mother_plants * A["shoots_per_mother_per_harvest"] * A["harvests_per_year"] * utilisation
        usable_cuttings = gross_cuttings * A["cutting_selection_rate"]
        rooting_capacity = rooting_cells_per_cycle * rooting_cycles * utilisation
        cuttings_stuck = min(usable_cuttings, rooting_capacity)
        rooted_cuttings = cuttings_stuck * A["rooting_success_rate"]
        shade_throughput = shade_capacity_per_cycle * shade_cycles * utilisation
        acclimatised_plants = min(rooted_cuttings * A["acclimatisation_survival_rate"], shade_throughput)
        hardening_throughput = hardening_capacity_per_cycle * hardening_cycles * utilisation
        hardened_plants = min(acclimatised_plants * A["hardening_survival_rate"], hardening_throughput)
        saleable_plants = hardened_plants * A["saleable_grade_acceptance_rate"]
        sold_plants = saleable_plants * market_rate
        constraints = {
            "mother_stock_supply": usable_cuttings,
            "rooting_capacity": rooting_capacity,
            "shade_capacity_after_rooting": safe_div(shade_throughput, A["rooting_success_rate"] * A["acclimatisation_survival_rate"], 0),
            "hardening_capacity_after_losses": safe_div(hardening_throughput, A["rooting_success_rate"] * A["acclimatisation_survival_rate"] * A["hardening_survival_rate"], 0),
        }
        bottleneck = min(constraints, key=constraints.get)
        rows.append(
            {
                "year": year,
                "operating_days": operating_days,
                "inflation_factor": (1 + A["inflation_rate"]) ** (year - 1),
                "capacity_utilisation": utilisation,
                "market_sales_rate": market_rate,
                "max_mother_plants_by_area": max_mother_by_area,
                "mother_plants": mother_plants,
                "surviving_mother_plants": surviving_mother_plants,
                "gross_cuttings_available": gross_cuttings,
                "usable_cuttings": usable_cuttings,
                "annual_sticking_capacity": rooting_capacity,
                "annual_rooting_capacity": rooting_capacity,
                "cuttings_stuck": cuttings_stuck,
                "rooted_cuttings": rooted_cuttings,
                "annual_shade_capacity": shade_throughput,
                "acclimatised_plants": acclimatised_plants,
                "annual_hardening_capacity": hardening_throughput,
                "hardened_plants": hardened_plants,
                "saleable_clonal_plants": saleable_plants,
                "saleable_seed_plants": 0.0,
                "total_saleable_plants": saleable_plants,
                "sold_plants": sold_plants,
                "unsold_saleable_plants": saleable_plants - sold_plants,
                "total_plants_started": cuttings_stuck,
                "total_propagation_loss": cuttings_stuck - saleable_plants,
                "overall_yield_efficiency": safe_div(saleable_plants, cuttings_stuck),
                "rooting_capacity_utilisation": safe_div(cuttings_stuck, rooting_capacity),
                "mother_stock_utilisation": safe_div(cuttings_stuck, usable_cuttings),
                "bottleneck": bottleneck,
            }
        )
    return pd.DataFrame(rows)


def build_opex_schedule(A: dict[str, float], production_df: pd.DataFrame, capex_assets: pd.DataFrame) -> pd.DataFrame:
    physical_capex = capex_assets.loc[capex_assets["is_physical_capex"], "initial_cost"].sum()
    tools_capex = capex_assets.loc[capex_assets["category"].eq("Tools"), "initial_cost"].sum()
    layout = validate_layout(A)
    rows: list[dict[str, Any]] = []

    def add(year: int, activity: str, driver: str, quantity: float, labour_days: float, labour_type: str, material_cost: float, notes: str, inflation_factor: float) -> None:
        wage = {
            "unskilled": A["unskilled_wage_per_day"],
            "skilled": A["skilled_wage_per_day"],
            "technician": A["technician_wage_per_day"],
            "supervisor": A["supervisor_wage_per_day"],
        }[labour_type]
        lcost = labour_cost(A, labour_days, wage, family_share=A["share_family_labour_operations"])
        rows.append(
            {
                "year": year,
                "cost_item": activity,
                "activity": activity,
                "driver": driver,
                "quantity": quantity,
                "labour_days": labour_days,
                "labour_type": labour_type,
                "labour_cost": lcost * inflation_factor,
                "material_cost": material_cost * inflation_factor,
                "cost": (lcost + material_cost) * inflation_factor,
                "notes": notes,
            }
        )

    for _, prod in production_df.iterrows():
        year = int(prod["year"])
        op_days = prod["operating_days"]
        infl = prod["inflation_factor"]
        add(year, "Mother stock maintenance", "mother stock area and operating months", A["mother_stock_area_m2"], A["mother_stock_area_m2"] / 100 * A["mother_stock_maintenance_days_per_100m2_per_month"] * A["operating_months_per_year"], "skilled", 0, "Pruning, coppice management, weeding, fertiliser checking, sanitation", infl)
        add(year, "Harvest cuttings", "gross cuttings harvested", prod["gross_cuttings_available"], safe_div(prod["gross_cuttings_available"], A["cuttings_harvested_per_worker_day"]), "skilled", 0, "Labour to collect cuttings from mother stock", infl)
        add(year, "Prepare and select cuttings", "gross cuttings harvested", prod["gross_cuttings_available"], safe_div(prod["gross_cuttings_available"], A["cuttings_prepared_per_worker_day"]), "skilled", 0, "Trimming, selection, moist handling, rejection of poor material", infl)
        trays_filled = safe_div(prod["cuttings_stuck"], A["cells_per_rooting_tray"])
        media_litres = trays_filled * A["rooting_media_litres_per_tray"] * (1 + A["media_loss_pct"])
        media_cost_per_litre = A["cocopeat_share"] * A["cocopeat_cost_per_litre"] + A["compost_share"] * A["compost_cost_per_litre"] + A["sand_share"] * A["sand_cost_per_litre"]
        add(year, "Mix media and fill rooting trays", "rooting trays filled", trays_filled, safe_div(trays_filled, A["media_trays_filled_per_worker_day"]), "unskilled", media_litres * media_cost_per_litre, "Media cost is built from litres, recipe shares, losses, and ingredient costs", infl)
        hormone = prod["cuttings_stuck"] / 1000 * A["rooting_hormone_cost_per_1000_cuttings"]
        disinfectant = prod["cuttings_stuck"] / 1000 * A["disinfectant_cost_per_1000_cuttings"]
        add(year, "Apply hormone and stick cuttings", "cuttings stuck", prod["cuttings_stuck"], safe_div(prod["cuttings_stuck"], A["cuttings_stuck_per_worker_day"]), "skilled", hormone + disinfectant, "Rooting hormone, disinfectant, and labour to stick cuttings", infl)
        add(year, "Shift rooted cuttings to acclimatisation", "rooted cuttings", prod["rooted_cuttings"], safe_div(prod["rooted_cuttings"], A["plants_shifted_per_worker_day"]), "unskilled", 0, "Move rooted cuttings to shade/acclimatisation", infl)
        container_cost = prod["acclimatised_plants"] * A["tube_or_polybag_cost_each"]
        fertiliser_cost = prod["total_saleable_plants"] / 1000 * A["fertiliser_cost_per_1000_plants_per_month"] * A["operating_months_per_year"]
        fungicide_cost = prod["total_saleable_plants"] / 1000 * A["fungicide_cost_per_1000_plants"]
        label_cost = prod["total_saleable_plants"] / 1000 * A["label_cost_per_1000_plants"]
        add(year, "Tube/polybag, fertilise, protect, and label plants", "acclimatised / saleable plants", prod["total_saleable_plants"], safe_div(prod["total_saleable_plants"], A["plants_shifted_per_worker_day"]), "unskilled", container_cost + fertiliser_cost + fungicide_cost + label_cost, "Containers, fertiliser, plant protection, labels, and labour after rooting", infl)
        add(year, "Grade, count, and dispatch plants", "sold plants", prod["sold_plants"], safe_div(prod["sold_plants"], A["plants_graded_per_worker_day"]), "skilled", prod["sold_plants"] / 1000 * A["packaging_cost_per_1000_sold"], "Final grading and dispatch preparation", infl)
        daily_water_l = estimate_daily_water_demand_litres(A) * prod["capacity_utilisation"]
        annual_water_kl = daily_water_l * op_days / 1000
        water_cost = annual_water_kl * A["water_cost_per_1000_litres"]
        power_cost = annual_water_kl * A["pump_power_kwh_per_1000_litres"] * A["electricity_cost_per_kwh"]
        add(year, "Watering, misting and daily monitoring", "operating days and water demand", op_days, op_days * A["watering_monitoring_labour_days_per_operating_day"], "unskilled", water_cost + power_cost, "Water and pump power from zone demand and operating days", infl)
        add(year, "General weeding, cleaning and sanitation", "developed nursery area and operating months", float(layout["developed_area_m2"]), float(layout["developed_area_m2"]) / 100 * A["weeding_sanitation_days_per_100m2_per_month"] * A["operating_months_per_year"], "unskilled", 25.0, "Routine sanitation, weeding, cleaning, and consumables", infl)
        add(year, "Administration and record keeping", "months of operation", A["operating_months_per_year"], A["admin_days_per_month"] * A["operating_months_per_year"], "skilled", 20.0, "Sales records, nursery records, accounts, and orders", infl)
        add(year, "Security / watchman", "months of operation", A["operating_months_per_year"], A["security_days_per_month"] * A["operating_months_per_year"], "unskilled", 0, "Part-time security presence", infl)
        add(year, "Technical supervision", "months of operation", A["operating_months_per_year"], A["technical_supervision_days_per_month"] * A["operating_months_per_year"], "technician", 0, "Technical checks on mother stock, rooting, disease prevention, and grading", infl)
        add(year, "Genetic access, certification and audit fees", "annual fixed fees", 1, 0, "technician", A["annual_genetic_access_fee"] + A["annual_certification_fee"], "Optional annual fees", infl)
        add(year, "Transport paid by nursery", "sold plants not collected by customers", prod["sold_plants"], 0, "unskilled", (1 - A["customer_collection_share"]) * prod["sold_plants"] / 1000 * A["transport_cost_per_1000_sold"], "Transport cost only applies to the share not collected by customers", infl)
        add(year, "Royalty per sold plant", "sold plants", prod["sold_plants"], 0, "technician", prod["sold_plants"] * A["royalty_per_sold_plant"], "Optional royalty", infl)
        add(year, "Routine maintenance of physical assets", "physical CAPEX base", physical_capex, 0, "skilled", physical_capex * A["maintenance_rate_capex"], "Maintenance allowance linked to built-up physical CAPEX", infl)
        add(year, "Small tools replacement", "tools CAPEX base", tools_capex, 0, "skilled", tools_capex * A["small_tools_replacement_pct"], "Annual replacement of worn hand tools and PPE", infl)

    return pd.DataFrame(rows)


def replacement_capex_by_year(capex_assets: pd.DataFrame, model_years: int, inflation_rate: float = 0.0) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for year in range(0, model_years + 1):
        for _, asset in capex_assets.iterrows():
            cost = 0.0
            if year == 0:
                cost = asset["initial_cost"]
            elif asset["replacement_rule"] == "life" and asset["life_years"] > 0 and year % int(asset["life_years"]) == 0:
                cost = asset["initial_cost"] * ((1 + inflation_rate) ** year)
            rows.append({"year": year, "asset": asset["asset"], "category": asset["category"], "capex": cost})
    return pd.DataFrame(rows)


def depreciation_by_year(capex_assets: pd.DataFrame, year: int) -> float:
    if year == 0:
        return 0.0
    return float(
        capex_assets.apply(
            lambda row: row["initial_cost"] / row["life_years"]
            if row["life_years"] > 0 and year <= row["life_years"]
            else 0,
            axis=1,
        ).sum()
    )


def build_financial_model(
    A: dict[str, float],
    production_df: pd.DataFrame,
    opex_cash_df: pd.DataFrame,
    capex_assets: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    capex_df = replacement_capex_by_year(capex_assets, int(A["model_years"]), A["inflation_rate"])
    rows: list[dict[str, Any]] = []
    previous_working_capital = 0.0
    initial_capex = capex_df.loc[capex_df["year"] == 0, "capex"].sum()
    rows.append(
        {
            "year": 0,
            "saleable_plants": 0,
            "plants_sold": 0,
            "revenue": 0.0,
            "opex": 0.0,
            "ebitda": 0.0,
            "depreciation": 0.0,
            "ebit": 0.0,
            "tax": 0.0,
            "operating_cashflow": 0.0,
            "capex": initial_capex,
            "working_capital": 0.0,
            "working_capital_change": 0.0,
            "free_cashflow": -initial_capex,
        }
    )

    for _, prod in production_df.iterrows():
        year = int(prod["year"])
        price = A["selling_price_per_plant_y1"] * ((1 + A["price_growth_rate"]) ** (year - 1))
        gross_revenue = prod["sold_plants"] * price
        bad_debt = gross_revenue * A["bad_debt_rate"]
        revenue = gross_revenue - bad_debt
        opex = opex_cash_df.loc[opex_cash_df["year"] == year, "cost"].sum() + bad_debt
        ebitda = revenue - opex
        depreciation = depreciation_by_year(capex_assets, year)
        ebit = ebitda - depreciation
        tax = max(0.0, ebit * A["tax_rate"])
        operating_cashflow = ebitda - tax
        capex = capex_df.loc[(capex_df["year"] == year) & (capex_df["capex"] > 0), "capex"].sum()
        working_capital = revenue * A["working_capital_pct_revenue"]
        wc_change = working_capital - previous_working_capital
        previous_working_capital = working_capital
        rows.append(
            {
                "year": year,
                "saleable_plants": prod["total_saleable_plants"],
                "plants_sold": prod["sold_plants"],
                "revenue": revenue,
                "opex": opex,
                "ebitda": ebitda,
                "depreciation": depreciation,
                "ebit": ebit,
                "tax": tax,
                "operating_cashflow": operating_cashflow,
                "capex": capex,
                "working_capital": working_capital,
                "working_capital_change": wc_change,
                "free_cashflow": operating_cashflow - capex - wc_change,
            }
        )

    out = pd.DataFrame(rows)
    out["cumulative_free_cashflow"] = out["free_cashflow"].cumsum()
    out["discount_factor"] = 1 / ((1 + A["discount_rate"]) ** out["year"])
    out["discounted_fcf"] = out["free_cashflow"] * out["discount_factor"]
    out["cumulative_discounted_fcf"] = out["discounted_fcf"].cumsum()
    out["cost_per_saleable_plant"] = out.apply(lambda row: safe_div(row["opex"], row["saleable_plants"], np.nan), axis=1)
    out["cash_cost_per_sold_plant"] = out.apply(lambda row: safe_div(row["opex"], row["plants_sold"], np.nan), axis=1)
    out["revenue_per_sold_plant"] = out.apply(lambda row: safe_div(row["revenue"], row["plants_sold"], np.nan), axis=1)
    out["ebitda_margin"] = out.apply(lambda row: safe_div(row["ebitda"], row["revenue"], np.nan), axis=1)
    return out, capex_df


def investment_metrics(financial_df: pd.DataFrame, A: dict[str, float]) -> dict[str, Any]:
    cashflows = financial_df["free_cashflow"].to_numpy(dtype=float)
    final_year = int(financial_df["year"].max())
    final = financial_df.loc[financial_df["year"] == final_year].iloc[0]
    return {
        "NPV": npv(A["discount_rate"], cashflows),
        "IRR": irr_bisection(cashflows),
        "Simple_payback_year": payback_year(cashflows),
        "Discounted_payback_year": discounted_payback_year(cashflows, A["discount_rate"]),
        "Initial_CAPEX": financial_df.loc[financial_df["year"] == 0, "capex"].iloc[0],
        "Total_revenue": financial_df["revenue"].sum(),
        "Total_OPEX": financial_df["opex"].sum(),
        "Total_free_cashflow": financial_df["free_cashflow"].sum(),
        "Average_annual_EBITDA": financial_df.loc[financial_df["year"] > 0, "ebitda"].mean(),
        "Average_EBITDA_margin": financial_df.loc[financial_df["year"] > 0, "ebitda_margin"].mean(),
        "Steady_state_sold_plants": final["plants_sold"],
        "Steady_state_cash_cost_per_sold_plant": final["cash_cost_per_sold_plant"],
        "Steady_state_revenue_per_sold_plant": final["revenue_per_sold_plant"],
    }


def build_dashboard(financial_df: pd.DataFrame, production_df: pd.DataFrame, metrics: dict[str, Any]) -> list[dict[str, Any]]:
    final_year = int(financial_df["year"].max())
    final_fin = financial_df[financial_df["year"] == final_year].iloc[0]
    final_prod = production_df[production_df["year"] == final_year].iloc[0]
    return [
        {"metric": "NPV", "value": metrics["NPV"], "kind": "money"},
        {"metric": "IRR", "value": metrics["IRR"], "kind": "percent"},
        {"metric": "Simple payback year", "value": metrics["Simple_payback_year"], "kind": "number"},
        {"metric": "Discounted payback year", "value": metrics["Discounted_payback_year"], "kind": "number"},
        {"metric": "Initial CAPEX", "value": metrics["Initial_CAPEX"], "kind": "money"},
        {"metric": "Final-year plants sold", "value": final_fin["plants_sold"], "kind": "number"},
        {"metric": "Final-year revenue", "value": final_fin["revenue"], "kind": "money"},
        {"metric": "Final-year EBITDA", "value": final_fin["ebitda"], "kind": "money"},
        {"metric": "Final-year EBITDA margin", "value": final_fin["ebitda_margin"], "kind": "percent"},
        {"metric": "Final-year cash OPEX / sold plant", "value": final_fin["cash_cost_per_sold_plant"], "kind": "money"},
        {"metric": "Final-year revenue / sold plant", "value": final_fin["revenue_per_sold_plant"], "kind": "money"},
        {"metric": "Overall biological yield efficiency, final year", "value": final_prod["overall_yield_efficiency"], "kind": "percent"},
        {"metric": "Rooting capacity utilisation, final year", "value": final_prod["rooting_capacity_utilisation"], "kind": "percent"},
        {"metric": "Mother stock utilisation, final year", "value": final_prod["mother_stock_utilisation"], "kind": "percent"},
        {"metric": "Final-year bottleneck", "value": final_prod["bottleneck"], "kind": "text"},
    ]


def run_npv_with_override(base_A: dict[str, float], capex_assets: pd.DataFrame, overrides: dict[str, float]) -> float:
    A = dict(base_A)
    A.update(overrides)
    production = build_production_schedule(A)
    opex = build_opex_schedule(A, production, capex_assets)
    financial, _ = build_financial_model(A, production, opex, capex_assets)
    return npv(A["discount_rate"], financial["free_cashflow"].to_numpy(dtype=float))


def build_sensitivity(A: dict[str, float], capex_assets: pd.DataFrame, base_npv: float) -> list[dict[str, Any]]:
    specs = [
        {"assumption": "selling_price_per_plant_y1", "label": "Selling price", "low_mult": 0.85, "high_mult": 1.15},
        {"assumption": "rooting_success_rate", "label": "Rooting success", "low_mult": 0.90, "high_mult": 1.10},
        {"assumption": "shoots_per_mother_per_harvest", "label": "Shoots per mother", "low_mult": 0.85, "high_mult": 1.15},
        {"assumption": "unskilled_wage_per_day", "label": "Unskilled wage", "low_mult": 0.80, "high_mult": 1.20},
        {"assumption": "mother_stock_area_m2", "label": "Mother stock area", "low_mult": 0.80, "high_mult": 1.20},
        {"assumption": "rooting_area_m2", "label": "Rooting area", "low_mult": 0.80, "high_mult": 1.20},
        {"assumption": "market_sales_rate", "label": "Market sales rate", "low_mult": 0.90, "high_mult": 1.08},
    ]
    rows = []
    for spec in specs:
        key = spec["assumption"]
        base_value = float(A[key])
        low_value = base_value * spec["low_mult"]
        high_value = base_value * spec["high_mult"]
        if any(token in key for token in ["rate", "utilisation", "success"]):
            high_value = min(high_value, 0.999)
        low_npv = run_npv_with_override(A, capex_assets, {key: low_value})
        high_npv = run_npv_with_override(A, capex_assets, {key: high_value})
        rows.append(
            {
                "assumption": spec["label"],
                "base_value": base_value,
                "low_value": low_value,
                "high_value": high_value,
                "low_npv": low_npv,
                "base_npv": base_npv,
                "high_npv": high_npv,
                "swing": abs(high_npv - low_npv),
            }
        )
    rows.sort(key=lambda row: row["swing"], reverse=True)
    return rows


def dataframe_to_records(df: pd.DataFrame | None, digits: int = 4) -> list[dict[str, Any]]:
    if df is None or df.empty:
        return []
    out = df.copy().replace({np.nan: None, np.inf: None, -np.inf: None})
    for column in out.columns:
        if pd.api.types.is_float_dtype(out[column]):
            out[column] = out[column].map(lambda value: round(float(value), digits) if value is not None else None)
    return out.to_dict(orient="records")


def clonal_nursery_default_library() -> dict[str, Any]:
    assumption_df, A = assumptions_from_payload(ClonalEucalyptusNurseryRequest())
    capex_assets = build_capex_assets_from_assumptions(A)
    return {
        "base_currency": BASE_CURRENCY,
        "library": {
            "assumptions": dataframe_to_records(assumption_df, 4),
            "capex_assets": dataframe_to_records(capex_assets, 4),
        },
    }


def _round_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for key, value in metrics.items():
        if isinstance(value, (float, np.floating)):
            out[key] = None if not np.isfinite(value) else round(float(value), 4)
        elif isinstance(value, (int, np.integer)):
            out[key] = int(value)
        else:
            out[key] = value
    return out


def run_clonal_eucalyptus_nursery(payload: ClonalEucalyptusNurseryRequest) -> dict[str, Any]:
    assumption_df, assumptions = assumptions_from_payload(payload)
    validate_layout(assumptions)
    capex_assets = capex_assets_from_payload(payload, assumptions)
    production_df = build_production_schedule(assumptions)
    opex_detail_df = build_opex_schedule(assumptions, production_df, capex_assets)
    financial_df, capex_by_year_df = build_financial_model(assumptions, production_df, opex_detail_df, capex_assets)
    metrics = investment_metrics(financial_df, assumptions)
    dashboard_rows = build_dashboard(financial_df, production_df, metrics)
    capex_summary = (
        capex_assets.groupby("category", as_index=False)["initial_cost"]
        .sum()
        .sort_values("initial_cost", ascending=False)
        .reset_index(drop=True)
    )
    opex_summary = (
        opex_detail_df.groupby(["year", "cost_item"], as_index=False)["cost"]
        .sum()
        .sort_values(["year", "cost"], ascending=[True, False])
        .reset_index(drop=True)
    )
    sensitivity_rows = build_sensitivity(assumptions, capex_assets, metrics["NPV"])

    return {
        "request": payload.model_dump(),
        "base_currency": BASE_CURRENCY,
        "assumptions": [
            "This activity-based clonal eucalyptus nursery case is denominated in USD.",
            "Site layout derives usable, service, developed, and spare land from independent area inputs.",
            "CAPEX is built from site establishment, structures, water-system, mother-stock, tools, facilities, optional access fees, and contingency activities.",
            "OPEX is built from annual nursery activities, labour productivity, materials, water demand, optional fees, royalties, maintenance, and transport.",
            "Free cashflow includes initial CAPEX, life-based replacement CAPEX, working-capital changes, and taxes when enabled.",
        ],
        "dashboard_rows": _round_metrics({"rows": dashboard_rows})["rows"],
        "metrics": _round_metrics(metrics),
        "production_rows": dataframe_to_records(production_df, 4),
        "opex_rows": dataframe_to_records(opex_summary, 4),
        "financial_rows": dataframe_to_records(financial_df, 4),
        "capex_rows": dataframe_to_records(capex_assets, 4),
        "capex_by_year_rows": dataframe_to_records(capex_by_year_df, 4),
        "capex_summary": dataframe_to_records(capex_summary, 4),
        "sensitivity_rows": [
            {key: round(value, 4) if isinstance(value, float) else value for key, value in row.items()}
            for row in sensitivity_rows
        ],
        "library": {
            "assumptions": dataframe_to_records(assumption_df, 4),
            "capex_assets": dataframe_to_records(capex_assets, 4),
        },
    }
