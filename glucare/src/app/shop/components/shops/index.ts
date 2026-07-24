import type { ShopSlug, ShopDefinition, ShopItem } from "@/app/shop/types"
import { DiabetesProgramsShop } from "./diabetes-programs-shop"

export interface ShopPageProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export const shopPageComponents: Record<ShopSlug, React.ComponentType<ShopPageProps>> = {
  "diabetes-programs": DiabetesProgramsShop,
}
