import { BaseLayout } from "@/components/layouts/base-layout"
import { ShopShell } from "./components/shop-shell"
import categories from "./data/categories.json"
import inventory from "./data/inventory.json"
import type { ShopCategory, ShopItem } from "./types"

export default function ShopPage() {
  return (
    <BaseLayout
      title="Shop"
      description="Seedlings, forests, and forestry services in one extendable commerce surface."
    >
      <div className="px-4 lg:px-6">
        <ShopShell
          categories={categories as ShopCategory[]}
          inventory={inventory as ShopItem[]}
        />
      </div>
    </BaseLayout>
  )
}