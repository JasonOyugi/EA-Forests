import { TrendingDown, TrendingUp, Sprout, Rocket, TriangleAlert, Wallet } from "lucide-react"

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

export function SectionCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-emerald-400 to-card shadow-xs investor-card investor-card-emerald">
          <CardHeader>
            <CardDescription className="text-foreground font-bold">Projected Portfolio Value</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              $ 14,560,134.21
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                <TrendingUp />
                +30%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Estimated valuation of 912 ha planted and 1,310 ha acquired<Rocket className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-rose-400 to-card shadow-xs investor-card investor-card-rose">
          <CardHeader>
            <CardDescription className="text-foreground font-bold">Land Managed</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              2,222 ha
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                <TrendingDown />
                -20%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Sold 500 ha managed block <TriangleAlert className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-emerald-400 to-card shadow-xs investor-card investor-card-emerald">
          <CardHeader>
            <CardDescription className="text-foreground font-bold">Estimated Volume</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              44,440 m³
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                <TrendingUp />
                +20.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              60% from fast growing Eucalyptus blocks <Sprout className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card className="@container/card h-full bg-lime-200 to-card shadow-xs dark:bg-yellow-300 investor-card investor-card-lime">
          <CardHeader>
            <CardDescription className="text-foreground font-bold">Payments Pending</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              $500,600.00
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                <Wallet />
                5 invoices
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Harvest of 191 ha and selling of 32 ha <Wallet className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>
    </div>
  )
}
