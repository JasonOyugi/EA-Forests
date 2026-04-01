import { TrendingDown, TrendingUp, Sprout, Handshake, TriangleAlert, Wallet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="@container/card from-green-500/10">
        <CardHeader>
          <CardDescription>Live Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            14
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +3
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            9 planting sites and 5 silviculture sites <Handshake className="size-10" />
          </div>
          <div className="text-muted-foreground">
            Highest concentration in Rift Valley and Western Kenya
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card from-red-500/10">
        <CardHeader>
          <CardDescription>Land Managed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1,234ha
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Down 20% this season's target <TriangleAlert className="size-10" />
          </div>
          <div className="text-muted-foreground">
            Less silviculture activities
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card from-green-500/10">
        <CardHeader>
          <CardDescription>Trees Planted</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            14.5M
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +20.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Seedling availability increased <Sprout className="size-10" />
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div>
        </CardFooter>
      </Card>

      <Card className="@container/card from-yellow-500/15">
        <CardHeader>
          <CardDescription>Payments Pending</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $5,500.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Wallet />
              5 invoices
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Next payment run is due Friday <Wallet className="size-10" />
          </div>
          <div className="text-muted-foreground">
            2 invoices are awaiting field verification before release
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
