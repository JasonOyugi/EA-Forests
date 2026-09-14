/**
 * Real Asset Intelligence data (Track v7 -- TREE POPULATION + STRUCTURAL
 * INFERENCE + REAL ASSET ECONOMICS). Every field here comes from
 * backend/scripts/asset_state_model_v3.py's real output
 * (outputs/asset-intel/asset-state-v3.json).
 *
 * v3 changes from v2: the forced CHMv2-median 50/50 split is replaced by
 * REAL data-driven structural strata (k-means over real CHMv2/Sentinel-2/
 * Sentinel-1/terrain features, k-NN minimum-mapping-unit smoothing -- see
 * backend/scripts/asset_structural_evidence_v3.py). Each stratum now
 * carries a REAL tree-population posterior (stems/ha, DBH, height, basal
 * area, standing volume) from an importance-sampling/ABC inference engine
 * (app/services/tree_population_model.py) run per candidate material class
 * and Bayesian-model-averaged. Processor country is a real point-in-country
 * geocode (not a distance proxy), and processor price is drawn from a
 * versioned evidence hierarchy (app/services/processor_price_evidence.py)
 * instead of one flat scenario spec. Asset value is now split into
 * harvest_margin_usd (may be negative), immediate_harvest_option_value_usd
 * (floored at zero) and asset_option_value_usd (the value of the optimal
 * 2026-2028 wait/harvest policy -- the correct headline "asset value").
 *
 * No individual tree, DBH, height, or age is fabricated. Every quantity
 * below is either a real database/GEE read or a MODELLED/ASSUMED
 * distribution with an explicit epistemicStatus and identifiability.
 */
import assetStateData from "./asset-state-v3.json"

export type EpistemicStatus =
  | "OBSERVED"
  | "EO_DERIVED"
  | "DERIVED"
  | "MODELLED"
  | "ASSUMED"
  | "VERSIONED_PRICE_EVIDENCE"
  | "VERIFIED"
  | "UNRESOLVED"
export type Identifiability = "HIGH" | "MEDIUM" | "LOW" | "LOW_BUT_ESTIMATED" | "NOT_IDENTIFIABLE"
export type Quantile = { p10: number; p50: number; p90: number }

export type PriceEvidenceRecord = {
  processor: string | null
  country: string
  species: string
  product: string
  value: number
  currency: string
  unit: string
  value_usd_per_m3: number
  observation_date: string
  source: string
  evidence_class: "OBSERVED_PROCESSOR_PRICE" | "HISTORICAL_PROCESSOR_PRICE" | "COMPARABLE_PROCESSOR_PROXY" | "COUNTRY_PRODUCT_BENCHMARK" | "SCENARIO_PRIOR"
  price_point: string
  note: string
  distance_km: number | null
}

export type ProcessorEvaluation = {
  processor: string
  distance_km: number
  route_source: string
  products: string | null
  species_priced: string
  price_evidence: PriceEvidenceRecord
  price_evidence_alternates: PriceEvidenceRecord[]
  cost_usd_per_m3_p50: number
  netback_usd_per_m3_p50: number
}

export type MaterialClassProbabilities = Record<string, number>

export type CandidateClassInference = {
  material_class: string
  n_draws: number
  effective_sample_size: number
  ess_fraction: number
  approx_mean_log_weight: number
  n_chm_likelihood_terms: number
  n_gedi_likelihood_terms: number
  prior_dominated: boolean
  identifiability: "PRIOR_DOMINATED" | "EVIDENCE_CONSTRAINED"
  stems_per_ha: { prior: Record<string, number>; posterior: Record<string, number> }
  dbh_cm: {
    prior: Record<string, number>
    posterior: Record<string, number>
    weibull_k_posterior: Record<string, number>
    weibull_lambda_posterior: Record<string, number>
    histogram: { counts: number[]; bin_edges_cm: number[] }
  }
  height_m: { posterior: Record<string, number> }
  basal_area_m2_per_ha: { posterior: Record<string, number> }
  standing_volume_m3_per_ha: { posterior: Record<string, number> }
  posterior_predictive: {
    chm_percentiles_predicted_m: Record<string, number>
    chm_percentiles_observed_m: Record<string, number> | null
    gedi_percentiles_predicted_m: Record<string, number> | null
    gedi_percentiles_observed_m: Record<string, number> | null
    cover_predicted: number
    cover_observed: number | null
  }
  sources: string[]
}

