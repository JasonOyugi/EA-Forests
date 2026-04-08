import type { ShopItem } from "@/app/shop/types"
import { ProductCard } from "./product-card"
import { EnhancedProductCard } from "@/components/commerce-ui/enhanced-product-card"

interface ProductGridProps {
  items: ShopItem[]
  quantities: Record<string, number>
  onAdd: (itemId: string, variant?: string) => void
  onDecrement: (itemId: string) => void
  useEnhancedCards?: boolean
  onClick?: (item: ShopItem) => void
}

export function ProductGrid({
  items,
  quantities,
  onAdd,
  onDecrement,
  useEnhancedCards = false,
  onClick,
}: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No products or services match this category yet.
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        useEnhancedCards ? (
          <EnhancedProductCard
            key={item.id}
            item={item}
            quantity={quantities[item.id] ?? 0}
            onAdd={onAdd}
            onDecrement={onDecrement}
            showVariants={true}
            onClick={onClick}
          />
        ) : (
          <ProductCard
            key={item.id}
            item={item}
            quantity={quantities[item.id] ?? 0}
            onAdd={onAdd}
            onDecrement={onDecrement}
          />
        )
      ))}
    </div>
  )
}