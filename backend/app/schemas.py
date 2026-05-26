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
    message: str
