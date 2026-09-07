export type ShopSlug =
  | "seedlings"
  | "forests-land"
  | "forestry-services"
  | "sector-map"
  | "wood-markets-map"

export type ShopDomain = "all" | "timber" | "agroforestry" | "restoration" | "services"

export type ShopItemKind = "product" | "service" | "asset"

export type StockStatus = "in-stock" | "limited" | "quote"

export type EvidenceKind = "observed" | "inferred" | "derived"

export interface EvidenceRef {
  kind: EvidenceKind
  confidence: number
  sourceIds: string[]
  inferenceRuleId?: string
}

export interface SourceRecord {
  id: string
  title: string
  publisher?: string
  url?: string
  publishedAt?: string
  accessedAt?: string
  vintage?: string
  jurisdiction?: string
  adapterId: string
  rawLocator?: string
}

export type PriceType =
  | "official_price"
  | "published_retail"
  | "auction_floor"
  | "asking_price"
  | "indicative_range"
  | "buyer_offer"
  | "unknown"

export interface PriceObservation {
  originalAmount: number
  originalCurrency: string
  unit: string
  basis: string
  priceType: PriceType
  date?: string
  vintage?: string
  seller?: string
  buyer?: string
  entity?: string
  product: string
  specification?: string
  sourceIds: string[]
  evidence: EvidenceRef
}

export type LocationPrecision = "locality" | "address" | "parcel" | "exact" | "geocoded"

export interface LocationEvidence {
  country?: string
  region?: string
  locality?: string
  address?: string
  latitude?: number
  longitude?: number
  precision: LocationPrecision
  confidence: number
  sourceIds: string[]
  evidence: EvidenceRef
}

export interface AvailabilityEvidence {
  status: "available" | "seasonal" | "unavailable" | "unknown"
  asOf?: string
  sourceIds: string[]
  evidence: EvidenceRef
}

export type RegistrationStatus =
  | "historically_registered"
  | "currently_verified"
  | "current_unverified"
  | "unknown"

export interface NurseryIdentityEvidence {
  canonicalId: string
  canonicalName: string
  aliases: string[]
  sourceIds: string[]
  confidence: number
  unresolvedDuplicateCandidates?: string[]
}

export interface NurseryStatusEvidence {
  historicalRegistration?: RegistrationStatus
  currentOperatingEvidence?: EvidenceRef
  currentAvailability?: AvailabilityEvidence
  lastObservedAt?: string
}

export interface InferenceAudit {
  statement: string
  ruleId: string
  inputSourceIds: string[]
  confidence: number
  evidence: EvidenceRef
}

export interface NurseryOfferEvidence {
  kind: "nursery-offer"
  entity: string
  product: string
  prices: PriceObservation[]
  location?: LocationEvidence
  availability?: AvailabilityEvidence
  sourceIds: string[]
}

export interface ForestryServiceOfferEvidence {
  kind: "forestry-service-offer"
  provider?: string
  service: string
  prices: PriceObservation[]
  location?: LocationEvidence
  availability?: AvailabilityEvidence
  sourceIds: string[]
}

export interface ForestInvestmentEvidence {
  kind: "forest-investment-opportunity"
  entity?: string
  opportunity: string
  prices: PriceObservation[]
  location?: LocationEvidence
  availability?: AvailabilityEvidence
  sourceIds: string[]
}

export interface WoodMarketObservationEvidence {
  kind: "wood-market-observation"
  entity?: string
  product: string
  prices: PriceObservation[]
  location?: LocationEvidence
  availability?: AvailabilityEvidence
  sourceIds: string[]
}

export interface ShopCategory {
  id: ShopDomain
  name: string
  description: string
  blurb: string
}

export interface ShopMetric {
  label: string
  value: string
}

export interface ShopItemVariant {
  id: string
  label: string
  count: number
  price: number
  unitLabel?: string
  secondaryPrice?: number
  secondaryUnitLabel?: string
  description?: string
  badge?: string
}

export interface ShopItemImage {
  url: string
  title?: string
}

export interface ShopItemMetric {
  label: string
  value: string
}

export interface ShopItemDetailSection {
  title: string
  items: string[]
}

export interface ShopItemMapPoint {
  id: string
  name: string
  label: string
  category: string
  summary: string
  image: string
  latitude: number
  longitude: number
  details?: string[]
  metrics?: ShopItemMetric[]
  ctaLabel?: string
}

export interface ShopDefinition {
  slug: ShopSlug
  name: string
  shortName: string
  description: string
  heroTitle: string
  heroDescription: string
  heroBadge?: string
  metrics?: ShopMetric[]
  emptyState: string
}

export interface ShopItem {
  id: string
  slug: string
  shop: ShopSlug
  name: string
  species?: string
  materialType?: string
  nurseryVarietyAliases?: string[]
  supplierCount?: number
  evidenceNote?: string
  kind: ShopItemKind
  unitLabel: string
  price: number
  priceAvailable?: boolean
  currency: string
  updatedAt?: string
  description: string
  image: string
  imageGallery?: ShopItemImage[]
  subtitle?: string
  tags: string[]
  stockStatus: StockStatus
  domain: ShopDomain
  featured?: boolean
  variants?: ShopItemVariant[]
  ctaLabel?: string
  featuredLabel?: string
  minimumPriceLabel?: string
  highlights?: string[]
  detailSections?: ShopItemDetailSection[]
  mapTitle?: string
  mapDescription?: string
  mapPoints?: ShopItemMapPoint[]
  observedSupplierCount?: number
  inferredSupplierCount?: number
  evidence?:
    | NurseryOfferEvidence
    | ForestryServiceOfferEvidence
    | ForestInvestmentEvidence
    | WoodMarketObservationEvidence
}
