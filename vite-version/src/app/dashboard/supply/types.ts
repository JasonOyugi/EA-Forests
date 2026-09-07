/** Read-side projections of shared forestry objects. Never a second source of truth. */
export type EpistemicClass = "OBSERVED" | "REPORTED" | "DERIVED" | "INFERRED" | "ASSUMED" | "FORECAST" | "SCENARIO" | "SYNTHETIC" | "UNKNOWN"
export type Grade = "G1" | "G2" | "G3" | "unclassified"
export type GradeTonnes = Record<Grade, number>
export type PipelineStage = "identified" | "modelled" | "verified" | "engaged" | "contracted" | "scheduled" | "delivered"
export type MapMode = "supply" | "cost" | "confidence" | "opportunity" | "operations"

export interface Provenance {
  epistemicClass: EpistemicClass
  world: { id: string; kind: "production" | "scenario" | "experiment" }
  asOf: string
  knownAt: string
  source: string
  freshness: "current" | "stale" | "unknown"
  verification: "verified" | "unverified"
  completeness: "complete" | "partial" | "missing"
  evidenceIds: string[]
  stateSnapshotId?: string
  modelRunId?: string
  modelVersionId?: string
}

export interface EvidenceValue<T> {
  value: T | null
  missingReason?: string
  provenance: Provenance
  interval?: { lower: number; upper: number; meaning: string }
}

export interface SupplyEvidence {
  kind: "field" | "management" | "eo-observation" | "derived-feature" | "inference"
  label: string
  acquiredAt: string | null
  status: "available" | "missing" | "cloud-unavailable" | "disagreement"
  provenance: Provenance
  detail: string
}

export interface SupplyLot {
  id: string
  standId: string | null
  sourceIdentity: string
  name: string
  species: "Eucalyptus" | "Pine"
  position: [number, number]
  geometryMethod: "preview-point" | "reported-point" | "surveyed-point"
  areaHa: EvidenceValue<number>
  management: string
  availability: { start: string; end: string; planningDate: string }
  /** Tranche assigned to one planning date; never repeat its mass in overlapping quarters. */
  gradeTonnes: EvidenceValue<GradeTonnes>
  standingVolumeM3: EvidenceValue<number>
  recoverableTonnes: EvidenceValue<number>
  specificationId: string
  stage: PipelineStage
  feasibility: "assumed-feasible" | "confirmed" | "unknown" | "blocked"
  commercialAvailability: "assumed" | "confirmed" | "unknown"
  deliveredCostUgxPerT: EvidenceValue<number>
  evidence: SupplyEvidence[]
  nextAction: { kind: "verify" | "engage" | "monitor" | "schedule"; label: string; reason: string; decisionValue: null | { value: number; unit: string; modelRunId: string } }
}

export interface ProcessorProjection {
  id: string
  name: string
  location: string
  position: [number, number]
  sourcingRadiusKm: EvidenceValue<number>
  specification: {
    id: string
    label: string
    basis: "legacy-tree-dbh" | "log-sed"
    species: string[]
    grades: { grade: Exclude<Grade, "unclassified">; minDiameterCm: number | null; minLengthM: number | null; origin: string }[]
  }
  utilisation: { quarter: string; percent: EvidenceValue<number>; history: { quarter: string; percent: number }[]; effectiveCapacityTonnesPerQuarter: EvidenceValue<number>; installedCapacityTonnesPerQuarter: EvidenceValue<number> }
  /** Explicit intake plan by quarter and grade; capacity is not a grade demand proxy. */
  requirements: { quarter: string; tonnes: EvidenceValue<GradeTonnes> }[]
}

export interface SupplyDataset {
  processor: ProcessorProjection
  lots: SupplyLot[]
  provenance: Provenance
  planningStart: string
  coverageEnd: string
}

export interface AnalyticalContext {
  processorId: string
  asOf: string
  horizonMonths: 0 | 3 | 6 | 12 | 24 | 60
  quarter: string | null
  radiusKm: 25 | 50 | 100
  grade: Grade | "all"
  mapMode: MapMode
  selectedSupplyId: string | null
  pipelineStage: PipelineStage | "all"
  confidenceFilter: "all" | "verified" | "unverified" | "stale"
  speciesFilter: "all" | SupplyLot["species"]
}
