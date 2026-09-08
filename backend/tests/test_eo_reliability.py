"""Bounded Earth Engine evaluation latency: backoff, work-unit clock, circuit
breaker (Uganda S2 history v0.1, Parts 2-5). Pure-Python, no database.
"""

from datetime import UTC, datetime, timedelta

import pytest

from app.services.eo.provider import ProviderError
from app.services.eo.reliability import (
    CircuitBreaker,
    WorkUnitClock,
    compute_backoff_seconds,
    retry_not_before,
)


class _RaisingEEObject:
    """Stands in for an ``ee.ComputedObject`` whose ``.getInfo()`` fails --
    exercises ``ee_provider._getinfo``'s classification without needing a
    live Earth Engine call (or even ``ee.Initialize()``): ``_getinfo`` only
    calls ``.getInfo()`` on whatever it is given.
    """

    def __init__(self, exc: Exception):
        self._exc = exc

    def getInfo(self):
        raise self._exc


def test_getinfo_classifies_timeout_error_as_retryable_provider_timeout():
    from app.services.eo.ee_provider import _getinfo

    with pytest.raises(ProviderError) as excinfo:
        _getinfo(_RaisingEEObject(TimeoutError("read timed out")))
    assert excinfo.value.reason_code == "PROVIDER_TIMEOUT"
    assert excinfo.value.retryable is True


def test_getinfo_classifies_other_failures_as_retryable_provider_unavailable():
    from app.services.eo.ee_provider import _getinfo

    with pytest.raises(ProviderError) as excinfo:
        _getinfo(_RaisingEEObject(RuntimeError("some other transport failure")))
    assert excinfo.value.reason_code == "PROVIDER_UNAVAILABLE"
    assert excinfo.value.retryable is True


def test_getinfo_passes_through_the_result_on_success():
    from app.services.eo.ee_provider import _getinfo

    class _Ok:
        def getInfo(self):
            return {"answer": 42}

    assert _getinfo(_Ok()) == {"answer": 42}


# --- Sentinel-1 dispatch/validation (offline: these paths raise before any
# Earth Engine call, so they are testable without live auth) --------------


def test_discover_rejects_unknown_collection():
    from app.services.eo.ee_provider import EarthEngineProvider

    provider = EarthEngineProvider()
    with pytest.raises(ProviderError) as excinfo:
        provider.discover(
            _dummy_geometry(), "NOT_A_REGISTERED_COLLECTION", datetime(2026, 6, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
        )
    assert excinfo.value.reason_code == "UNSUPPORTED_COLLECTION"


def test_extract_rejects_unknown_collection_via_manifest():
    from app.services.eo.ee_provider import EarthEngineProvider
    from app.services.eo.provider import DiscoveryManifest

    provider = EarthEngineProvider()
    manifest = DiscoveryManifest(
        provider_key="google_earth_engine",
        collection_key="NOT_A_REGISTERED_COLLECTION",
        window_start=datetime(2026, 6, 1, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, tzinfo=UTC),
        candidate_count=0,
        items=(),
    )
    with pytest.raises(ProviderError) as excinfo:
        provider.extract(_dummy_geometry(), manifest, "irrelevant", "1", "irrelevant", "1")
    assert excinfo.value.reason_code == "UNSUPPORTED_COLLECTION"


def test_extract_s1_rejects_unregistered_recipe_key():
    from app.services.eo.ee_provider import S1_COLLECTION_KEY, EarthEngineProvider
    from app.services.eo.provider import DiscoveryManifest
    from app.services.eo.sar_feature_registry import QA_PROFILE_KEY, RECIPE_VERSION

    provider = EarthEngineProvider()
    manifest = DiscoveryManifest(
        provider_key="google_earth_engine",
        collection_key=S1_COLLECTION_KEY,
        window_start=datetime(2026, 6, 1, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, tzinfo=UTC),
        candidate_count=0,
        items=(),
    )
    with pytest.raises(ProviderError) as excinfo:
        provider.extract(_dummy_geometry(), manifest, "s1-grd-backscatter-orbit-agnostic-v1", RECIPE_VERSION, QA_PROFILE_KEY, RECIPE_VERSION)
    assert excinfo.value.reason_code == "UNKNOWN_RECIPE"


def test_extract_s1_rejects_unknown_qa_profile():
    from app.services.eo.ee_provider import S1_COLLECTION_KEY, EarthEngineProvider
    from app.services.eo.provider import DiscoveryManifest
    from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING, RECIPE_VERSION

    provider = EarthEngineProvider()
    manifest = DiscoveryManifest(
        provider_key="google_earth_engine",
        collection_key=S1_COLLECTION_KEY,
        window_start=datetime(2026, 6, 1, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, tzinfo=UTC),
        candidate_count=0,
        items=(),
    )
    with pytest.raises(ProviderError) as excinfo:
        provider.extract(_dummy_geometry(), manifest, RECIPE_KEY_ASCENDING, RECIPE_VERSION, "some-other-qa-profile/1", "1")
    assert excinfo.value.reason_code == "UNKNOWN_QA_PROFILE"


def test_extract_s1_orbit_pass_homogeneity_excludes_the_other_pass():
    """Without any live EE call: a manifest with BOTH orbit passes present
    must, after filtering to one recipe's pass, use only that pass's items --
    verified by forcing the "no acquisitions" early-return path when the
    manifest contains only the WRONG pass for the requested recipe.
    """
    from app.services.eo.ee_provider import S1_COLLECTION_KEY, EarthEngineProvider
    from app.services.eo.provider import DiscoveryManifest, SourceItem
    from app.services.eo.sar_feature_registry import (
        QA_PROFILE_KEY,
        RECIPE_KEY_ASCENDING,
        RECIPE_VERSION,
    )

    descending_only_item = SourceItem(
        provider_key="google_earth_engine",
        collection_key=S1_COLLECTION_KEY,
        item_id="S1A_TEST_DESCENDING",
        sensing_start=datetime(2026, 6, 15, tzinfo=UTC),
        sensing_end=None,
        platform="Sentinel-1",
        processing_baseline=None,
        properties={"orbit_pass": "DESCENDING", "relative_orbit": 1, "polarisations": ["VV", "VH"]},
        role="signal",
        included=True,
    )
    manifest = DiscoveryManifest(
        provider_key="google_earth_engine",
        collection_key=S1_COLLECTION_KEY,
        window_start=datetime(2026, 6, 1, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, tzinfo=UTC),
        candidate_count=1,
        items=(descending_only_item,),
    )
    provider = EarthEngineProvider()
    # Requesting the ASCENDING recipe against a manifest that only has a
    # DESCENDING item must find zero eligible items -- proving the orbit
    # filter actually excludes the wrong pass rather than using it anyway.
    result = provider.extract(_dummy_geometry(), manifest, RECIPE_KEY_ASCENDING, RECIPE_VERSION, QA_PROFILE_KEY, RECIPE_VERSION)
    assert result.outcome == "no_observation"
    assert result.reason_codes == ("NO_ACQUISITIONS_FOR_ORBIT_PASS",)
    assert result.eligible_acquisition_count == 0


def _dummy_geometry():
    from app.services.eo.provider import ExactGeometry

    return ExactGeometry(
        aoi_version_id="00000000-0000-0000-0000-000000000000",
        geometry_hash="deadbeef",
        geojson={"type": "Point", "coordinates": [0, 0]},
        area_m2=1.0,
    )


def test_backoff_grows_with_attempt_number_and_is_bounded():
    # No jitter, so growth is exactly deterministic and comparable.
    b1 = compute_backoff_seconds(1, random_fn=lambda: 0.5)
    b2 = compute_backoff_seconds(2, random_fn=lambda: 0.5)
    b3 = compute_backoff_seconds(3, random_fn=lambda: 0.5)
    assert b1 < b2 < b3
    b_huge = compute_backoff_seconds(20, random_fn=lambda: 0.5)
    assert b_huge <= 300 * 1.5  # never exceeds the cap plus max jitter


def test_backoff_jitter_is_bounded_and_never_negative():
    for r in (0.0, 0.5, 1.0):
        value = compute_backoff_seconds(1, random_fn=lambda r=r: r)
        assert value >= 1.0


def test_retry_not_before_is_strictly_in_the_future():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    result = retry_not_before(1, now=now)
    assert result > now


def test_work_unit_clock_not_exceeded_when_fresh():
    clock = WorkUnitClock(started_at=datetime.now(UTC), budget_seconds=600)
    assert clock.exceeded() is False


def test_work_unit_clock_exceeded_past_budget():
    started = datetime.now(UTC) - timedelta(seconds=700)
    clock = WorkUnitClock(started_at=started, budget_seconds=600)
    assert clock.exceeded() is True
    assert clock.elapsed_seconds() >= 700


def test_circuit_breaker_stays_closed_below_threshold():
    breaker = CircuitBreaker(failure_threshold=5, window_seconds=300, cooldown_seconds=120)
    now = datetime(2026, 1, 1, tzinfo=UTC)
    for _ in range(4):
        breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=now)
    assert breaker.is_open(now=now) is False


