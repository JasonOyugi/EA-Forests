import type { MaterialEvidence, SeedTechnicalData } from "./planting-material-types"

export const accessedAt = "2026-09-12"
export function materialEvidence(sourceId: string, url: string, publishedAt: string | null, notes: string, current = false): MaterialEvidence {
  return { kind: "observed", sourceId, url, publishedAt, accessedAt, confidence: "high",
    freshness: current ? "current-catalogue" : publishedAt ? "historical" : "unverified", notes }
}
export const seedSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
export const emptySeedTechnical = (evidence: MaterialEvidence): SeedTechnicalData => ({
  sourceNumber: null, sourceType: "unknown", seedSource: null, origin: null, commonName: null,
  seedsPerKg: null, seedlingsPerKg: null, germination: null, purity: null, pretreatment: null,
  storage: null, sowing: null, nursery: null, plantingZones: null, altitude: null, rainfall: null,
  uses: null, collectionSeason: null, evidence,
})
