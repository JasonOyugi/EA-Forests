import {
  Rocket,
  Sprout,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react"

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

type SummaryCard = {
  title: string
  value: string
  trendLabel: string
  trendUp: boolean
  summary: string
  icon: LucideIcon
  onClick: () => void
  toneClassName: string
}

function DashboardSummaryCard({
  title,
  value,
  trendLabel,
  trendUp,
  summary,
  icon: Icon,
  onClick,
  toneClassName,
}: SummaryCard) {
  return (
    <BentoTilt className="h-full">
      <Card
        className={`@container/card h-full cursor-pointer shadow-xs investor-card ${toneClassName}`}
        onClick={onClick}
      >
        <CardHeader>
          <CardDescription className="font-bold text-foreground">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="animate-pulse bg-gray">
              {trendUp ? <TrendingUp /> : <TrendingDown />}
              {trendLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-2 flex gap-2 font-medium">
            {summary}
            <Icon className="size-5" />
          </div>
        </CardFooter>
      </Card>
    </BentoTilt>
  )
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
  const cards: SummaryCard[] = [
    {
      title: "Projected Portfolio Value",
      value: portfolioValue,
      trendLabel: portfolioTrendLabel,
      trendUp: portfolioTrendUp,
      summary: portfolioSummary,
      icon: TriangleAlert,
      onClick: () => onMetricCardClick("portfolioValue"),
      toneClassName: portfolioTrendUp
        ? "bg-emerald-400 investor-card-emerald"
        : "bg-rose-400 investor-card-rose",
    },
    {
      title: "Land Managed",
      value: landManaged,
      trendLabel: landTrendLabel,
      trendUp: landTrendUp,
      summary: landSummary,
      icon: Rocket,
      onClick: () => onMetricCardClick("landManaged"),
      toneClassName: landTrendUp
        ? "bg-emerald-400 investor-card-emerald"
        : "bg-rose-400 investor-card-rose",
    },
    {
      title: "Estimated Volume",
      value: estimatedVolume,
      trendLabel: volumeTrendLabel,
      trendUp: volumeTrendUp,
      summary: volumeSummary,
      icon: Sprout,
      onClick: () => onMetricCardClick("expectedVolume"),
      toneClassName: volumeTrendUp
        ? "bg-emerald-400 investor-card-emerald"
        : "bg-rose-300 investor-card-rose",
    },
    {
      title: "Payments Pending",
      value: pendingPayments,
      trendLabel: pendingInvoicesLabel,
      trendUp: true,
      summary: pendingSummary,
      icon: Wallet,
      onClick: onPaymentsCardClick,
      toneClassName: "bg-lime-200 dark:bg-yellow-300 investor-card-lime",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <DashboardSummaryCard key={card.title} {...card} />
      ))}
    </div>
  )
}
