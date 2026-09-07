import type { AnalyticalContext, Grade, GradeTonnes, SupplyDataset, SupplyLot } from "./types"

export const grades: Grade[] = ["G1", "G2", "G3", "unclassified"]
export const pipelineStages = ["identified", "modelled", "verified", "engaged", "contracted", "scheduled", "delivered"] as const
export const mapModes = ["supply", "cost", "confidence", "opportunity", "operations"] as const
export const emptyGrades = (): GradeTonnes => ({ G1: 0, G2: 0, G3: 0, unclassified: 0 })
export const number = (value: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value)
export const shortDate = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date))
export const quarterKey = (date: string) => `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`
export const quarterLabel = (quarter: string) => `${quarter.slice(5)} ${quarter.slice(0, 4)}`

/** Great-circle surface distance, not road distance or an economic radius. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180
  const h = Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}
export function compatibleTonnes(values: GradeTonnes, grade: AnalyticalContext["grade"]) {
  return grade === "unclassified" ? 0 : grade === "all" ? values.G1 + values.G2 + values.G3 : values[grade]
}
export function selectedTonnes(lot: SupplyLot, grade: AnalyticalContext["grade"]) {
  const values = lot.gradeTonnes.value
  return values ? grade === "unclassified" ? values.unclassified : compatibleTonnes(values, grade) : 0
}
export function isPotentiallyProcurable(lot: SupplyLot) {
  return !["contracted", "scheduled", "delivered"].includes(lot.stage) && ["confirmed", "assumed-feasible"].includes(lot.feasibility) && lot.commercialAvailability !== "unknown"
}
export function horizonWindow(data: SupplyDataset, context: AnalyticalContext) {
  const start = context.horizonMonths === 0 ? context.asOf : data.planningStart
  const end = new Date(start)
  if (context.horizonMonths === 0) end.setUTCDate(end.getUTCDate() + 1)
  else end.setUTCMonth(end.getUTCMonth() + context.horizonMonths)
  return { start, end: end.toISOString().slice(0, 10) }
}
export function deriveSupply(data: SupplyDataset, context: AnalyticalContext) {
  const window = horizonWindow(data, context)
  const eligible = data.lots.filter(lot => {
    const provenance = lot.gradeTonnes.provenance
    return lot.specificationId === data.processor.specification.id &&
      lot.availability.planningDate >= window.start && lot.availability.planningDate < window.end &&
      (context.speciesFilter === "all" || context.speciesFilter === lot.species) &&
      (context.pipelineStage === "all" ? lot.stage !== "delivered" : lot.stage === context.pipelineStage) &&
      (context.confidenceFilter === "all" || (context.confidenceFilter === "stale" ? provenance.freshness === "stale" : provenance.verification === context.confidenceFilter)) &&
      (lot.gradeTonnes.value === null || selectedTonnes(lot, context.grade) > 0)
  })
  const spatial = eligible.filter(lot => distanceKm(data.processor.position, lot.position) <= context.radiusKm)
  const selected = spatial.filter(lot => !context.quarter || quarterKey(lot.availability.planningDate) === context.quarter)
  const totals = selected.reduce((sum, lot) => {
    for (const grade of grades) sum[grade] += lot.gradeTonnes.value?.[grade] ?? 0
    return sum
  }, emptyGrades())
  // An explicit ordinal policy, not a calibrated score: feasible first, earliest tranche,
  // then compatible tonnes. Unknown costs never become zero-cost bargains.
  const opportunities = [...selected].filter(lot => !["contracted", "scheduled", "delivered"].includes(lot.stage)).sort((a, b) =>
    Number(isPotentiallyProcurable(b)) - Number(isPotentiallyProcurable(a)) ||
    a.availability.planningDate.localeCompare(b.availability.planningDate) || selectedTonnes(b, context.grade) - selectedTonnes(a, context.grade) || a.id.localeCompare(b.id))
  const quarters: { key: string; grades: GradeTonnes; total: number; requirement: number | null; gap: number | null }[] = []
  for (let m = 0; m < Math.min(context.horizonMonths, 24); m += 3) {
    const date = new Date(data.planningStart)
    date.setUTCMonth(date.getUTCMonth() + m)
    const key = quarterKey(date.toISOString())
    const inQuarter = spatial.filter(lot => quarterKey(lot.availability.planningDate) === key)
    const values = inQuarter.reduce((sum, lot) => {
      for (const grade of grades) sum[grade] += lot.gradeTonnes.value?.[grade] ?? 0
      return sum
    }, emptyGrades())
    const total = compatibleTonnes(values, context.grade)
    const plan = data.processor.requirements.find(row => row.quarter === key)?.tonnes.value
    const requirement = plan && context.grade !== "unclassified" ? compatibleTonnes(plan, context.grade) : null
    const incomplete = inQuarter.some(lot => lot.gradeTonnes.value === null)
    quarters.push({ key, grades: values, total, requirement, gap: requirement === null || incomplete ? null : Math.max(0, requirement - total) })
  }
  const potential = selected.filter(isPotentiallyProcurable)
  const missingQuantityCount = selected.filter(lot => lot.gradeTonnes.value === null).length
  const expected = compatibleTonnes(totals, context.grade)
  const costed = potential.filter(lot => lot.deliveredCostUgxPerT.value !== null)
  return {
    window, eligible, selected, totals, expected, potential, opportunities, quarters, missingQuantityCount,
    potentialTonnes: potential.reduce((sum, lot) => sum + (lot.gradeTonnes.value ? compatibleTonnes(lot.gradeTonnes.value, context.grade) : 0), 0),
    nextDate: selected.filter(lot => lot.stage !== "delivered" && lot.availability.planningDate >= context.asOf).map(lot => lot.availability.planningDate).sort()[0] ?? null,
    verifiedTonnes: selected.filter(lot => lot.gradeTonnes.provenance.verification === "verified").reduce((sum, lot) => sum + selectedTonnes(lot, context.grade), 0),
    costRange: costed.length ? [Math.min(...costed.map(lot => lot.deliveredCostUgxPerT.value!)), Math.max(...costed.map(lot => lot.deliveredCostUgxPerT.value!))] : null,
    beyondCoverage: window.end > data.coverageEnd && context.horizonMonths > 24,
  }
}
export type SupplyAnalysis = ReturnType<typeof deriveSupply>
