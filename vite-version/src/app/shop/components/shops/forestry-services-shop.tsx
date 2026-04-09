"use client"

import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface ForestryServicesShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function ForestryServicesShop({ shop, inventory }: ForestryServicesShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={
        <>
          <ForestryServicesSaleBanner />
          <div className="mt-6">
            <ForestryServicesCountdownBanner />
          </div>
        </>
      }
      featuredItems={featuredItems}
      featuredTitle="Featured Services"
      featuredSubtitle="Operational services ready for booking"
      featuredTheme="forestry-services"
      featuredSectionClassName="rounded-2xl border border-amber-300 bg-amber-50/70"
      showNewArrivals={false}
    />
  )
}
