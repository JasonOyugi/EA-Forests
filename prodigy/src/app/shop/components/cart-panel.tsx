import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/app/shop/lib/format"
import type { ShopItem } from "@/app/shop/types"

interface CartPanelProps {
  items: ShopItem[]
  cart: Record<string, number>
  subtotal: number
  checkoutActive: boolean
  onAdd: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onCheckout: () => void
  onClear: () => void
}

export function CartPanel({
  items,
  cart,
  subtotal,
  checkoutActive,
  onAdd,
  onDecrement,
  onRemove,
  onCheckout,
  onClear,
}: CartPanelProps) {
  const lineItems = items.filter((item) => (cart[item.id] ?? 0) > 0)

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Cart</CardTitle>
          <Badge variant="secondary">{lineItems.length} lines</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {lineItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Your cart is empty. Add a few products or services to continue.
          </div>
        ) : (
          lineItems.map((item) => {
            const quantity = cart[item.id] ?? 0
            const lineTotal = item.price * quantity

            return (
              <div key={item.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.unitLabel}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(lineTotal, item.currency)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onDecrement(item.id)}>
                    -
                  </Button>
                  <span className="min-w-8 text-center text-sm">{quantity}</span>
                  <Button size="sm" variant="outline" onClick={() => onAdd(item.id)}>
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => onRemove(item.id)}
                  >
                    Remove
                  </Button>
                </div>

                <Separator />
              </div>
            )
          })
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t pt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>

        <Button disabled={lineItems.length === 0 || checkoutActive} onClick={onCheckout}>
          {checkoutActive ? "Checkout started" : "Proceed to checkout"}
        </Button>

        <Button
          variant="outline"
          disabled={lineItems.length === 0}
          onClick={onClear}
        >
          Clear cart
        </Button>
      </CardFooter>
    </Card>
  )
}