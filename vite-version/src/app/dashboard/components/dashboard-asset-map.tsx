"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"
import { useMap } from "react-leaflet"
import { Map as MapIcon, MapPinned } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Map,
  MapPolygon,
  MapPopup,
  MapTileLayer,
} from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildGroupMetricSeries,
  createPolygon,
  formatVarietyLabel,
  getGroupEstimatedMetrics,
  getGroupSpecies,
  getSubBlockEstimatedMetrics,
  initialAssetGroups,
  speciesProfile,
  type AssetGroup,
  type SiteMetricKey,
} from "./data-table"
import {
  compactCurrency,
  compactNumber,
  dashboardFrameClass,
  dashboardSurfaceClass,
  formatYearTick,
} from "./dashboard-shared"

interface DashboardAssetMapProps {
  selectedGroupId: string
  onSelectGroup: (groupId: string) => void
  showOpenFullMapButton?: boolean
  showHeaderCopy?: boolean
}

const emeraldGlitterHoverClass =
  "transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-emerald-300 group-hover:via-emerald-500 group-hover:to-emerald-200 group-hover:bg-clip-text group-hover:text-transparent"

const centeredSelectTextClass =
  "w-full cursor-pointer justify-center text-center [&_[data-slot=select-value]]:flex [&_[data-slot=select-value]]:w-full [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:text-center"

