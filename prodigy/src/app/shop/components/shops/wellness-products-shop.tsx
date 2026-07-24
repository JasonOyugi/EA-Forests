"use client"

import { Apple, Dumbbell, Sparkles, type LucideIcon } from "lucide-react"
import { ShopPromoBanner } from "@/components/commerce-ui/shop-promo-banner"
import { SkincareBanner } from "@/components/commerce-ui/skincare-banner"
import { NutritionBanner } from "@/components/commerce-ui/nutrition-banner"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { assetUrl, cn, getAppUrl } from "@/lib/utils"
import { ShopCommonLayout, type ShopCategoryFilter } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface WellnessProductsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

interface WellnessCategoryBanner extends ShopCategoryFilter {
  description: string
  icon: LucideIcon
  image: string
  className: string
}

const wellnessCategoryBanners: WellnessCategoryBanner[] = [
  {
    value: "supplements",
    label: "Nutrition",
    description: "Daily supplements, probiotics, and nutrition support essentials.",
    icon: Apple,
    image: assetUrl("/mealplan.jpg"),
    className: "from-emerald-700 to-lime-500",
  },
  {
    value: "skincare",
    label: "Skin Care",
    description: "Targeted topical care, moisturizers, and brightening routines.",
    icon: Sparkles,
    image: assetUrl("/skin.jpg"),
    className: "from-rose-600 to-amber-500",
  },
  {
    value: "weight-management",
    label: "Weight Management",
    description: "Balanced shakes and support products for everyday goals.",
    icon: Dumbbell,
    image: assetUrl("/shake1.jpg"),
    className: "from-sky-700 to-emerald-500",
  },
]

function WellnessCategoryShowcase({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string
  onSelectCategory: (value: string) => void
}) {
  return (
    <section aria-labelledby="wellness-category-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <a
          href={`${getAppUrl("/shop/wellness-products")}#products-section`}
          onClick={(event) => {
            event.preventDefault()
            onSelectCategory("all")
          }}
          className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
        >
          View all personal care products
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {wellnessCategoryBanners.map((category) => {
          const Icon = category.icon
          const isActive = selectedCategory === category.value

          return (
            <BentoTilt key={category.value} maxTilt={5}>
              <a
                href={`${getAppUrl(`/shop/wellness-products?category=${encodeURIComponent(category.value)}`)}#products-section`}
                onClick={(event) => {
                  event.preventDefault()
                  onSelectCategory(category.value)
                }}
                className={cn(
                  "group relative block min-h-48 overflow-hidden rounded-lg p-5 text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300",
                  isActive && "ring-4 ring-emerald-200"
                )}
                aria-current={isActive ? "true" : undefined}
              >
                <img
                  src={category.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105"
                />
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", category.className)} />
                <div className="absolute inset-0 bg-black/18" />
                <div className="relative flex h-full min-h-40 flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 text-white backdrop-blur">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                      Shop
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold leading-tight">{category.label}</h3>
                    <p className="text-sm leading-6 text-white/88">{category.description}</p>
                  </div>
                </div>
              </a>
            </BentoTilt>
          )
        })}
      </div>
    </section>
  )
}

export function WellnessProductsShop({ shop, inventory }: WellnessProductsShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={
        <>
          <ShopPromoBanner
            eyebrow="JUST RESTOCKED"
            title="New Personal Care Products"
            description="Supplements, skincare, and everyday care essentials from Prodigy Healthcare, now available."
          />
          <SkincareBanner />
          <div className="mt-6">
            <NutritionBanner />
          </div>
        </>
      }
      categoryFilters={wellnessCategoryBanners.map(({ value, label }) => ({ value, label }))}
      categoryShowcase={(props) => <WellnessCategoryShowcase {...props} />}
      featuredItems={featuredItems}
      featuredTitle="Featured Products"
      featuredSubtitle="Handpicked personal care essentials for everyday health"
      featuredTheme="wellness-products"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Latest additions to the personal care store"
      newTheme="wellness-products"
      newSectionClassName="rounded-xl"
      showNewArrivals={true}
    />
  )
}
