import { useParams, Navigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ProductPage } from "@/components/commerce-ui/product-page"
import { FlagshipInvestmentPage } from "@/app/shop/components/flagship-investment-page"
import { flagshipPricingCatalog } from "@/app/shop/lib/flagship-pricing"
import { shopInventoryMap } from "./config/shops"

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

  const isFlagshipProduct = productSlug in flagshipPricingCatalog

  return (
    <BaseLayout>
      <div className="mx-auto">
        {isFlagshipProduct ? (
          <FlagshipInvestmentPage
            item={product}
            onBack={() => window.history.back()}
          />
        ) : (
          <ProductPage
            item={product}
            onBack={() => window.history.back()}
          />
        )}
      </div>
    </BaseLayout>
  )
}

