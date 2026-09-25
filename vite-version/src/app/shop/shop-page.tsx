import { Navigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { shopPageComponents } from "./components/shops"
import { isValidShopSlug, shopDefinitions, shopInventoryMap } from "./config/shops"

export default function ShopPage() {
  const { shopSlug } = useParams()

  if (!shopSlug) {
    return <Navigate to="/shop/seedlings" replace />
  }

  if (shopSlug === "roundwood") {
    return <Navigate to="/landing#sector-map" replace />
  }

  if (shopSlug === "sector-map") {
    return <Navigate to="/landing#sector-map" replace />
  }

  if (!isValidShopSlug(shopSlug)) {
    return <Navigate to="/errors/not-found" replace />
  }

  // Land parcels/managed-forest-block commerce has been removed — Forestry Services (silviculture
  // + harvest & haulage contractors) is now the second Market Atlas market.
  if (shopSlug === "forests-land") {
    return <Navigate to="/shop/forestry-services" replace />
  }

  const shop = shopDefinitions[shopSlug]
  const inventory = shopInventoryMap[shopSlug]
  const ShopPageComponent = shopPageComponents[shopSlug]

  // The Market Atlas shell renders its own interactive title (brief §3 — the title *is* the mode
  // control), so BaseLayout must not also render a static heading above it.
  const isMarketAtlasRoute = shopSlug === "seedlings" || shopSlug === "forestry-services" || shopSlug === "wood-markets-map"

  return (
    <BaseLayout title={isMarketAtlasRoute ? undefined : shop.name} description={isMarketAtlasRoute ? undefined : shop.description}>
      <div className="px-4 lg:px-6">
        <ShopPageComponent shop={shop} inventory={inventory} />
      </div>
    </BaseLayout>
  )
}
