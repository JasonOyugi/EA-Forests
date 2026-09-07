import type { EvidenceValue, GradeTonnes, Provenance } from "./types"

/** These adapters consume existing outputs; they neither run inference nor promote scenarios. */
export interface LegacyRoundwoodOutput {
  model_run_id: string
  model_version_id: string
  state_snapshot_id: string
  world_id: string
  result: { T_del_by_grade: Record<string, number> }
}
export function adaptLegacyRoundwood(output: LegacyRoundwoodOutput, provenance: Provenance): EvidenceValue<GradeTonnes> {
  if (provenance.world.kind === "production" || provenance.world.id !== output.world_id) {
    throw new Error("Legacy manual stand yields require the matching scenario/experiment world")
  }
  const tonnes = output.result.T_del_by_grade
  for (const key of ["G1", "G2", "G3", "Reject"]) {
    if (!Number.isFinite(tonnes[key]) || tonnes[key] < 0) throw new Error(`Missing or invalid ${key} mass`)
  }
  return {
    // Reject is NOT unclassified and is excluded from compatible tonnes.
    value: { G1: tonnes.G1, G2: tonnes.G2, G3: tonnes.G3, unclassified: 0 },
    provenance: { ...provenance, epistemicClass: "SCENARIO", stateSnapshotId: output.state_snapshot_id, modelRunId: output.model_run_id, modelVersionId: output.model_version_id },
  }
}

export interface SilvicultureEconomicOutput {
  base_currency: string
  metrics: Record<string, number | null>
  assumptions: string[]
  warnings: string[]
}
export function adaptSilvicultureEconomics(output: SilvicultureEconomicOutput, provenance: Provenance) {
  if (provenance.world.kind === "production") throw new Error("Manual silviculture economics remain a scenario")
  return {
    currency: output.base_currency,
    metrics: output.metrics,
    assumptions: output.assumptions,
    warnings: output.warnings,
    provenance: { ...provenance, epistemicClass: "SCENARIO" as const },
    treeSizeDistribution: null,
    compatibilityEffect: null,
    missingReason: "The current silviculture service models operation costs and cashflow; it does not predict intervention-dependent tree-size distributions.",
  }
}

/** An authorized application read endpoint can implement this once production supply exists.
 * Do not call the local canonical admin API or pass its bearer token to the browser. */
export interface SupplyProjectionRequest {
  worldId: string
  processorEntityId: string
  standEntityIds: string[]
  validAt: string
  knownAt: string
  processorSnapshotId: string
  specificationId: string
  managementScenarioId: string | null
}
