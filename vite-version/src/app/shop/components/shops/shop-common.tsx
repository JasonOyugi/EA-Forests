"use client"

import { ReactNode, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutPlaceholder } from "../checkout-placeholder"
import { FloatingCart } from "../floating-cart"
import { ProductGrid } from "../product-grid"
import { ShopSectionHeader } from "../shop-section-header"
import { FeaturedSection } from "@/components/commerce-ui/featured-section"
import { useShopStore } from "@/stores/shop-store"
import type { ShopDefinition, ShopDomain, ShopItem } from "@/app/shop/types"

export type FeaturedTheme = "seedlings" | "forests-land" | "forestry-services" | "roundwood"

interface ShopCommonLayoutProps {
  shop: ShopDefinition
  inventory: ShopItem[]
  banner: ReactNode
  secondaryBanner?: ReactNode
  featuredItems: ShopItem[]
  featuredTitle: string
  featuredSubtitle?: string
  featuredTheme?: FeaturedTheme
  featuredSectionClassName?: string
  newItems?: ShopItem[]
  newTitle?: string
  newSubtitle?: string
  newTheme?: FeaturedTheme
  newSectionClassName?: string
  showNewArrivals?: boolean
}

export function ShopCommonLayout({
  shop,
  inventory,
  banner,
  secondaryBanner,
  featuredItems,
  featuredTitle,
  featuredSubtitle,
  featuredTheme,
  featuredSectionClassName,
  newItems,
  newTitle,
  newSubtitle,
  newTheme,
  newSectionClassName,
  showNewArrivals = true,
}: ShopCommonLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const search = searchParams.get("q") ?? ""

  const {
    cart,
    checkoutState,
    addItem,
    decrementItem,
    removeItem,
    clearCart,
    beginFakeCheckout,
    completeFakeCheckout,
    getCartSubtotal,
    getCartCount,
  } = useShopStore(
    useShallow((state) => ({
      cart: state.cart,
      checkoutState: state.checkoutState,
      addItem: state.addItem,
      decrementItem: state.decrementItem,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
      beginFakeCheckout: state.beginFakeCheckout,
      completeFakeCheckout: state.completeFakeCheckout,
      getCartSubtotal: state.getCartSubtotal,
      getCartCount: state.getCartCount,
    }))
  )

  const subtotal = getCartSubtotal(inventory)
  const cartCount = getCartCount()

  const [selectedSpecies, setSelectedSpecies] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortOrder, setSortOrder] = useState("none")

  const speciesOptions = useMemo(() => {
    const options = inventory
      .map((item) => item.species ?? item.name)
      .filter(Boolean)
    const unique = Array.from(new Set(options))
    return ["all", ...unique]
  }, [inventory])

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return inventory
      .filter((item) => {
        if (selectedCategory === "featured") {
          return item.tags.includes("featured") || item.tags.includes("popular")
        }

        if (selectedCategory === "new") {
          return item.tags.includes("new")
        }

        return true
      })
      .filter((item) => {
        if (!normalized) return true

        return [
          item.name,
          item.species ?? "",
          item.description,
          item.kind,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      })
      .filter((item) => {
        if (selectedSpecies === "all") return true
        return (item.species ?? item.name) === selectedSpecies
      })
      .sort((a, b) => {
        if (sortOrder === "priceLowToHigh") {
          const aPrice = a.variants?.[0]?.price ?? a.price
          const bPrice = b.variants?.[0]?.price ?? b.price
          return aPrice - bPrice
        }
        return 0
      })
  }, [inventory, search, selectedCategory, selectedSpecies, sortOrder])

  const handleProductClick = (item: ShopItem) => {
    navigate(`/shop/${shop.slug}/${item.slug}`)
  }

  const handleFeaturedViewAll = () => {
    setSelectedCategory("featured")
    document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">{banner}</div>
      {secondaryBanner ? <div className="space-y-6">{secondaryBanner}</div> : null}

      <div className="space-y-8">
        <div id="featured-products">
          <FeaturedSection
            title={featuredTitle}
            subtitle={featuredSubtitle}
            type="featured"
            compact={true}
            theme={featuredTheme}
            items={featuredItems}
            quantities={cart}
            onAdd={addItem}
            onDecrement={decrementItem}
            onClick={handleProductClick}
            onViewAll={handleFeaturedViewAll}
            className={featuredSectionClassName}
          />
        </div>

        {showNewArrivals && newItems && newItems.length > 0 ? (
          <div id="new-arrivals-section">
            <FeaturedSection
              title={newTitle ?? "New Arrivals"}
              subtitle={newSubtitle}
              type="new"
              compact={true}
              theme={newTheme}
              items={newItems}
              quantities={cart}
              onAdd={addItem}
              onDecrement={decrementItem}
              onClick={handleProductClick}
              className={newSectionClassName}
            />
          </div>
        ) : null}

        <div id="products-section" className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <ShopSectionHeader title={shop.name} description={shop.description} />

            <div className="w-full max-w-sm">
              <Input
                value={search}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams)
                  const value = event.target.value

                  if (value) next.set("q", value)
                  else next.delete("q")

                  setSearchParams(next, { replace: true })
                }}
                placeholder={`Search ${shop.shortName.toLowerCase()}`}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Filter by species</p>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all" ? "All species" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Category</p>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="new">New arrivals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Sort</p>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Relevance</SelectItem>
                  <SelectItem value="priceLowToHigh">Price: Low to high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-6" />

          {checkoutState === "submitted" ? (
            <CheckoutPlaceholder onBack={() => clearCart()} onConfirm={() => completeFakeCheckout()} />
          ) : (
            <ProductGrid
              items={filteredItems}
              quantities={cart}
              onAdd={addItem}
              onDecrement={decrementItem}
              useEnhancedCards={true}
              theme={featuredTheme}
              onClick={handleProductClick}
            />
          )}
        </div>
      </div>

      <FloatingCart
        items={inventory}
        cart={cart}
        subtotal={subtotal}
        cartCount={cartCount}
        checkoutActive={checkoutState === "submitted"}
        onAdd={addItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onCheckout={beginFakeCheckout}
        onClear={clearCart}
      />
    </div>
  )
}
