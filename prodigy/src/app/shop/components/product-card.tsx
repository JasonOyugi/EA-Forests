import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/app/shop/lib/format"
import { ContactMenu } from "./contact-menu"
import type { ShopItem } from "@/app/shop/types"

interface ProductCardProps {
  item: ShopItem
  quantity: number
  onAdd: (itemId: string) => void
  onDecrement: (itemId: string) => void
}

export function ProductCard({
  item,
}: ProductCardProps) {
  return (
    <Card className="overflow-hidden gap-0 py-0">
      <div className="relative aspect-[16/10] overflow-hidden bg-transparent">
        <img
          src={item.image}
          alt={item.name}
          className="block h-full w-full bg-white/95 object-contain object-center p-3"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
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

      <CardContent className="space-y-3 text-white">
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={tag === "new" ? "border-emerald-500 bg-emerald-500 text-white" : undefined}
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="text-sm text-white/82">
          {item.kind === "service" ? "Service" : "Product"} · {item.unitLabel}
        </div>

        <div className="text-2xl font-semibold text-white">
          {formatCurrency(item.price, item.currency)}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t pt-2 pb-3">
        <div className="text-sm text-white/82">Contact for availability</div>
        <ContactMenu productName={item.name} className="emerald-border-hover" />
      </CardFooter>
    </Card>
  )
}
