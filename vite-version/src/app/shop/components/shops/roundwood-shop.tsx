"use client"

import { RoundwoodTopBanner } from "@/components/commerce-ui/roundwood-top-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface RoundwoodShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function RoundwoodShop({ shop, inventory }: RoundwoodShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={<RoundwoodTopBanner />}
      featuredItems={featuredItems}
      featuredTitle="Featured Roundwood"
      featuredSubtitle="Poles, logs, and timber products selected for quality"
      featuredTheme="roundwood"
      featuredSectionClassName="rounded-2xl border border-rose-300 bg-rose-50/70"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Freshly available timber categories"
      newTheme="roundwood"
      newSectionClassName="rounded-2xl border border-rose-300 bg-rose-100/75"
      showNewArrivals={true}
    />
  )
}
