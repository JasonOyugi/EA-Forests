import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckoutPlaceholder } from "./checkout-placeholder"
import { FloatingCart } from "./floating-cart"
import { ProductGrid } from "./product-grid"
import { ShopHero } from "./shop-hero"
import { ShopSectionHeader } from "./shop-section-header"
import { useShopStore } from "@/stores/shop-store"
import type { ShopDefinition, ShopItem } from "../types"

interface CommerceShellProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

export function CommerceShell({ shop, inventory }: CommerceShellProps) {
  const [searchParams, setSearchParams] = useSearchParams()
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

  const subtotal = getCartSubtotal(inventory)
  const cartCount = getCartCount()

  return (
    <>
      <div className="space-y-6">
        <ShopHero shop={shop} />

        <div className="rounded-xl border bg-card p-6">
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