import {
  Rocket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { MetricCardDecoration } from "@/app/landing/components/metric-card-decoration"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Track v5-19 reality reset: replaces the fake portfolio-value/payments-
 * pending headline cards with the four real asset metrics the sprint asked
 * for -- forest area, standing volume, best netback price, and asset
 * value. Every value is a real P50 (with a P10-P90 range shown in the
 * summary line) from asset-state-v1.json, never a fabricated point
 * estimate.
 */
interface SectionCardsProps {
  onForestAreaClick: () => void
  onVolumeClick: () => void
  onNetbackClick: () => void
  onValueClick: () => void
  forestArea: string
  forestAreaSummary: string
  standingVolume: string
  volumeRangeLabel: string
  volumeSummary: string
  bestNetback: string
  netbackTrendUp: boolean
  netbackSummary: string
  assetValue: string
  assetValueTrendUp: boolean
  assetValueSummary: string
}

type SummaryCard = {
  title: string
  value: string
  trendLabel: string
  trendUp: boolean
  summary: string
  positiveIcon: LucideIcon
  negativeIcon?: LucideIcon
  onClick: () => void
  toneClassName: string
  decorationAccent: string
}

function DashboardSummaryCard({
  title,
  value,
  trendLabel,
  trendUp,
  summary,
  positiveIcon,
  negativeIcon,
  onClick,
  toneClassName,
  decorationAccent,
}: SummaryCard) {
  const Icon = trendUp ? positiveIcon : negativeIcon ?? positiveIcon

  return (
    <BentoTilt className="h-full">
      <Card
        className={`@container/card relative overflow-hidden h-full cursor-pointer shadow-xs investor-card ${toneClassName}`}
        onClick={onClick}
      >
        <MetricCardDecoration accent={decorationAccent} />
        <CardHeader className="relative z-10">
          <CardDescription className="font-bold text-foreground">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="bg-gray">
              {trendUp ? <TrendingUp /> : <TrendingDown />}
              {trendLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1.5 text-sm">
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
  onForestAreaClick,
  onVolumeClick,
  onNetbackClick,
  onValueClick,
  forestArea,
  forestAreaSummary,
  standingVolume,
  volumeRangeLabel,
  volumeSummary,
  bestNetback,
  netbackTrendUp,
  netbackSummary,
  assetValue,
  assetValueTrendUp,
  assetValueSummary,
}: SectionCardsProps) {
  const cards: SummaryCard[] = [
    {
      title: "Forest / Stocked Area",
      value: forestArea,
      trendLabel: "OBSERVED",
      trendUp: true,
      summary: forestAreaSummary,
      positiveIcon: Rocket,
      onClick: onForestAreaClick,
      toneClassName: "bg-emerald-400 investor-card-emerald",
      decorationAccent: "#34d399",
    },
    {
      title: "Standing Volume",
      value: standingVolume,
      trendLabel: volumeRangeLabel,
      trendUp: true,
      summary: volumeSummary,
      positiveIcon: Rocket,
      onClick: onVolumeClick,
      toneClassName: "bg-emerald-400 investor-card-emerald",
      decorationAccent: "#34d399",
    },
    {
      title: "Best Netback Price",
      value: bestNetback,
      trendLabel: netbackTrendUp ? "SCENARIO PRICE" : "BELOW COST",
      trendUp: netbackTrendUp,
      summary: netbackSummary,
      positiveIcon: Rocket,
      negativeIcon: TriangleAlert,
      onClick: onNetbackClick,
      toneClassName: netbackTrendUp ? "bg-emerald-400 investor-card-emerald" : "bg-rose-400 investor-card-rose",
      decorationAccent: netbackTrendUp ? "#34d399" : "#fb7185",
    },
    {
      title: "Asset Value",
      value: assetValue,
      trendLabel: assetValueTrendUp ? "MODELLED" : "NEGATIVE"  ,
      trendUp: assetValueTrendUp,
      summary: assetValueSummary,
      positiveIcon: Rocket,
      negativeIcon: TriangleAlert,
      onClick: onValueClick,
      toneClassName: assetValueTrendUp ? "bg-lime-200 dark:bg-yellow-300 investor-card-lime" : "bg-rose-300 investor-card-rose",
      decorationAccent: assetValueTrendUp ? "#bef264" : "#fda4af",
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
