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


def default_assumptions() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"category": "General", "assumption": "model_years", "value": 10, "unit": "years", "economic_behaviour": "model horizon", "notes": "Projection length"},
            {"category": "General", "assumption": "currency", "value": 0, "unit": BASE_CURRENCY, "economic_behaviour": "display", "notes": "Base calculation currency"},
            {"category": "Finance", "assumption": "discount_rate", "value": 0.15, "unit": "%", "economic_behaviour": "valuation", "notes": "Real or nominal rate should match cashflow assumptions"},
            {"category": "Finance", "assumption": "inflation_rate", "value": 0.04, "unit": "%", "economic_behaviour": "annual escalation", "notes": "Applied to prices and most costs"},
            {"category": "Finance", "assumption": "tax_rate", "value": 0.0, "unit": "%", "economic_behaviour": "tax", "notes": "Set to zero for simple rural dummy case"},
            {"category": "Finance", "assumption": "working_capital_pct_revenue", "value": 0.05, "unit": "%", "economic_behaviour": "working capital", "notes": "Cash tied up in receivables/inventory"},
            {"category": "Site and Scale", "assumption": "total_land_m2", "value": 2500, "unit": "m2", "economic_behaviour": "capacity", "notes": "Total nursery site footprint"},
            {"category": "Site and Scale", "assumption": "usable_production_area_m2", "value": 1200, "unit": "m2", "economic_behaviour": "capacity", "notes": "Usable production area"},
            {"category": "Site and Scale", "assumption": "mother_stock_area_m2", "value": 350, "unit": "m2", "economic_behaviour": "biological supply", "notes": "Area used for mother stock / hedge plants"},
            {"category": "Site and Scale", "assumption": "rooting_area_m2", "value": 180, "unit": "m2", "economic_behaviour": "physical throughput", "notes": "Low-cost humidity/rooting area"},
            {"category": "Site and Scale", "assumption": "shade_area_m2", "value": 350, "unit": "m2", "economic_behaviour": "physical throughput", "notes": "Shade area for acclimatisation"},
            {"category": "Site and Scale", "assumption": "hardening_area_m2", "value": 500, "unit": "m2", "economic_behaviour": "physical throughput", "notes": "Hardening and dispatch holding area"},
            {"category": "Site and Scale", "assumption": "operating_months_per_year", "value": 11, "unit": "months", "economic_behaviour": "operating intensity", "notes": "Allows seasonal or year-round operation"},
            {"category": "Product Mix", "assumption": "seed_based_share", "value": 0.0, "unit": "%", "economic_behaviour": "production mix", "notes": "Zero in this clonal dummy case"},
            {"category": "Product Mix", "assumption": "clonal_share", "value": 1.0, "unit": "%", "economic_behaviour": "production mix", "notes": "Pure clonal dummy case"},
            {"category": "Seed Pathway", "assumption": "seeds_sown_capacity", "value": 0, "unit": "seeds/year", "economic_behaviour": "biological supply", "notes": "Inactive for pure clonal nursery"},
            {"category": "Seed Pathway", "assumption": "germination_rate", "value": 0.70, "unit": "%", "economic_behaviour": "conversion", "notes": "Used only if seed pathway active"},
            {"category": "Seed Pathway", "assumption": "transplant_survival_rate", "value": 0.90, "unit": "%", "economic_behaviour": "conversion", "notes": "Used only if seed pathway active"},
            {"category": "Seed Pathway", "assumption": "seedling_hardening_survival_rate", "value": 0.92, "unit": "%", "economic_behaviour": "conversion", "notes": "Used only if seed pathway active"},
            {"category": "Seed Pathway", "assumption": "seedling_saleable_acceptance_rate", "value": 0.95, "unit": "%", "economic_behaviour": "conversion", "notes": "Used only if seed pathway active"},
            {"category": "Clonal Pathway", "assumption": "mother_plants", "value": 2500, "unit": "plants", "economic_behaviour": "biological supply", "notes": "Mother stock count"},
            {"category": "Clonal Pathway", "assumption": "shoots_per_mother_per_harvest", "value": 4.0, "unit": "shoots/plant/harvest", "economic_behaviour": "biological supply", "notes": "Conservative rural dummy assumption"},
            {"category": "Clonal Pathway", "assumption": "harvests_per_year", "value": 8, "unit": "harvests/year", "economic_behaviour": "biological supply", "notes": "Harvest frequency"},
            {"category": "Clonal Pathway", "assumption": "cutting_selection_rate", "value": 0.80, "unit": "%", "economic_behaviour": "conversion", "notes": "Reject weak/unusable shoots before sticking"},
            {"category": "Clonal Pathway", "assumption": "rooting_success_rate", "value": 0.68, "unit": "%", "economic_behaviour": "conversion", "notes": "Rural low-tech rooting success"},
            {"category": "Clonal Pathway", "assumption": "acclimatisation_survival_rate", "value": 0.90, "unit": "%", "economic_behaviour": "conversion", "notes": "Post-rooting transition survival"},
            {"category": "Clonal Pathway", "assumption": "hardening_survival_rate", "value": 0.93, "unit": "%", "economic_behaviour": "conversion", "notes": "Hardening-stage survival"},
            {"category": "Clonal Pathway", "assumption": "saleable_grade_acceptance_rate", "value": 0.95, "unit": "%", "economic_behaviour": "conversion", "notes": "Final saleable quality filter"},
            {"category": "Capacity", "assumption": "rooting_trays", "value": 420, "unit": "trays", "economic_behaviour": "physical throughput", "notes": "Reusable rooting trays"},
            {"category": "Capacity", "assumption": "cells_per_rooting_tray", "value": 98, "unit": "cells/tray", "economic_behaviour": "physical throughput", "notes": "Tray cell count"},
            {"category": "Capacity", "assumption": "rooting_cycles_per_year", "value": 3.0, "unit": "cycles/year", "economic_behaviour": "physical throughput", "notes": "Low-tech cycle rate"},
            {"category": "Capacity", "assumption": "base_capacity_utilisation_y1", "value": 0.55, "unit": "%", "economic_behaviour": "ramp-up", "notes": "Year 1 utilisation"},
            {"category": "Capacity", "assumption": "steady_state_capacity_utilisation", "value": 0.82, "unit": "%", "economic_behaviour": "ramp-up", "notes": "Long-run utilisation"},
            {"category": "Capacity", "assumption": "ramp_up_years", "value": 4, "unit": "years", "economic_behaviour": "ramp-up", "notes": "Years to steady state"},
            {"category": "Capacity", "assumption": "market_sales_rate", "value": 0.96, "unit": "%", "economic_behaviour": "market demand", "notes": "Share of saleable plants actually sold"},
            {"category": "Labour", "assumption": "family_labour_days_per_year", "value": 180, "unit": "days/year", "economic_behaviour": "economic cost optional", "notes": "Measured but not always cash-paid"},
            {"category": "Labour", "assumption": "family_labour_cash_cost_per_day", "value": 0.0, "unit": "USD/day", "economic_behaviour": "cash cost", "notes": "Set to zero for rural family contribution"},
            {"category": "Labour", "assumption": "family_labour_opportunity_cost_per_day", "value": 4.0, "unit": "USD/day", "economic_behaviour": "economic cost", "notes": "Optional economic cost"},
            {"category": "Labour", "assumption": "permanent_workers", "value": 1, "unit": "workers", "economic_behaviour": "fixed operating cost", "notes": "Paid full-time worker"},
            {"category": "Labour", "assumption": "permanent_worker_monthly_wage", "value": 120, "unit": "USD/month", "economic_behaviour": "fixed operating cost", "notes": "Rural wage assumption"},
            {"category": "Labour", "assumption": "manager_monthly_allowance", "value": 80, "unit": "USD/month", "economic_behaviour": "fixed operating cost", "notes": "Owner/manager allowance"},
            {"category": "Labour", "assumption": "seasonal_daily_wage", "value": 3.5, "unit": "USD/day", "economic_behaviour": "variable labour", "notes": "Task labour wage"},
            {"category": "Labour", "assumption": "cuttings_prepared_per_worker_day", "value": 1200, "unit": "cuttings/day", "economic_behaviour": "labour productivity", "notes": "Cutting preparation productivity"},
            {"category": "Labour", "assumption": "cuttings_stuck_per_worker_day", "value": 1000, "unit": "cuttings/day", "economic_behaviour": "labour productivity", "notes": "Sticking productivity"},
            {"category": "Labour", "assumption": "plants_graded_per_worker_day", "value": 1500, "unit": "plants/day", "economic_behaviour": "labour productivity", "notes": "Grading/dispatch productivity"},
            {"category": "Labour", "assumption": "payroll_burden_rate", "value": 0.03, "unit": "%", "economic_behaviour": "labour overhead", "notes": "Benefits, meals, incidentals"},
            {"category": "Inputs", "assumption": "rooting_media_cost_per_cutting", "value": 0.012, "unit": "USD/cutting stuck", "economic_behaviour": "plant-started variable cost", "notes": "Local mix / simple substrate"},
            {"category": "Inputs", "assumption": "container_cost_per_saleable_plant", "value": 0.025, "unit": "USD/saleable plant", "economic_behaviour": "saleable-plant variable cost", "notes": "Tube/polybag/sleeve equivalent"},
            {"category": "Inputs", "assumption": "rooting_hormone_cost_per_cutting", "value": 0.003, "unit": "USD/cutting stuck", "economic_behaviour": "plant-started variable cost", "notes": "Set zero if not used"},
            {"category": "Inputs", "assumption": "fertilizer_cost_per_saleable_plant", "value": 0.010, "unit": "USD/saleable plant", "economic_behaviour": "saleable-plant variable cost", "notes": "Fertigation/foliar/basic fertilizer"},
            {"category": "Inputs", "assumption": "plant_protection_cost_per_saleable_plant", "value": 0.006, "unit": "USD/saleable plant", "economic_behaviour": "saleable-plant variable cost", "notes": "Fungicide, insecticide, sanitation"},
            {"category": "Inputs", "assumption": "label_packaging_cost_per_sold_plant", "value": 0.004, "unit": "USD/plant sold", "economic_behaviour": "plant-sold variable cost", "notes": "Labels, bundling, packaging"},
            {"category": "Inputs", "assumption": "water_cost_per_plant_started", "value": 0.003, "unit": "USD/plant started", "economic_behaviour": "plant-started variable cost", "notes": "Water cash cost or pumping cost"},
            {"category": "Inputs", "assumption": "power_fuel_cost_per_year", "value": 300, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Pump fuel/charging/power"},
            {"category": "Inputs", "assumption": "tools_consumables_per_year", "value": 250, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Small tools, PPE, repairs"},
            {"category": "Genetic and Technical Access", "assumption": "annual_genetic_access_fee", "value": 0, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Consortium annual fee if applicable"},
            {"category": "Genetic and Technical Access", "assumption": "royalty_per_sold_plant", "value": 0, "unit": "USD/plant sold", "economic_behaviour": "plant-sold variable cost", "notes": "Clone royalty if applicable"},
            {"category": "Genetic and Technical Access", "assumption": "annual_certification_fee", "value": 0, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Certification/accreditation if applicable"},
            {"category": "Genetic and Technical Access", "assumption": "technical_support_fee_per_year", "value": 0, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "External technical support if applicable"},
            {"category": "Overheads", "assumption": "admin_cost_per_year", "value": 250, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Phone, stationery, local admin"},
            {"category": "Overheads", "assumption": "security_cost_per_year", "value": 120, "unit": "USD/year", "economic_behaviour": "annual fixed cost", "notes": "Low rural security assumption"},
            {"category": "Overheads", "assumption": "maintenance_rate_capex", "value": 0.04, "unit": "%", "economic_behaviour": "annual fixed cost", "notes": "Annual maintenance as share of initial physical CAPEX"},
            {"category": "Market", "assumption": "selling_price_per_plant_y1", "value": 0.30, "unit": "USD/plant", "economic_behaviour": "revenue", "notes": "Dummy rural clonal plant price"},
            {"category": "Market", "assumption": "transport_cost_per_sold_plant", "value": 0.010, "unit": "USD/plant sold", "economic_behaviour": "plant-sold variable cost", "notes": "Local delivery/collection support"},
            {"category": "Market", "assumption": "bad_debt_rate", "value": 0.01, "unit": "%", "economic_behaviour": "revenue leakage", "notes": "Non-payment / leakage"},
        ]
    )


def default_capex_assets() -> pd.DataFrame:
    rows = [
        {"category": "Land and Site", "asset": "Land lease deposit / access payment", "qty": 1, "unit_cost": 250, "life_years": 10, "replacement_rule": "none", "notes": "Small rural site access payment"},
        {"category": "Land and Site", "asset": "Clearing, levelling, drainage", "qty": 1, "unit_cost": 300, "life_years": 10, "replacement_rule": "none", "notes": "Basic site preparation"},
        {"category": "Land and Site", "asset": "Fencing", "qty": 1, "unit_cost": 450, "life_years": 7, "replacement_rule": "life", "notes": "Basic fencing"},
        {"category": "Water", "asset": "Water storage tank", "qty": 2, "unit_cost": 120, "life_years": 7, "replacement_rule": "life", "notes": "Small tanks"},
        {"category": "Water", "asset": "Pump / treadle / small motor pump", "qty": 1, "unit_cost": 280, "life_years": 5, "replacement_rule": "life", "notes": "Simple water movement"},
        {"category": "Water", "asset": "Basic hoses and irrigation lines", "qty": 1, "unit_cost": 220, "life_years": 3, "replacement_rule": "life", "notes": "Low-cost irrigation"},
        {"category": "Water", "asset": "Automated misting / fogging system", "qty": 0, "unit_cost": 3000, "life_years": 5, "replacement_rule": "life", "notes": "Advanced nursery feature; inactive here"},
        {"category": "Water", "asset": "Filtration and fertigation system", "qty": 0, "unit_cost": 1800, "life_years": 6, "replacement_rule": "life", "notes": "Advanced nursery feature; inactive here"},
        {"category": "Production Structures", "asset": "Mother stock beds", "qty": 1, "unit_cost": 300, "life_years": 5, "replacement_rule": "life", "notes": "Basic hedge/mother stock beds"},
        {"category": "Production Structures", "asset": "Low-cost rooting humidity chamber", "qty": 1, "unit_cost": 700, "life_years": 4, "replacement_rule": "life", "notes": "Pragmatic low-tech rooting structure"},
        {"category": "Production Structures", "asset": "Shade-net house", "qty": 1, "unit_cost": 900, "life_years": 4, "replacement_rule": "life", "notes": "Basic shade structure"},
        {"category": "Production Structures", "asset": "Hardening area / open benches", "qty": 1, "unit_cost": 450, "life_years": 5, "replacement_rule": "life", "notes": "Basic hardening area"},
        {"category": "Production Structures", "asset": "Advanced greenhouse/polyhouse", "qty": 0, "unit_cost": 12000, "life_years": 8, "replacement_rule": "life", "notes": "Advanced nursery feature; inactive here"},
        {"category": "Equipment", "asset": "Rooting trays", "qty": 420, "unit_cost": 1.2, "life_years": 3, "replacement_rule": "life", "notes": "Reusable trays"},
        {"category": "Equipment", "asset": "Work tables / benches", "qty": 6, "unit_cost": 45, "life_years": 5, "replacement_rule": "life", "notes": "Cutting prep and grading"},
        {"category": "Equipment", "asset": "Hand tools and pruning tools", "qty": 1, "unit_cost": 220, "life_years": 3, "replacement_rule": "life", "notes": "Tools"},
        {"category": "Equipment", "asset": "Wheelbarrow / trolleys / crates", "qty": 1, "unit_cost": 180, "life_years": 4, "replacement_rule": "life", "notes": "Movement and dispatch"},
        {"category": "Equipment", "asset": "pH/EC meter and small measuring tools", "qty": 1, "unit_cost": 150, "life_years": 4, "replacement_rule": "life", "notes": "Basic quality control"},
        {"category": "Buildings", "asset": "Small storage shed", "qty": 1, "unit_cost": 380, "life_years": 7, "replacement_rule": "life", "notes": "Input and tool storage"},
        {"category": "Buildings", "asset": "Worker shelter / simple office", "qty": 1, "unit_cost": 300, "life_years": 7, "replacement_rule": "life", "notes": "Basic facility"},
        {"category": "Advanced Systems", "asset": "Traceability / nursery software setup", "qty": 0, "unit_cost": 1000, "life_years": 5, "replacement_rule": "life", "notes": "Inactive here"},
        {"category": "Advanced Systems", "asset": "Barcode printer / labels system", "qty": 0, "unit_cost": 800, "life_years": 5, "replacement_rule": "life", "notes": "Inactive here"},
        {"category": "Intangible Access", "asset": "Initial genetic access / consortium fee", "qty": 0, "unit_cost": 5000, "life_years": 5, "replacement_rule": "none", "notes": "Set positive for consortium/access model"},
        {"category": "Intangible Access", "asset": "Initial certification / accreditation fee", "qty": 0, "unit_cost": 1000, "life_years": 3, "replacement_rule": "none", "notes": "Set positive for certified nursery"},
    ]
    out = pd.DataFrame(rows)
    out["initial_cost"] = out["qty"] * out["unit_cost"]
    out["is_physical_capex"] = ~out["category"].isin(["Intangible Access"])
    return out


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


def capex_assets_from_payload(payload: ClonalEucalyptusNurseryRequest) -> pd.DataFrame:
    if not payload.capex_assets:
        return default_capex_assets()
    capex_assets = pd.DataFrame(payload.capex_assets)
    required = {"category", "asset", "qty", "unit_cost", "life_years", "replacement_rule", "notes"}
    missing = required - set(capex_assets.columns)
    if missing:
        raise ValueError(f"capex_assets is missing required column(s): {sorted(missing)}")
    capex_assets = capex_assets[["category", "asset", "qty", "unit_cost", "life_years", "replacement_rule", "notes"]].copy()
    for column in ["qty", "unit_cost", "life_years"]:
        capex_assets[column] = pd.to_numeric(capex_assets[column], errors="raise")
    capex_assets["initial_cost"] = capex_assets["qty"] * capex_assets["unit_cost"]
    capex_assets["is_physical_capex"] = ~capex_assets["category"].isin(["Intangible Access"])
    return capex_assets


def assumptions_from_payload(payload: ClonalEucalyptusNurseryRequest) -> tuple[pd.DataFrame, dict[str, float]]:
    assumptions = _coerce_assumption_rows(payload.assumptions)
    values = assumptions.set_index("assumption")["value"].to_dict()
    if not payload.assumptions:
        for key, value in payload.model_dump().items():
            if key in values:
                values[key] = value
                assumptions.loc[assumptions["assumption"] == key, "value"] = value
    return assumptions, values


def ramped_utilisation(year: int, y1_util: float, steady_util: float, ramp_years: int) -> float:
    if ramp_years <= 1:
        return float(steady_util)
    progress = min(max((year - 1) / (ramp_years - 1), 0), 1)
    return float(y1_util + progress * (steady_util - y1_util))


def build_production_schedule(A: dict[str, float]) -> pd.DataFrame:
    rows = []
    for year in range(1, int(A["model_years"]) + 1):
        inflation_factor = (1 + A["inflation_rate"]) ** (year - 1)
        utilisation = ramped_utilisation(
            year,
            A["base_capacity_utilisation_y1"],
            A["steady_state_capacity_utilisation"],
            int(A["ramp_up_years"]),
        )
        seeds_sown = A["seeds_sown_capacity"] * A["seed_based_share"] * utilisation
        seed_saleable = (
            seeds_sown
            * A["germination_rate"]
            * A["transplant_survival_rate"]
            * A["seedling_hardening_survival_rate"]
            * A["seedling_saleable_acceptance_rate"]
        )
        gross_cuttings = (
            A["mother_plants"]
            * A["shoots_per_mother_per_harvest"]
            * A["harvests_per_year"]
        )
        usable_cuttings = gross_cuttings * A["cutting_selection_rate"]
        annual_sticking_capacity = (
            A["rooting_trays"]
            * A["cells_per_rooting_tray"]
            * A["rooting_cycles_per_year"]
            * utilisation
        )
        cuttings_stuck = min(usable_cuttings, annual_sticking_capacity) * A["clonal_share"]
        rooted_cuttings = cuttings_stuck * A["rooting_success_rate"]
        acclimatised_plants = rooted_cuttings * A["acclimatisation_survival_rate"]
        hardened_plants = acclimatised_plants * A["hardening_survival_rate"]
        clonal_saleable = hardened_plants * A["saleable_grade_acceptance_rate"]
        total_saleable = seed_saleable + clonal_saleable
        sold_plants = total_saleable * A["market_sales_rate"]
        total_plants_started = seeds_sown + cuttings_stuck
        rows.append(
            {
                "year": year,
                "inflation_factor": inflation_factor,
                "capacity_utilisation": utilisation,
                "gross_cuttings_available": gross_cuttings,
                "usable_cuttings": usable_cuttings,
                "annual_sticking_capacity": annual_sticking_capacity,
                "cuttings_stuck": cuttings_stuck,
                "rooted_cuttings": rooted_cuttings,
                "acclimatised_plants": acclimatised_plants,
                "hardened_plants": hardened_plants,
                "saleable_clonal_plants": clonal_saleable,
                "saleable_seed_plants": seed_saleable,
                "total_saleable_plants": total_saleable,
                "sold_plants": sold_plants,
                "unsold_saleable_plants": total_saleable - sold_plants,
                "total_plants_started": total_plants_started,
                "total_propagation_loss": total_plants_started - total_saleable,
                "overall_yield_efficiency": safe_div(total_saleable, total_plants_started),
                "rooting_capacity_utilisation": safe_div(cuttings_stuck, annual_sticking_capacity),
                "mother_stock_utilisation": safe_div(cuttings_stuck, usable_cuttings),
                "bottleneck": "Mother stock constrained"
                if usable_cuttings < annual_sticking_capacity
                else "Rooting capacity constrained",
            }
        )
    return pd.DataFrame(rows)


def build_opex_schedule(
    A: dict[str, float],
    production_df: pd.DataFrame,
    capex_assets: pd.DataFrame,
) -> pd.DataFrame:
    physical_initial_capex = capex_assets.loc[
        capex_assets["is_physical_capex"], "initial_cost"
    ].sum()
    rows = []
    for _, p in production_df.iterrows():
        year = int(p["year"])
        infl = p["inflation_factor"]
        cuttings_stuck = p["cuttings_stuck"]
        saleable = p["total_saleable_plants"]
        sold = p["sold_plants"]

        prep_days = cuttings_stuck / A["cuttings_prepared_per_worker_day"]
        sticking_days = cuttings_stuck / A["cuttings_stuck_per_worker_day"]
        grading_days = saleable / A["plants_graded_per_worker_day"]
        seasonal_days = prep_days + sticking_days + grading_days

        family_labour_cash = A["family_labour_days_per_year"] * A["family_labour_cash_cost_per_day"] * infl
        family_labour_economic = A["family_labour_days_per_year"] * A["family_labour_opportunity_cost_per_day"] * infl
        permanent_labour = A["permanent_workers"] * A["permanent_worker_monthly_wage"] * 12 * infl
        management = A["manager_monthly_allowance"] * 12 * infl
        seasonal_labour = seasonal_days * A["seasonal_daily_wage"] * infl
        payroll_burden = (
            family_labour_cash + permanent_labour + management + seasonal_labour
        ) * A["payroll_burden_rate"]

        cost_items = {
            "Family labour cash": family_labour_cash,
            "Permanent labour": permanent_labour,
            "Management allowance": management,
            "Seasonal labour": seasonal_labour,
            "Payroll burden": payroll_burden,
            "Rooting media": cuttings_stuck * A["rooting_media_cost_per_cutting"] * infl,
            "Containers": saleable * A["container_cost_per_saleable_plant"] * infl,
            "Rooting hormone": cuttings_stuck * A["rooting_hormone_cost_per_cutting"] * infl,
            "Fertilizer": saleable * A["fertilizer_cost_per_saleable_plant"] * infl,
            "Plant protection and sanitation": saleable * A["plant_protection_cost_per_saleable_plant"] * infl,
            "Labels and packaging": sold * A["label_packaging_cost_per_sold_plant"] * infl,
            "Water": p["total_plants_started"] * A["water_cost_per_plant_started"] * infl,
            "Power and fuel": A["power_fuel_cost_per_year"] * infl,
            "Tools and consumables": A["tools_consumables_per_year"] * infl,
            "Annual genetic access fee": A["annual_genetic_access_fee"] * infl,
            "Annual certification fee": A["annual_certification_fee"] * infl,
            "Technical support fee": A["technical_support_fee_per_year"] * infl,
            "Royalty": sold * A["royalty_per_sold_plant"] * infl,
            "Admin": A["admin_cost_per_year"] * infl,
            "Security": A["security_cost_per_year"] * infl,
            "Maintenance": physical_initial_capex * A["maintenance_rate_capex"] * infl,
            "Transport": sold * A["transport_cost_per_sold_plant"] * infl,
        }

        for item, cost in cost_items.items():
            rows.append({"year": year, "cost_item": item, "cost": float(cost)})
        rows.append(
            {
                "year": year,
                "cost_item": "Family labour opportunity cost (memo)",
                "cost": float(family_labour_economic),
            }
        )

    return pd.DataFrame(rows)


def replacement_capex_by_year(capex_assets: pd.DataFrame, model_years: int) -> pd.DataFrame:
    rows = []
    for year in range(0, model_years + 1):
        for _, asset in capex_assets.iterrows():
            cost = 0.0
            if year == 0:
                cost = asset["initial_cost"]
            elif (
                asset["replacement_rule"] == "life"
                and asset["life_years"] > 0
                and year % int(asset["life_years"]) == 0
            ):
                cost = asset["initial_cost"]
            rows.append(
                {
                    "year": year,
                    "asset": asset["asset"],
                    "category": asset["category"],
                    "capex": cost,
                }
            )
    return pd.DataFrame(rows)


def annual_depreciation(capex_assets: pd.DataFrame) -> float:
    return float(
        capex_assets.apply(
            lambda row: row["initial_cost"] / row["life_years"]
            if row["life_years"] > 0
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
    capex_df = replacement_capex_by_year(capex_assets, int(A["model_years"]))
    annual_dep = annual_depreciation(capex_assets)
    rows = []
    previous_working_capital = 0.0

    for year in range(0, int(A["model_years"]) + 1):
        if year == 0:
            revenue = opex = ebitda = depreciation = ebit = tax = 0.0
            operating_cashflow = working_capital = wc_change = 0.0
            plants_sold = saleable = 0.0
        else:
            p = production_df.loc[production_df["year"] == year].iloc[0]
            price = A["selling_price_per_plant_y1"] * p["inflation_factor"]
            gross_revenue = p["sold_plants"] * price
            bad_debt = gross_revenue * A["bad_debt_rate"]
            revenue = gross_revenue - bad_debt
            opex = opex_cash_df.loc[opex_cash_df["year"] == year, "cost"].sum()
            ebitda = revenue - opex
            depreciation = annual_dep
            ebit = ebitda - depreciation
            tax = max(0.0, ebit * A["tax_rate"])
            operating_cashflow = ebitda - tax
            working_capital = revenue * A["working_capital_pct_revenue"]
            wc_change = working_capital - previous_working_capital
            previous_working_capital = working_capital
            plants_sold = p["sold_plants"]
            saleable = p["total_saleable_plants"]

        capex = capex_df.loc[capex_df["year"] == year, "capex"].sum()
        free_cashflow = operating_cashflow - capex - wc_change
        rows.append(
            {
                "year": year,
                "saleable_plants": saleable,
                "plants_sold": plants_sold,
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
                "free_cashflow": free_cashflow,
            }
        )

    out = pd.DataFrame(rows)
    out["cumulative_free_cashflow"] = out["free_cashflow"].cumsum()
    out["discount_factor"] = 1 / ((1 + A["discount_rate"]) ** out["year"])
    out["discounted_fcf"] = out["free_cashflow"] * out["discount_factor"]
    out["cumulative_discounted_fcf"] = out["discounted_fcf"].cumsum()
    out["cost_per_saleable_plant"] = out.apply(
        lambda row: safe_div(row["opex"], row["saleable_plants"], np.nan),
        axis=1,
    )
    out["cash_cost_per_sold_plant"] = out.apply(
        lambda row: safe_div(row["opex"], row["plants_sold"], np.nan),
        axis=1,
    )
    out["revenue_per_sold_plant"] = out.apply(
        lambda row: safe_div(row["revenue"], row["plants_sold"], np.nan),
        axis=1,
    )
    out["ebitda_margin"] = out.apply(
        lambda row: safe_div(row["ebitda"], row["revenue"], np.nan),
        axis=1,
    )
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


def build_dashboard(
    financial_df: pd.DataFrame,
    production_df: pd.DataFrame,
    metrics: dict[str, Any],
) -> list[dict[str, Any]]:
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


def run_npv_with_override(
    base_A: dict[str, float],
    capex_assets: pd.DataFrame,
    overrides: dict[str, float],
) -> float:
    A = dict(base_A)
    A.update(overrides)
    production = build_production_schedule(A)
    opex = build_opex_schedule(A, production, capex_assets)
    opex_cash = opex[~opex["cost_item"].str.contains("memo", case=False)].copy()
    financial, _ = build_financial_model(A, production, opex_cash, capex_assets)
    return npv(A["discount_rate"], financial["free_cashflow"].to_numpy(dtype=float))


def build_sensitivity(
    A: dict[str, float],
    capex_assets: pd.DataFrame,
    base_npv: float,
) -> list[dict[str, Any]]:
    specs = [
        {"assumption": "selling_price_per_plant_y1", "label": "Selling price", "low_mult": 0.85, "high_mult": 1.15},
        {"assumption": "rooting_success_rate", "label": "Rooting success", "low_mult": 0.90, "high_mult": 1.10},
        {"assumption": "market_sales_rate", "label": "Market sales rate", "low_mult": 0.92, "high_mult": 1.05},
        {"assumption": "steady_state_capacity_utilisation", "label": "Capacity utilisation", "low_mult": 0.85, "high_mult": 1.10},
        {"assumption": "rooting_media_cost_per_cutting", "label": "Rooting media cost", "low_mult": 0.80, "high_mult": 1.25},
        {"assumption": "container_cost_per_saleable_plant", "label": "Container cost", "low_mult": 0.80, "high_mult": 1.25},
        {"assumption": "permanent_worker_monthly_wage", "label": "Permanent wage", "low_mult": 0.80, "high_mult": 1.25},
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
            out[column] = out[column].map(
                lambda value: round(float(value), digits) if value is not None else None
            )
    return out.to_dict(orient="records")


def clonal_nursery_default_library() -> dict[str, Any]:
    return {
        "base_currency": BASE_CURRENCY,
        "library": {
            "assumptions": dataframe_to_records(default_assumptions(), 4),
            "capex_assets": dataframe_to_records(default_capex_assets(), 4),
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


def run_clonal_eucalyptus_nursery(
    payload: ClonalEucalyptusNurseryRequest,
) -> dict[str, Any]:
    assumption_df, assumptions = assumptions_from_payload(payload)
    capex_assets = capex_assets_from_payload(payload)
    production_df = build_production_schedule(assumptions)
    opex_detail_df = build_opex_schedule(assumptions, production_df, capex_assets)
    opex_cash_df = opex_detail_df[
        ~opex_detail_df["cost_item"].str.contains("memo", case=False)
    ].copy()
    financial_df, capex_by_year_df = build_financial_model(
        assumptions,
        production_df,
        opex_cash_df,
        capex_assets,
    )
    metrics = investment_metrics(financial_df, assumptions)
    dashboard_rows = build_dashboard(financial_df, production_df, metrics)
    capex_summary = (
        capex_assets.groupby("category", as_index=False)["initial_cost"]
        .sum()
        .sort_values("initial_cost", ascending=False)
        .reset_index(drop=True)
    )
    opex_summary = (
        opex_cash_df.groupby(["year", "cost_item"], as_index=False)["cost"]
        .sum()
        .sort_values(["year", "cost"], ascending=[True, False])
        .reset_index(drop=True)
    )
    sensitivity_rows = build_sensitivity(assumptions, capex_assets, metrics["NPV"])

    return {
        "request": payload.model_dump(),
        "base_currency": BASE_CURRENCY,
        "assumptions": [
            "This is the notebook's pragmatic rural clonal eucalyptus nursery case, with advanced nursery features inactive unless their costs are raised.",
            "Production is constrained by mother stock supply or rooting tray capacity after applying biological conversion rates.",
            "Revenue, most costs, and working capital are escalated by the selected annual inflation rate.",
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
