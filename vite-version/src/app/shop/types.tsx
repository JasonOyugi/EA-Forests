export type ShopSlug =
  | "seedlings"
  | "forests-land"
  | "forestry-services"
  | "roundwood"

export type ShopDomain = "all" | "timber" | "agroforestry" | "restoration" | "services"

export type ShopItemKind = "product" | "service" | "asset"

export type StockStatus = "in-stock" | "limited" | "quote"

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
  kind: ShopItemKind
  unitLabel: string
  price: number
  currency: string
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
}
