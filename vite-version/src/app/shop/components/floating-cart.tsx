import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed z-[80] bottom-24 right-4 md:right-6 lg:right-8 flex flex-col items-end gap-2">
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button
            size="lg"
            className="relative h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl cursor-pointer hover:bg-slate-800"
          >
            <ShoppingCart className="size-6" />
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 min-w-6 justify-center px-1.5">
                {cartCount}
              </Badge>
            )}
            <span className="sr-only">Open cart</span>
          </Button>
        </HoverCardTrigger>

        <HoverCardContent className="mb-3 w-[360px] rounded-xl shadow-2xl bg-background border border-border p-0 animate-in fade-in slide-in-from-bottom-4 relative mr-4 md:mr-6 lg:mr-8">
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
        </HoverCardContent>
      </HoverCard>
    </div>,
    document.body
  )
}