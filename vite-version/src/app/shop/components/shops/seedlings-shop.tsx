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
      featuredTitle="Featured Products"
      featuredSubtitle="Handpicked selections for quality and reliability"
      featuredTheme="seedlings"
      featuredSectionClassName="border border-emerald-200 bg-emerald-50/75 rounded-xl"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Latest additions to our catalog"
      newTheme="seedlings"
      newSectionClassName="border border-emerald-400 bg-emerald-100 rounded-xl"
      showNewArrivals={true}
    />
  )
}
