"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useMap } from "react-leaflet"
import { ExternalLink, MapPinned } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Map, MapPolygon, MapPopup, MapTileLayer } from "@/components/ui/map"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface DashboardAssetMapProps {
  selectedGroupId: string
  onSelectGroup: (groupId: string) => void
}

const mapStyleOptions = [
  {
    value: "carto",
    label: "Light atlas",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    value: "osm",
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    value: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
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
    description: "Yearly value projection for the selected site split by species.",
    format: (value) => compactCurrency(value),
    axisTick: (value) => compactCurrency(value),
  },
  expectedVolume: {
    label: "Expected volume",
    description: "Standing volume trend by species block for this region.",
    format: (value) => `${compactNumber(value)} m3`,
    axisTick: (value) => compactNumber(value),
  },
  expectedPrice: {
    label: "Expected price",
    description: "Expected realized price per cubic metre by species line.",
    format: (value) => `$${value.toFixed(2)} / m3`,
    axisTick: (value) => `$${value.toFixed(0)}`,
  },
}

type SpeciesFilter = "all" | ReturnType<typeof getGroupSpecies>[number]

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function getGroupBounds(group: AssetGroup) {
  const points = group.subBlocks.flatMap((subBlock, index) =>
    createPolygon(group.mapCenter, index, subBlock.size, subBlock.plantedSize).outer
  )
  const fallback = group.mapCenter
  const latitudes = points.map(([lat]) => lat)
  const longitudes = points.map(([, lng]) => lng)

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

function MapViewportFocus({ group, focusVersion }: { group: AssetGroup; focusVersion: number }) {
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
}: {
  group: AssetGroup
  metric: SiteMetricKey
  speciesFilter: SpeciesFilter
}) {
  const availableSpecies = React.useMemo(() => getGroupSpecies(group), [group])
  const visibleSpecies = React.useMemo(
    () => (speciesFilter === "all" ? availableSpecies : availableSpecies.filter((species) => species === speciesFilter)),
    [availableSpecies, speciesFilter]
  )
  const chartData = React.useMemo(() => buildGroupMetricSeries(group, metric), [group, metric])
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

  return (
    <div className="chart-card-running-boundary rounded-2xl p-[1.5px]" style={{ ["--chart-accent" as string]: accentColor }}>
      <Card className="h-full rounded-[calc(var(--radius-xl)+2px)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={78}
                tickMargin={8}
                tickFormatter={meta.axisTick}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span>{chartConfig[String(name)]?.label ?? String(name)}</span>
                        <span className="font-mono tabular-nums">{meta.format(Number(value))}</span>
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
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardAssetMap({ selectedGroupId, onSelectGroup }: DashboardAssetMapProps) {
  const navigate = useNavigate()
  const [selectedMapStyle, setSelectedMapStyle] = React.useState<(typeof mapStyleOptions)[number]["value"]>("carto")
  const [speciesFilter, setSpeciesFilter] = React.useState<SpeciesFilter>("all")
  const [focusVersion, setFocusVersion] = React.useState(0)
  const selectedGroup =
    initialAssetGroups.find((group) => group.id === selectedGroupId) ?? initialAssetGroups[0]
  const availableSpecies = React.useMemo(() => getGroupSpecies(selectedGroup), [selectedGroup])
  const activeMapStyle = mapStyleOptions.find((option) => option.value === selectedMapStyle) ?? mapStyleOptions[0]
  const selectedMetrics = React.useMemo(() => getGroupEstimatedMetrics(selectedGroup), [selectedGroup])
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
    <div className="chart-card-running-boundary rounded-2xl p-[1.5px]" style={{ ["--chart-accent" as string]: accentColor }}>
      <Card
        id="dashboard-asset-map"
        className="overflow-hidden rounded-[calc(var(--radius-xl)+2px)] bg-gradient-to-b from-background via-background to-muted/20"
      >
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-emerald-700" />
                <CardTitle>Asset Map</CardTitle>
              </div>
              <CardDescription className="mt-1 max-w-3xl">
                Select a site to focus the map, switch basemaps, and compare yearly performance by species block without leaving the dashboard.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedMapStyle} onValueChange={(value) => setSelectedMapStyle(value as (typeof mapStyleOptions)[number]["value"])}>
                <SelectTrigger className="w-[180px] cursor-pointer">
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
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/assets-map?site=${selectedGroup.id}`)}>
                Open full map
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 xl:p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[28px] border bg-card">
                <Map center={selectedGroup.mapCenter} zoom={7} className="h-[500px] w-full rounded-none xl:h-[560px]">
                  <MapTileLayer url={activeMapStyle.url} attribution={activeMapStyle.attribution} />
                  <MapViewportFocus group={selectedGroup} focusVersion={focusVersion} />
                  {initialAssetGroups.flatMap((group) =>
                    group.subBlocks.flatMap((subBlock, index) => {
                      const polygons = createPolygon(group.mapCenter, index, subBlock.size, subBlock.plantedSize)
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
                                style={{ background: `linear-gradient(135deg, ${speciesColor}, color-mix(in oklch, ${speciesColor} 42%, black))` }}
                              >
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em]">
                                  {group.block} - {subBlock.subBlock}
                                </div>
                                <div className="mt-1 text-xl font-semibold capitalize">{subBlock.variety}</div>
                                <div className="text-sm text-white/85">
                                  {group.location}, {group.country}
                                </div>
                              </div>
                              <div className="grid gap-4 p-5">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Planted</div>
                                    <div className="mt-1 text-base font-semibold">{subBlock.plantedSize.toFixed(2)} ha</div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Expected volume</div>
                                    <div className="mt-1 text-base font-semibold">{compactNumber(subMetrics.estimatedVolume)} m3</div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Expected value</div>
                                    <div className="mt-1 text-base font-semibold">{compactCurrency(subMetrics.estimatedValuation)}</div>
                                  </div>
                                  <div className="rounded-xl border bg-muted/20 p-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Contractor</div>
                                    <div className="mt-1 text-sm font-medium">{subBlock.contractor}</div>
                                  </div>
                                </div>
                                <Button size="sm" className="w-full cursor-pointer" onClick={() => handleSelectGroup(group.id)}>
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

              <div className="flex flex-col gap-3 rounded-[28px] border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">Selected site species view</div>
                  <div className="text-sm text-muted-foreground">
                    Show one species or compare all of them across the annual regional projections below.
                  </div>
                </div>
                <Select value={speciesFilter} onValueChange={(value) => setSpeciesFilter(value as SpeciesFilter)}>
                  <SelectTrigger className="w-[190px] cursor-pointer">
                    <SelectValue placeholder="Species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All species</SelectItem>
                    {availableSpecies.map((species) => (
                      <SelectItem key={species} value={species}>
                        {formatVarietyLabel(species)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <SiteMetricChart group={selectedGroup} metric="portfolioPerformance" speciesFilter={speciesFilter} />
                <SiteMetricChart group={selectedGroup} metric="expectedVolume" speciesFilter={speciesFilter} />
                <SiteMetricChart group={selectedGroup} metric="expectedPrice" speciesFilter={speciesFilter} />
              </div>
            </div>

            <div className="space-y-4">
              <Card className="rounded-[28px] border bg-muted/15">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{selectedGroup.block}</CardTitle>
                  <CardDescription>{selectedGroup.location}, {selectedGroup.country}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="rounded-2xl border bg-background p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Portfolio performance</div>
                      <div className="mt-2 text-lg font-semibold">{compactCurrency(selectedMetrics.estimatedValuation)}</div>
                    </div>
                    <div className="rounded-2xl border bg-background p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Expected volume</div>
                      <div className="mt-2 text-lg font-semibold">{compactNumber(selectedMetrics.estimatedVolume)} m3</div>
                    </div>
                    <div className="rounded-2xl border bg-background p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Capital deployed</div>
                      <div className="mt-2 text-lg font-semibold">{compactCurrency(selectedMetrics.investmentPlaced)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedGroup.subBlocks.map((subBlock) => (
                      <div key={subBlock.id} className="rounded-2xl border bg-background px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: speciesProfile[subBlock.variety].color }} />
                            <div>
                              <div className="font-medium">
                                {formatVarietyLabel(subBlock.variety)} <span className="text-muted-foreground">{subBlock.subBlock}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {subBlock.plantedSize.toFixed(2)} ha planted - {subBlock.age} years
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{subBlock.contractor}</div>
                            <div className="capitalize">{subBlock.activity}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {initialAssetGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelectGroup(group.id)}
                    className="w-full rounded-2xl border bg-background p-4 text-left transition-colors"
                    style={{
                      borderColor:
                        group.id === selectedGroup.id
                          ? `color-mix(in oklch, ${speciesProfile[getGroupSpecies(group)[0] ?? "eucalyptus"].color} 42%, transparent)`
                          : "var(--border)",
                      backgroundColor:
                        group.id === selectedGroup.id
                          ? `color-mix(in oklch, ${speciesProfile[getGroupSpecies(group)[0] ?? "eucalyptus"].color} 10%, transparent)`
                          : "transparent",
                    }}
                  >
                    <div className="font-medium text-foreground">{group.block}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{group.location}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
