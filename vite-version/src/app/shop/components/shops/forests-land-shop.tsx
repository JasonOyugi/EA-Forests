"use client"

import { useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  TrendingUp,
  Trees,
  Wrench,
} from "lucide-react"
import forestryServicesInventory from "@/app/shop/data/forestry-services.json"
import { ProductGrid } from "@/app/shop/components/product-grid"
import { ShopSectionHeader } from "@/app/shop/components/shop-section-header"
import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { useShopStore } from "@/stores/shop-store"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface ForestsLandShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

type CarouselSection = {
  id: string
  title: string
  subtitle: string
  icon: typeof TrendingUp
  cardClass: string
  items: Array<{
    title: string
    subtitle: string
    image: string
    actionLabel: string
    item?: ShopItem
    boundaryClass?: string
    boundaryStyle?: React.CSSProperties
  }>
}

const forestryServicesItems = forestryServicesInventory as ShopItem[]

export function ForestsLandShop({ inventory }: ForestsLandShopProps) {
  const navigate = useNavigate()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    skipSnaps: false,
    containScroll: "trimSnaps",
  })

  const { cart, addItem, decrementItem } = useShopStore(
    useShallow((state) => ({
      cart: state.cart,
      addItem: state.addItem,
      decrementItem: state.decrementItem,
    }))
  )

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)

    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi])

  const strategies = inventory.filter((item) =>
    ["core-forests", "high-performance-forests", "dryland-frontier-forests"].includes(item.slug)
  )
  const concessions = inventory.find((item) => item.slug === "uganda-concessions")
  const landListings = inventory.find((item) => item.slug === "land-listings")
  const featuredServices = forestryServicesItems.filter(
    (item) => item.tags.includes("featured") || item.tags.includes("popular")
  )

  const sections: CarouselSection[] = [
    {
      id: "strategies",
      title: "Forestry Investment Strategies",
      subtitle: "Three structured routes into managed forestry capital.",
      icon: TrendingUp,
      cardClass: "from-[#f7efe3] via-white to-[#eef4ea] border-[#d7c6a3]",
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
      subtitle: "Country-level concession pathways arranged for quick review.",
      icon: MapPinned,
      cardClass: "from-[#edf2f0] via-white to-[#e8efe7] border-[#c7d4ce]",
      items: [
        {
          title: "Uganda",
          subtitle: concessions?.subtitle ?? "Government-linked concession opportunities with map-based site review.",
          image: "/ug.jpg",
          actionLabel: concessions?.ctaLabel ?? "Review Uganda concessions",
          item: concessions,
          boundaryClass: "flag-row flag-row-ug",
          boundaryStyle: {
            border: "1px solid transparent",
            background:
              "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #111111 0%, #facc15 50%, #dc2626 100%) border-box",
          },
        },
        {
          title: "Kenya",
          subtitle: "Regional concessional pipeline under review for investor-ready allocation structures.",
          image: "/ke.jpg",
          actionLabel: "Kenya pipeline",
          boundaryClass: "flag-row flag-row-ke",
          boundaryStyle: {
            border: "1px solid transparent",
            background:
              "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #111111 0%, #dc2626 50%, #15803d 100%) border-box",
          },
        },
        {
          title: "Tanzania",
          subtitle: "Cross-border concession opportunities being prepared for diligence and rollout sequencing.",
          image: "/tz.jpg",
          actionLabel: "Tanzania pipeline",
          boundaryClass: "flag-row flag-row-tz",
          boundaryStyle: {
            border: "1px solid transparent",
            background:
              "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #16a34a 0%, #111111 50%, #2563eb 100%) border-box",
          },
        },
      ],
    },
    {
      id: "services",
      title: "Featured Forestry Services",
      subtitle: "Operational services and bundled offers ready for booking.",
      icon: Wrench,
      cardClass: "from-[#f5ede5] via-white to-[#f3efe8] border-[#d8c5b4]",
      items: featuredServices.map((item) => ({
        title: item.name,
        subtitle: item.description,
        image: item.image,
        actionLabel: item.ctaLabel ?? "Book service",
        item,
      })),
    },
    {
      id: "land",
      title: "Land Listings",
      subtitle: "Map-led land opportunities with minimum pricing and site context.",
      icon: Trees,
      cardClass: "from-[#eef3f8] via-white to-[#f3f6f2] border-[#cbd8e4]",
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Opportunity Deck</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse strategies, concessions, services, and land from one shared commerce flow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => emblaApi?.scrollPrev()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => emblaApi?.scrollNext()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="-ml-5 flex">
            {sections.map((section) => {
              const Icon = section.icon

              return (
                <div key={section.id} className="min-w-0 flex-[0_0_92%] pl-5 md:flex-[0_0_72%] xl:flex-[0_0_48%]">
                  <Card
                    className={`h-full border bg-gradient-to-br ${section.cardClass} py-0 shadow-sm transition-all duration-300 ${
                      sections[selectedIndex]?.id === section.id ? "shadow-xl ring-1 ring-slate-900/5" : ""
                    }`}
                  >
                    <CardHeader className="pb-4 pt-6">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-slate-700 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <CardTitle>{section.title}</CardTitle>
                          <CardDescription>{section.subtitle}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pb-6">
                      {section.items.map((entry) => (
                        <BentoTilt key={`${section.id}-${entry.title}`} className="block">
                          <button
                            type="button"
                            onClick={() => openItem(entry.item)}
                            disabled={!entry.item}
                            className={`w-full overflow-hidden rounded-2xl border border-white/60 bg-white/85 text-left shadow-sm transition hover:bg-white disabled:cursor-default ${section.id === "strategies" ? "emerald-border-hover" : ""} ${entry.boundaryClass ?? ""}`}
                            style={entry.boundaryStyle}
                          >
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={entry.image}
                                alt={entry.title}
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
                              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                                <div>
                                  <div className="text-lg font-semibold text-white">{entry.title}</div>
                                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/85">
                                    {entry.actionLabel}
                                  </div>
                                </div>
                                <ArrowUpRight className="mb-1 h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="text-sm leading-6 text-slate-600">{entry.subtitle}</p>
                            </div>
                          </button>
                        </BentoTilt>
                      ))}

                      {section.id === "services" ? (
                        <div className="rounded-2xl border border-dashed border-amber-300/90 bg-white/55 px-4 py-3 text-sm text-slate-600">
                          Featured forestry services stay in this deck for quick scanning, and the full service catalogue continues below.
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
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
