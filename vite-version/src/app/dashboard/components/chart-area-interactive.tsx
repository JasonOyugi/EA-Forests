"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const description = "Investor portfolio trends at trimester intervals"

type MetricKey =
  | "expectedPrice"
  | "expectedVolume"
  | "portfolioValue"
  | "landManaged"
  | "cash"
  | "capitalDeployed"

type PortfolioPoint = {
  date: string
  label: string
  isProjected: boolean
} & Record<MetricKey, number>

type MetricMeta = {
  label: string
  shortLabel: string
  unit: string
  color: string
  format: (value: number) => string
  axisTick: (value: number) => string
}

const metricMeta: Record<MetricKey, MetricMeta> = {
  expectedPrice: {
    label: "Expected price",
    shortLabel: "Price",
    unit: "$ per m3",
    color: "#e1d229",
    format: (value) => `$${value.toFixed(2)} / m3`,
    axisTick: (value) => `$${Math.round(value)}`,
  },
  expectedVolume: {
    label: "Expected volume",
    shortLabel: "Volume",
    unit: "m3",
    color: "#2042b3",
    format: (value) => `${Math.round(value).toLocaleString()} m3`,
    axisTick: (value) => compactNumber(value),
  },
  portfolioValue: {
    label: "Portfolio value",
    shortLabel: "Portfolio",
    unit: "$",
    color: "#2f8913",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  landManaged: {
    label: "Land managed",
    shortLabel: "Land",
    unit: "hectares",
    color: "#ac690a",
    format: (value) => `${Math.round(value).toLocaleString()} ha`,
    axisTick: (value) => compactNumber(value),
  },
  cash: {
    label: "Cash",
    shortLabel: "Cash",
    unit: "$",
    color: "#0369a1",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  capitalDeployed: {
    label: "Capital deployed",
    shortLabel: "Deployed",
    unit: "$",
    color: "#dc2626",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
}

const metricOptions: MetricKey[] = [
  "expectedPrice",
  "expectedVolume",
  "portfolioValue",
  "landManaged",
  "cash",
  "capitalDeployed",
]

const chartConfig = Object.fromEntries(
  metricOptions.map((key) => [
    key,
    {
      label: metricMeta[key].label,
      color: metricMeta[key].color,
    },
  ])
) satisfies ChartConfig

function startOfTrimester(value: Date) {
  const trimesterStartMonth = Math.floor(value.getMonth() / 4) * 4
  return new Date(value.getFullYear(), trimesterStartMonth, 1)
}

function addMonths(value: Date, months: number) {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

function getTrimesterLabel(value: Date) {
  const trimester = Math.floor(value.getMonth() / 4) + 1
  return `T${trimester} ${value.getFullYear()}`
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function generatePortfolioSeries(now: Date): PortfolioPoint[] {
  const nowTrimester = startOfTrimester(now)
  const start = new Date(nowTrimester)
  start.setFullYear(start.getFullYear() - 2)

  const end = new Date(nowTrimester)
  end.setFullYear(end.getFullYear() + 3)

  const points: PortfolioPoint[] = []
  let cursor = new Date(start)
  let index = 0

  while (cursor <= end) {
    const seasonalFactor = Math.sin(index / 2)

    const expectedPrice = 78 + index * 2.3 + seasonalFactor * 3.4
    const expectedVolume = 1320 + index * 92 + seasonalFactor * 72
    const landManaged = 290 + index * 16 + seasonalFactor * 5
    const capitalDeployed = 1_600_000 + index * 132_000 + seasonalFactor * 22_000
    const cash = 610_000 - index * 16_000 + seasonalFactor * 58_000
    const portfolioValue =
      expectedPrice * expectedVolume * 0.64 + landManaged * 2_350 + cash - capitalDeployed * 0.16

    points.push({
      date: cursor.toISOString().slice(0, 10),
      label: getTrimesterLabel(cursor),
      isProjected: cursor > nowTrimester,
      expectedPrice: Math.round(expectedPrice * 100) / 100,
      expectedVolume: Math.round(expectedVolume),
      portfolioValue: Math.round(portfolioValue),
      landManaged: Math.round(landManaged),
      cash: Math.round(cash),
      capitalDeployed: Math.round(capitalDeployed),
    })

    cursor = addMonths(cursor, 4)
    index += 1
  }

  return points
}

export function ChartAreaInteractive() {
  const [metric, setMetric] = React.useState<MetricKey>("portfolioValue")
  const chartData = React.useMemo(() => generatePortfolioSeries(new Date()), [])
  const activeMeta = metricMeta[metric]

  return (
    <Card className="@container/card">
      <CardHeader>
        <div>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>
            Past and predicted performance over 4-month intervals.
            <span className={`ml-2 inline-block rounded-md border border-border/60 px-2 py-0.5 text-xs text-foreground`} style={{ backgroundColor: `${activeMeta.color}`, opacity: 0.9 }}>
              {activeMeta.label}: {activeMeta.unit}
            </span>
          </CardDescription>
        </div>
        <CardAction>
          <Select value={metric} onValueChange={(value) => setMetric(value as MetricKey)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              style={{ backgroundColor: `${activeMeta.color}`, opacity: 0.4 }}
              size="sm"
              aria-label="Select chart metric"
            >
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {metricOptions.map((option) => (
                <SelectItem key={option} value={option} className="rounded-lg">
                  {metricMeta[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart data={chartData} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={94}
              tickFormatter={activeMeta.axisTick}
              label={{
                value: `${activeMeta.label} (${activeMeta.unit})`,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "hsl(var(--foreground))" },
              }}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span>{activeMeta.label}</span>
                      <span className="font-mono tabular-nums">
                        {activeMeta.format(Number(value))}
                      </span>
                    </div>
                  )}
                  labelFormatter={(value) => {
                    return String(value)
                  }}
                />
              }
            />
            <Bar
              dataKey={metric}
              fill={`var(--color-${metric})`}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
