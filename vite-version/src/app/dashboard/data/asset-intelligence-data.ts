/**
 * Real Asset Intelligence data (Track v5/v6). Every field here comes from
 * backend/scripts/asset_state_model.py's real output
 * (outputs/asset-intel/asset-state-v2.json), which reuses the SAME
 * validated hierarchical Monte Carlo engine built for the Zurkt/Evergreen
 * supply case (app.services.supply.zurkt_scenario.build_cfr_supply_state)
 * -- not a second, divergent model.
 *
 * v2 (Track v6) changes from v5: structural EO is now POLYGON-CLIPPED
 * (not a 1km reference-point buffer); two REAL structural zones per asset
 * (split at the real CHMv2 median height, each exactly 50% of area by
 * construction) each carry their own material-class mixture; volume now
 * has THREE separate time series (standing/harvestable/merchantable),
 * never one series mislabeled "volume"; market_state ranks multiple REAL
 * nearby processors (country-filtered) instead of defaulting to Evergreen
 * for every asset.
 *
 * No individual tree, DBH, height, or age is fabricated. Every quantity
 * below is either a real database/GEE read or a MODELLED/ASSUMED
 * distribution with an explicit epistemicStatus and identifiability.
 */
import assetStateData from "./asset-state-v2.json"

export type EpistemicStatus = "OBSERVED" | "EO_DERIVED" | "DERIVED" | "MODELLED" | "ASSUMED" | "ASSUMED_PRICE_REAL_DISTANCE" | "VERIFIED" | "UNRESOLVED"
export type Identifiability = "HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIABLE"
export type Quantile = { p10: number; p50: number; p90: number }

export type StructuralZone = {
  label: string
  area_ha: number
  material_mix_probabilities: Record<string, number>
  standing_volume_m3: Quantile
  merchantable_volume_m3: Quantile
}

export type ProcessorEvaluation = {
  processor: string
  distance_km: number
  route_source: string
  products: string
  netback_usd_per_m3_p50: number
  delivered_cost_usd_per_m3_p50: number
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
  structural_evidence?: {
    canonical_name: string; clip_method: string
    chmv2: { source: string; epistemic_status: EpistemicStatus; note: string; stats: Record<string, number> }
    gedi: { source_l2a: string; source_l2b: string; epistemic_status: EpistemicStatus; note: string; n_shots_sampled: number; n_shots_quality_flag_1: number; rh98_quality_mean_m: number | null }
  }
  structural_zones: { epistemic_status: EpistemicStatus; method: string; zones: StructuralZone[] }
  market_state: {
    epistemic_status: EpistemicStatus
    processors_evaluated: ProcessorEvaluation[]
    best_processor: string
    best_processor_distance_km: number
    note: string
  }
  volume_state: {
    epistemic_status: EpistemicStatus; identifiability: Identifiability
    standing_volume_m3: Quantile; harvestable_volume_m3: Quantile; merchantable_volume_m3: Quantile
    volume_by_year_standing_m3: Record<string, Quantile>
    volume_by_year_harvestable_m3: Record<string, Quantile>
    volume_by_year_merchantable_m3: Record<string, Quantile>
    volume_by_year_note: string
  }
  valuation_state: { epistemic_status: EpistemicStatus; identifiability: Identifiability; netback_usd_per_m3: { p50: number }; asset_value_usd: Quantile; note: string }
}

export const assetStates: AssetState[] = (assetStateData as { assets: AssetState[] }).assets

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
 * DERIVED ANALYSIS ZONES (Track v6-3/4): real material-class mixture
 * WITHIN each of the asset's two real CHMv2-median-split structural
 * zones -- NOT a surveyed compartment plan and NOT official sub-block
 * boundaries. Every entry carries its real source zone, material class,
 * probability and area, never a fabricated species/age/DBH.
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
  for (const zone of state.structural_zones.zones) {
    const entries = Object.entries(zone.material_mix_probabilities).filter(([, p]) => p > 0)
    entries
      .sort((a, b) => b[1] - a[1])
      .forEach(([materialClass, probability], i) => {
        out.push({
          id: `${state.entity_id}-${zone.label}-${i}`,
          zoneLabel: zone.label,
          materialClass,
          probability,
          areaHa: Math.round(zone.area_ha * probability * 100) / 100,
        })
      })
  }
  return out.sort((a, b) => b.areaHa - a.areaHa)
}
