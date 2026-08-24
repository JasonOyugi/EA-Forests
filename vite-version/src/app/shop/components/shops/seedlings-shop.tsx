"use client"

import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface SeedlingsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function SeedlingsShop({ shop, inventory }: SeedlingsShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={<SeedlingsBanner />}
      featuredItems={featuredItems}
      featuredTitle="Featured material"
      featuredSubtitle="The best, tried and tested material in the market right now"
      featuredTheme="seedlings"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="Latest arrivals"
      newSubtitle="Just arrived in the market, ready for planting!"
      newTheme="seedlings"
      newSectionClassName="rounded-xl"
      showNewArrivals={true}
    />
  )
}
