"use client"

import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface ForestsLandShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function ForestsLandShop({ shop, inventory }: ForestsLandShopProps) {
  const featuredSlugs = new Set([
    "core-forests",
    "high-performance-forests",
    "dryland-frontier-forests",
  ])
  const featuredItems = inventory.filter((item) => featuredSlugs.has(item.slug))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={<ForestsLandTopBanner />}
      featuredItems={featuredItems}
      featuredTitle="Featured Forest Strategies"
      featuredSubtitle="Compare the three main forestry entry points before exploring concessions or land listings."
      featuredTheme="forests-land"
      featuredSectionClassName="border border-emerald-200 bg-emerald-50/75 rounded-xl"
      showNewArrivals={false}
    />
  )
}
