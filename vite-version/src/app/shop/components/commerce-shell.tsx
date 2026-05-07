import { useMemo, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutPlaceholder } from "./checkout-placeholder"
import { FloatingCart } from "./floating-cart"
import { ProductGrid } from "./product-grid"
import { ShopSectionHeader } from "./shop-section-header"
import { PromoBanner } from "@/components/commerce-ui/promo-banner"
import { FeaturedSection } from "@/components/commerce-ui/featured-section"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { useShopStore } from "@/stores/shop-store"
import type { ShopDefinition, ShopItem } from "../types"

interface CommerceShellProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function CommerceShell({ shop, inventory }: CommerceShellProps) {
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
    // Only include specified species
    const allowed = ["eucalyptus", "pine", "cypress", "acacia"]
    return ["all", ...unique.filter(s => allowed.includes(s.toLowerCase()))]
  }, [inventory])

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return inventory
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
      .filter((item) => {
        if (selectedCategory === "all") return true
        return selectedCategory === "featured"
          ? item.tags.includes("featured")
          : item.tags.includes("new")
      })
      .sort((a, b) => {
        if (sortOrder === "priceLowToHigh") {
          const aPrice = a.variants?.[0]?.price ?? a.price
          const bPrice = b.variants?.[0]?.price ?? b.price
          return aPrice - bPrice
        }
        return 0
      })
  }, [inventory, search, selectedSpecies, selectedCategory, sortOrder])

  const handleProductClick = (item: ShopItem) => {
    navigate(`/shop/${shop.slug}/${item.slug}`)
  }

  const isSeedlings = shop.slug === "seedlings"

  return (
    <>
      <div className={isSeedlings ? "space-y-8 bg-primary-50/70 p-6 rounded-[2rem]" : "space-y-8"}>
        {/* Custom banner for seedlings, generic promo banner for others */}
        {isSeedlings ? (
          <SeedlingsBanner />
        ) : (
          <PromoBanner
            title={`${shop.name} - Premium Quality`}
            subtitle="Special Offer"
            description="Discover our curated selection of high-quality forestry products. Limited time offers available!"
            badge="🔥 Hot Deal"
            primaryAction={{
              label: "Shop Now",
              onClick: () => {
                // Scroll to products section
                document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
              },
            }}
            secondaryAction={{
              label: "Learn More",
              onClick: () => {
                // Could open a modal or navigate to info page
                console.log("Learn more clicked");
              },
            }}
          />
        )}

        {/* Featured Products Section */}
        <div id="featured-products">
          <FeaturedSection
            title="Featured Products"
            subtitle="Handpicked selections for quality and reliability"
            type="featured"
            compact={true}
            theme={isSeedlings ? "seedlings" : undefined}
            items={inventory.filter((item) => item.tags.includes("featured") || item.tags.includes("popular"))}
            quantities={cart}
            onAdd={addItem}
            onDecrement={decrementItem}
            onClick={handleProductClick}
            onViewAll={() => {
              // Could filter to show only featured
              console.log("View all featured");
            }}
          />
        </div>

        {/* New Arrivals Section */}
        <div id="new-arrivals-section">
          <FeaturedSection
            title="New Arrivals"
            subtitle="Latest additions to our catalog"
            type="new"
            compact={true}
            theme={isSeedlings ? "seedlings" : undefined}
            items={inventory.filter((item) => item.tags.includes("new"))}
            quantities={cart}
            onAdd={addItem}
            onDecrement={decrementItem}
            onClick={handleProductClick}
          />
        </div>

        {/* Main Products Section */}
        <div id="products-section" className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <ShopSectionHeader
              title={shop.name}
              description={shop.description}
            />

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
            <CheckoutPlaceholder
              onBack={() => clearCart()}
              onConfirm={() => completeFakeCheckout()}
            />
          ) : (
            <ProductGrid
              items={filteredItems}
              quantities={cart}
              onAdd={addItem}
              onDecrement={decrementItem}
              useEnhancedCards={true}
              theme={isSeedlings ? "seedlings" : undefined}
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
    </>
  )
}