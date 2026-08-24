import type { ShopSlug, ShopDefinition, ShopItem } from "@/app/shop/types"
import { SeedlingsShop } from "./seedlings-shop"
import { ForestsLandShop } from "./forests-land-shop"
import { ForestryServicesShop } from "./forestry-services-shop"
import { RoundwoodShop, WoodMarketsMap } from "./roundwood-shop"

export interface ShopPageProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export const shopPageComponents: Record<ShopSlug, React.ComponentType<ShopPageProps>> = {
  seedlings: SeedlingsShop,
  "forests-land": ForestsLandShop,
  "forestry-services": ForestryServicesShop,
  "sector-map": RoundwoodShop,
  "wood-markets-map": WoodMarketsMap,
}
