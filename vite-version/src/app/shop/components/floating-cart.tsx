import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ShoppingCart } from "lucide-react"
import { CartPanel } from "./cart-panel"
import type { ShopItem } from "@/app/shop/types"

interface FloatingCartProps {
  items: ShopItem[]
  cart: Record<string, number>
  subtotal: number
  cartCount: number
  checkoutActive: boolean
  onAdd: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onCheckout: () => void
  onClear: () => void
}

export function FloatingCart({
  items,
  cart,
  subtotal,
  cartCount,
  checkoutActive,
  onAdd,
  onDecrement,
  onRemove,
  onCheckout,
  onClear,
}: FloatingCartProps) {
  return (
    <div className="fixed z-50 bottom-8 right-4 md:right-6 lg:right-8">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" className="relative size-14 rounded-full shadow-lg">
            <ShoppingCart className="size-6" />
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 min-w-6 justify-center px-1.5">
                {cartCount}
              </Badge>
            )}
            <span className="sr-only">Open cart</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          className="w-[360px] p-0 border-0 bg-transparent shadow-none"
        >
          <CartPanel
            items={items}
            cart={cart}
            subtotal={subtotal}
            checkoutActive={checkoutActive}
            onAdd={onAdd}
            onDecrement={onDecrement}
            onRemove={onRemove}
            onCheckout={onCheckout}
            onClear={onClear}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}