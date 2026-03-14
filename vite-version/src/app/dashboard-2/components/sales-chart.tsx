"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartStyle,
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
import { Button } from "@/components/ui/button"

const portfolioData = [
  {
    year: "2025",
    total: 420000,
    eucalyptusGU: 180000,
    eucalyptusGC: 140000,
    pine: 70000,
    mixedHardwoods: 30000,
  },
  {
    year: "2026",
    total: 510000,
    eucalyptusGU: 220000,
    eucalyptusGC: 165000,
    pine: 82000,
    mixedHardwoods: 43000,
  },
  {
    year: "2027",
    total: 605000,
    eucalyptusGU: 255000,
    eucalyptusGC: 192000,
    pine: 98000,
    mixedHardwoods: 60000,
  },
  {
    year: "2028",
    total: 690000,
    eucalyptusGU: 286000,
    eucalyptusGC: 218000,
    pine: 112000,
    mixedHardwoods: 74000,
  },
  {
    year: "2029",
    total: 815000,
    eucalyptusGU: 335000,
    eucalyptusGC: 252000,
    pine: 132000,
    mixedHardwoods: 96000,
  },
  {
    year: "2030",
    total: 930000,
    eucalyptusGU: 372000,
    eucalyptusGC: 290000,
    pine: 148000,
    mixedHardwoods: 120000,
  },
  {
    year: "2031",
    total: 1085000,
    eucalyptusGU: 438000,
    eucalyptusGC: 332000,
    pine: 170000,
    mixedHardwoods: 145000,
  },
  {
    year: "2032",
    total: 1230000,
    eucalyptusGU: 485000,
    eucalyptusGC: 375000,
    pine: 188000,
    mixedHardwoods: 182000,
  },
  {
    year: "2033",
    total: 1180000,
    eucalyptusGU: 430000,
    eucalyptusGC: 360000,
    pine: 205000,
    mixedHardwoods: 185000,
  },
  {
    year: "2034",
    total: 1360000,
    eucalyptusGU: 510000,
    eucalyptusGC: 410000,
    pine: 220000,
    mixedHardwoods: 220000,
  },
  {
    year: "2035",
    total: 1540000,
    eucalyptusGU: 590000,
    eucalyptusGC: 455000,
    pine: 245000,
    mixedHardwoods: 250000,
  },
  {
    year: "2036",
    total: 1490000,
    eucalyptusGU: 540000,
    eucalyptusGC: 440000,
    pine: 255000,
    mixedHardwoods: 255000,
  },
  {
    year: "2037",
    total: 1710000,
    eucalyptusGU: 650000,
    eucalyptusGC: 500000,
    pine: 270000,
    mixedHardwoods: 290000,
  },
  {
    year: "2038",
    total: 1890000,
    eucalyptusGU: 720000,
    eucalyptusGC: 555000,
    pine: 290000,
    mixedHardwoods: 325000,
  },
]

const chartConfig = {
  total: {
    label: "Total portfolio",
    color: "var(--chart-1)",
  },
  eucalyptusGU: {
    label: "Eucalyptus GU",
    color: "var(--chart-2)",
  },
  eucalyptusGC: {
    label: "Eucalyptus GC",
    color: "var(--chart-3)",
  },
  pine: {
    label: "Pine",
    color: "var(--chart-4)",
  },
  mixedHardwoods: {
    label: "Mixed hardwoods",
    color: "var(--chart-5)",
  },
}

const seriesOptions = [
  { key: "total", label: "Total portfolio" },
  { key: "eucalyptusGU", label: "Eucalyptus GU" },
  { key: "eucalyptusGC", label: "Eucalyptus GC" },
  { key: "pine", label: "Pine" },
  { key: "mixedHardwoods", label: "Mixed hardwoods" },
] as const

type SeriesKey = (typeof seriesOptions)[number]["key"]

export function SalesChart() {
  const id = "portfolio-value-trajectory"
  const [timeRange, setTimeRange] = useState("full")
  const [activeSeries, setActiveSeries] = useState<SeriesKey>("total")

  const filteredData = useMemo(() => {
    if (timeRange === "5y") return portfolioData.slice(-5)
    if (timeRange === "10y") return portfolioData.slice(-10)
    return portfolioData
  }, [timeRange])

  const activeConfig = chartConfig[activeSeries]

  return (
    <Card data-chart={id} className="cursor-pointer">
      <ChartStyle id={id} config={chartConfig} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Portfolio Value Trajectory</CardTitle>
          <CardDescription>
            Projected roundwood value across the forest portfolio through 2038
          </CardDescription>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={activeSeries} onValueChange={(value) => setActiveSeries(value as SeriesKey)}>
            <SelectTrigger className="w-40 cursor-pointer">
              <SelectValue placeholder="Select variety" />
            </SelectTrigger>
            <SelectContent>
              {seriesOptions.map((option) => (
                <SelectItem
                  key={option.key}
                  value={option.key}
                  className="cursor-pointer"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5y" className="cursor-pointer">
                Last 5 years
              </SelectItem>
              <SelectItem value="10y" className="cursor-pointer">
                Last 10 years
              </SelectItem>
              <SelectItem value="full" className="cursor-pointer">
                Full rotation
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="cursor-pointer">
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-6">
        <div className="px-6 pb-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorActiveSeries" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={activeConfig.color}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={activeConfig.color}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />

              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              />

              <ChartTooltip
                content={<ChartTooltipContent />}
              />

              <Area
                type="monotone"
                dataKey={activeSeries}
                stroke={activeConfig.color}
                fill="url(#colorActiveSeries)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}