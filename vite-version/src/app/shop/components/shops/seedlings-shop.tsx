"use client"

import { PlantingMarket } from "../planting-market"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface SeedlingsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function SeedlingsShop({ inventory }: SeedlingsShopProps) {
  return <PlantingMarket inventory={inventory} />
}
