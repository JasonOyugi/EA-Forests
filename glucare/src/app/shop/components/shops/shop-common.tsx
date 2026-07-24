"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutPlaceholder } from "../checkout-placeholder"
import { FloatingCart } from "../floating-cart"
import { ProductGrid } from "../product-grid"
import { FeaturedSection } from "@/components/commerce-ui/featured-section"
import { useShopStore } from "@/stores/shop-store"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

export type FeaturedTheme = "wellness-products" | "hospital-services" | "diabetes-programs"

export interface ShopCategoryFilter {
  value: string
  label: string
}

interface CategoryShowcaseProps {
  selectedCategory: string
  onSelectCategory: (value: string) => void
}

interface ShopCommonLayoutProps {
  shop: ShopDefinition
  inventory: ShopItem[]
  banner: ReactNode
  secondaryBanner?: ReactNode
  categoryFilters?: ShopCategoryFilter[]
  categoryShowcase?: (props: CategoryShowcaseProps) => ReactNode
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
  categoryFilters = [],
  categoryShowcase,
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
  const categoryOptions = useMemo(
    () => [
      { value: "featured", label: "Featured" },
      { value: "new", label: "New arrivals" },
      ...categoryFilters,
    ],
    [categoryFilters]
  )
  const requestedCategory = searchParams.get("category") ?? "all"
  const selectedCategory = categoryOptions.some((option) => option.value === requestedCategory)
    ? requestedCategory
    : "all"

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

  const [sortOrder, setSortOrder] = useState("none")

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

        if (selectedCategory !== "all") {
          return item.tags.includes(selectedCategory)
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
      .sort((a, b) => {
        if (sortOrder === "priceLowToHigh") {
          const aPrice = a.variants?.[0]?.price ?? a.price
          const bPrice = b.variants?.[0]?.price ?? b.price
          return aPrice - bPrice
        }
        if (sortOrder === "priceHighToLow") {
          const aPrice = a.variants?.[0]?.price ?? a.price
          const bPrice = b.variants?.[0]?.price ?? b.price
          return bPrice - aPrice
        }
        return 0
      })
  }, [inventory, search, selectedCategory, sortOrder])

  const handleProductClick = (item: ShopItem) => {
    navigate(`/shop/${shop.slug}/${item.slug}`)
  }

  const updateCategoryFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)

    if (value === "all") {
      next.delete("category")
    } else {
      next.set("category", value)
    }

    setSearchParams(next, { replace: true })
  }

  const selectCategoryAndScroll = (value: string) => {
    updateCategoryFilter(value)
    window.requestAnimationFrame(() => {
      document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const handleFeaturedViewAll = () => {
    selectCategoryAndScroll("featured")
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">{banner}</div>
      {secondaryBanner ? <div className="space-y-6">{secondaryBanner}</div> : null}
      {categoryShowcase ? (
        <div className="space-y-6">
          {categoryShowcase({
            selectedCategory,
            onSelectCategory: selectCategoryAndScroll,
          })}
        </div>
      ) : null}

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

        <div id="products-section" className="rounded-xl bg-transparent border-none p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Category</p>
              <Select value={selectedCategory} onValueChange={updateCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="priceHighToLow">Price: High to low</SelectItem>
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
