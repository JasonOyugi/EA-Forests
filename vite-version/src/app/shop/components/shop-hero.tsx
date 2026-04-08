import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ShopDefinition } from "../types"

interface ShopHeroProps {
  shop: ShopDefinition
}

export function ShopHero({ shop }: ShopHeroProps) {
  return (
    <Card className="overflow-hidden border bg-gradient-to-br from-background to-muted/40">
      <CardContent className="p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {shop.heroBadge && <Badge variant="secondary">{shop.heroBadge}</Badge>}
              <Badge variant="outline">Local JSON backed</Badge>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">{shop.heroTitle}</h2>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                {shop.heroDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {shop.metrics?.map((metric) => (
              <div key={metric.label} className="rounded-xl border bg-background/80 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </div>
                <div className="mt-1 text-sm font-medium">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}