import { Navigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { shopPageComponents } from "./components/shops"
import { isValidShopSlug, shopDefinitions, shopInventoryMap } from "./config/shops"

export default function ShopPage() {
  const { shopSlug } = useParams()

  if (!shopSlug) {
    return <Navigate to="/shop/seedlings" replace />
  }

  if (!isValidShopSlug(shopSlug)) {
    return <Navigate to="/errors/not-found" replace />
  }

  if (shopSlug === "forestry-services") {
    return <Navigate to="/shop/forests-land" replace />
  }

  const shop = shopDefinitions[shopSlug]
  const inventory = shopInventoryMap[shopSlug]
  const ShopPageComponent = shopPageComponents[shopSlug]

  return (
    <BaseLayout title={shop.name} description={shop.description}>
      <div className="px-4 lg:px-6">
        <ShopPageComponent shop={shop} inventory={inventory} />
      </div>
    </BaseLayout>
  )
}
