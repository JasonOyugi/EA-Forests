import zurktCfrResults from "./data/zurkt-cfr-supply-results-v1.json"
import zurktScenario from "./data/zurkt-uganda-scenario-v1.json"
import zurktSupplyCurve from "./data/zurkt-delivered-supply-curve-v1.json"
import zurktOutlook from "./data/zurkt-10yr-outlook-v1.json"
import zurktSensitivity from "./data/zurkt-sensitivity-v1.json"
import zurktVerification from "./data/zurkt-verification-priorities-v1.json"
import type { EvidenceValue, GradeTonnes, Provenance, SupplyDataset, SupplyLot } from "./types"

// Fixed demonstration world. These locations and quantities are not forest observations.
export const previewProvenance: Provenance = {
  epistemicClass: "SYNTHETIC", world: { id: "supply-workspace-preview-v1", kind: "experiment" },
  asOf: "2026-09-07", knownAt: "2026-09-07", source: "Supply workspace demonstration fixture v1",
  freshness: "unknown", verification: "unverified", completeness: "partial", evidenceIds: [],
}
function value<T>(input: T | null, missingReason?: string): EvidenceValue<T> {
  return { value: input, missingReason, provenance: previewProvenance }
}

/**
 * Zurkt Uganda is an explicit SCENARIO processor -- no real Zurkt facts
 * (address, capacity, species, price) exist anywhere in this repository or
 * its history (confirmed by exhaustive search, 2026-09-11). Its location is
 * a labeled assumption, not an observed fact.
 *
 * Every CFR below IS real: a canonical, polygon-backed Uganda CFR AOI from
 * the operational database, real straight-line + OSRM road distance, real
 * EO observation coverage. What's MODELLED on top is the output of
 * backend/app/services/supply/zurkt_scenario.py's Monte Carlo (scenario
 * zurktScenario.scenario_version / model zurktScenario.model_version):
 * broad, explicitly-labeled ASSUMED priors (stocked fraction, maturity,
 * commercial availability, stand DBH/height/density -- no field inventory
 * exists for any of these 274 CFRs) run through the existing harvest/
 * haulage/grade cost engine (app.services.roundwood_production). P50
 * populates each lot's headline value; the full P10-P90 Monte Carlo
 * interval rides along in `interval` on every modelled EvidenceValue so the
 * UI can show uncertainty, not a false point estimate. epistemicClass is
 * "FORECAST" for modelled outputs (never "OBSERVED") -- see
 * zurkt-uganda-scenario-v1.json for every prior's exact rationale.
 */
const modelledProvenance: Provenance = {
  ...previewProvenance,
  epistemicClass: "FORECAST",
  source: `${zurktScenario.scenario_version} / ${zurktScenario.model_version}`,
}

type ZurktQuantile = { p10: number; p50: number; p90: number }
type ZurktCfrResult = {
  entity_id: string
  canonical_name: string
  evidence: {
    lat: number
    lon: number
    aoi_id: string
    aoi_version_id: string
    gross_mapped_area_ha: number
    straight_line_km: number
    road_km: number | null
    route_source: string
    eo_evidence_status: "observed" | "not_yet_processed"
  }
  modelled: {
    standing_volume_m3: ZurktQuantile
    zurkt_suitable_volume_m3: ZurktQuantile
    grade_g1_share: ZurktQuantile
    grade_g2_share: ZurktQuantile
    grade_g3_share: ZurktQuantile
    delivered_cost_usd_per_m3: ZurktQuantile
    annual_suitable_supply_m3: ZurktQuantile
  }
}

const WOOD_DENSITY_T_PER_M3 = 0.55 // matches zurkt_scenario.py's wood_density_t_per_m3 prior mean
const UGX_PER_USD = 3700

const allCfrResults = (zurktCfrResults.cfrs as ZurktCfrResult[])
  .slice()
  .sort((a, b) => b.modelled.annual_suitable_supply_m3.p50 - a.modelled.annual_suitable_supply_m3.p50)

