"""Small exact registry. Currency exchange and density are deliberately not conversions."""

from decimal import Decimal

# symbol -> (dimension, multiplier to the dimension's base unit)
UNITS = {
    "cm": ("length", "0.01"),
    "m": ("length", "1"),
    "km": ("length", "1000"),
    "m2": ("area", "1"),
    "ha": ("area", "10000"),
    "km2": ("area", "1000000"),
    "m3": ("volume", "1"),
    "L": ("volume", "0.001"),
    "kg": ("mass", "1"),
    "tonne": ("mass", "1000"),
    "fraction": ("fraction", "1"),
    "percent": ("fraction", "0.01"),
    "trees": ("count", "1"),
    "trees/ha": ("stocking", "1"),
    "m3/ha": ("volume_per_area", "1"),
    "tonne/day": ("mass_rate", "1000"),
    "kg/day": ("mass_rate", "1"),
    "m3/day": ("volume_rate", "1"),
    "m3/year": ("annual_volume", "1"),
    "L/m3": ("fuel_intensity", "1"),
    "kg/m3": ("density", "1"),
    "UGX": ("UGX", "1"),
    "USD": ("USD", "1"),
    "UGX/tonne": ("UGX_mass", "1"),
    "USD/tonne": ("USD_mass", "1"),
    "UGX/m3": ("UGX_volume", "1"),
    "USD/m3": ("USD_volume", "1"),
    "USD/ha/year": ("USD_area_year", "1"),
    "UGX/L": ("UGX_fuel", "1"),
    "USD/seedling": ("USD_seedling", "1"),
    "UGX/USD": ("exchange_UGX_USD", "1"),
    "date/time": ("time_instant", "1"),
    "hour": ("duration", "1"),
}


def convert(value: Decimal | float | str, source: str, target: str) -> Decimal:
    if source not in UNITS or target not in UNITS:
        raise ValueError("Unregistered unit")
    dimension, scale = UNITS[source]
    target_dimension, target_scale = UNITS[target]
    if dimension != target_dimension or dimension == "time_instant":
        raise ValueError(f"Cannot convert {source} to {target} without a model or explicit context")
    number = Decimal(str(value))
    if not number.is_finite():
        raise ValueError("Value must be finite")
    return number * Decimal(scale) / Decimal(target_scale)
