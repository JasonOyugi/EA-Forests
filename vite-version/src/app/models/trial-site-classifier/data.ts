"use client"

import type {
  RankingConfig,
  TrialClassifierArtifacts,
  TrialPerformanceRow,
  TrialSiteClimateProfile,
  TrialSiteRegistryRow,
  VarietyCrossSiteSummary,
  VarietyDistribution,
} from "./types"

const artifactBaseUrl = "/data/trial-sites"

async function loadJson<T>(filename: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${artifactBaseUrl}/${filename}`, { signal })
  if (!response.ok) {
    throw new Error(`Trial artifact unavailable: ${filename}`)
  }

  return (await response.json()) as T
}

export async function loadTrialClassifierArtifacts(signal?: AbortSignal) {
  const [
    sites,
    climateProfiles,
    performanceRows,
    defaultTopRows,
    crossSiteSummaries,
    distributions,
    rankingConfig,
  ] = await Promise.all([
    loadJson<TrialSiteRegistryRow[]>("trial-site-registry.json", signal),
    loadJson<TrialSiteClimateProfile[]>(
      "trial-site-climate-profiles.json",
      signal
    ),
    loadJson<TrialPerformanceRow[]>(
      "trial-entry-performance-summary.json",
      signal
    ),
    loadJson<TrialPerformanceRow[]>(
      "top-varieties-by-site-genus-group.json",
      signal
    ),
    loadJson<VarietyCrossSiteSummary[]>(
      "variety-cross-site-summary.json",
      signal
    ),
    loadJson<VarietyDistribution[]>("variety-distributions.json", signal),
    loadJson<RankingConfig>("ranking-config.json", signal),
  ])

  return {
    sites,
    climateProfiles,
    performanceRows,
    defaultTopRows,
    crossSiteSummaries,
    distributions,
    rankingConfig,
  } satisfies TrialClassifierArtifacts
}
