import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckoutPlaceholder } from "./checkout-placeholder"
import { CartPanel } from "./cart-panel"
import { CategoryNav } from "./category-nav"
import { ProductGrid } from "./product-grid"
import { useShopStore } from "@/stores/shop-store"
import type { ShopCategory, ShopDomain, ShopItem } from "@/app/shop/types"

interface ShopShellProps {
  categories: ShopCategory[]
  inventory: ShopItem[]
}

export function ShopShell({ categories, inventory }: ShopShellProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")

  const requestedDomain = searchParams.get("domain") as ShopDomain | null
  const activeDomain: ShopDomain | "all" =
    requestedDomain && categories.some((category) => category.id === requestedDomain)
      ? requestedDomain
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
  } = useShopStore((state) => ({
    cart: state.cart,
    checkoutState: state.checkoutState,
    addItem: state.addItem,
    decrementItem: state.decrementItem,
    removeItem: state.removeItem,
    clearCart: state.clearCart,
    beginFakeCheckout: state.beginFakeCheckout,
    completeFakeCheckout: state.completeFakeCheckout,
    getCartSubtotal: state.getCartSubtotal,
  }))

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (search) {
      next.set("q", search)
    } else {
      next.delete("q")
    }
    setSearchParams(next, { replace: true })
  }, [search, searchParams, setSearchParams])

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return inventory.filter((item) => {
      const matchesDomain = activeDomain === "all" ? true : item.domain === activeDomain
      const matchesSearch =
        normalized.length === 0
          ? true
          : [
              item.name,
              item.description,
              item.kind,
              item.domain,
              ...item.tags,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized)

      return matchesDomain && matchesSearch
    })
  }, [activeDomain, inventory, search])

  const subtotal = getCartSubtotal(inventory)

  const activeCategory =
    activeDomain === "all"
      ? null
      : categories.find((category) => category.id === activeDomain) ?? null

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Commerce v1</Badge>
                <Badge variant="outline">Local JSON backed</Badge>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Forestry commerce
              </h2>
              <p className="text-sm text-muted-foreground">
                A first-pass shop surface for seedlings, forests, and forestry
                services. The UI is modular so the data layer and checkout can be
                swapped later.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products or services"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <CategoryNav
            categories={categories}
            activeDomain={activeDomain}
            onChange={(domain) => {
              const next = new URLSearchParams(searchParams)
              if (domain === "all") {
                next.delete("domain")
              } else {
                next.set("domain", domain)
              }
              setSearchParams(next)
            }}
          />

          {activeCategory && (
            <div className="mt-4 rounded-lg bg-muted/40 p-4">
              <div className="font-medium">{activeCategory.name}</div>
              <div className="text-sm text-muted-foreground">
                {activeCategory.description} · {activeCategory.blurb}
              </div>
            </div>
          )}
        </div>

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

      <div className="space-y-4">
        <CartPanel
          items={inventory}
          cart={cart}
          subtotal={subtotal}
          checkoutActive={checkoutState === "submitted"}
          onAdd={addItem}
          onDecrement={decrementItem}
          onRemove={removeItem}
          onCheckout={beginFakeCheckout}
          onClear={clearCart}
        />
      </div>
    </div>
  )
}