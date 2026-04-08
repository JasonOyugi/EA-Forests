import { Navigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { CommerceShell } from "./components/commerce-shell"
import { isValidShopSlug, shopDefinitions, shopInventoryMap } from "./config/shops"

export default function ShopPage() {
  const { shopSlug } = useParams()

  if (!shopSlug) {
    return <Navigate to="/shop/seedlings" replace />
  }

  if (!isValidShopSlug(shopSlug)) {
    return <Navigate to="/errors/not-found" replace />
  }

  const shop = shopDefinitions[shopSlug]
  const inventory = shopInventoryMap[shopSlug]

  return (
    <BaseLayout title={shop.name} description={shop.description}>
      <div className="px-4 lg:px-6">
        <CommerceShell shop={shop} inventory={inventory} />
      </div>
    </BaseLayout>
  )
}