export type StructuralStratum = {
  cluster_id: number
  label: string
  area_ha: number
  material_class_probabilities_prior: MaterialClassProbabilities
  material_class_probabilities_posterior: MaterialClassProbabilities
  candidate_class_inference: CandidateClassInference[]
  chm_evidence_used: Record<string, number> | null
  gedi_evidence_used: { n_shots: number; rh_percentiles_m: Record<string, number> | null; cover_mean: number | null }
}

export type AssetState = {
  entity_id: string
  aoi_version_id: string
  canonical_name: string
  display_name: string
  country: string
  model_version: string
  asset_identity: { epistemic_status: EpistemicStatus; entity_id: string; aoi_version_id: string; area_ha: number }
  eo_evidence: { epistemic_status: EpistemicStatus; n_ndvi_observations: number; note: string }
  structural_evidence: {
    clip_method: string | null
    gedi_chm_reconciliation: {
      method: string
      n_shots_matched: number
      // Loosely typed: real per-RH-level bias/RMSE/MAE/rank-correlation
      // stats keyed "50"/"75"/"90"/"95"/"98", PLUS an
      // "attribution_rh98_minus_chm_p98" key with a different shape -- see
      // backend/scripts/asset_structural_evidence_v3.py's
      // compute_reconciliation_stats for the exact fields.
      by_rh_level: Record<string, Record<string, number | string | null>>
    }
    gedi_l4a_agbd: { source: string; epistemic_status: string; note: string; n_shots: number }
    palsar_l_band: { available: boolean; source?: string; acquisition_year?: number; note: string; per_stratum?: { cluster_id: number; label: string; hv_db_mean: number | null; hh_db_mean: number | null; n: number }[] }
  }
  structural_strata: { epistemic_status: EpistemicStatus; method: string; strata: StructuralStratum[] }
  tree_population_state: {
    epistemic_status: EpistemicStatus
    identifiability: Identifiability
    stems_per_ha: Quantile
    total_stems: Quantile
    basal_area_m2_per_ha: Quantile
    total_basal_area_m2: Quantile
    standing_volume_m3_per_ha: Quantile
    standing_volume_m3_total: Quantile
    dbh_cm: Quantile
    height_m: Quantile
    posterior_predictive_agbd_check: { note: string; implied_biomass_total_t_p50_estimate: number }
    method_note: string
  }
  market_state: {
    epistemic_status: EpistemicStatus
    processors_evaluated: ProcessorEvaluation[]
    best_processor: string
    best_processor_distance_km: number
    note: string
  }
  volume_state: {
    epistemic_status: EpistemicStatus
    identifiability: Identifiability
    standing_volume_m3: Quantile
    harvestable_volume_m3: Quantile
    merchantable_volume_m3: Quantile
    volume_by_year_standing_m3: Record<string, Quantile>
    volume_by_year_harvestable_m3: Record<string, Quantile>
    volume_by_year_merchantable_m3: Record<string, Quantile>
    volume_by_year_note: string
  }
  valuation_state: {
    epistemic_status: EpistemicStatus
    identifiability: Identifiability
    netback_usd_per_m3: { p50: number }
    harvest_margin_usd: Quantile
    immediate_harvest_option_value_usd: Quantile
    asset_option_value_usd: Quantile
    optimal_action_by_year: Record<string, "HARVEST" | "WAIT">
    option_value_method_note: string
    note: string
  }
  field_calibration_design: {
    epistemic_status: EpistemicStatus
    plot_design: string
    variables_measured: string[]
    plots_by_stratum_at_20_total: { cluster_id: number; label: string; area_ha: number; recommended_plots_of_20: number }[]
    recommended_total_plots_min: number
    uncertainty_reduction_scenarios: Record<string, { n_plots: number; current_relative_spread_standing_volume: number; illustrative_relative_spread_after: number; note: string }>
    note: string
  }
}

export const assetStates: AssetState[] = (assetStateData as unknown as { assets: AssetState[] }).assets

export function getAssetStateByEntityId(entityId: string): AssetState | undefined {
  return assetStates.find((a) => a.entity_id === entityId)
}

