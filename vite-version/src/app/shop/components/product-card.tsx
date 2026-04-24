import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/app/shop/lib/format"
import type { ShopItem } from "@/app/shop/types"

interface ProductCardProps {
  item: ShopItem
  quantity: number
  onAdd: (itemId: string) => void
  onDecrement: (itemId: string) => void
}

export function ProductCard({
  item,
  quantity,
  onAdd,
  onDecrement,
}: ProductCardProps) {
  return (
    <Card className="overflow-hidden gap-0 py-0">
      <div className="relative aspect-[16/10] overflow-hidden bg-transparent">
        <img
          src={item.image}
          alt={item.name}
          className="block h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <div className="space-y-2">
            <CardTitle className="text-lg text-white">{item.name}</CardTitle>
            <CardDescription className="max-w-xl text-white/82">{item.description}</CardDescription>
          </div>
          <Badge
            variant={item.stockStatus === "in-stock" ? "default" : "secondary"}
            className="shrink-0 bg-white/90 text-slate-900 backdrop-blur"
          >
            {item.stockStatus === "quote" ? "Quote" : item.stockStatus}
          </Badge>
        </div>
      </div>

      <CardHeader className="sr-only">
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          {item.kind === "service" ? "Service" : "Product"} · {item.unitLabel}
        </div>

        <div className="text-2xl font-semibold">
          {formatCurrency(item.price, item.currency)}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t pt-2 pb-3">
        <div className="text-sm text-muted-foreground">
          {quantity > 0 ? `${quantity} in cart` : "Not in cart"}
        </div>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <Button variant="outline" size="sm" onClick={() => onDecrement(item.id)}>
              Remove one
            </Button>
          )}
          <Button size="sm" className="emerald-border-hover" onClick={() => onAdd(item.id)}>
            Add to cart
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
