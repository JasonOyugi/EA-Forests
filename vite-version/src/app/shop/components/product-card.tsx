import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
    <Card className="group overflow-hidden py-0 gap-0">
      <div className="relative min-h-[360px] bg-black">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-300 group-hover:scale-105 [filter:brightness(0.72)_saturate(0.9)_contrast(1.03)]"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.78) 100%), url(${item.image})`,
          }}
        />

        <div className="relative flex min-h-[360px] flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <Badge
              variant={item.stockStatus === "in-stock" ? "default" : "secondary"}
              className="shrink-0 bg-white/90 text-slate-900 backdrop-blur"
            >
              {item.stockStatus === "quote" ? "Quote" : item.stockStatus}
            </Badge>
          </div>

          <div className="space-y-4 text-white">
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold leading-tight text-white">
                {item.name}
              </CardTitle>
              <CardDescription className="max-w-xl text-sm leading-relaxed text-white/85">
                {item.description}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="text-sm text-white/80">
              {item.kind === "service" ? "Service" : "Product"} · {item.unitLabel}
            </div>

            <div className="text-2xl font-semibold text-white">
              {formatCurrency(item.price, item.currency)}
            </div>
          </div>
        </div>
      </div>

      <CardHeader className="sr-only">
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>

      <CardFooter className="flex items-center justify-between gap-3 bg-background pt-2 pb-3">
        <div className="text-sm text-muted-foreground">
          {quantity > 0 ? `${quantity} in cart` : "Not in cart"}
        </div>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecrement(item.id)}
            >
              Remove one
            </Button>
          )}
          <Button
            size="sm"
            className="emerald-border-hover"
            onClick={() => onAdd(item.id)}
          >
            Add to cart
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
