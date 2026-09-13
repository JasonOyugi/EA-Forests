/**
 * Real Asset Intelligence data (Track v5 reality reset). This file
 * replaces the fabricated sub-block/species/DBH/contractor/invoice engine
 * that used to live in forestry-data.ts. Every field here comes from
 * backend/scripts/asset_state_model.py's real output
 * (outputs/asset-intel/asset-state-v1.json), which itself reuses the SAME
 * validated hierarchical Monte Carlo engine built for the Zurkt/Evergreen
 * supply case (app.services.supply.zurkt_scenario.build_cfr_supply_state)
 * -- not a second, divergent model.
 *
 * No individual tree, DBH, height, or age is fabricated. Every quantity
 * below is either a real database read (area, EO observation count,
 * distance) or a MODELLED/ASSUMED distribution with an explicit
 * epistemicStatus and identifiability -- see each field's own `note`.
 */
import assetStateData from "./asset-state-v1.json"

export type EpistemicStatus = "OBSERVED" | "EO_DERIVED" | "DERIVED" | "MODELLED" | "ASSUMED" | "VERIFIED" | "UNRESOLVED"
export type Identifiability = "HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIABLE"
export type Quantile = { p10: number; p50: number; p90: number }

export type AssetState = {
  entity_id: string
  aoi_version_id: string
  canonical_name: string
  display_name: string
  country: string
  model_version: string
  asset_identity: { epistemic_status: EpistemicStatus; entity_id: string; aoi_version_id: string; area_ha: number }
  eo_evidence: { epistemic_status: EpistemicStatus; n_ndvi_observations: number; n_ndmi_observations: number; n_nbr_observations: number; note: string }
  distance_to_nearest_known_processor: { epistemic_status: EpistemicStatus; processor: string; straight_line_km: number; road_km: number | null; route_source: string; note: string }
  nearby_real_processors: { epistemic_status: EpistemicStatus; processors: { name: string; distance_km: number; products: string; capacity: string; certification: string }[]; note: string }
  structural_evidence?: {
    canonical_name: string; buffer_m: number; note: string
    chmv2: { source: string; epistemic_status: EpistemicStatus; note: string; stats: Record<string, number> }
    gedi: { source_l2a: string; source_l2b: string; epistemic_status: EpistemicStatus; note: string; stats: Record<string, unknown> }
  }
  material_state: { epistemic_status: EpistemicStatus; identifiability: Identifiability; mixture_probabilities: Record<string, number>; note: string }
  tree_population_state: { epistemic_status: EpistemicStatus; stems_per_ha_identifiability: Identifiability; dbh_identifiability: Identifiability; height_identifiability: Identifiability; note: string; relevant_stocked_area_ha: Quantile }
  volume_state: {
    epistemic_status: EpistemicStatus; identifiability: Identifiability
    standing_volume_m3: Quantile; harvestable_volume_m3: Quantile; merchantable_volume_m3: Quantile
    grade_shares: { g1: Quantile; g2: Quantile; g3: Quantile }
    volume_by_year_m3: Record<string, Quantile>
    volume_by_year_note: string
  }
  market_state: {
    epistemic_status: EpistemicStatus
    procurement_cost_usd_per_m3: Quantile; harvest_extract_load_cost_usd_per_m3: Quantile
    haulage_cost_usd_per_m3: Quantile; regulatory_admin_cost_usd_per_m3: Quantile; delivered_cost_usd_per_m3: Quantile
    scenario_price_usd_per_m3_by_grade: Record<string, number>
    price_note: string
  }
  valuation_state: { epistemic_status: EpistemicStatus; identifiability: Identifiability; netback_usd_per_m3: Quantile; asset_value_usd: Quantile; note: string }
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

/**
 * DERIVED ANALYSIS ZONES (Track v5-4/20) -- an illustrative area-weighted
 * split of the asset's REAL modelled material-class mixture probabilities,
 * NOT a surveyed compartment plan and NOT official sub-block boundaries.
 * Used only to give the map/detail panel something spatially organized to
 * show instead of one undifferentiated polygon; every zone carries its
 * real source probability, never a fabricated species/age/DBH.
 */
export type DerivedAnalysisZone = {
  id: string
  materialClass: string
  probability: number
  areaHa: number
}

export function deriveAnalysisZones(state: AssetState): DerivedAnalysisZone[] {
  const probs = state.material_state.mixture_probabilities
  const areaHa = state.asset_identity.area_ha
  return Object.entries(probs)
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([materialClass, probability], i) => ({
      id: `${state.entity_id}-zone-${i}`,
      materialClass,
      probability,
      areaHa: Math.round(areaHa * probability * 100) / 100,
    }))
}
