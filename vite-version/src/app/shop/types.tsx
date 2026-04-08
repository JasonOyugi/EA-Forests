export type ShopSlug =
  | "seedlings"
  | "forests-land"
  | "forestry-services"
  | "roundwood"

export type ShopItemKind = "product" | "service" | "asset"

export type StockStatus = "in-stock" | "limited" | "quote"

export interface ShopMetric {
  label: string
  value: string
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
  kind: ShopItemKind
  unitLabel: string
  price: number
  currency: string
  description: string
  image: string
  tags: string[]
  stockStatus: StockStatus
  featured?: boolean
}