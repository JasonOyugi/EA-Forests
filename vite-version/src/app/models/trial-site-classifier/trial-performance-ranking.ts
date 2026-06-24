"use client"

import type {
  RankedTrialPerformanceRow,
  RankingConfig,
  TrialPerformanceRow,
} from "./types"

export type RankingWeights = Record<string, number>

function numericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function areDefaultWeights(
  weights: RankingWeights,
  rankingConfig: RankingConfig
) {
  return rankingConfig.available_metrics.every((metric) => {
    const current = weights[metric.key] ?? 0
    const baseline = rankingConfig.default_weights[metric.key] ?? 0
    return Math.abs(current - baseline) < 0.000001
  })
}

export function buildInitialRankingWeights(
  rankingConfig: RankingConfig
): RankingWeights {
  return Object.fromEntries(
    rankingConfig.available_metrics.map((metric) => [
      metric.key,
      rankingConfig.default_weights[metric.key] ?? 0,
    ])
  )
}

export function calculateRuntimeScore(
  row: TrialPerformanceRow,
  rankingConfig: RankingConfig,
  weights: RankingWeights
) {
  let weightedScore = 0
  let totalAbsWeight = 0

  for (const metric of rankingConfig.available_metrics) {
    const weight = weights[metric.key] ?? 0
    if (weight === 0) continue
    weightedScore += weight * numericValue(row[metric.component_column])
    totalAbsWeight += Math.abs(weight)
  }

  if (totalAbsWeight === 0) return 0
  return weightedScore / totalAbsWeight
}

export function rankVarietiesForSiteGroup({
  siteId,
  genusGroup,
  performanceRows,
  defaultTopRows,
  rankingConfig,
  weights,
  limit = 10,
}: {
  siteId: string
  genusGroup: string
  performanceRows: TrialPerformanceRow[]
  defaultTopRows: TrialPerformanceRow[]
  rankingConfig: RankingConfig
  weights: RankingWeights
  limit?: number
}): RankedTrialPerformanceRow[] {
  const useDefaultArtifact = areDefaultWeights(weights, rankingConfig)
  const sourceRows = useDefaultArtifact
    ? defaultTopRows.filter(
        (row) => row.site_id === siteId && row.genus_group === genusGroup
      )
    : performanceRows.filter(
        (row) =>
          row.site_id === siteId &&
          row.genus_group === genusGroup &&
          row.is_latest_for_site_group
      )

  return sourceRows
    .map((row) => ({
      ...row,
      runtime_composite_score: calculateRuntimeScore(
        row,
        rankingConfig,
        weights
      ),
      runtime_rank: 0,
    }))
    .sort((a, b) => {
      if (useDefaultArtifact) {
        return (
          (a.rank_default_within_site_group ?? Number.MAX_SAFE_INTEGER) -
          (b.rank_default_within_site_group ?? Number.MAX_SAFE_INTEGER)
        )
      }

      return (
        b.runtime_composite_score - a.runtime_composite_score ||
        String(a.entry).localeCompare(String(b.entry))
      )
    })
    .slice(0, limit)
    .map((row, index) => ({ ...row, runtime_rank: index + 1 }))
}
