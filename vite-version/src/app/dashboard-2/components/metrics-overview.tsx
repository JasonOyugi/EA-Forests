import { TrendingDown, TrendingUp, Sprout, Handshake, TriangleAlert, Wallet } from "lucide-react"

import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MetricsOverview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-emerald-100 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Live Projects</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              14
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-emerald-100 animate-pulse">
                <TrendingUp />
                +3
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              9 planting sites and 5 silviculture sites <Handshake className="size-5" />
            </div>
            <div className="text-muted-foreground">
              Highest concentration in Rift Valley and Western Kenya
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-rose-100 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Land Managed</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              1,234ha
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-rose-100 animate-pulse">
                <TrendingDown />
                -20%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Down 20% this season's target <TriangleAlert className="size-5" />
            </div>
            <div className="text-muted-foreground">
              Less silviculture activities
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-emerald-100 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Trees Planted</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              14.5M
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-emerald-100 animate-pulse">
                <TrendingUp />
                +20.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Seedling availability increased <Sprout className="size-5" />
            </div>
            <div className="text-muted-foreground">Engagement exceed targets</div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-lime-100 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Payments Pending</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              $5,500.00
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-lime-100 animate-pulse">
                <Wallet />
                5 invoices
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Next payment run is due Friday <Wallet className="size-5" />
            </div>
            <div className="text-muted-foreground">
              2 invoices are awaiting field verification before release
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>
    </div>
  )
}
