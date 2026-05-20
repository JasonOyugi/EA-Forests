import * as React from "react"
import { useParams, Navigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ProductPage } from "@/components/commerce-ui/product-page"
import { FlagshipInvestmentPage } from "./components/flagship-investment-page"
import { CountryConcessionMapPage } from "./components/country-concession-map-page"
import { tweakcnThemes } from "@/config/theme-data"
import { useThemeManager } from "@/hooks/use-theme-manager"
import { shopInventoryMap } from "./config/shops"
import { useShopStore } from "@/stores/shop-store"

export default function ShopProductPage() {
  const { shopSlug, productSlug } = useParams()
  const { applyTweakcnTheme, isDarkMode } = useThemeManager()
  const lastAppliedNatureThemeRef = React.useRef<string | null>(null)
  const {
    cart,
    addItem,
    decrementItem,
  } = useShopStore()
  const isNatureThemeShop =
    shopSlug === "seedlings" ||
    shopSlug === "forests-land" ||
    shopSlug === "forestry-services" ||
    shopSlug === "roundwood"

  React.useInsertionEffect(() => {
    if (!isNatureThemeShop || !shopSlug) return

    const themeKey = `${shopSlug}-${isDarkMode ? "dark" : "light"}`
    if (lastAppliedNatureThemeRef.current === themeKey) return

    const natureTheme = tweakcnThemes.find((theme) => theme.value === "nature")?.preset
    if (!natureTheme) return

    applyTweakcnTheme(natureTheme, isDarkMode)
    lastAppliedNatureThemeRef.current = themeKey
  }, [applyTweakcnTheme, isDarkMode, isNatureThemeShop, shopSlug])

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
  const isConcessionMapPage =
    shopSlug === "forests-land" &&
    product.slug.includes("concessions")

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6">
        {isFlagshipInvestment ? (
          <FlagshipInvestmentPage item={product} onBack={() => window.history.back()} />
        ) : isConcessionMapPage ? (
          <CountryConcessionMapPage item={product} onBack={() => window.history.back()} />
        ) : (
          <ProductPage
            item={product}
            shopItems={inventory}
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
