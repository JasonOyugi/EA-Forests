"""Pure-Python reference implementation of the area-weighted spatial
statistics contract (EO observation architecture, feature value schema):
``w_i = area(AOI intersect cell_i)``. Used to independently spot-check the
Earth Engine adapter's server-side ``reduceRegion`` result against a
from-scratch calculation on the same pulled pixel values (section 21), and
as directly testable pure functions.
"""

from __future__ import annotations


def weighted_mean(values: list[float], weights: list[float]) -> float | None:
    total_weight = sum(weights)
    if total_weight <= 0 or not values:
        return None
    return sum(w * v for w, v in zip(weights, values, strict=True)) / total_weight


def weighted_population_variance(
    values: list[float], weights: list[float], mean: float | None = None
) -> float | None:
    total_weight = sum(weights)
    if total_weight <= 0 or not values:
        return None
    if mean is None:
        mean = weighted_mean(values, weights)
    return sum(w * (v - mean) ** 2 for w, v in zip(weights, values, strict=True)) / total_weight


class ShardStats:
    """Sufficient statistics for one non-overlapping processing shard of a
    single canonical AOI/version (task section 16): mean, population
    variance, and total weight over that shard's valid cells only. A shard
    is never a new forest asset; it exists only to bound one EE work unit
    and is merged back to the exact original AOI before publication.
    """

    __slots__ = ("mean", "variance", "weight")

    def __init__(self, mean: float, variance: float, weight: float):
        self.mean = mean
        self.variance = variance
        self.weight = weight


def merge_shard_statistics(shards: list[ShardStats]) -> tuple[float, float, float] | None:
    """Pools per-shard weighted mean/variance into the statistics for the
    union AOI, using the weighted law-of-total-variance decomposition
    (never a naive average of shard means/variances, which double-counts
    unequal shard weights and ignores between-shard dispersion). Returns
    ``(mean, population_variance, total_weight)``.
    """
    usable = [shard for shard in shards if shard.weight > 0]
    total_weight = sum(shard.weight for shard in usable)
    if total_weight <= 0:
        return None
    mean = sum(shard.weight * shard.mean for shard in usable) / total_weight
    variance = (
        sum(shard.weight * (shard.variance + (shard.mean - mean) ** 2) for shard in usable)
        / total_weight
    )
    return mean, variance, total_weight
