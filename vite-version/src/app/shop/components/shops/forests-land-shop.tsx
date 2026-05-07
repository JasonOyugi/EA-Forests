"use client"

import { useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { ArrowUpRight, MapPinned, TrendingUp, Trees } from "lucide-react"

import forestryServicesInventory from "@/app/shop/data/forestry-services.json"
import { ProductGrid } from "@/app/shop/components/product-grid"
import { ShopSectionHeader } from "@/app/shop/components/shop-section-header"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"
import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useShopStore } from "@/stores/shop-store"

interface ForestsLandShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

type InvestmentSection = {
  id: string
  title: string
  subtitle: string
  icon: typeof TrendingUp
  items: Array<{
    title: string
    subtitle: string
    image: string
    actionLabel: string
    item?: ShopItem
  }>
}

const forestryServicesItems = forestryServicesInventory as ShopItem[]

export function ForestsLandShop({ inventory }: ForestsLandShopProps) {
  const navigate = useNavigate()

  const { cart, addItem, decrementItem } = useShopStore(
    useShallow((state) => ({
      cart: state.cart,
      addItem: state.addItem,
      decrementItem: state.decrementItem,
    }))
  )

  const strategies = inventory.filter((item) =>
    ["core-forests", "high-performance-forests", "dryland-frontier-forests"].includes(item.slug)
  )
  const concessions = inventory.find((item) => item.slug === "uganda-concessions")
  const landListings = inventory.find((item) => item.slug === "land-listings")

  const sections: InvestmentSection[] = [
    {
      id: "strategies",
      title: "The Flagship Investments",
      subtitle:
        "This is what the experts are betting on: data-driven, high-performance forestry asset building. Don't guess. Capitalise on the groundwork already done to identify the most promising strategies.",
      icon: TrendingUp,
      items: strategies.map((item) => ({
        title: item.name,
        subtitle: item.subtitle ?? item.description,
        image: item.image,
        actionLabel: item.minimumPriceLabel ?? item.ctaLabel ?? "View strategy",
        item,
      })),
    },
    {
      id: "concessions",
      title: "Concessional Investments",
      subtitle: "Country-level concession pathways arranged for quick review and investor-ready diligence.",
      icon: MapPinned,
      items: [
        {
          title: "Uganda",
          subtitle: concessions?.subtitle ?? "Government-linked concession opportunities with map-based site review.",
          image: "/ug.jpg",
          actionLabel: concessions?.ctaLabel ?? "Review Uganda concessions",
          item: concessions,
        },
        {
          title: "Kenya",
          subtitle: "Regional concessional pipeline under review for investor-ready allocation structures.",
          image: "/ke.jpg",
          actionLabel: "Kenya pipeline",
        },
        {
          title: "Tanzania",
          subtitle: "Cross-border concession opportunities being prepared for diligence and rollout sequencing.",
          image: "/tz.jpg",
          actionLabel: "Tanzania pipeline",
        },
      ],
    },
    {
      id: "land",
      title: "Land Listings",
      subtitle: "Map-led land opportunities with minimum pricing, site context, and room to structure a thesis around them.",
      icon: Trees,
      items: landListings
        ? [
            {
              title: landListings.name,
              subtitle: landListings.subtitle ?? landListings.description,
              image: landListings.image,
              actionLabel: landListings.ctaLabel ?? "Explore listings",
              item: landListings,
            },
          ]
        : [],
    },
  ]

  const openItem = (item?: ShopItem) => {
    if (!item) return
    navigate(`/shop/${item.shop}/${item.slug}`)
  }

  return (
    <div className="space-y-8">
      <ForestsLandTopBanner />
      <ForestryServicesSaleBanner />
      <ForestryServicesCountdownBanner />

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Find The Right Investment For You</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore the flagship strategies, concessional pathways, and land-led entries in a full-width editorial layout.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon

            return (
              <Card key={section.id} className="theme-primary-section-shell overflow-hidden border-transparent bg-transparent py-0 shadow-none">
                <CardHeader className="pb-4 pt-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription>{section.subtitle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-6">
                  {section.items.map((entry) => (
                    <BentoTilt key={`${section.id}-${entry.title}`} className="block">
                      <button
                        type="button"
                        onClick={() => openItem(entry.item)}
                        disabled={!entry.item}
                        className="theme-primary-run-card group/card w-full overflow-hidden rounded-[1.7rem] border border-transparent bg-transparent text-left transition-all duration-300 disabled:cursor-default"
                      >
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={entry.image}
                            alt={entry.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.06]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-xl font-semibold text-white">{entry.title}</div>
                              <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/85">
                                {entry.actionLabel}
                              </div>
                            </div>
                            <ArrowUpRight className="mb-1 h-4 w-4 text-white transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm leading-6 text-slate-600">{entry.subtitle}</p>
                        </div>
                      </button>
                    </BentoTilt>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="products-section" className="rounded-2xl border bg-card p-6">
        <ShopSectionHeader
          title="Forestry Services Catalogue"
          description="Operational services, bundled offers, and dryland support now sit directly under forests and land."
        />
        <div className="mt-6">
          <ProductGrid
            items={forestryServicesItems}
            quantities={cart}
            onAdd={addItem}
            onDecrement={decrementItem}
            useEnhancedCards={true}
            theme="forestry-services"
            onClick={openItem}
          />
        </div>
      </section>
    </div>
  )
}
