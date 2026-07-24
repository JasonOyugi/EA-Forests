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
      featuredTitle="Mapped genetic material"
      featuredSubtitle="Named varieties with at least one mapped nursery supplier"
      featuredTheme="seedlings"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="Additional genetics"
      newSubtitle="Pure species, hybrids, and clones from nursery records and trial evidence"
      newTheme="seedlings"
      newSectionClassName="rounded-xl"
      showNewArrivals={true}
    />
  )
}
