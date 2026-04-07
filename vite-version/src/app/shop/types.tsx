export type ShopDomain = "seedlings" | "forests" | "forestry-services"

export interface ShopCategory {
  id: ShopDomain
  name: string
  description: string
  blurb: string
}

export interface ShopItem {
  id: string
  slug: string
  name: string
  domain: ShopDomain
  kind: "product" | "service"
  unitLabel: string
  price: number
  currency: string
  description: string
  image: string
  tags: string[]
  stockStatus: "in-stock" | "limited" | "quote"
  featured?: boolean
}

export interface CartItem {
  itemId: string
  quantity: number
}