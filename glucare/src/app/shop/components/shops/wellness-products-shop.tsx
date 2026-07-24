"use client"

import { ShopPromoBanner } from "@/components/commerce-ui/shop-promo-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface WellnessProductsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function WellnessProductsShop({ shop, inventory }: WellnessProductsShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={
        <ShopPromoBanner
          eyebrow="JUST RESTOCKED"
          title="New Wellness Products"
          description="Supplements and skincare essentials from Prodigy Healthcare, now available."
        />
      }
      featuredItems={featuredItems}
      featuredTitle="Featured Products"
      featuredSubtitle="Handpicked wellness essentials for everyday health"
      featuredTheme="wellness-products"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Latest additions to the wellness store"
      newTheme="wellness-products"
      newSectionClassName="rounded-xl"
      showNewArrivals={true}
    />
  )
}
