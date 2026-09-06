import type { EvidenceRef, LocationEvidence, PriceObservation } from "../types"

export function validatePriceObservation(observation: PriceObservation) {
  const errors: string[] = []
  if (!Number.isFinite(observation.originalAmount)) errors.push("price amount")
  if (!observation.originalCurrency.trim()) errors.push("currency")
  if (!observation.unit.trim()) errors.push("unit")
  if (!observation.basis.trim()) errors.push("basis")
  if (!observation.product.trim()) errors.push("product")
  if (observation.sourceIds.length === 0) errors.push("source IDs")
  return errors
}

export function validateEvidenceRef(evidence: EvidenceRef) {
  if (evidence.confidence < 0 || evidence.confidence > 1) return ["confidence"]
  if (evidence.sourceIds.length === 0) return ["source IDs"]
  if (evidence.kind === "inferred" && !evidence.inferenceRuleId?.trim()) {
    return ["inference rule"]
  }
  return []
}

export function validateLocationEvidence(location: LocationEvidence) {
  const errors = [...validateEvidenceRef(location.evidence)]
  if (location.evidence.kind === "derived" && (location.latitude == null || location.longitude == null)) {
    errors.push("derived coordinates")
  }
  if ((location.latitude != null || location.longitude != null) && !location.precision) {
    errors.push("coordinate precision")
  }
  return errors
}

export function assertProductionEvidence(value: unknown) {
  const serialized = JSON.stringify(value).toLowerCase()
  if (/dummy-land-generated|\bdummy\b|\btest record\b|replace with verified/.test(serialized)) {
    throw new Error("Synthetic or dummy commercial evidence cannot be exposed in production")
  }
}

export function assertNamedCloneInference(
  name: string,
  evidence: EvidenceRef,
  explicitlyNamedBySource: boolean
) {
  if (/\b(gu\s*7|gc\s*550)\b/i.test(name) && evidence.kind === "inferred" && !explicitlyNamedBySource) {
    throw new Error("Named clones require an explicit observed source fact")
  }
}
