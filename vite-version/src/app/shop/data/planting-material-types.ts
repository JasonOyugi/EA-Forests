/** Shared commerce fields; seed biology lives only on seed offers. */
export type PlantingMaterialType = "seedling" | "seed"
export type ObservationKind = "observed" | "derived" | "inferred" | "unknown"
export type MaterialUnit = "seedling" | "g" | "kg" | "packet" | "unknown"

export interface MaterialEvidence {
  kind: ObservationKind
  sourceId: string
  url: string | null
  publishedAt: string | null
  accessedAt: string | null
  confidence: "high" | "medium" | "low" | "unknown"
  freshness: "current-catalogue" | "historical" | "unverified"
  notes: string
}

export interface MaterialCoordinate {
  latitude: number
  longitude: number
}

export interface MaterialSupplier {
  id: string
  name: string
  country: string | null
  station: string | null
  region: string | null
  address: string | null
  coordinate: MaterialCoordinate | null
  coordinatePrecision: string | null
  coordinateEvidence: MaterialEvidence | null
  phone: string | null
  email: string | null
  website: string | null
  ordering: string | null
  delivery: string | null
  evidence: MaterialEvidence
  active?: boolean
  branches?: Array<{ name: string; address: string; phone: string; sourceUrl: string }>
}

export interface MaterialQuote {
  /** Original published amount, including when its commercial unit is unknown. */
  amount: number | null
  currency: string
  quantity: number | null
  unit: MaterialUnit
  packLabel?: string
  massGrams?: number | null
  minimumOrder?: string | null
  evidence: MaterialEvidence
}

export interface SeedTechnicalData {
  sourceNumber: string | null
  sourceType: "seed orchard" | "clonal seed orchard" | "seed production stand" | "plantation" | "natural stand" | "imported source" | "unknown"
  seedSource: string | null
  origin: string | null
  commonName: string | null
  seedsPerKg: number | null
  seedlingsPerKg: number | null
  germination: string | null
  purity: string | null
  pretreatment: string | null
  storage: string | null
  sowing: string | null
  nursery: string | null
  plantingZones: string | null
  altitude: string | null
  rainfall: string | null
  uses: string | null
  collectionSeason: string | null
  evidence: MaterialEvidence
}

interface MaterialOfferBase {
  id: string
  productId: string
  supplier: MaterialSupplier
  scientificName: string
  variety: string | null
  provenance: string | null
  availability: "available" | "seasonal" | "order-only" | "unavailable" | "unknown"
  availabilityNote: string
  evidence: MaterialEvidence
  quotes: MaterialQuote[]
  historicalQuotes?: MaterialQuote[]
}

export type PlantingMaterialOffer =
  | (MaterialOfferBase & { material: "seedling"; capacity: number | null; traceability: string | null })
  | (MaterialOfferBase & { material: "seed"; technical: SeedTechnicalData })

export interface MaterialSelection {
  quantity: number
  unit: MaterialUnit
  /** Pack identity prevents comparing unlike packets. */
  packLabel?: string
}

export interface MaterialPrice extends MaterialSelection {
  amount: number
  currency: string
  kind: ObservationKind
  note: string
  offerId: string
  supplierName: string
  original: MaterialQuote
  perUnit: number
}

export interface MaterialFilters {
  country?: string
  region?: string
  supplier?: string
  variety?: string
  availability?: string
  location?: MaterialCoordinate | null
  radiusKm?: number | null
  pricedOnly?: boolean
  priceCurrency?: string
  maxPrice?: number | null
}