export const zurktSupplyModel = {
  scenarioVersion: zurktScenario.scenario_version,
  modelVersion: zurktScenario.model_version,
  knownSimplifications: zurktScenario.known_simplifications as string[],
  cfrCount: allCfrResults.length,
  viableCfrCount: allCfrResults.filter((c) => c.modelled.delivered_cost_usd_per_m3.p50 <= 60).length,
  aggregateAnnualSupplyM3: zurktSupplyCurve.aggregate_annual_suitable_supply_m3 as ZurktQuantile,
  supplyCurve: zurktSupplyCurve.points as {
    entity_id: string; canonical_name: string
    delivered_cost_usd_per_m3_p50: number; annual_suitable_supply_m3_p50: number; cumulative_annual_supply_m3_p50: number
  }[],
  volumeBelowCostThreshold: zurktSupplyCurve.volume_below_cost_threshold as {
    delivered_cost_threshold_usd_per_m3: number; contributing_cfrs: number; cumulative_annual_supply_m3_p50: number
  }[],
  sourceConcentration: zurktSupplyCurve.source_concentration as { top5_cfrs_share_of_p50_supply: number | null; top10_cfrs_share_of_p50_supply: number | null },
  outlookYears: zurktOutlook.years as { year: number; annual_supply_m3: ZurktQuantile; cumulative_supply_m3: ZurktQuantile; remaining_stock_m3: ZurktQuantile }[],
  sensitivity: zurktSensitivity.one_variable_sensitivities as {
    perturbation: string; supply_change_pct: number | null; cost_change_pct: number | null
  }[],
  verificationPriorities: zurktVerification.top_verification_targets as {
    entity_id: string; canonical_name: string; value_of_information_proxy: number
    relative_uncertainty_cv: number; commercial_contribution_share: number
    distance_km: number; road_km: number | null; recommended_field_variables: string[]
  }[],
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function gradeTonnesFromShares(r: ZurktCfrResult): GradeTonnes {
  const annualTonnes = r.modelled.annual_suitable_supply_m3.p50 * WOOD_DENSITY_T_PER_M3
  return {
    G1: round1(annualTonnes * r.modelled.grade_g1_share.p50),
    G2: round1(annualTonnes * r.modelled.grade_g2_share.p50),
    G3: round1(annualTonnes * r.modelled.grade_g3_share.p50),
    unclassified: 0,
  }
}

// Map/list performance: surface the 40 highest-annual-supply CFRs as
// individual lots (still real, canonical entities -- see
// zurkt-cfr-supply-results-v1.json and outputs/supply/ for all 274).
const nearestCfrs = allCfrResults.slice(0, 40)

export const supplyPreview: SupplyDataset = {
  provenance: previewProvenance,
  planningStart: "2026-10-01", coverageEnd: "2028-09-30",
  processor: {
    id: "scenario-zurkt-uganda", name: "Zurkt Uganda", location: "Jinja industrial area · scenario processor",
    position: [zurktScenario.processor.location.lat, zurktScenario.processor.location.lon],
    sourcingRadiusKm: value(50),
    specification: {
      id: "zurkt-scenario-standard-euc-v1", label: "Eucalyptus-equivalent · scenario grading (no real Zurkt spec exists)", basis: "legacy-tree-dbh", species: ["Eucalyptus"],
      grades: [
        { grade: "G1", minDiameterCm: 30, minLengthM: 2.7, origin: "Explicit scenario assumption (STANDARD spec); no real Zurkt grading spec exists" },
        { grade: "G2", minDiameterCm: 20, minLengthM: 2.7, origin: "Explicit scenario assumption (STANDARD spec); no real Zurkt grading spec exists" },
        { grade: "G3", minDiameterCm: 15, minLengthM: 2.7, origin: "Explicit scenario assumption (STANDARD spec); no real Zurkt grading spec exists" },
      ],
    },
    utilisation: {
      quarter: "Q2 2026", percent: value<number>(null, "No real Zurkt utilisation record exists"), history: [],
      effectiveCapacityTonnesPerQuarter: value<number>(null, "No real Zurkt capacity record exists"), installedCapacityTonnesPerQuarter: value<number>(null, "No real Zurkt capacity record exists"),
    },
    requirements: [],
  },
  lots: nearestCfrs.map((r): SupplyLot => {
    const m = r.modelled
    const suitableTonnesP10 = round1(m.zurkt_suitable_volume_m3.p10 * WOOD_DENSITY_T_PER_M3)
    const suitableTonnesP50 = round1(m.zurkt_suitable_volume_m3.p50 * WOOD_DENSITY_T_PER_M3)
    const suitableTonnesP90 = round1(m.zurkt_suitable_volume_m3.p90 * WOOD_DENSITY_T_PER_M3)
    const costUgxPerT = (p: number) => Math.round((p / WOOD_DENSITY_T_PER_M3) * UGX_PER_USD)

    return {
      id: r.entity_id, name: r.canonical_name, sourceIdentity: `Canonical CFR AOI ${r.evidence.aoi_id}`, standId: null,
      position: [r.evidence.lat, r.evidence.lon], geometryMethod: "reported-point", species: "Eucalyptus",
      areaHa: value(r.evidence.gross_mapped_area_ha, undefined),
      management: "No management or harvest-status record connected for this CFR.",
      availability: { start: "", end: "", planningDate: "" },
      gradeTonnes: {
        value: gradeTonnesFromShares(r), provenance: modelledProvenance,
        interval: { lower: suitableTonnesP10, upper: suitableTonnesP90, meaning: "P10-P90 total Zurkt-suitable tonnes (not annual), Monte Carlo n=2000" },
      },
      specificationId: "zurkt-scenario-standard-euc-v1",
      standingVolumeM3: {
        value: round1(m.standing_volume_m3.p50), provenance: modelledProvenance,
        interval: { lower: m.standing_volume_m3.p10, upper: m.standing_volume_m3.p90, meaning: "P10-P90 standing volume" },
      },
      recoverableTonnes: {
        value: suitableTonnesP50, provenance: modelledProvenance,
        interval: { lower: suitableTonnesP10, upper: suitableTonnesP90, meaning: "P10-P90 Zurkt-suitable tonnes" },
      },
      stage: "modelled", feasibility: "assumed-feasible", commercialAvailability: "assumed",
      deliveredCostUgxPerT: {
        value: costUgxPerT(m.delivered_cost_usd_per_m3.p50), provenance: modelledProvenance,
        interval: { lower: costUgxPerT(m.delivered_cost_usd_per_m3.p10), upper: costUgxPerT(m.delivered_cost_usd_per_m3.p90), meaning: "P10-P90 delivered cost" },
      },
      evidence: [
        { kind: "field", label: "Field inventory", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No measured DBH, height, stocking or density linked -- stand quantities above are broad scenario priors, not observations." },
        { kind: "management", label: "Harvest window", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No harvest plan or landholder-availability record connected." },
        {
          kind: "eo-observation", label: "EO observations",
          acquiredAt: r.evidence.eo_evidence_status === "observed" ? "2026-09" : null,
          status: r.evidence.eo_evidence_status === "observed" ? "available" : "missing",
          provenance: previewProvenance,
          detail: r.evidence.eo_evidence_status === "observed"
            ? `Real canonical AOI (aoi_version_id ${r.evidence.aoi_version_id}) with Sentinel-1/2 observations from the Uganda country pass. Coverage, not a forest-condition claim.`
            : "No EO observations processed yet for this AOI.",
        },
        {
          kind: "inference", label: "Stochastic supply model", acquiredAt: "2026-09-11",
          status: "available", provenance: modelledProvenance,
          detail: `${zurktScenario.model_version}, n=2000 Monte Carlo draws over broad ASSUMED priors (stocked fraction, maturity, commercial availability, stand DBH/height/density -- no field survey exists for this CFR). Road distance: ${r.evidence.road_km != null ? `${r.evidence.road_km} km (OSRM)` : `${r.evidence.straight_line_km} km straight-line, road routing unavailable`}.`,
        },
      ],
      nextAction: {
        kind: "verify",
        label: "Prioritize field verification",
        reason: "Real catchment membership, distance and EO coverage are known; the modelled supply/cost figures above rest on broad unverified priors -- stocking, DBH, species and access all still need field verification.",
        decisionValue: null,
      },
    }
  }),
}
