"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  formatVarietyLabel,
  getSpeciesAllocationData,
  type SpeciesAllocationDatum,
  type TreeVariety,
} from "../data/forestry-data"
import { dashboardFrameClass, dashboardSurfaceClass } from "./dashboard-shared"

export function SpeciesAllocation() {
  const id = "species-allocation"
  const speciesAllocationData = React.useMemo(() => getSpeciesAllocationData(), [])
  const defaultCategory = speciesAllocationData[0]?.category ?? "eucalyptus"
  const [activeCategory, setActiveCategory] =
    React.useState<TreeVariety>(defaultCategory)

  React.useEffect(() => {
    if (!speciesAllocationData.some((item) => item.category === activeCategory)) {
      setActiveCategory(defaultCategory)
    }
  }, [activeCategory, defaultCategory, speciesAllocationData])

  const chartConfig = React.useMemo(
    () =>
      ({
        amount: {
          label: "Hectares",
          color: "var(--muted-foreground)",
        },
        ...Object.fromEntries(
          speciesAllocationData.map((item) => [
            item.category,
            {
              label: formatVarietyLabel(item.category),
              color: item.fill,
            },
          ])
        ),
      }) as Record<string, { label: string; color: string }>,
    [speciesAllocationData]
  )

  const activeIndex = React.useMemo(
    () =>
      speciesAllocationData.findIndex((item) => item.category === activeCategory),
    [activeCategory, speciesAllocationData]
  )
  const activeItem =
    speciesAllocationData[activeIndex] ?? speciesAllocationData[0] ?? null
  const activeConfig = activeItem
    ? chartConfig[activeItem.category]
    : chartConfig.amount

  const renderSlice = (props: PieSectorDataItem) => {
    const payload = props.payload as SpeciesAllocationDatum
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

  const totalFinancedArea = speciesAllocationData.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  if (!activeItem) return null

  return (
    <div
      className={dashboardFrameClass}
      style={{ ["--chart-accent" as string]: activeItem.fill }}
    >
      <Card data-chart={id} className={dashboardSurfaceClass}>
        <ChartStyle id={id} config={chartConfig} />
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Species Allocation</CardTitle>
            <CardDescription>
              Distribution of financed hectares by variety from the shared stand ledger
            </CardDescription>
          </div>
          <Button variant="outline" className="cursor-pointer">
            View report
          </Button>
        </CardHeader>

        <CardContent className="pb-6">
          <div className="rounded-[28px] bg-gradient-to-br from-background via-background to-muted/30 p-5">
            <div className="mb-4 text-center">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Total financed hectares
              </div>
              <div className="mt-2 text-3xl font-semibold">
                {totalFinancedArea.toFixed(1)} ha
              </div>
            </div>
            <div
              className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[24px]"
              style={{
                background:
                  "radial-gradient(circle at center, color-mix(in oklch, var(--chart-accent) 10%, transparent), transparent 50%)",
              }}
            >
              <ChartContainer
                id={id}
                config={chartConfig}
                className="mx-auto h-[420px] w-full max-w-[560px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(_, name, item) => {
                          const payload = item.payload as SpeciesAllocationDatum
                          return (
                            <div className="flex w-full items-center justify-between gap-4">
                              <span>
                                {chartConfig[String(name)]?.label ?? String(name)}
                              </span>
                              <span className="font-mono tabular-nums">
                                {payload.value}% share
                              </span>
                            </div>
                          )
                        }}
                      />
                    }
                  />
                  <Pie
                    data={speciesAllocationData}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={106}
                    outerRadius={174}
                    stroke="var(--background)"
                    strokeWidth={3}
                    shape={renderSlice}
                    onMouseEnter={(_, index) =>
                      setActiveCategory(speciesAllocationData[index].category)
                    }
                    onClick={(_, index) =>
                      setActiveCategory(speciesAllocationData[index].category)
                    }
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 14}
                                className="fill-foreground text-5xl font-semibold"
                              >
                                {activeItem.amount.toFixed(1)} ha
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 18}
                                className="fill-muted-foreground text-[11px] uppercase tracking-[0.24em]"
                              >
                                financed area
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 44}
                                className="text-sm font-medium"
                                fill={activeItem.fill}
                              >
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
        </CardContent>
      </Card>
    </div>
  )
}
