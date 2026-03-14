"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const description = "A planting and silviculture progress chart"

const chartData = [
  { date: "2026-01-05", planting: 48, silviculture: 35 },
  { date: "2026-01-12", planting: 62, silviculture: 41 },
  { date: "2026-01-19", planting: 74, silviculture: 46 },
  { date: "2026-01-26", planting: 88, silviculture: 54 },
  { date: "2026-02-02", planting: 95, silviculture: 60 },
  { date: "2026-02-09", planting: 108, silviculture: 67 },
  { date: "2026-02-16", planting: 116, silviculture: 71 },
  { date: "2026-02-23", planting: 124, silviculture: 79 },
  { date: "2026-03-02", planting: 132, silviculture: 86 },
  { date: "2026-03-09", planting: 145, silviculture: 92 },
  { date: "2026-03-16", planting: 152, silviculture: 98 },
  { date: "2026-03-23", planting: 164, silviculture: 105 },
]

const chartConfig = {
  hectares: {
    label: "Hectares",
  },
  silviculture: {
    label: "Silviculture",
    color: "#86efac",
  },
  planting: {
    label: "Planting",
    color: "#16a34a",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("12w")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("4w")
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (timeRange === "12w") return chartData
    if (timeRange === "6w") return chartData.slice(-6)
    return chartData.slice(-4)
  }, [timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <div>
          <CardTitle>This Seasons Field Delivery Trend</CardTitle>
          <CardDescription>
            Weekly hectares completed/managed across planting and silviculture workstreams this planting season.
          </CardDescription>
        </div>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="12w">Last 12 weeks</ToggleGroupItem>
            <ToggleGroupItem value="6w">Last 6 weeks</ToggleGroupItem>
            <ToggleGroupItem value="4w">Last 4 weeks</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 12 weeks" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12w" className="rounded-lg">
                Last 12 weeks
              </SelectItem>
              <SelectItem value="6w" className="rounded-lg">
                Last 6 weeks
              </SelectItem>
              <SelectItem value="4w" className="rounded-lg">
                Last 4 weeks
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPlanting" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-planting)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-planting)" stopOpacity={0.12} />
              </linearGradient>
              <linearGradient id="fillSilviculture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-silviculture)" stopOpacity={0.75} />
                <stop offset="95%" stopColor="var(--color-silviculture)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={70}
              label={{
                value: "Hectares",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => {
                    return new Date(value as string | number | Date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
              }
            />
            <Area
              dataKey="silviculture"
              type="natural"
              fill="url(#fillSilviculture)"
              stroke="var(--color-silviculture)"
              stackId="a"
            />
            <Area
              dataKey="planting"
              type="natural"
              fill="url(#fillPlanting)"
              stroke="var(--color-planting)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
