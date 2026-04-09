import { useParams, Navigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ProductPage } from "@/components/commerce-ui/product-page"
import { shopInventoryMap } from "./config/shops"
import { useShopStore } from "@/stores/shop-store"

export default function ShopProductPage() {
  const { shopSlug, productSlug } = useParams()

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

  const {
    cart,
    addItem,
    decrementItem,
  } = useShopStore()

  return (
    <BaseLayout title={product.name} description={product.description}>
      <div className="px-4 lg:px-6">
        <ProductPage
          item={product}
          quantity={cart[product.id] || 0}
          onAdd={addItem}
          onDecrement={decrementItem}
          onBack={() => window.history.back()}
        />
      </div>
    </BaseLayout>
  )
}