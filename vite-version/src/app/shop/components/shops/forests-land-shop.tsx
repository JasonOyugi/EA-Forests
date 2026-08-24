"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"

import forestryServicesInventory from "@/app/shop/data/forestry-services.json"
import { ProductGrid } from "@/app/shop/components/product-grid"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useShopStore } from "@/stores/shop-store"

interface ForestsLandShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

const forestryServicesItems = forestryServicesInventory as ShopItem[]
type CatalogueFilter = "all" | "land" | "services"
type CatalogueSort = "relevance" | "priceLowToHigh" | "priceHighToLow"

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

  const openItem = (item: ShopItem) => {
    navigate(`/shop/${item.shop}/${item.slug}`)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ForestryServicesSaleBanner onVisibilityChange={setSaleBannerVisible} />
      <ForestryServicesCountdownBanner onVisibilityChange={setCountdownBannerVisible} />
      <span className="sr-only" aria-live="polite">
        {saleBannerVisible || countdownBannerVisible ? "Forests and land offers available" : "Offer banners dismissed"}
      </span>

      <section id="products-section" className="rounded-xl border-none bg-transparent p-6">
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Category</p>
            <Select value={catalogueFilter} onValueChange={(value) => setCatalogueFilter(value as CatalogueFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="land">Forestry land</SelectItem>
                <SelectItem value="services">Forestry services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Sort</p>
            <Select value={catalogueSort} onValueChange={(value) => setCatalogueSort(value as CatalogueSort)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="priceLowToHigh">Price: Low to high</SelectItem>
                <SelectItem value="priceHighToLow">Price: High to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-6" />

        <ProductGrid
          items={filteredCatalogueItems}
          quantities={cart}
          onAdd={addItem}
          onDecrement={decrementItem}
          useEnhancedCards={true}
          theme="seedlings"
          onClick={openItem}
        />
      </section>
    </div>
  )
}
