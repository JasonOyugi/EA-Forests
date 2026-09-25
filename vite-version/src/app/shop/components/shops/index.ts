import type { ShopSlug, ShopDefinition, ShopItem } from "@/app/shop/types"
import { ForestsLandShop } from "./forests-land-shop"
import { RoundwoodShop } from "./roundwood-shop"
import {
  ForestryServicesMarketAtlasPage,
  SeedlingsMarketAtlasPage,
  WoodMarketsAtlasPage,
} from "@/app/shop/market-atlas/route-pages"

export interface ShopPageProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export const shopPageComponents: Record<ShopSlug, React.ComponentType<ShopPageProps>> = {
  seedlings: SeedlingsMarketAtlasPage,
  // Kept only so a direct hit on the old URL still renders something before the redirect in
  // shop-page.tsx sends it to /shop/forestry-services — land parcels are no longer a market.
  "forests-land": ForestsLandShop,
  "forestry-services": ForestryServicesMarketAtlasPage,
  "sector-map": RoundwoodShop,
  "wood-markets-map": WoodMarketsAtlasPage,
}