// Material-class display palette (a UI color mapping, not fabricated data).
export const MATERIAL_CLASS_COLORS: Record<string, string> = {
  eucalyptus_plantation: "#4f9d69",
  pine_plantation: "#7fb385",
  mixed_plantation: "#a3c9a8",
  natural_hardwood_mixed: "#2f6b4f",
  degraded_open: "#c9a15a",
  unresolved: "#8a8a8a",
  other: "#94a3b8",
}

/** Material classes that are not a commercial tree species/cover type --
 * these roll up into a single "Other" bucket for any user-facing species
 * mix (composition chart, map legend, species table). "Other" is land
 * area, never timber: it must never receive a share of standing/
 * harvestable/merchantable volume or asset value. */
export const NON_SPECIES_MATERIAL_CLASSES = ["degraded_open", "unresolved"] as const

export function isSpeciesMaterialClass(materialClass: string): boolean {
  return !(NON_SPECIES_MATERIAL_CLASSES as readonly string[]).includes(materialClass)
}

export type LandCompositionEntry = { materialClass: string; areaHa: number; sharePct: number }
export type LandComposition = {
  totalAreaHa: number
  productiveForestAreaHa: number
  otherAreaHa: number
  species: LandCompositionEntry[]
  other: LandCompositionEntry
}

/** Real per-asset land composition: total AOI area split into named
 * species/commercial-cover classes plus a single "Other" bucket (open,
 * degraded, unresolved), area-weighted across the asset's real, data-driven
 * structural strata (posterior material-class probabilities). Denominator
 * is the total canonical AOI area (real), matching the high-level land/
 * species split -- forestry-performance figures (volume, value) stay
 * asset-level and are never re-derived per class here. */
export function getAssetLandComposition(state: AssetState): LandComposition {
  const totalAreaHa = state.asset_identity.area_ha
  const areaByClass = new Map<string, number>()
  for (const stratum of state.structural_strata.strata) {
    for (const [materialClass, probability] of Object.entries(stratum.material_class_probabilities_posterior)) {
      areaByClass.set(materialClass, (areaByClass.get(materialClass) ?? 0) + stratum.area_ha * probability)
    }
  }

  let otherAreaHa = 0
  const species: LandCompositionEntry[] = []
  for (const [materialClass, areaHa] of areaByClass) {
    if (isSpeciesMaterialClass(materialClass)) {
      species.push({ materialClass, areaHa, sharePct: totalAreaHa > 0 ? (areaHa / totalAreaHa) * 100 : 0 })
    } else {
      otherAreaHa += areaHa
    }
  }
  species.sort((a, b) => b.areaHa - a.areaHa)

  return {
    totalAreaHa,
    productiveForestAreaHa: Math.max(totalAreaHa - otherAreaHa, 0),
    otherAreaHa,
    species,
    other: { materialClass: "other", areaHa: otherAreaHa, sharePct: totalAreaHa > 0 ? (otherAreaHa / totalAreaHa) * 100 : 0 },
  }
}

export function formatMaterialClassLabel(materialClass: string): string {
  return materialClass
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

export function formatZoneLabel(zoneLabel: string): string {
  return zoneLabel
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * DERIVED ANALYSIS ZONES (Track v7): real material-class posterior
 * probability WITHIN each of the asset's real, data-driven structural
 * strata (k-means over real multi-sensor features) -- NOT a surveyed
 * compartment plan and NOT official sub-block boundaries. Every entry
 * carries its real source stratum, material class, POSTERIOR probability
 * (Bayesian-model-averaged using real ABC evidence, not just the prior
 * heuristic) and area.
 */
export type DerivedAnalysisZone = {
  id: string
  zoneLabel: string
  materialClass: string
  probability: number
  areaHa: number
}

export function deriveAnalysisZones(state: AssetState): DerivedAnalysisZone[] {
  const out: DerivedAnalysisZone[] = []
  for (const stratum of state.structural_strata.strata) {
    const entries = Object.entries(stratum.material_class_probabilities_posterior).filter(([, p]) => p > 0.01)
    entries
      .sort((a, b) => b[1] - a[1])
      .forEach(([materialClass, probability], i) => {
        out.push({
          id: `${state.entity_id}-${stratum.cluster_id}-${i}`,
          zoneLabel: stratum.label,
          materialClass,
          probability,
          areaHa: Math.round(stratum.area_ha * probability * 100) / 100,
        })
      })
  }
  return out.sort((a, b) => b.areaHa - a.areaHa)
}
