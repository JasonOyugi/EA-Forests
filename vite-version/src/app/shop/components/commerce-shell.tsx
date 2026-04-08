import { useMemo } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckoutPlaceholder } from "./checkout-placeholder"
import { FloatingCart } from "./floating-cart"
import { ProductGrid } from "./product-grid"
import { ShopHero } from "./shop-hero"
import { ShopSectionHeader } from "./shop-section-header"
import { PromoBanner } from "@/components/commerce-ui/promo-banner"
import { FeaturedSection } from "@/components/commerce-ui/featured-section"
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

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return inventory.filter((item) => {
      if (!normalized) return true

      return [
        item.name,
        item.description,
        item.kind,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
  }, [inventory, search])

  const handleProductClick = (item: ShopItem) => {
    navigate(`/shop/${shop.slug}/${item.slug}`)
  }

  return (
    <>
      <div className="space-y-8">
        {/* Promotional Banner */}
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

        <FeaturedSection
          title="Featured Products"
          subtitle="Handpicked selections for quality and reliability"
          type="featured"
          items={inventory.filter(item => item.tags.includes("featured") || item.tags.includes("popular"))}
          quantities={cart}
          onAdd={addItem}
          onDecrement={decrementItem}
          onClick={handleProductClick}
          onViewAll={() => {
            // Could filter to show only featured
            console.log("View all featured");
          }}
        />

        {/* New Arrivals Section */}
        <FeaturedSection
          title="New Arrivals"
          subtitle="Latest additions to our catalog"
          type="new"
          items={inventory.filter(item => item.tags.includes("new"))}
          quantities={cart}
          onAdd={addItem}
          onDecrement={decrementItem}
          onClick={handleProductClick}
        />

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