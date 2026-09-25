// Canonical actor shape produced by `scripts/market-atlas/sync-market-atlas.mjs`. Keep in sync
// with `scripts/market-atlas/lib/schema.mjs` (the zod schema that validates the generated JSON).
export type ActorMode = "seeds" | "seedlings" | "silviculture" | "harvest_haulage" | "wood"
export type EvidenceClass = "A" | "B" | "C" | "D"

export interface ActorLocation {
  country: string | null
  region: string | null
  district: string | null
  town: string | null
  address?: string | null
  latitude: number | null
  longitude: number | null
  sourceId: string | null
  currentness: string | null
}

export interface ActorOffering {
  kind: string
  fields: Record<string, unknown>
}

export interface ActorSource {
  id: string
  title: string
  url: string | null
  sourceType?: string | null
  publisher?: string | null
  date: string | null
  evidenceClass: EvidenceClass | null
}

export interface ActorImages {
  imageUrl: string | null
  logoUrl: string | null
  imageSourceUrl: string | null
  imageAlt: string | null
  imageStatus: "placeholder" | "verified" | "unverified"
}

export interface Actor {
  id: string
  name: string
  aliases?: string | null
  country: string
  countryCode?: string | null
  regionId: string | null
  regionName: string | null
  regionState: string | null
  districtCounty: string | null
  townSite: string | null
  actorType: string | null
  primaryRole: string | null
  modes: ActorMode[]
  roles: string[]
  species: string | null
  seedlingCapacityPerYear: string | null
  seedlingCertification: string | null
  silvicultureServices: string | null
  harvestHaulageServices: string | null
  processorProducts: string | null
  rawMaterialSpecies: string | null
  logSpecs: string | null
  annualCapacityM3: number | null
  annualRequirementM3: number | null
  currentSupplyM3: number | null
  utilisationPct: number | null
  sourcingRadiusKm: number | null
  certifications: string | null
  website: string | null
  email: string | null
  phone: string | null
  contactPerson: string | null
  currentness: string | null
  evidenceClass: EvidenceClass | null
  catalogStatus: string | null
  sourceCount: number
  bestSourceId: string | null
  lastVerifiedDate: string | null
  summary: string | null
  notes: string | null
  locations: ActorLocation[]
  offerings: ActorOffering[]
  sources: ActorSource[]
  providerIds: string[]
  images: ActorImages
  issues: string[]
}

export interface CoverageGapRow {
  country?: string
  segment?: string
  category?: string
  severity?: string
  gap?: string
  key_gap?: string
  next_action?: string
  next_ingestion_target?: string
  [key: string]: unknown
}

export interface MarketAtlasFile {
  version: number
  generatedAt: string
  sourceHash: string
  actors: Actor[]
  coverage: CoverageGapRow[]
}

// The five sub-market hues (brief §10) collapse into three routed markets: Seeds & Seedlings
// toggles "seeds"/"seedlings", Forestry Services toggles "silviculture"/"harvest_haulage", Wood
// Markets is single-mode ("wood").
export type MarketId = "seedlings" | "forestry-services" | "wood-markets-map"
