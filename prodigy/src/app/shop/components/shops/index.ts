import type { ShopSlug, ShopDefinition, ShopItem } from "@/app/shop/types"
import { WellnessProductsShop } from "./wellness-products-shop"
import { HospitalServicesShop } from "./hospital-services-shop"

export interface ShopPageProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export const shopPageComponents: Record<ShopSlug, React.ComponentType<ShopPageProps>> = {
  "wellness-products": WellnessProductsShop,
  "hospital-services": HospitalServicesShop,
}
