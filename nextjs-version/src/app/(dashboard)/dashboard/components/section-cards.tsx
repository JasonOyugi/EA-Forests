import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BentoTilt } from "@/components/ui/bento-tilt"
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              $1,250.00
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Trending up this month <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Visitors for the last 6 months
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>New Customers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              1,234
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
              Down 20% this period <TrendingDown className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Acquisition needs attention
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Active Accounts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              45,678
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Strong user retention <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Engagement exceed targets</div>
          </CardFooter>
        </Card>
      </BentoTilt>
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>Growth Rate</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              4.5%
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +4.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Steady performance increase <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Meets growth projections</div>
          </CardFooter>
        </Card>
      </BentoTilt>
    </div>
  )
}
