"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const speciesAllocationData = [
  { category: "eucalyptus-gu", value: 48, amount: 150, fill: "var(--chart-2)" },
  { category: "eucalyptus-gc", value: 30, amount: 94, fill: "color-mix(in oklch, var(--chart-2) 74%, var(--chart-1) 26%)" },
  { category: "pine", value: 14, amount: 44, fill: "var(--chart-3)" },
  { category: "mixed-hardwoods", value: 8, amount: 24, fill: "var(--chart-5)" },
] as const

const chartConfig = {
  amount: {
    label: "Hectares",
    color: "var(--muted-foreground)",
  },
  "eucalyptus-gu": {
    label: "Eucalyptus GU",
    color: "var(--chart-2)",
  },
  "eucalyptus-gc": {
    label: "Eucalyptus GC",
    color: "color-mix(in oklch, var(--chart-2) 74%, var(--chart-1) 26%)",
  },
  pine: {
    label: "Pine",
    color: "var(--chart-3)",
  },
  "mixed-hardwoods": {
    label: "Mixed Hardwoods",
    color: "var(--chart-5)",
  },
}

export function SpeciesAllocation() {
  const id = "species-allocation"
  const [activeCategory, setActiveCategory] = React.useState("eucalyptus-gu")

  const activeIndex = React.useMemo(
    () => speciesAllocationData.findIndex((item) => item.category === activeCategory),
    [activeCategory]
  )
  const categories = React.useMemo(() => speciesAllocationData.map((item) => item.category), [])
  const totalAllocated = React.useMemo(
    () => speciesAllocationData.reduce((sum, item) => sum + item.amount, 0),
    []
  )
  const activeItem = speciesAllocationData[activeIndex]
  const activeConfig = chartConfig[activeCategory as keyof typeof chartConfig]

  const renderSlice = (props: PieSectorDataItem) => {
    const payload = props.payload as (typeof speciesAllocationData)[number]
    const isActive = payload.category === activeCategory
    const outerRadius = (props.outerRadius ?? 0) + (isActive ? 10 : 0)

    return (
      <g>
        <Sector
          {...props}
          outerRadius={outerRadius}
          fill={payload.fill}
          stroke="var(--background)"
          strokeWidth={isActive ? 5 : 3}
        />
        {isActive ? (
          <Sector
            {...props}
            innerRadius={outerRadius + 4}
            outerRadius={outerRadius + 15}
            fill={payload.fill}
            fillOpacity={0.14}
            stroke="none"
          />
        ) : null}
      </g>
    )
  }

  return (
    <div
      className="chart-card-running-boundary rounded-2xl p-[1.5px]"
      style={{ ["--chart-accent" as string]: activeItem.fill }}
    >
      <Card data-chart={id} className="rounded-[calc(var(--radius-xl)+2px)]">
        <ChartStyle id={id} config={chartConfig} />
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Species Allocation</CardTitle>
            <CardDescription>Distribution of financed hectares by variety mix</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="w-[190px] cursor-pointer rounded-lg" aria-label="Select a category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg">
                {categories.map((key) => {
                  const config = chartConfig[key as keyof typeof chartConfig]
                  if (!config) return null

                  return (
                    <SelectItem key={key} value={key} className="cursor-pointer rounded-md [&_span]:flex">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: config.color }} />
                        {config.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" className="cursor-pointer">
              View report
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
            <div className="rounded-[28px] border bg-gradient-to-br from-background via-background to-muted/30 p-5">
              <div className="mb-4 text-center">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Total financed hectares</div>
                <div className="mt-2 text-3xl font-semibold">{totalAllocated} ha</div>
              </div>
              <div
                className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[24px] border"
                style={{ background: "radial-gradient(circle at center, color-mix(in oklch, var(--chart-accent) 10%, transparent), transparent 68%)" }}
              >
                <ChartContainer id={id} config={chartConfig} className="mx-auto h-[420px] w-full max-w-[560px]">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={speciesAllocationData}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={106}
                      outerRadius={174}
                      stroke="var(--background)"
                      strokeWidth={3}
                      shape={renderSlice}
                      onMouseEnter={(_, index) => setActiveCategory(speciesAllocationData[index].category)}
                      onClick={(_, index) => setActiveCategory(speciesAllocationData[index].category)}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14} className="fill-foreground text-5xl font-semibold">
                                  {activeItem.amount} ha
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-[11px] uppercase tracking-[0.24em]">
                                  active allocation
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 44} className="text-sm font-medium" fill={activeItem.fill}>
                                  {activeConfig?.label}
                                </tspan>
                              </text>
                            )
                          }
                          return null
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {speciesAllocationData.map((item, index) => {
                const config = chartConfig[item.category as keyof typeof chartConfig]
                const isActive = index === activeIndex

                return (
                  <button
                    key={item.category}
                    type="button"
                    className="rounded-2xl border px-4 py-4 text-left transition-colors"
                    style={{
                      borderColor: isActive
                        ? `color-mix(in oklch, ${item.fill} 36%, transparent)`
                        : "var(--border)",
                      backgroundColor: isActive
                        ? `color-mix(in oklch, ${item.fill} 10%, transparent)`
                        : "transparent",
                    }}
                    onMouseEnter={() => setActiveCategory(item.category)}
                    onClick={() => setActiveCategory(item.category)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                        <div>
                          <div className="font-medium">{config?.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {item.amount} ha currently assigned to this financing line.
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{item.value}%</div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">share</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
