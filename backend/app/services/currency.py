from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import requests


SUPPORTED_CURRENCIES = ["USD", "KES", "TZS", "UGX", "GBP"]
FALLBACK_USD_RATES = {
    "USD": 1.0,
    "KES": 129.0,
    "TZS": 2600.0,
    "UGX": 3700.0,
    "GBP": 0.79,
}

_CACHE: dict[str, Any] = {
    "expires_at": datetime.min.replace(tzinfo=UTC),
    "payload": None,
}


def _fallback_payload(message: str) -> dict[str, Any]:
    return {
        "base": "USD",
        "rates": FALLBACK_USD_RATES,
        "currencies": SUPPORTED_CURRENCIES,
        "source": "fallback_static",
        "as_of": datetime.now(UTC).date().isoformat(),
        "message": message,
    }


def get_currency_rates() -> dict[str, Any]:
    now = datetime.now(UTC)
    if _CACHE["payload"] is not None and _CACHE["expires_at"] > now:
        return _CACHE["payload"]

    try:
        response = requests.get(
            "https://open.er-api.com/v6/latest/USD",
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        raw_rates = payload.get("rates", {})
        rates = {
            code: float(raw_rates[code])
            for code in SUPPORTED_CURRENCIES
            if code in raw_rates
        }
        missing = [code for code in SUPPORTED_CURRENCIES if code not in rates]
        if missing:
            raise ValueError(f"Missing currency rates: {', '.join(missing)}")

        out = {
            "base": "USD",
            "rates": rates,
            "currencies": SUPPORTED_CURRENCIES,
            "source": "open.er-api.com",
            "as_of": payload.get("time_last_update_utc")
            or now.date().isoformat(),
            "message": "Live rates loaded.",
        }
    except Exception as exc:
        out = _fallback_payload(f"Live currency rates unavailable: {exc}")

    _CACHE["payload"] = out
    _CACHE["expires_at"] = now + timedelta(hours=6)
    return out
