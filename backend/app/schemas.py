from typing import Literal

from pydantic import BaseModel, Field


SourceName = Literal["terraclimate", "chirps", "nasa_power", "era5_land_ee"]
DataType = Literal["dynamic", "static"]
DynamicMetricGroup = Literal[
    "temperature",
    "water",
    "demand_stress",
    "radiation_wind",
]
StaticMetricGroup = Literal["topography", "soil"]
SummaryLevel = Literal["full", "monthly", "annual"]
AgreementFamily = Literal[
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


class SiteClassificationRequest(BaseModel):
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)
    start_year: int = Field(..., ge=1950, le=2100)
    end_year: int = Field(..., ge=1950, le=2100)
    site_id: str = Field(default="site")
    sources: list[SourceName] = Field(default_factory=list)
    data_types: list[DataType] = Field(default_factory=list)
    dynamic_metric_groups: list[DynamicMetricGroup] = Field(default_factory=list)
    static_metric_groups: list[StaticMetricGroup] = Field(default_factory=list)
    summary_levels: list[SummaryLevel] = Field(default_factory=list)
    agreement_families: list[AgreementFamily] = Field(default_factory=list)
    climate_buffer_m: int = Field(default=5000, ge=0, le=50000)
    topo_buffer_m: int = Field(default=300, ge=0, le=10000)
    min_overlap: int = Field(default=12, ge=1, le=500)


class EarthEngineStatusResponse(BaseModel):
    available: bool
    authenticated: bool
    required: bool = True
    message: str


class CommercialForestViabilityRequest(BaseModel):
    rotation_year: int = Field(default=8, ge=4, le=15)
    thinning: Literal["yes", "no"] = "yes"
    qty_weight: float = Field(default=1, ge=0, le=1)
    wage_weight: float = Field(default=1, ge=0, le=1)
    labour_mix: Literal["unskilled", "skilled"] = "skilled"
    skilled_factor: float = Field(default=0.75, ge=0.1, le=1)
    d1: float = Field(default=0.85, ge=0, le=1)
    d2: float = Field(default=0.75, ge=0, le=1)
    initial_trees_per_ha: float = Field(default=1111, ge=0)
    area_ha: float = Field(default=1, gt=0)
    thinnings: dict[int, float] = Field(default_factory=lambda: {4: 0.30, 7: 0.30})
    price_thinning_tree: dict[int, float] = Field(
        default_factory=lambda: {4: 5_000, 7: 8_000}
    )
    final_harvest_year: int | None = Field(default=None, ge=1, le=15)
    price_final_tree: float = Field(default=35_000, ge=0)
    discount_rate: float = Field(default=0.15, ge=0, le=1)


class RoundwoodProductionRequest(BaseModel):
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)
    species: Literal["euc", "pine"] = "euc"
    processor_count: int = Field(default=3, ge=1, le=5)
    processor_names: list[str] = Field(default_factory=list)
    use_processor_specs: bool = True

    felling_method: Literal["chainsaw", "harvester"] = "chainsaw"
    extraction_method: Literal["manual", "tractor", "bell_logger"] = "tractor"
    loading_method: Literal["manual", "machine"] = "manual"
    equipment_regime: Literal["rented", "owned"] = "rented"

    harvest_area_ha: float = Field(default=1.0, gt=0)
    stems_per_ha: float = Field(default=545, gt=0)
    mean_tree_dbh: float = Field(default=35.0, gt=0)
    std_tree_dbh: float = Field(default=5.0, ge=0)
    mean_tree_h: float = Field(default=10.0, gt=0)
    std_tree_h: float = Field(default=3.0, ge=0)
    mean_tree_density: float = Field(default=0.70, gt=0)
    std_tree_density: float = Field(default=0.05, ge=0)
    form_factor: float = Field(default=0.45, gt=0, le=1)

    g1_dbh_min: float = Field(default=30.0, ge=0)
    g1_h_min: float = Field(default=2.7, ge=0)
    g2_dbh_min: float = Field(default=20.0, ge=0)
    g2_h_min: float = Field(default=2.7, ge=0)
    g3_dbh_min: float = Field(default=15.0, ge=0)
    g3_h_min: float = Field(default=2.7, ge=0)
    loss_g1: float = Field(default=0.10, ge=0, le=1)
    loss_g2: float = Field(default=0.10, ge=0, le=1)
    loss_g3: float = Field(default=0.10, ge=0, le=1)
    loss_reject: float = Field(default=0.0, ge=0, le=1)

    price_mode: Literal["per_m3", "per_tonne"] = "per_tonne"
    price_g1: float = Field(default=125_000, ge=0)
    price_g2: float = Field(default=115_000, ge=0)
    price_g3: float = Field(default=105_000, ge=0)
    price_reject: float = Field(default=0, ge=0)

    v_mensuration: float = Field(default=0.5, ge=0, le=1)
    v_felling: float = Field(default=0.5, ge=0, le=1)
    v_extraction: float = Field(default=0.5, ge=0, le=1)
    v_loading: float = Field(default=0.5, ge=0, le=1)
    v_haulage: float = Field(default=0.5, ge=0, le=1)
    v_regulatory: float = Field(default=0.5, ge=0, le=1)
    v_misc: float = Field(default=0.5, ge=0, le=1)
    lambda_wage: float = Field(default=0.5, ge=0, le=1)
    lambda_price: float = Field(default=0.5, ge=0, le=1)
    p_allowance: float = Field(default=0.5, ge=0, le=1)
    p_permit: float = Field(default=0.5, ge=0, le=1)

    haulage_mode: Literal["direct", "aggregation"] = "aggregation"
    road_distance_factor: float = Field(default=1.25, ge=1, le=3)
    forest_to_node_km: float = Field(default=7.0, ge=0)
    payload_direct_m3: float = Field(default=10.0, gt=0)
    payload_forest_to_node_m3: float = Field(default=8.0, gt=0)
    payload_node_to_factory_m3: float = Field(default=12.0, gt=0)

    n_draws: int = Field(default=30_000, ge=1_000, le=200_000)
    rng_seed: int = Field(default=7, ge=0)
