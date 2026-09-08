"""Bounded Earth Engine evaluation latency: provider deadline, work-unit
deadline, retry backoff and a small in-process circuit breaker (Uganda S2
history v0.1, Parts 2-5).

Context: the August country pass ran 656/656 CFRs successfully, but one job
(Kagombe, 30,063 ha) took ~93 minutes for a single un-retried Earth Engine
evaluation against a ~3s median -- investigated and found to have no
demonstrable cause in area, vertex count, acquisition count, or surrounding
system load (docs/data-provenance/uganda-s2-history-kagombe-investigation.md).
This module does not "fix" that specific incident; it ensures one pathological
evaluation cannot block national processing again, regardless of cause.

Two distinct bounds, per the architecture:

- PROVIDER_DEADLINE_MS: a real transport-level timeout on each individual
  Earth Engine API call, via ``ee.data.setDeadline()``. Verified live against
  ee-oyugijason that this controls the actual underlying HTTP read timeout
  (confirmed: a tightened deadline surfaces as a builtin ``TimeoutError``,
  raised from ee/_cloud_api_utils.py's own request wrapper) -- not a
  ``Future.result(timeout=...)`` wrapper racing an uncontrolled background
  call. With this in place, a single analysis (at most one discover() call
  plus two extract() calls) is structurally bounded to well under the
  work-unit budget by the provider deadline alone.

- WORK_UNIT_TIMEOUT_SECONDS: a larger, distinct ceiling on the whole
  discover+extract call for one job. A thread-plus-Future wrapper was
  considered and rejected: ``run_analysis`` writes through a SQLAlchemy
  ``Session``, which is not thread-safe, so racing it against a timeout from
  another thread risks corrupting in-flight transaction state if the caller
  moves on while the background thread is still using the same session. This
  is enforced instead as a cooperative post-execution check: if the call
  still exceeds budget (a path the provider deadline does not already
  structurally rule out -- e.g. local PostGIS/grid computation, not just the
  Earth Engine round trip), the result is not published as a success; it is
  treated as a timeout and goes through the same bounded-retry path.
"""

from __future__ import annotations

import os
import random
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

RELIABILITY_VERSION = "eo-reliability/0.1"

PROVIDER_DEADLINE_MS = int(os.getenv("EO_PROVIDER_DEADLINE_MS", "120000"))  # 120s per EE call
WORK_UNIT_TIMEOUT_SECONDS = int(os.getenv("EO_WORK_UNIT_TIMEOUT_SECONDS", "600"))  # 10 minutes per job

# Retry backoff (Part 4): exponential with jitter, bounded. attempt 1's retry
# waits ~30-45s, attempt 2's ~60-90s; DEFAULT_MAX_ATTEMPTS (worker.py) stops
# retrying after 3 total attempts.
RETRY_BACKOFF_BASE_SECONDS = 30
RETRY_BACKOFF_MAX_SECONDS = 300
RETRY_BACKOFF_JITTER_FRACTION = 0.5

# Circuit breaker (Part 5): if this many retryable provider failures land
# within the window, stop claiming new work for the cooldown period. Small,
# in-process, single-worker state -- no Redis/Celery, no new tables; the
# durable job queue (queued/retry_wait) already holds the real work safely
# while the breaker is open.
CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
CIRCUIT_BREAKER_WINDOW_SECONDS = 300
CIRCUIT_BREAKER_COOLDOWN_SECONDS = 120

RETRYABLE_REASON_CODES = frozenset({"PROVIDER_TIMEOUT", "PROVIDER_UNAVAILABLE", "WORK_UNIT_TIMEOUT"})


def compute_backoff_seconds(attempt: int, *, random_fn=random.random) -> float:
    """``attempt`` is the attempt number that just failed (1-based, i.e.
    ``claimed["attempts"]`` after ``claim_job`` incremented it). Exponential
    growth from ``RETRY_BACKOFF_BASE_SECONDS``, capped, plus symmetric jitter
    so many simultaneously-failing jobs don't all retry at the same instant.
    """
    base = min(RETRY_BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)), RETRY_BACKOFF_MAX_SECONDS)
    jitter = base * RETRY_BACKOFF_JITTER_FRACTION * (2 * random_fn() - 1)
    return max(1.0, base + jitter)


def retry_not_before(attempt: int, *, now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    return now + timedelta(seconds=compute_backoff_seconds(attempt))


@dataclass
class WorkUnitClock:
    """Elapsed-time guard for one job's discover+extract call. Cooperative,
    not preemptive: see the module docstring for why this is a post-hoc
    check rather than a threaded timeout.
    """

    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    budget_seconds: int = WORK_UNIT_TIMEOUT_SECONDS

    def elapsed_seconds(self, *, now: datetime | None = None) -> float:
        now = now or datetime.now(UTC)
        return (now - self.started_at).total_seconds()

    def exceeded(self, *, now: datetime | None = None) -> bool:
        return self.elapsed_seconds(now=now) > self.budget_seconds


@dataclass
class CircuitBreaker:
    """In-process (per-worker), not persisted: a single script's worker loop
    consults this before claiming the next job. Restarting the process resets
    it, which is fine -- it is backpressure for the CURRENT run, not durable
    state; the job queue itself is what stays crash-safe.
    """

    failure_threshold: int = CIRCUIT_BREAKER_FAILURE_THRESHOLD
    window_seconds: int = CIRCUIT_BREAKER_WINDOW_SECONDS
    cooldown_seconds: int = CIRCUIT_BREAKER_COOLDOWN_SECONDS
    _failures: list[datetime] = field(default_factory=list)
    _opened_at: datetime | None = field(default=None)

    def record_failure(self, *, reason_code: str, now: datetime | None = None) -> None:
        if reason_code not in RETRYABLE_REASON_CODES:
            return  # a deterministic/non-transient failure says nothing about provider health
        now = now or datetime.now(UTC)
        self._failures.append(now)
        cutoff = now - timedelta(seconds=self.window_seconds)
        self._failures = [t for t in self._failures if t >= cutoff]
        if len(self._failures) >= self.failure_threshold and self._opened_at is None:
            self._opened_at = now

    def record_success(self) -> None:
        self._failures.clear()
        self._opened_at = None

    def is_open(self, *, now: datetime | None = None) -> bool:
        if self._opened_at is None:
            return False
        now = now or datetime.now(UTC)
        if (now - self._opened_at).total_seconds() >= self.cooldown_seconds:
            # Cooldown elapsed: close the breaker and let the next real
            # attempt prove whether the provider has recovered.
            self._opened_at = None
            self._failures.clear()
            return False
        return True

    def reason(self, *, now: datetime | None = None) -> str | None:
        if not self.is_open(now=now):
            return None
        remaining = self.cooldown_seconds - (
            ((now or datetime.now(UTC)) - self._opened_at).total_seconds()
        )
        return (
            f"circuit breaker open: {len(self._failures)} transient provider failures "
            f"in the last {self.window_seconds}s; cooling down for {max(0, round(remaining))}s more"
        )
