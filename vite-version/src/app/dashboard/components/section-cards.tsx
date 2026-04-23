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
import type { MetricKey } from "./chart-area-interactive"

interface SectionCardsProps {
  onMetricCardClick: (metric: MetricKey) => void
  onPaymentsCardClick: () => void
  portfolioValue: string
  portfolioTrendLabel: string
  portfolioTrendUp: boolean
  portfolioSummary: string
  landManaged: string
  landTrendLabel: string
  landTrendUp: boolean
  landSummary: string
  estimatedVolume: string
  volumeTrendLabel: string
  volumeTrendUp: boolean
  volumeSummary: string
  pendingPayments: string
  pendingInvoicesLabel: string
  pendingSummary: string
}

export function SectionCards({
  onMetricCardClick,
  onPaymentsCardClick,
  portfolioValue,
  portfolioTrendLabel,
  portfolioTrendUp,
  portfolioSummary,
  landManaged,
  landTrendLabel,
  landTrendUp,
  landSummary,
  estimatedVolume,
  volumeTrendLabel,
  volumeTrendUp,
  volumeSummary,
  pendingPayments,
  pendingInvoicesLabel,
  pendingSummary,
}: SectionCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BentoTilt className="h-full">
        <Card
          className={`@container/card h-full cursor-pointer to-card shadow-xs investor-card ${
            portfolioTrendUp ? "bg-emerald-400 investor-card-emerald" : "bg-rose-400 investor-card-rose"
          }`}
          onClick={() => onMetricCardClick("portfolioValue")}
        >
          <CardHeader>
            <CardDescription className="font-bold text-foreground">Projected Portfolio Value</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {portfolioValue}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                {portfolioTrendUp ? <TrendingUp /> : <TrendingDown />}
                {portfolioTrendLabel}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-2 flex gap-2 font-medium">
              {portfolioSummary}
              <Rocket className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card
          className={`@container/card h-full cursor-pointer to-card shadow-xs investor-card ${
            landTrendUp ? "bg-emerald-400 investor-card-emerald" : "bg-rose-400 investor-card-rose"
          }`}
          onClick={() => onMetricCardClick("landManaged")}
        >
          <CardHeader>
            <CardDescription className="font-bold text-foreground">Land Managed</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {landManaged}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                {landTrendUp ? <TrendingUp /> : <TrendingDown />}
                {landTrendLabel}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-2 flex gap-2 font-medium">
              {landSummary}
              <TriangleAlert className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card
          className={`@container/card h-full cursor-pointer to-card shadow-xs investor-card ${
            volumeTrendUp ? "bg-emerald-400 investor-card-emerald" : "bg-rose-300 investor-card-rose"
          }`}
          onClick={() => onMetricCardClick("expectedVolume")}
        >
          <CardHeader>
            <CardDescription className="font-bold text-foreground">Estimated Volume</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {estimatedVolume}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                {volumeTrendUp ? <TrendingUp /> : <TrendingDown />}
                {volumeTrendLabel}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-2 flex gap-2 font-medium">
              {volumeSummary}
              <Sprout className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>

      <BentoTilt className="h-full">
        <Card
          className="@container/card h-full cursor-pointer bg-lime-200 to-card shadow-xs dark:bg-yellow-300 investor-card investor-card-lime"
          onClick={onPaymentsCardClick}
        >
          <CardHeader>
            <CardDescription className="font-bold text-foreground">Payments Pending</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {pendingPayments}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="bg-gray animate-pulse">
                <Wallet />
                {pendingInvoicesLabel}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-2 flex gap-2 font-medium">
              {pendingSummary}
              <Wallet className="size-5" />
            </div>
          </CardFooter>
        </Card>
      </BentoTilt>
    </div>
  )
}
