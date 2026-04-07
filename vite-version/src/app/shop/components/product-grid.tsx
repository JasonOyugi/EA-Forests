import type { ShopItem } from "@/app/shop/types"
import { ProductCard } from "./product-card"

interface ProductGridProps {
  items: ShopItem[]
  quantities: Record<string, number>
  onAdd: (itemId: string) => void
  onDecrement: (itemId: string) => void
}

export function ProductGrid({
  items,
  quantities,
  onAdd,
  onDecrement,
}: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No products or services match this category yet.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          quantity={quantities[item.id] ?? 0}
          onAdd={onAdd}
          onDecrement={onDecrement}
        />
      ))}
    </div>
  )
}