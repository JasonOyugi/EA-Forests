"use client"

import {
  Droplets,
  HeartPulse,
  Layers,
  ShieldCheck,
  Sparkles,
  Syringe,
  Waves,
  type LucideIcon,
} from "lucide-react"
import { ShopPromoBanner } from "@/components/commerce-ui/shop-promo-banner"
import { assetUrl, cn, getAppUrl } from "@/lib/utils"
import { ShopCommonLayout, type ShopCategoryFilter } from "./shop-common"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface HospitalServicesShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

interface HospitalCategoryBanner extends ShopCategoryFilter {
  description: string
  icon: LucideIcon
  className: string
  image: string
}

const hospitalCategoryBanners: HospitalCategoryBanner[] = [
  {
    value: "dialysis-consumables",
    label: "Dialysis Consumables",
    description: "Concentrates, machine care supplies, and dialysis-center essentials.",
    icon: Waves,
    className: "from-cyan-600 to-sky-500",
    image: assetUrl("/dialysis1.jpg"),
  },
  {
    value: "high-level-disinfectants",
    label: "High Level Disinfectants",
    description: "Validated formulas for heat-sensitive devices and clinical equipment.",
    icon: ShieldCheck,
    className: "from-emerald-600 to-teal-500",
    image: assetUrl("/disinfect.webp"),
  },
  {
    value: "vascular-access-icu",
    label: "Vascular Access & ICU",
    description: "Access kits and specialty devices for critical-care teams.",
    icon: Syringe,
    className: "from-blue-700 to-indigo-500",
    image: assetUrl("/icu1.webp"),
  },
  {
    value: "antiseptics",
    label: "Antiseptics",
    description: "Skin-preparation and wound-antisepsis products for clinical use.",
    icon: Sparkles,
    className: "from-amber-500 to-orange-500",
    image: assetUrl("/antiseptic.webp"),
  },
  {
    value: "wound-care",
    label: "Wound Care",
    description: "Dressings and pads for post-operative protection and healing.",
    icon: HeartPulse,
    className: "from-rose-600 to-pink-500",
    image: assetUrl("/wound.jpg"),
  },
  {
    value: "liquids-gels-soaps",
    label: "Liquids, Gels, Soaps",
    description: "Hand hygiene liquids and rubs for everyday hospital workflows.",
    icon: Droplets,
    className: "from-lime-600 to-emerald-500",
    image: assetUrl("/liquidsgel.png"),
  },
]

function HospitalCategoryShowcase({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string
  onSelectCategory: (value: string) => void
}) {
  return (
    <section aria-labelledby="hospital-category-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <a
          href={`${getAppUrl("/shop/hospital-services")}#products-section`}
          onClick={(event) => {
            event.preventDefault()
            onSelectCategory("all")
          }}
          className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
        >
          View all hospital supplies
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hospitalCategoryBanners.map((category) => {
          const Icon = category.icon
          const isActive = selectedCategory === category.value

          return (
            <a
              key={category.value}
              href={`${getAppUrl(`/shop/hospital-services?category=${encodeURIComponent(category.value)}`)}#products-section`}
              onClick={(event) => {
                event.preventDefault()
                onSelectCategory(category.value)
              }}
              className={cn(
                "group relative min-h-44 overflow-hidden rounded-lg p-5 text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300",
                `bg-gradient-to-br ${category.className}`,
                isActive && "ring-4 ring-sky-200"
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {category.image.endsWith(".mp4") ? (
                <video
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src={category.image}
                />
              ) : (
                <img
                  src={category.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105"
                />
              )}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", category.className)} />
              <div className="absolute inset-0 bg-black/28" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_34%)]" />
              <div className="relative flex h-full flex-col justify-between gap-6">
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
                  <p className="text-sm leading-6 text-white/86">{category.description}</p>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export function HospitalServicesShop({ shop, inventory }: HospitalServicesShopProps) {
  const featuredItems = inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))
  const newItems = inventory.filter((item) => item.tags.includes("new"))

  return (
    <ShopCommonLayout
      shop={shop}
      inventory={inventory}
      banner={
        <ShopPromoBanner
          eyebrow="TRUSTED BY HOSPITALS"
          title="Hospital Care Supplies, Delivered Reliably"
          description="Dialysis consumables, high-level disinfectants, vascular access devices, and wound care supplies from Prodigy Healthcare."
          gradientClass="from-sky-100 via-sky-200 to-cyan-100"
          accentClass="text-sky-700"
        />
      }
      categoryFilters={hospitalCategoryBanners.map(({ value, label }) => ({ value, label }))}
      categoryShowcase={(props) => <HospitalCategoryShowcase {...props} />}
      featuredItems={featuredItems}
      featuredTitle="Featured Supplies"
      featuredSubtitle="Popular hospital care consumables and disinfectants"
      featuredTheme="hospital-services"
      featuredSectionClassName="rounded-xl"
      newItems={newItems}
      newTitle="New Arrivals"
      newSubtitle="Latest hospital care supplies now available"
      newTheme="hospital-services"
      newSectionClassName="rounded-xl"
      showNewArrivals={newItems.length > 0}
    />
  )
}
