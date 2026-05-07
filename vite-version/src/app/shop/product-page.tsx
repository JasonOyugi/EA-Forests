import { useParams, Navigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ProductPage } from "@/components/commerce-ui/product-page"
import { FlagshipInvestmentPage } from "./components/flagship-investment-page"
import { shopInventoryMap } from "./config/shops"
import { useShopStore } from "@/stores/shop-store"

export default function ShopProductPage() {
  const { shopSlug, productSlug } = useParams()
  const {
    cart,
    addItem,
    decrementItem,
  } = useShopStore()

  if (!shopSlug || !productSlug) {
    return <Navigate to="/shop" replace />
  }

  const inventory = shopInventoryMap[shopSlug as keyof typeof shopInventoryMap]
  if (!inventory) {
    return <Navigate to="/errors/not-found" replace />
  }

  const product = inventory.find(item => item.slug === productSlug)
  if (!product) {
    return <Navigate to="/errors/not-found" replace />
  }

  const isFlagshipInvestment =
    shopSlug === "forests-land" &&
    ["core-forests", "high-performance-forests", "dryland-frontier-forests"].includes(product.slug)

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6">
        {isFlagshipInvestment ? (
          <FlagshipInvestmentPage item={product} onBack={() => window.history.back()} />
        ) : (
          <ProductPage
            item={product}
            quantity={cart[product.id] || 0}
            onAdd={addItem}
            onDecrement={decrementItem}
            onBack={() => window.history.back()}
          />
        )}
      </div>
    </BaseLayout>
  )
}
