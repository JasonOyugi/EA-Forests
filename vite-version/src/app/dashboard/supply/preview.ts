import zurktCatchment from "./data/zurkt-uganda-catchment.json"
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
 * a labeled assumption, not an observed fact -- see
 * backend/scripts/zurkt_supply_catchment.py's module docstring.
 *
 * The CFRs in `zurktCatchment` ARE real: every entry is a canonical,
 * polygon-backed Uganda CFR AOI from the operational database
 * (ea_forests_uganda_country_pass), with a real entity_id/aoi_version_id
 * and real straight-line distance from the scenario processor location.
 * `eoEvidenceStatus` reflects whether that CFR already has real Sentinel-1/2
 * observations from the active Uganda country pass -- it is not modelled.
 * No stand volume, grade mix, harvest cost, or delivered cost is invented
 * for any of them: those fields stay `null` with an explicit
 * missingReason, exactly like the rest of this preview world's honest gaps.
 */
const ZURKT_SCENARIO_LOCATION = { lat: 0.4479, lon: 33.2026 }

type ZurktCatchmentEntry = {
  entity_id: string
  canonical_name: string
  aoi_id: string
  aoi_version_id: string
  lat: number
  lon: number
  area_ha: number
  distance_km: number
  eo_recipe_count: number
  eo_observation_count: number
  eo_evidence_status: "observed" | "not_yet_processed"
}

const catchment = zurktCatchment.cfrs as ZurktCatchmentEntry[]
const nearestCfrs = catchment.slice(0, 15)

export const zurktCatchmentSummary = zurktCatchment.band_summary as {
  band_km: number
  cfr_count: number
  total_polygon_area_ha: number
  cfrs_with_eo_evidence: number
}[]

export const supplyPreview: SupplyDataset = {
  provenance: previewProvenance,
  planningStart: "2026-10-01", coverageEnd: "2028-09-30",
  processor: {
    id: "scenario-zurkt-uganda", name: "Zurkt Uganda", location: "Jinja industrial area · scenario processor",
    position: [ZURKT_SCENARIO_LOCATION.lat, ZURKT_SCENARIO_LOCATION.lon],
    sourcingRadiusKm: value(50),
    specification: {
      id: "zurkt-scenario-standard-euc-v1", label: "Eucalyptus · scenario grading (no real Zurkt spec exists)", basis: "legacy-tree-dbh", species: ["Eucalyptus"],
      grades: [
        { grade: "G1", minDiameterCm: 25, minLengthM: 2.7, origin: "Explicit scenario assumption; no real Zurkt grading spec exists" },
        { grade: "G2", minDiameterCm: 20, minLengthM: 2.7, origin: "Explicit scenario assumption; no real Zurkt grading spec exists" },
        { grade: "G3", minDiameterCm: 15, minLengthM: 2.7, origin: "Explicit scenario assumption; no real Zurkt grading spec exists" },
      ],
    },
    utilisation: {
      quarter: "Q2 2026", percent: value<number>(null, "No real Zurkt utilisation record exists"), history: [],
      effectiveCapacityTonnesPerQuarter: value<number>(null, "No real Zurkt capacity record exists"), installedCapacityTonnesPerQuarter: value<number>(null, "No real Zurkt capacity record exists"),
    },
    requirements: [],
  },
  lots: nearestCfrs.map((cfr): SupplyLot => ({
    id: cfr.entity_id, name: cfr.canonical_name, sourceIdentity: `Canonical CFR AOI ${cfr.aoi_id}`, standId: null,
    position: [cfr.lat, cfr.lon], geometryMethod: "reported-point", species: "Eucalyptus",
    areaHa: value(cfr.area_ha, undefined),
    management: "No management or harvest-status record connected for this CFR.",
    availability: { start: "", end: "", planningDate: "" },
    gradeTonnes: value<GradeTonnes>(null, "No stand inventory connected -- real CFR, catchment identified only"),
    specificationId: "zurkt-scenario-standard-euc-v1",
    standingVolumeM3: value<number>(null, "No stand inventory connected"),
    recoverableTonnes: value<number>(null, "No stand inventory connected"),
    stage: "identified", feasibility: "unknown", commercialAvailability: "unknown",
    deliveredCostUgxPerT: value<number>(null, "Harvest, access and haulage quotes required"),
    evidence: [
      { kind: "field", label: "Field inventory", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No measured DBH, height, stocking or density linked." },
      { kind: "management", label: "Harvest window", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No harvest plan or landholder-availability record connected." },
      {
        kind: "eo-observation", label: "EO observations",
        acquiredAt: cfr.eo_evidence_status === "observed" ? "2026-09" : null,
        status: cfr.eo_evidence_status === "observed" ? "available" : "missing",
        provenance: previewProvenance,
        detail: cfr.eo_evidence_status === "observed"
          ? `Real canonical AOI (aoi_version_id ${cfr.aoi_version_id}) with ${cfr.eo_recipe_count} sensor recipes and ${cfr.eo_observation_count} successful observations from the Uganda country pass. Coverage, not a forest-condition claim.`
          : "No EO observations processed yet for this AOI.",
      },
    ],
    nextAction: {
      kind: "verify",
      label: "Prioritize field verification",
      reason: "Real catchment membership and EO coverage are known; stocking, DBH and access still require field verification before any supply estimate.",
      decisionValue: null,
    },
  })),
}
