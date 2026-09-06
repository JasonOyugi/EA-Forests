from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class EpistemicClass(StrEnum):
    OBSERVED = "OBSERVED"
    REPORTED = "REPORTED"
    DERIVED = "DERIVED"
    INFERRED = "INFERRED"
    ASSUMED = "ASSUMED"
    FORECAST = "FORECAST"
    SCENARIO = "SCENARIO"
    SYNTHETIC = "SYNTHETIC"
    UNKNOWN = "UNKNOWN"


class Missingness(StrEnum):
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    NOT_MEASURED = "NOT_MEASURED"
    NOT_REPORTED = "NOT_REPORTED"
    WITHHELD = "WITHHELD"
    CONFIDENTIAL = "CONFIDENTIAL"


class Uncertainty(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    standard_error: float | None = Field(default=None, ge=0)
    standard_deviation: float | None = Field(default=None, ge=0)
    lower: float | None = None
    upper: float | None = None
    measurement_precision: float | None = Field(default=None, ge=0)
    distribution_family: str | None = None

    @model_validator(mode="after")
    def ordered_interval(self):
        if self.lower is not None and self.upper is not None and self.lower > self.upper:
            raise ValueError("lower must not exceed upper")
        return self


class Value(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    numeric_value: Decimal | None = None
    text_value: str | None = None
    boolean_value: bool | None = None
    categorical_value: str | None = None
    structured_value: dict[str, Any] | list[Any] | None = None
    datetime_value: AwareDatetime | None = None
    missingness: Missingness | None = None
    unit: str | None = None

    @model_validator(mode="after")
    def exactly_one_value(self):
        fields = ("numeric", "text", "boolean", "categorical", "structured", "datetime")
        count = sum(getattr(self, f"{key}_value") is not None for key in fields)
        if count != (0 if self.missingness else 1):
            raise ValueError("Provide exactly one typed value OR an explicit missingness reason")
        if self.numeric_value is not None and not self.unit:
            raise ValueError("Numeric values require a unit")
        if self.numeric_value is not None and not self.numeric_value.is_finite():
            raise ValueError("Numeric values must be finite")
        return self


class FactCreate(Value):
    subject_entity_id: UUID
    variable_key: str
    world_id: UUID
    source_id: UUID
    evidence_item_id: UUID
    epistemic_class: EpistemicClass
    method: str = Field(min_length=1)
    observed_at: AwareDatetime | None = None
    valid_from: AwareDatetime | None = None
    valid_to: AwareDatetime | None = None
    sampling_protocol: str | None = None
    observer_entity_id: UUID | None = None
    geometry_observation_id: UUID | None = None
    uncertainty: Uncertainty = Field(default_factory=Uncertainty)
    quality_status: Literal["unreviewed", "accepted", "flagged", "rejected"] = "unreviewed"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def interval(self):
        if self.valid_from and self.valid_to and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must be after valid_from; intervals are [from,to)")
        return self


def visible_at(row: dict, valid_at: datetime, known_at: datetime) -> bool:
    """Bitemporal reference predicate, also used to test boundary semantics."""
    return (
        (row.get("valid_from") is None or row["valid_from"] <= valid_at)
        and (row.get("valid_to") is None or valid_at < row["valid_to"])
        and row["recorded_at"] <= known_at
        and (row.get("superseded_at") is None or known_at < row["superseded_at"])
    )
