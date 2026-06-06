"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { ArrowDownUp, ArrowUpRight, Filter, TrendingUp } from "lucide-react"

import forestryServicesInventory from "@/app/shop/data/forestry-services.json"
import { ProductGrid } from "@/app/shop/components/product-grid"
import { ShopSectionHeader } from "@/app/shop/components/shop-section-header"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
type CatalogueFilter = "all" | "land" | "services"
type CatalogueSort = "relevance" | "priceLowToHigh" | "priceHighToLow"

const filterLabels: Record<CatalogueFilter, string> = {
  all: "All",
  land: "Land",
  services: "Services",
}

const sortLabels: Record<CatalogueSort, string> = {
  relevance: "Relevance",
  priceLowToHigh: "Increasing price",
  priceHighToLow: "Decreasing price",
}

export function ForestsLandShop({ inventory }: ForestsLandShopProps) {
  const navigate = useNavigate()
  const [saleBannerVisible, setSaleBannerVisible] = React.useState(true)
  const [countdownBannerVisible, setCountdownBannerVisible] = React.useState(true)
  const [catalogueFilter, setCatalogueFilter] = React.useState<CatalogueFilter>("all")
  const [catalogueSort, setCatalogueSort] = React.useState<CatalogueSort>("relevance")

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
  const landOfferings = React.useMemo(
    () => inventory.filter((item) => item.tags.includes("land")),
    [inventory]
  )
  const catalogueItems = React.useMemo(
    () => [...forestryServicesItems, ...landOfferings],
    [landOfferings]
  )
  const filteredCatalogueItems = React.useMemo(() => {
    const items = catalogueItems
      .filter((item) => {
        if (catalogueFilter === "land") return item.tags.includes("land")
        if (catalogueFilter === "services") return item.kind === "service"
        return true
      })
      .map((item, index) => ({ item, index }))

    if (catalogueSort === "priceLowToHigh") {
      items.sort((a, b) => a.item.price - b.item.price || a.index - b.index)
    } else if (catalogueSort === "priceHighToLow") {
      items.sort((a, b) => b.item.price - a.item.price || a.index - b.index)
    }

    return items.map(({ item }) => item)
  }, [catalogueFilter, catalogueItems, catalogueSort])

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
  ]

  const openItem = (item?: ShopItem) => {
    if (!item) return
    navigate(`/shop/${item.shop}/${item.slug}`)
  }

  const hasVisibleBanner = saleBannerVisible || countdownBannerVisible

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <ForestryServicesSaleBanner onVisibilityChange={setSaleBannerVisible} />
      <ForestryServicesCountdownBanner onVisibilityChange={setCountdownBannerVisible} />

      <section className="space-y-3 sm:space-y-4 md:space-y-5">
        {hasVisibleBanner ? (
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Find The Right Investment For You</h2>
          </div>
        ) : null}

        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1">
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
                          <p className="text-sm leading-6 text-muted-foreground">{entry.subtitle}</p>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ShopSectionHeader
            title="Forestry Land and Services"
            description="Browse forestry land offerings and operational services in one catalogue."
          />
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="theme-primary-border-hover">
                  <Filter className="h-4 w-4" />
                  {filterLabels[catalogueFilter]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={catalogueFilter}
                  onValueChange={(value) => setCatalogueFilter(value as CatalogueFilter)}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="land">Land</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="services">Forestry services</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="theme-primary-border-hover">
                  <ArrowDownUp className="h-4 w-4" />
                  {sortLabels[catalogueSort]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={catalogueSort}
                  onValueChange={(value) => setCatalogueSort(value as CatalogueSort)}
                >
                  <DropdownMenuRadioItem value="relevance">Relevance</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="priceLowToHigh">Increasing price</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="priceHighToLow">Decreasing price</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6">
          <ProductGrid
            items={filteredCatalogueItems}
            quantities={cart}
            onAdd={addItem}
            onDecrement={decrementItem}
            useEnhancedCards={true}
            theme="forests-land"
            onClick={openItem}
          />
        </div>
      </section>
    </div>
  )
}
