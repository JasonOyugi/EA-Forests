"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from "recharts"

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
import {
  generatePortfolioSeries,
  portfolioSeriesReferenceDate,
  type PortfolioMetricKey as MetricKey,
} from "../data/forestry-data"

export type { PortfolioPoint } from "../data/forestry-data"
export type { PortfolioMetricKey as MetricKey } from "../data/forestry-data"
export { generatePortfolioSeries, portfolioSeriesReferenceDate } from "../data/forestry-data"

type MetricMeta = {
  label: string
  unit: string
  format: (value: number) => string
  axisTick: (value: number) => string
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const metricMeta: Record<MetricKey, MetricMeta> = {
  expectedPrice: {
    label: "Expected price",
    unit: "$ per tonne",
    format: (value) => `$${formatDecimal(value)} / tonne`,
    axisTick: (value) => `$${formatDecimal(value)}`,
  },
  expectedVolume: {
    label: "Expected volume",
    unit: "m3",
    format: (value) => `${formatDecimal(value)} m3`,
    axisTick: (value) => compactNumber(value),
  },
  portfolioValue: {
    label: "Portfolio value",
    unit: "$",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  landManaged: {
    label: "Land managed",
    unit: "hectares",
    format: (value) => `${formatDecimal(value)} ha`,
    axisTick: (value) => compactNumber(value),
  },
  cash: {
    label: "Cash",
    unit: "$",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  capitalDeployed: {
    label: "Capital deployed",
    unit: "$",
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
      color: "var(--chart-accent)",
    },
  ])
) satisfies ChartConfig

interface ChartAreaInteractiveProps {
  metric: MetricKey
  onMetricChange: (metric: MetricKey) => void
}

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace("#", "")
  const normalized =
    sanitized.length === 3
      ? sanitized.split("").map((char) => char + char).join("")
      : sanitized
  const numeric = Number.parseInt(normalized, 16)
  const r = (numeric >> 16) & 255
  const g = (numeric >> 8) & 255
  const b = numeric & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ChartAreaInteractive({
  metric,
  onMetricChange,
}: ChartAreaInteractiveProps) {
  const chartData = React.useMemo(
    () => generatePortfolioSeries(portfolioSeriesReferenceDate),
    []
  )
  const activeMeta = metricMeta[metric]
  const transitionLabel = "T3 2026"
  const baselineLabel = "T2 2026"
  const transitionIndex = chartData.findIndex((item) => item.label === transitionLabel)
  const baselinePoint = chartData.find((item) => item.label === baselineLabel)
  const transitionPoint = chartData.find((item) => item.label === transitionLabel)
  const futureStartLabel =
    transitionIndex >= 0 && transitionIndex < chartData.length - 1
      ? chartData[transitionIndex + 1].label
      : undefined
  const hasDroppedFromT2ToT3 =
    (transitionPoint?.[metric] ?? 0) < (baselinePoint?.[metric] ?? 0)
  const tintedChartData = React.useMemo(
    () =>
      chartData.map((point, index) => ({
        ...point,
        pastValue:
          index <= transitionIndex || transitionIndex === -1 ? point[metric] : null,
        futureValue:
          index > transitionIndex && transitionIndex !== -1 ? point[metric] : null,
      })),
    [chartData, metric, transitionIndex]
  )
  const activeFill = hasDroppedFromT2ToT3 ? "#fb7185" : "#34d399"
  const futureFill = hexToRgba(activeFill, 0.45)
  const chartSurface = hexToRgba(activeFill, 0.08)
  const projectedLabelBackground = hexToRgba(activeFill, 0.12)

  return (
    <div
      className="chart-card-running-boundary rounded-xl p-[1.5px]"
      style={{ ["--chart-accent" as string]: activeFill }}
    >
      <Card className="@container/card rounded-[calc(var(--radius-xl)+2px)] border-none bg-transparent shadow-none">
        <CardHeader>
          <div>
            <CardTitle>Portfolio Summary</CardTitle>
            <CardDescription>
              Past and projected performance from the shared forestry ledger.
              <span
                className="ml-2 inline-block rounded-md border border-border/60 px-2 py-0.5 text-xs text-foreground"
                style={{ backgroundColor: activeFill, opacity: 0.9 }}
              >
                {activeMeta.label}: {activeMeta.unit}
              </span>
            </CardDescription>
          </div>
          <CardAction>
            <Select
              value={metric}
              onValueChange={(value) => onMetricChange(value as MetricKey)}
            >
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
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
          <div className="relative">
            {futureStartLabel ? (
              <div
                className="pointer-events-none absolute right-4 top-1 z-10 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: activeFill,
                  backgroundColor: projectedLabelBackground,
                }}
              >
                Projected value
              </div>
            ) : null}
            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
              <BarChart data={tintedChartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                {futureStartLabel ? (
                  <ReferenceArea
                    x1={futureStartLabel}
                    x2={tintedChartData[tintedChartData.length - 1]?.label}
                    fill={chartSurface}
                    fillOpacity={1}
                    ifOverflow="extendDomain"
                  />
                ) : null}
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  padding={{ left: 22, right: 22 }}
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
                      labelFormatter={(value) => String(value)}
                    />
                  }
                />
                <Bar dataKey="pastValue" fill={activeFill} radius={[4, 4, 0, 0]} barSize={32} />
                <Bar
                  dataKey="futureValue"
                  fill={futureFill}
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