def test_circuit_breaker_opens_at_threshold_within_window():
    breaker = CircuitBreaker(failure_threshold=5, window_seconds=300, cooldown_seconds=120)
    now = datetime(2026, 1, 1, tzinfo=UTC)
    for _ in range(5):
        breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=now)
    assert breaker.is_open(now=now) is True
    assert breaker.reason(now=now) is not None


def test_circuit_breaker_ignores_failures_outside_the_window():
    breaker = CircuitBreaker(failure_threshold=3, window_seconds=60, cooldown_seconds=120)
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=t0)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=t0 + timedelta(seconds=10))
    # Third failure arrives well after the window for the first two.
    later = t0 + timedelta(seconds=200)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=later)
    assert breaker.is_open(now=later) is False  # only 1 failure inside the 60s window at `later`


def test_circuit_breaker_ignores_non_transient_reason_codes():
    breaker = CircuitBreaker(failure_threshold=2, window_seconds=300, cooldown_seconds=120)
    now = datetime(2026, 1, 1, tzinfo=UTC)
    breaker.record_failure(reason_code="INVALID_GEOMETRY", now=now)
    breaker.record_failure(reason_code="UNSUPPORTED_COLLECTION", now=now)
    assert breaker.is_open(now=now) is False


def test_circuit_breaker_closes_after_cooldown_elapses():
    breaker = CircuitBreaker(failure_threshold=2, window_seconds=300, cooldown_seconds=100)
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=t0)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=t0)
    assert breaker.is_open(now=t0) is True
    still_cooling = t0 + timedelta(seconds=50)
    assert breaker.is_open(now=still_cooling) is True
    after_cooldown = t0 + timedelta(seconds=150)
    assert breaker.is_open(now=after_cooldown) is False


def test_circuit_breaker_success_resets_failure_history():
    breaker = CircuitBreaker(failure_threshold=3, window_seconds=300, cooldown_seconds=120)
    now = datetime(2026, 1, 1, tzinfo=UTC)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=now)
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=now)
    breaker.record_success()
    breaker.record_failure(reason_code="PROVIDER_TIMEOUT", now=now)
    assert breaker.is_open(now=now) is False