const mapStyleOptions = [
  {
    value: "carto",
    label: "Light atlas",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    value: "osm",
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    value: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  {
    value: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
] as const

const metricMeta: Record<
  SiteMetricKey,
  {
    label: string
    description: string
    format: (value: number) => string
    axisTick: (value: number) => string
  }
> = {
  portfolioPerformance: {
    label: "Portfolio performance",
    description: "[For the selected site]",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  expectedVolume: {
    label: "Expected volume",
    description: "[For the selected site]",
    format: (value) => `${compactNumber(value)} m3`,
    axisTick: (value) => compactNumber(value),
  },
  expectedPrice: {
    label: "Expected price",
    description: "[For the selected site]",
    format: (value) => `$${value.toFixed(2)} / m3`,
    axisTick: (value) => `$${value.toFixed(0)}`,
  },
}

type SpeciesFilter = "all" | ReturnType<typeof getGroupSpecies>[number]

function getMetricHeadline(group: AssetGroup, metric: SiteMetricKey) {
  const totals = getGroupEstimatedMetrics(group)

  if (metric === "portfolioPerformance") {
    return {
      label: "Total present value",
      value: metricMeta[metric].format(totals.estimatedValuation),
    }
  }

  if (metric === "expectedVolume") {
    return {
      label: "Expected volume",
      value: metricMeta[metric].format(totals.estimatedVolume),
    }
  }

  const priceSeries = buildGroupMetricSeries(group, "expectedPrice")
  const currentYear = String(new Date().getFullYear())
  const currentRow =
    priceSeries.find((row) => row.year === currentYear) ??
    priceSeries[priceSeries.length - 1]
  const averagePriceValues = getGroupSpecies(group)
    .map((species) => Number(currentRow?.[species] ?? 0))
    .filter((value) => value > 0)
  const averagePrice = averagePriceValues.length
    ? averagePriceValues.reduce((sum, value) => sum + value, 0) /
      averagePriceValues.length
    : 0

  return {
    label: "Average expected price",
    value: metricMeta[metric].format(averagePrice),
  }
}

function getGroupBounds(group: AssetGroup) {
  const points = group.subBlocks.flatMap((subBlock, index) =>
    createPolygon(group.mapCenter, index, subBlock.size, subBlock.plantedSize).outer
  )
  const fallback = group.mapCenter
  const latitudes = points.map(([latitude]) => latitude)
  const longitudes = points.map(([, longitude]) => longitude)

  if (points.length === 0) {
    return [
      [fallback[0] - 0.04, fallback[1] - 0.04],
      [fallback[0] + 0.04, fallback[1] + 0.04],
    ] as [[number, number], [number, number]]
  }

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ] as [[number, number], [number, number]]
}

function MapViewportFocus({
  group,
  focusVersion,
}: {
  group: AssetGroup
  focusVersion: number
}) {
  const map = useMap()
  const bounds = React.useMemo(() => getGroupBounds(group), [group])

  React.useEffect(() => {
    map.flyToBounds(bounds, {
      padding: [34, 34],
      duration: 0.8,
      maxZoom: 11,
    })
  }, [bounds, focusVersion, map])

  return null
}

function SiteMetricChart({
  group,
  metric,
  speciesFilter,
  onMetricChange,
  onSpeciesFilterChange,
}: {
  group: AssetGroup
  metric: SiteMetricKey
  speciesFilter: SpeciesFilter
  onMetricChange: (metric: SiteMetricKey) => void
  onSpeciesFilterChange: (species: SpeciesFilter) => void
}) {
  const isMobile = useIsMobile()
  const availableSpecies = React.useMemo(() => getGroupSpecies(group), [group])
  const visibleSpecies = React.useMemo(
    () =>
      speciesFilter === "all"
        ? availableSpecies
        : availableSpecies.filter((species) => species === speciesFilter),
    [availableSpecies, speciesFilter]
  )
  const chartData = React.useMemo(
    () => buildGroupMetricSeries(group, metric),
    [group, metric]
  )
  const chartConfig = React.useMemo(
    () =>
      Object.fromEntries(
        availableSpecies.map((species) => [
          species,
          {
            label: formatVarietyLabel(species),
            color: speciesProfile[species].color,
          },
        ])
      ),
    [availableSpecies]
  )
  const fallbackSpecies = visibleSpecies[0] ?? availableSpecies[0] ?? "eucalyptus"
  const accentColor = speciesProfile[fallbackSpecies].color
  const meta = metricMeta[metric]
  const metricHeadline = React.useMemo(
    () => getMetricHeadline(group, metric),
    [group, metric]
  )
  const projectionStartYear = "2027"
  const projectionEndYear = chartData[chartData.length - 1]?.year

  return (
    <div
      className={dashboardFrameClass}
      style={{ ["--chart-accent" as string]: accentColor }}
    >
      <Card className={`h-full ${dashboardSurfaceClass}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="min-w-0 flex-1">
            <Select
              value={metric}
              onValueChange={(value) => onMetricChange(value as SiteMetricKey)}
            >
              <SelectTrigger className="group h-auto w-full max-w-[360px] rounded-[24px] border-0 p-4 text-left shadow-none">
                <div className="min-w-0 py-2">
                  <div
                    className={`mt-2 truncate text-xl font-semibold text-foreground ${emeraldGlitterHoverClass}`}
                  >
                    {meta.label}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {meta.description}
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="w-full">
                {Object.entries(metricMeta).map(([metricKey, metricInfo]) => (
                  <SelectItem key={metricKey} value={metricKey}>
                    {metricInfo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-4 flex flex-wrap items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => onSpeciesFilterChange("all")}
                className={cn(
                  "rounded-full border px-3 text-sm transition",
                  speciesFilter === "all"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                All species
              </button>
              {availableSpecies.map((species) => (
                <button
                  key={species}
                  type="button"
                  onClick={() => onSpeciesFilterChange(species)}
                  className={cn(
                    "rounded-full border px-3 text-sm transition",
                    speciesFilter === species
                      ? "text-white shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    speciesFilter === species
                      ? {
                          borderColor: speciesProfile[species].color,
                          backgroundColor: speciesProfile[species].color,
                        }
                      : undefined
                  }
                >
                  {formatVarietyLabel(species)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/70 bg-background/92 px-3 py-2 text-right shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {metricHeadline.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {metricHeadline.value}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <ChartContainer
            config={chartConfig}
            className={`h-[220px] w-full text-foreground ${
              isMobile ? "h-[200px]" : ""
            }`}
          >
            <BarChart data={chartData} margin={{ left: isMobile ? 0 : 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              {projectionEndYear &&
              Number(projectionEndYear) >= Number(projectionStartYear) ? (
                <ReferenceArea
                  x1={projectionStartYear}
                  x2={projectionEndYear}
                  fill="rgba(15,23,42,0.07)"
                  fillOpacity={1}
                  ifOverflow="extendDomain"
                />
              ) : null}
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tickMargin={isMobile ? 6 : 8}
                interval={0}
                tickFormatter={(value) => formatYearTick(String(value), isMobile)}
                tick={{ fontSize: isMobile ? 10 : 11, fill: "currentColor" }}
              />
              <YAxis
                hide={isMobile}
                axisLine={false}
                tickLine={false}
                width={78}
                tickMargin={8}
                tickFormatter={meta.axisTick}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span>
                          {chartConfig[String(name)]?.label ?? String(name)}
                        </span>
                        <span className="font-mono tabular-nums">
                          {meta.format(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {visibleSpecies.map((species) => (
                <Bar
                  key={species}
                  dataKey={species}
                  fill={speciesProfile[species].color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={visibleSpecies.length === 1 ? 42 : 26}
                />
              ))}
            </BarChart>
          </ChartContainer>

          {projectionEndYear &&
          Number(projectionEndYear) >= Number(projectionStartYear) ? (
            <div className="mt-2 flex justify-end">
              <span className="rounded-full border border-slate-200 bg-muted/30 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Projected value
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardAssetMap({
  selectedGroupId,
  onSelectGroup,
  showOpenFullMapButton = true,
  showHeaderCopy = true,
}: DashboardAssetMapProps) {
  const navigate = useNavigate()
  const [selectedMapStyle, setSelectedMapStyle] = React.useState<
    (typeof mapStyleOptions)[number]["value"]
  >("carto")
  const [selectedMetric, setSelectedMetric] =
    React.useState<SiteMetricKey>("portfolioPerformance")
  const [speciesFilter, setSpeciesFilter] =
    React.useState<SpeciesFilter>("all")
  const [focusVersion, setFocusVersion] = React.useState(0)

  const selectedGroup =
    initialAssetGroups.find((group) => group.id === selectedGroupId) ??
    initialAssetGroups[0]
  const availableSpecies = React.useMemo(
    () => getGroupSpecies(selectedGroup),
    [selectedGroup]
  )
  const activeMapStyle =
    mapStyleOptions.find((option) => option.value === selectedMapStyle) ??
    mapStyleOptions[0]
  const accentColor = speciesProfile[availableSpecies[0] ?? "eucalyptus"].color

  React.useEffect(() => {
    if (speciesFilter !== "all" && !availableSpecies.includes(speciesFilter)) {
      setSpeciesFilter("all")
    }
  }, [availableSpecies, speciesFilter])

  const handleSelectGroup = (groupId: string) => {
    onSelectGroup(groupId)
    setFocusVersion((value) => value + 1)
  }

  return (
    <div
      className={dashboardFrameClass}
      style={{ ["--chart-accent" as string]: accentColor }}
    >
      <Card
        id="dashboard-asset-map"
        className={`overflow-hidden ${dashboardSurfaceClass}`}
      >
        <CardHeader
          className={cn(
            "gap-4",
            showHeaderCopy ? "border-b" : "border-none pb-0"
          )}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {showHeaderCopy ? (
              <div>
                <div className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-emerald-700" />
                  <CardTitle>Asset Map</CardTitle>
                </div>
                <CardDescription className="mt-1 max-w-3xl">
                  Interactive view of your assets
                </CardDescription>
              </div>
            ) : (
              <div />
            )}

            {showOpenFullMapButton ? (
              <div className="flex w-full flex-col gap-2 xl:max-w-[260px]">
                <Button
                  className="w-full cursor-pointer rounded-full p-0 text-base"
                  onClick={() =>
                    navigate(`/dashboard/assets-map?site=${selectedGroup.id}`)
                  }
                >
                  <span className="group relative flex min-h-[46px] w-full items-center justify-center overflow-hidden rounded-full px-4 py-3">
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                    <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                      <span className="relative mr-2 flex h-4 w-4 items-center justify-center">
                        <MapIcon className="absolute h-4 w-4 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
                        <MapPinned className="absolute h-4 w-4 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                      </span>
                      Open full map
                    </span>
                  </span>
                </Button>
                <Select
                  value={selectedMapStyle}
                  onValueChange={(value) =>
                    setSelectedMapStyle(
                      value as (typeof mapStyleOptions)[number]["value"]
                    )
                  }
                >
                  <SelectTrigger className={centeredSelectTextClass}>
                    <SelectValue placeholder="Map type" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {mapStyleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="w-full max-w-[240px]">
                <Select
                  value={selectedMapStyle}
                  onValueChange={(value) =>
                    setSelectedMapStyle(
                      value as (typeof mapStyleOptions)[number]["value"]
                    )
                  }
                >
                  <SelectTrigger className={centeredSelectTextClass}>
                    <SelectValue placeholder="Map type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mapStyleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={showHeaderCopy ? "p-4 xl:p-5" : "px-0 pb-0 pt-4"}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[28px] border bg-background/70 backdrop-blur-sm">
                <Map
                  center={selectedGroup.mapCenter}
                  zoom={7}
                  className="h-[500px] w-full rounded-none xl:h-[560px]"
                >
                  <MapTileLayer
                    url={activeMapStyle.url}
                    attribution={activeMapStyle.attribution}
                  />
                  <MapViewportFocus
                    group={selectedGroup}
                    focusVersion={focusVersion}
                  />
                  {initialAssetGroups.flatMap((group) =>
                    group.subBlocks.flatMap((subBlock, index) => {
                      const polygons = createPolygon(
                        group.mapCenter,
                        index,
                        subBlock.size,
                        subBlock.plantedSize
                      )
                      const speciesColor = speciesProfile[subBlock.variety].color
                      const isSelected = group.id === selectedGroup.id
                      const subMetrics = getSubBlockEstimatedMetrics(group, subBlock)

                      return [
                        <MapPolygon
                          key={`${subBlock.id}-outer`}
                          positions={polygons.outer}
                          eventHandlers={{ click: () => handleSelectGroup(group.id) }}
                          pathOptions={{
                            color: speciesColor,
                            weight: isSelected ? 4 : 2.5,
                            fillColor: speciesColor,
                            fill: true,
                            fillOpacity: isSelected ? 0.22 : 0.11,
                          }}
                        >
                          <MapPopup className="w-[min(28rem,calc(100vw-3rem))] p-0">
                            <div className="overflow-hidden rounded-[20px] border bg-background">
                              <div
                                className="px-5 py-4 text-white"
                                style={{
                                  background: `linear-gradient(135deg, ${speciesColor}, color-mix(in oklch, ${speciesColor} 42%, black))`,
                                }}
                              >
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em]">
                                  {group.block} - {subBlock.subBlock}
                                </div>
                                <div className="mt-1 text-xl font-semibold capitalize">
                                  {subBlock.variety}
                                </div>
                                <div className="text-sm text-white/85">
                                  {group.location}, {group.country}
                                </div>
                              </div>
                              <div className="grid gap-4 p-5">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Planted
                                    </div>
                                    <div className="mt-1 text-base font-semibold">
                                      {subBlock.plantedSize.toFixed(2)} ha
                                    </div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Expected volume
                                    </div>
                                    <div className="mt-1 text-base font-semibold">
                                      {compactNumber(subMetrics.estimatedVolume)} m3
                                    </div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Expected value
                                    </div>
                                    <div className="mt-1 text-base font-semibold">
                                      {compactCurrency(subMetrics.estimatedValuation)}
                                    </div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Contractor
                                    </div>
                                    <div className="mt-1 text-sm font-medium">
                                      {subBlock.contractor}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full cursor-pointer"
                                  onClick={() => handleSelectGroup(group.id)}
                                >
                                  Focus site
                                </Button>
                              </div>
                            </div>
                          </MapPopup>
                        </MapPolygon>,
                        <MapPolygon
                          key={`${subBlock.id}-inner`}
                          positions={polygons.inner}
                          eventHandlers={{ click: () => handleSelectGroup(group.id) }}
                          pathOptions={{
                            color: speciesColor,
                            weight: isSelected ? 3 : 2,
                            fillColor: speciesColor,
                            fill: true,
                            fillOpacity: isSelected ? 0.56 : 0.32,
                          }}
                        />,
                      ]
                    })
                  )}
                </Map>
              </div>

              <div className="rounded-[28px] border-0 bg-background/70 p-4 backdrop-blur-sm">
                <Select value={selectedGroup.id} onValueChange={handleSelectGroup}>
                  <SelectTrigger className="group h-auto w-full rounded-[24px] border-0 bg-transparent text-left shadow-none">
                    <div className="min-w-0 py-2">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Selected site
                      </div>
                      <div
                        className={`mt-2 truncate text-xl font-semibold text-foreground ${emeraldGlitterHoverClass}`}
                      >
                        {selectedGroup.block}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {selectedGroup.location}, {selectedGroup.country}
                      </div>
                    </div>
                  </SelectTrigger>

                  <SelectContent>
                    {initialAssetGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SiteMetricChart
                group={selectedGroup}
                metric={selectedMetric}
                speciesFilter={speciesFilter}
                onMetricChange={setSelectedMetric}
                onSpeciesFilterChange={setSpeciesFilter}
              />
            </div>

            <div className="rounded-[28px] border bg-background/70 p-4 backdrop-blur-sm">
              <div className="space-y-3">
                {selectedGroup.subBlocks.map((subBlock) => (
                  <div key={subBlock.id} className="rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: speciesProfile[subBlock.variety].color,
                          }}
                        />
                        <div>
                          <div className="font-medium">
                            {formatVarietyLabel(subBlock.variety)}{" "}
                            <span className="text-muted-foreground">
                              {subBlock.subBlock}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subBlock.plantedSize.toFixed(2)} ha planted - {subBlock.age} years
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
