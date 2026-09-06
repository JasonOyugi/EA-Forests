from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.domain.units import convert
from app.domain.values import EpistemicClass, Uncertainty, Value, visible_at
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.market_databases import numeric, synthetic_record


@pytest.mark.parametrize(
    "value,source,target,expected",
    [
        (31.7, "cm", "m", "0.317"),
        (1, "ha", "m2", "10000"),
        (1, "km2", "ha", "100"),
        (86, "percent", "fraction", "0.86"),
        (47, "tonne", "kg", "47000"),
        (2, "m3", "L", "2000"),
        (22, "tonne/day", "kg/day", "22000"),
        (0, "UGX/tonne", "UGX/tonne", "0"),
    ],
)
def test_exact_units(value, source, target, expected):
    assert convert(value, source, target) == Decimal(expected)


@pytest.mark.parametrize(
    "source,target", [("m3", "tonne"), ("UGX", "USD"), ("cm", "ha"), ("DBH", "cm")]
)
def test_no_implicit_physical_or_financial_conversion(source, target):
    with pytest.raises(ValueError):
        convert(1, source, target)


def test_missing_is_not_zero():
    assert Value(numeric_value=0, unit="cm").numeric_value == 0
    assert Value(missingness="NOT_MEASURED").numeric_value is None
    assert numeric("") is None and numeric(None) is None and numeric("unknown") is None
    assert numeric(0) == 0 and numeric(False) is None
    with pytest.raises(ValidationError):
        Value(numeric_value=0, unit="cm", missingness="UNKNOWN")


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"numeric_value": 2},
        {"numeric_value": "NaN", "unit": "cm"},
        {"text_value": "a", "boolean_value": False},
    ],
)
def test_typed_values(data):
    with pytest.raises(ValidationError):
        Value(**data)


def test_uncertainty_and_epistemics():
    assert len(EpistemicClass) == 9
    assert EpistemicClass.REPORTED != EpistemicClass.OBSERVED
    with pytest.raises(ValidationError):
        Uncertainty(lower=20, upper=10)
    with pytest.raises(ValidationError):
        Uncertainty(standard_error=-1)


def test_bitemporal_half_open_boundaries():
    july1 = datetime(2026, 7, 1, tzinfo=UTC)
    july18 = july1 + timedelta(days=17)
    august1 = july1 + timedelta(days=31)
    fact = {"valid_from": july1, "valid_to": august1, "recorded_at": july18, "superseded_at": None}
    assert not visible_at(fact, july1, july18 - timedelta(seconds=1))
    assert visible_at(fact, july1, july18)
    assert not visible_at(fact, august1, august1)
    fact["superseded_at"] = august1
    assert not visible_at(fact, july1, august1)


def test_artifacts_preserve_exact_bytes_and_detect_tampering(tmp_path):
    store = LocalArtifactStore(tmp_path)
    content = b'\xef\xbb\xbf{ "spacing": 1 }\r\n'
    uri, digest = store.put(content)
    assert store.get(uri) == content
    assert store.put(content)[0] == uri
    with pytest.raises(ValueError):
        store.get("sha256:../../secret")
    (tmp_path / digest[:2] / digest).write_bytes(b"changed")
    with pytest.raises(ValueError):
        store.get(uri)


def test_mixed_dummy_records_are_quarantined():
    assert synthetic_record(
        {"verification": "State Verified", "Comments": "Dummy functional test data"}
    )
    assert not synthetic_record({"verification": "State Verified", "Data source": "registry.kml"})


def test_concurrent_artifact_publication(tmp_path):
    from concurrent.futures import ThreadPoolExecutor

    store = LocalArtifactStore(tmp_path)
    content = b"original record" * 10000
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: store.put(content), range(12)))
    assert len({uri for uri, _ in results}) == 1
    assert store.get(results[0][0]) == content
    assert not list(tmp_path.rglob("*.tmp"))
