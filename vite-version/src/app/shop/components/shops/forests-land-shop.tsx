"use client"

import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface ForestsLandShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function ForestsLandShop({ shop, inventory }: ForestsLandShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={<ForestsLandTopBanner />}
      featuredItems={featuredItems}
      featuredTitle="Featured Opportunities"
      featuredSubtitle="Managed forests and land assets ready for review"
      featuredTheme="forests-land"
      featuredSectionClassName="rounded-2xl border border-slate-300 bg-slate-50/80"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Latest forestry opportunities"
      newTheme="forests-land"
      newSectionClassName="rounded-2xl border border-slate-300 bg-slate-100/75"
      showNewArrivals={true}
    />
  )
}
