import { createContext, useContext } from "react"
import type { AnalyticalContext, SupplyDataset } from "./types"
import type { SupplyAnalysis } from "./selectors"
import { grades, mapModes, pipelineStages } from "./selectors"

export function readContext(params: URLSearchParams, data: SupplyDataset): AnalyticalContext {
  const radius = Number(params.get("radius"))
  const horizon = Number(params.get("months") ?? 12)
  const configuredRadius = data.processor.sourcingRadiusKm.value
  const fallbackRadius = configuredRadius === 25 || configuredRadius === 100 ? configuredRadius : 50
  const grade = params.get("grade")
  const mode = params.get("mode")
  const stage = params.get("stage")
  const confidence = params.get("evidence")
  const species = params.get("species")
  const quarter = params.get("quarter")
  return {
    processorId: data.processor.id, asOf: data.provenance.asOf,
    radiusKm: radius === 25 || radius === 50 || radius === 100 ? radius : fallbackRadius,
    horizonMonths: [0, 3, 6, 12, 24, 60].includes(horizon) ? horizon as AnalyticalContext["horizonMonths"] : 12,
    grade: grades.includes(grade as never) ? grade as AnalyticalContext["grade"] : "all",
    mapMode: mapModes.includes(mode as never) ? mode as AnalyticalContext["mapMode"] : "supply",
    pipelineStage: pipelineStages.includes(stage as never) ? stage as AnalyticalContext["pipelineStage"] : "all",
    confidenceFilter: ["verified", "unverified", "stale"].includes(confidence ?? "") ? confidence as AnalyticalContext["confidenceFilter"] : "all",
    speciesFilter: species === "Eucalyptus" || species === "Pine" ? species : "all",
    quarter: quarter && data.processor.requirements.some(row => row.quarter === quarter) ? quarter : null,
    selectedSupplyId: params.get("supply"),
  }
}

const paramKeys: Partial<Record<keyof AnalyticalContext, string>> = {
  radiusKm: "radius", horizonMonths: "months", grade: "grade", mapMode: "mode", quarter: "quarter",
  selectedSupplyId: "supply", pipelineStage: "stage", confidenceFilter: "evidence", speciesFilter: "species",
}
export function writeContext(params: URLSearchParams, patch: Partial<AnalyticalContext>) {
  const next = new URLSearchParams(params)
  // Clear selection on cohort changes. A detail rail must never silently describe an excluded lot.
  if (Object.keys(patch).some(key => !["mapMode", "selectedSupplyId"].includes(key))) next.delete("supply")
  if ("horizonMonths" in patch) next.delete("quarter")
  for (const [key, value] of Object.entries(patch)) {
    const param = paramKeys[key as keyof AnalyticalContext]
    if (!param) continue
    if (value === null || value === "all") next.delete(param)
    else next.set(param, String(value))
  }
  return next
}

export const SupplyContext = createContext<{
  data: SupplyDataset
  context: AnalyticalContext
  analysis: SupplyAnalysis
  update: (patch: Partial<AnalyticalContext>) => void
} | null>(null)
export function useSupply() {
  const value = useContext(SupplyContext)
  if (!value) throw new Error("Supply components require a SupplyContext")
  return value
}
