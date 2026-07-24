"use client"

import { ShopPromoBanner } from "@/components/commerce-ui/shop-promo-banner"
import { ShopCommonLayout } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface DiabetesProgramsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function DiabetesProgramsShop({ shop, inventory }: DiabetesProgramsShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={
        <ShopPromoBanner
          eyebrow="REMISSION-FOCUSED CARE"
          title="Start Your Diabetes Care Program"
          description="Structured, personalised programs from GluCare, built around your goals."
          gradientClass="from-rose-100 via-rose-200 to-orange-100"
          accentClass="text-rose-700"
        />
      }
      featuredItems={featuredItems}
      featuredTitle="Featured Programs"
      featuredSubtitle="Our most requested diabetes care programs"
      featuredTheme="diabetes-programs"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Newly launched programs and services"
      newTheme="diabetes-programs"
      newSectionClassName="rounded-xl"
      showNewArrivals={newItems.length > 0}
    />
  )
}
