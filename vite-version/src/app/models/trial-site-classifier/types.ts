"use client"

export interface TrialSiteRegistryRow {
  site_id: string
  site_name: string
  latitude: number
  longitude: number
  available_genus_groups: string[]
  available_measurement_ages_months: number[]
}

export interface TrialSiteClimateProfile extends TrialSiteRegistryRow {
  climate_profile_status?: string
  long_term_climate?: Record<string, number | null> | null
  trial_period_climate?: Record<string, number | null> | null
  trial_period_anomaly?: Record<string, number | null> | null
  scaled_climate_vector?: Record<string, number | null> | number[] | null
}

export interface SelectedClimateProfile {
  latitude: number
  longitude: number
  climate_profile_status: "placeholder" | "available"
  source: "placeholder_adapter" | "site_classifier"
  scaled_climate_vector: Record<string, number | null> | number[] | null
  notes: string[]
}

export interface ClimateVariableWeights {
  [variable: string]: number
}

export type MatchConfidence = "high" | "medium" | "low"

export interface ClimateMatch {
  site: TrialSiteClimateProfile
  distance_score: number
  coordinate_distance_km: number
  confidence: MatchConfidence
  similarity_drivers: string[]
  mismatch_drivers: string[]
  outside_trial_envelope_warning: string | null
  used_coordinate_fallback: boolean
}

export interface RankingMetric {
  key: string
  label: string
  component_column: string
  direction: "higher_is_better" | string
  optional?: boolean
  assumption?: string
}

export interface RankingConfig {
  version: string
  default_weights: Record<string, number>
  available_metrics: RankingMetric[]
  recommended_runtime_formula: string
  ranking_scope: string
  do_not_compare: string
  volume_proxy: string
  minimum_n_for_default_ranking: number
}

export interface TrialPerformanceRow {
  site_id: string
  site_name: string
  latitude: number
  longitude: number
  genus_group: string
  broad_group: string
  trial_family: string
  age_months: number
  entry: string
  n_planted: number
  n_alive: number
  n_dbh: number
  mean_dbh_cm: number | null
  n_height: number
  mean_height_m: number | null
  n_stem: number
  mean_stem_score: number | null
  n_volume: number
  mean_volume_proxy_m3: number | null
  survival_rate: number | null
  survival_adjusted_volume_proxy_m3: number | null
  latest_age_months: number
  is_latest_for_site_group: boolean
  data_quality_flag: string
  default_composite_score: number | null
  rank_default_within_site_group: number | null
  rank_default_within_site_broad_group: number | null
  [key: string]: string | number | boolean | null
}

export interface RankedTrialPerformanceRow extends TrialPerformanceRow {
  runtime_composite_score: number
  runtime_rank: number
}

export interface VarietyCrossSiteSummary {
  entry: string
  genus_group: string
  broad_group: string
  n_sites: number
  sites_tested: string
  mean_default_rank: number | null
  best_default_rank: number | null
  worst_default_rank: number | null
  mean_default_score: number | null
  sd_default_score: number | null
  mean_survival_rate: number | null
  mean_dbh_cm: number | null
  mean_height_m: number | null
  mean_stem_score: number | null
  mean_volume_proxy_m3: number | null
  mean_survival_adjusted_volume_proxy_m3: number | null
  total_n_planted: number
  total_n_alive: number
  stability_score: number | null
  cross_site_survival_rate: number | null
  stability_class: string
}

export interface VarietyDistribution {
  site_id: string
  site_name: string
  genus_group: string
  entry: string
  age_months: number
  metric: string
  label: string
  n: number
  mean: number | null
  sd: number | null
  p10: number | null
  p25: number | null
  p50: number | null
  p75: number | null
  p90: number | null
  histogram: {
    bins: number[]
    counts: number[]
  }
  kde: {
    x: number[]
    y: number[]
  }
}

export interface TrialClassifierArtifacts {
  sites: TrialSiteRegistryRow[]
  climateProfiles: TrialSiteClimateProfile[]
  performanceRows: TrialPerformanceRow[]
  defaultTopRows: TrialPerformanceRow[]
  crossSiteSummaries: VarietyCrossSiteSummary[]
  distributions: VarietyDistribution[]
  rankingConfig: RankingConfig
}
