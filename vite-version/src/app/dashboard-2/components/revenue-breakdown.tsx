"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const revenueData = [
  { category: "eucalyptus-gu", value: 48, amount: 150, fill: "var(--color-eucalyptus-gu)" },
  { category: "eucalyptus-gc", value: 30, amount: 94, fill: "var(--color-eucalyptus-gc)" },
  { category: "pine", value: 14, amount: 44, fill: "var(--color-pine)" },
  { category: "mixed-hardwoods", value: 8, amount: 24, fill: "var(--color-mixed-hardwoods)" },
]

const chartConfig = {
  amount: {
    label: "Hectares",
  },
  "eucalyptus-gu": {
    label: "Eucalyptus GU",
    color: "var(--chart-1)",
  },
  "eucalyptus-gc": {
    label: "Eucalyptus GC",
    color: "var(--chart-2)",
  },
  pine: {
    label: "Pine",
    color: "var(--chart-3)",
  },
  "mixed-hardwoods": {
    label: "Mixed Hardwoods",
    color: "var(--chart-4)",
  },
}

export function RevenueBreakdown() {
  const id = "species-allocation"
  const [activeCategory, setActiveCategory] = React.useState("eucalyptus-gu")

  const activeIndex = React.useMemo(
    () => revenueData.findIndex((item) => item.category === activeCategory),
    [activeCategory]
  )

  const categories = React.useMemo(() => revenueData.map((item) => item.category), [])
  const activeItem = revenueData[activeIndex]

  return (
    <Card data-chart={id} className="flex flex-col cursor-pointer">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2">
        <div>
          <CardTitle>Species Allocation</CardTitle>
          <CardDescription>Distribution of financed hectares by variety mix</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="w-[175px] rounded-lg cursor-pointer" aria-label="Select a category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent align="end" className="rounded-lg">
              {categories.map((key) => {
                const config = chartConfig[key as keyof typeof chartConfig]
                if (!config) return null
                return (
                  <SelectItem key={key} value={key} className="rounded-md [&_span]:flex cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 shrink-0" style={{ backgroundColor: `var(--color-${key})` }} />
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
      <CardContent className="flex flex-1 justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="flex justify-center">
            <ChartContainer id={id} config={chartConfig} className="mx-auto aspect-square w-full max-w-[300px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={revenueData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={60}
                  strokeWidth={5}
                  activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                    <g>
                      <Sector {...props} outerRadius={outerRadius + 10} />
                      <Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} />
                    </g>
                  )}
                  onClick={(_, index) => setActiveCategory(revenueData[index].category)}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                              {activeItem.amount} ha
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                              Allocated
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

          <div className="flex flex-col justify-center space-y-4">
            {revenueData.map((item, index) => {
              const config = chartConfig[item.category as keyof typeof chartConfig]
              const isActive = index === activeIndex

              return (
                <div
                  key={item.category}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                    isActive ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveCategory(item.category)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${item.category})` }} />
                    <div>
                      <span className="font-medium">{config?.label}</span> 
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.amount} ha</div>
                    <div className="text-sm text-muted-foreground">{item.value}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
