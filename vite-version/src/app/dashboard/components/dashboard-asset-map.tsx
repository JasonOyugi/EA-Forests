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
import { useMap, useMapEvents } from "react-leaflet"
import {
  Building2,
  FlaskConical,
  Leaf,
  Map as MapIcon,
  MapPin,
  MapPinned,
  MousePointerClick,
  PanelRightOpen,
  Route,
  ShieldCheck,
  Sprout,
  Trees,
  X,
  type LucideIcon,
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
  MapCircleMarker,
  MapControlContainer,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapMarkerClusterGroup,
  MapPolygon,
  MapPolyline,
  MapPopup,
  MapTileLayer,
  MapTooltip,
  MapZoomControl,
} from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  marketActorLayerMeta,
  marketActors,
  marketRegions,
  marketTileLayers,
  stakeholderAnalyticsLayers,
  type MarketActor,
  type MarketActorLayer,
  type MarketRegion,
} from "@/app/shop/data/market-map"
import { ugandaCfrs, type LatLngTuple } from "@/app/shop/data/generated-boundaries"
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
  disableBoundaryEffect?: boolean
}

const emeraldGlitterHoverClass =
  "transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-emerald-300 group-hover:via-emerald-500 group-hover:to-emerald-200 group-hover:bg-clip-text group-hover:text-transparent"

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
    format: (value) => `$${value.toFixed(2)} / tonne`,
    axisTick: (value) => `$${value.toFixed(0)}`,
  },
}

type SelectedPoint = {
  latitude: number
  longitude: number
  label: string
}

type NearestFeatureLayer = Extract<
  MarketActorLayer,
  "processor" | "nursery" | "commercialForest"
>

type NearestFeature = MarketActor & {
  distanceKm: number
  distanceMode: "road" | "estimated-road"
  routeCoordinates?: LatLngTuple[]
}

type NearestFeatureGroups = Record<NearestFeatureLayer, NearestFeature[]>

type NearestHighlight = {
  color: string
  rank: number
  layer: NearestFeatureLayer
}

type RegionAnalytics = MarketRegion & {
  count: number
  layerCounts: Record<MarketActorLayer, number>
}

const actorLayerOrder: MarketActorLayer[] = [
  "processor",
  "nursery",
  "commercialForest",
  "trialSite",
  "forestReserve",
]

const nearestFeatureLayers: NearestFeatureLayer[] = [
  "processor",
  "nursery",
  "commercialForest",
]

const nearestFeatureLabels: Record<NearestFeatureLayer, string> = {
  processor: "Nearest processors",
  nursery: "Nearest nurseries",
  commercialForest: "Nearest commercial forests",
}

const defaultMarketMapLayerGroups: string[] = []

const actorLayerIcons: Record<MarketActorLayer, LucideIcon> = {
  processor: Building2,
  nursery: Leaf,
  commercialForest: Trees,
  trialSite: FlaskConical,
  forestReserve: ShieldCheck,
}

function formatDistance(distanceKm: number) {
  return distanceKm >= 100
    ? `${Math.round(distanceKm)} km`
    : `${distanceKm.toFixed(1)} km`
}

function formatCoordinate(value: number) {
  return value.toFixed(5)
}

function formatArea(value?: number) {
  if (!value) return "Not recorded"
  return `${Math.round(value).toLocaleString()} ha`
}

function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const earthRadiusKm = 6371
  const toRadians = Math.PI / 180
  const dLat = (latitudeB - latitudeA) * toRadians
  const dLon = (longitudeB - longitudeA) * toRadians
  const latA = latitudeA * toRadians
  const latB = latitudeB * toRadians

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getEstimatedRoadDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  return haversineKm(latitudeA, longitudeA, latitudeB, longitudeB) * 1.32
}

function createEmptyNearestFeatureGroups(): NearestFeatureGroups {
  return {
    processor: [],
    nursery: [],
    commercialForest: [],
  }
}

function getEstimatedNearestFeatures(
  layer: NearestFeatureLayer,
  latitude: number,
  longitude: number,
  excludeActorId?: string,
  limit = 3
): NearestFeature[] {
  return marketActors
    .filter((actor) => actor.layer === layer && actor.id !== excludeActorId)
    .map((actor) => ({
      ...actor,
      distanceKm: getEstimatedRoadDistanceKm(latitude, longitude, actor.latitude, actor.longitude),
      distanceMode: "estimated-road" as const,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

function getEstimatedNearestFeatureGroups(
  selectedPoint: SelectedPoint,
  selectedActor: MarketActor | null
) {
  return nearestFeatureLayers.reduce<NearestFeatureGroups>((groups, layer) => {
    groups[layer] = getEstimatedNearestFeatures(
      layer,
      selectedPoint.latitude,
      selectedPoint.longitude,
      selectedActor?.layer === layer ? selectedActor.id : undefined
    )
    return groups
  }, createEmptyNearestFeatureGroups())
}

async function fetchRoadRoute(
  origin: SelectedPoint,
  destination: MarketActor,
  signal: AbortSignal
) {
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    alternatives: "false",
    steps: "false",
  })
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?${params.toString()}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`Route request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    routes?: {
      distance?: number
      geometry?: { coordinates?: [number, number][] }
    }[]
  }
  const route = payload.routes?.[0]
  if (route?.distance == null) {
    throw new Error("Route response did not include distance")
  }

  return {
    distanceKm: route.distance / 1000,
    routeCoordinates: route.geometry?.coordinates?.map(
      ([longitude, latitude]) => [latitude, longitude] as LatLngTuple
    ),
  }
}

async function getNearestFeaturesByRoad(
  selectedPoint: SelectedPoint,
  layer: NearestFeatureLayer,
  excludeActorId: string | undefined,
  signal: AbortSignal
): Promise<NearestFeature[]> {
  const estimatedCandidates = getEstimatedNearestFeatures(
    layer,
    selectedPoint.latitude,
    selectedPoint.longitude,
    excludeActorId,
    layer === "processor" ? marketActors.length : 6
  )
  const routes = await Promise.all(
    estimatedCandidates.map(async (feature) => {
      try {
        const route = await fetchRoadRoute(selectedPoint, feature, signal)

        return {
          ...feature,
          distanceKm: route.distanceKm,
          distanceMode: "road" as const,
          routeCoordinates: route.routeCoordinates,
        }
      } catch {
        return {
          ...feature,
          distanceKm: getEstimatedRoadDistanceKm(
            selectedPoint.latitude,
            selectedPoint.longitude,
            feature.latitude,
            feature.longitude
          ),
          distanceMode: "estimated-road" as const,
        }
      }
    })
  )

  return routes.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3)
}

async function getNearestFeatureGroupsByRoad(
  selectedPoint: SelectedPoint,
  selectedActor: MarketActor | null,
  signal: AbortSignal
) {
  const entries = await Promise.all(
    nearestFeatureLayers.map(async (layer) => [
      layer,
      await getNearestFeaturesByRoad(
        selectedPoint,
        layer,
        selectedActor?.layer === layer ? selectedActor.id : undefined,
        signal
      ),
    ] as const)
  )

  return entries.reduce<NearestFeatureGroups>((groups, [layer, features]) => {
    groups[layer] = features
    return groups
  }, createEmptyNearestFeatureGroups())
}

function countActorsByLayer(actors: MarketActor[]) {
  return actorLayerOrder.reduce<Record<MarketActorLayer, number>>((counts, layer) => {
    counts[layer] = actors.filter((actor) => actor.layer === layer).length
    return counts
  }, {} as Record<MarketActorLayer, number>)
}

function getRegionBoundaries(region: MarketRegion) {
  return region.boundaries?.length ? region.boundaries : [region.boundary]
}

function pointInBoundary(
  latitude: number,
  longitude: number,
  boundary: LatLngTuple[]
) {
  let inside = false

  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [latI, lngI] = boundary[i]
    const [latJ, lngJ] = boundary[j]
    const intersects =
      latI > latitude !== latJ > latitude &&
      longitude <
        ((lngJ - lngI) * (latitude - latI)) / (latJ - latI || 1) + lngI

    if (intersects) inside = !inside
  }

  return inside
}

function pointInMarketRegion(
  latitude: number,
  longitude: number,
  region: MarketRegion
) {
  return getRegionBoundaries(region).some((boundary) =>
    pointInBoundary(latitude, longitude, boundary)
  )
}

function countForestReservesForRegion(region: MarketRegion) {
  if (region.country !== "Uganda") return 0

  return ugandaCfrs.filter((cfr) =>
    pointInMarketRegion(cfr.center[0], cfr.center[1], region)
  ).length
}

function getRegionAnalytics(): RegionAnalytics[] {
  return marketRegions.map((region) => {
    const actors = marketActors.filter(
      (actor) =>
        actor.country === region.country &&
        actor.region === region.name &&
        stakeholderAnalyticsLayers.includes(actor.layer)
    )
    const layerCounts = countActorsByLayer(actors)
    const forestReserveCount = countForestReservesForRegion(region)
    layerCounts.forestReserve = forestReserveCount

    return {
      ...region,
      count: actors.length + forestReserveCount,
      layerCounts,
    }
  })
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
  const maxSubBlockArea = Math.max(...group.subBlocks.map((subBlock) => subBlock.size), 1)
  const points = group.subBlocks.flatMap((subBlock, index) =>
    createPolygon(
      group.mapCenter,
      index,
      subBlock.size,
      subBlock.plantedSize,
      group.subBlocks.length,
      maxSubBlockArea
    ).outer
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

function MarketMapClickHandler({
  onSelectPoint,
}: {
  onSelectPoint: (point: SelectedPoint) => void
}) {
  useMapEvents({
    click(event) {
      onSelectPoint({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        label: "Clicked supply point",
      })
    },
  })

  return null
}

function ActorPin({
  actor,
  active,
  highlight,
}: {
  actor: MarketActor
  active: boolean
  highlight?: NearestHighlight
}) {
  const meta = marketActorLayerMeta[actor.layer]
  const Icon = actorLayerIcons[actor.layer]
  const accentColor = highlight?.color ?? meta.color

  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-transform",
          (active || highlight) && "scale-110 ring-2 ring-offset-2 ring-offset-background"
        )}
        style={{
          backgroundColor: meta.color,
          borderColor: active ? "#ffffff" : "rgba(255,255,255,0.78)",
          boxShadow: highlight
            ? `0 0 0 4px ${accentColor}33, 0 0 20px ${accentColor}`
            : active
              ? `0 0 0 3px ${meta.color}44`
              : undefined,
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      {highlight ? (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white px-1 text-[10px] font-semibold text-white shadow"
          style={{ backgroundColor: accentColor }}
        >
          {highlight.rank}
        </span>
      ) : null}
    </div>
  )
}

function ClusterBadge({
  count,
  layer,
}: {
  count: number
  layer: MarketActorLayer
}) {
  const meta = marketActorLayerMeta[layer]

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white shadow-md"
      style={{ backgroundColor: meta.color }}
    >
      {count}
    </div>
  )
}

function ClickPointMarker({ point }: { point: SelectedPoint }) {
  return (
    <MapCircleMarker
      center={[point.latitude, point.longitude]}
      radius={7}
      pathOptions={{
        color: "#111827",
        fillColor: "#f97316",
        fillOpacity: 0.95,
        opacity: 1,
        weight: 2,
      }}
    >
      <MapTooltip side="top">Selected point</MapTooltip>
    </MapCircleMarker>
  )
}

function DetailRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid grid-cols-[8.25rem_minmax(0,1fr)] border-b text-sm last:border-b-0"
        >
          <div className="bg-muted/70 px-3 py-2 font-medium text-muted-foreground">
            {row.label}
          </div>
          <div className="px-3 py-2 leading-5">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function ActorPopup({
  actor,
  onFocusActor,
}: {
  actor: MarketActor
  onFocusActor: (actorId: string) => void
}) {
  const meta = marketActorLayerMeta[actor.layer]

  return (
    <div className="w-80 bg-background">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2" style={{ color: meta.color }}>
              {meta.label}
            </Badge>
            <h3 className="text-base font-semibold leading-tight">{actor.name}</h3>
          </div>
          <span
            className="mt-1 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{actor.summary}</p>
      </div>
      <div className="space-y-3 p-4">
        <DetailRows
          rows={[
            { label: "Role", value: actor.role },
            { label: "Region", value: `${actor.region}, ${actor.country}` },
            { label: "Coordinates", value: `${formatCoordinate(actor.latitude)}, ${formatCoordinate(actor.longitude)}` },
            ...(actor.sizeHa ? [{ label: "Area", value: formatArea(actor.sizeHa) }] : []),
            ...actor.details.slice(0, 4),
          ]}
        />
        <Button size="sm" variant="outline" className="w-full" onClick={() => onFocusActor(actor.id)}>
          <MapPin className="h-4 w-4" />
          Focus
        </Button>
      </div>
    </div>
  )
}

function RegionalBoundariesLayer({
  regions,
  maxCount,
}: {
  regions: RegionAnalytics[]
  maxCount: number
}) {
  return (
    <MapLayerGroup name="Regional boundaries">
      {regions.flatMap((region) => {
        const intensity = maxCount > 0 ? region.count / maxCount : 0
        const fillOpacity = 0.1 + intensity * 0.12

        return getRegionBoundaries(region).map((boundary, index) => (
          <MapPolygon
            key={`${region.id}-${index}`}
            positions={boundary}
            pathOptions={{
              color: region.color,
              fillColor: region.color,
              fillOpacity,
              opacity: 0.9,
              weight: 2,
            }}
          >
            <MapPopup className="w-72 p-0">
              <div className="space-y-3 bg-background p-4">
                <div>
                  <Badge variant="secondary" style={{ color: region.color }}>
                    {region.name}, {region.country}
                  </Badge>
                  <h3 className="mt-2 text-base font-semibold">
                    {region.count} mapped stakeholders
                  </h3>
                </div>
                <DetailRows
                  rows={[
                    { label: "Processors", value: String(region.layerCounts.processor) },
                    { label: "Nurseries", value: String(region.layerCounts.nursery) },
                    { label: "Trial sites", value: String(region.layerCounts.trialSite) },
                    { label: "Commercial forests", value: String(region.layerCounts.commercialForest) },
                    { label: "Forest reserves", value: String(region.layerCounts.forestReserve) },
                    ...(region.source ? [{ label: "Boundary", value: region.source }] : []),
                  ]}
                />
              </div>
            </MapPopup>
            <MapTooltip side="top">
              {region.name}, {region.country}
            </MapTooltip>
          </MapPolygon>
        ))
      })}
    </MapLayerGroup>
  )
}

function ActorLayerGroup({
  layer,
  actors,
  selectedActorId,
  nearestHighlights,
  onSelectActor,
}: {
  layer: MarketActorLayer
  actors: MarketActor[]
  selectedActorId: string | null
  nearestHighlights: Record<string, NearestHighlight>
  onSelectActor: (actorId: string) => void
}) {
  const meta = marketActorLayerMeta[layer]

  if (layer === "forestReserve") {
    return (
      <MapLayerGroup name={meta.label}>
        {ugandaCfrs.flatMap((cfr) =>
          cfr.polygons.map((boundary, index) => (
            <MapPolygon
              key={`${cfr.id}-${index}`}
              positions={boundary}
              pathOptions={{
                color: meta.color,
                fillColor: meta.color,
                fillOpacity: 0.14,
                opacity: 0.78,
                weight: 1.25,
              }}
            >
              <MapPopup className="w-72 p-0">
                <div className="space-y-3 bg-background p-4">
                  <div>
                    <Badge variant="secondary" style={{ color: meta.color }}>
                      Central Forest Reserve
                    </Badge>
                    <h3 className="mt-2 text-base font-semibold">{cfr.name}</h3>
                  </div>
                  <DetailRows
                    rows={[
                      { label: "Area", value: formatArea(cfr.areaHa) },
                      { label: "Source", value: "Ugandabmap.kml" },
                      { label: "Footprints", value: String(cfr.polygons.length) },
                    ]}
                  />
                </div>
              </MapPopup>
              <MapTooltip side="top">
                {cfr.name} CFR
              </MapTooltip>
            </MapPolygon>
          ))
        )}
      </MapLayerGroup>
    )
  }

  return (
    <MapLayerGroup name={meta.label}>
      <MapMarkerClusterGroup
        maxClusterRadius={42}
        showCoverageOnHover={false}
        icon={(count) => <ClusterBadge count={count} layer={layer} />}
      >
        {actors.map((actor) => (
          <MapMarker
            key={actor.id}
            position={[actor.latitude, actor.longitude]}
            icon={
              <ActorPin
                actor={actor}
                active={actor.id === selectedActorId}
                highlight={nearestHighlights[actor.id]}
              />
            }
            iconAnchor={[20, 20]}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelectActor(actor.id) }}
          >
            <MapPopup className="w-80 p-0">
              <ActorPopup actor={actor} onFocusActor={onSelectActor} />
            </MapPopup>
          </MapMarker>
        ))}
      </MapMarkerClusterGroup>
    </MapLayerGroup>
  )
}

function NearestFeatureRoutes({
  nearestFeatures,
}: {
  nearestFeatures: NearestFeatureGroups
}) {
  return (
    <>
      {nearestFeatureLayers.flatMap((layer) => {
        const color = marketActorLayerMeta[layer].color

        return nearestFeatures[layer].flatMap((feature, index) => {
          const positions = feature.routeCoordinates
          if (!positions?.length) return []

          return [
            <MapPolyline
              key={`nearest-halo-${feature.id}`}
              className="fill-transparent"
              positions={positions}
              pathOptions={{
                color,
                fill: false,
                lineCap: "round",
                lineJoin: "round",
                opacity: index === 0 ? 0.24 : 0.14,
                weight: index === 0 ? 12 : 9,
              }}
            />,
            <MapPolyline
              key={`nearest-route-${feature.id}`}
              className="fill-transparent"
              positions={positions}
              pathOptions={{
                color,
                dashArray: layer === "processor" ? undefined : "8 8",
                fill: false,
                lineCap: "round",
                lineJoin: "round",
                opacity: index === 0 ? 0.95 : 0.72,
                weight: index === 0 ? 4 : 3,
              }}
            >
              <MapTooltip side="top">
                {feature.name}: {formatDistance(feature.distanceKm)}
              </MapTooltip>
            </MapPolyline>,
          ]
        })
      })}
      {nearestFeatureLayers.flatMap((layer) => {
        const color = marketActorLayerMeta[layer].color

        return nearestFeatures[layer].map((feature, index) => (
          <MapCircleMarker
            key={`nearest-pulse-${feature.id}`}
            center={[feature.latitude, feature.longitude]}
            radius={index === 0 ? 12 : 9}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: index === 0 ? 0.35 : 0.2,
              opacity: 0.95,
              weight: index === 0 ? 4 : 3,
            }}
          >
            <MapTooltip side="top">
              {nearestFeatureLabels[layer]} #{index + 1}: {feature.name}
            </MapTooltip>
          </MapCircleMarker>
        ))
      })}
    </>
  )
}

function NearestFeatureList({
  layer,
  features,
  isRouting,
}: {
  layer: NearestFeatureLayer
  features: NearestFeature[]
  isRouting: boolean
}) {
  const meta = marketActorLayerMeta[layer]
  const Icon = actorLayerIcons[layer]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
        {nearestFeatureLabels[layer]}
        {isRouting ? (
          <span className="text-xs font-normal text-muted-foreground">
            Routing
          </span>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-md border">
        {features.map((feature, index) => (
          <div
            key={feature.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_6.75rem] items-center border-b px-3 py-2 text-sm last:border-b-0"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {index + 1}
            </span>
            <span className="truncate">{feature.name}</span>
            <span className="text-right">
              <span className="block font-medium">{formatDistance(feature.distanceKm)}</span>
              <span className="block text-[10px] uppercase tracking-normal text-muted-foreground">
                {feature.distanceMode === "road" ? "Road" : "Est. road"}
              </span>
            </span>
          </div>
        ))}
        {features.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No mapped {marketActorLayerMeta[layer].label.toLowerCase()}.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MapSideTable({
  selectedActor,
  selectedPoint,
  nearestFeatures,
  isRouting,
  showRoadAnalysis,
  onClose,
}: {
  selectedActor: MarketActor | null
  selectedPoint: SelectedPoint
  nearestFeatures: NearestFeatureGroups
  isRouting: boolean
  showRoadAnalysis: boolean
  onClose: () => void
}) {
  const meta = selectedActor
    ? marketActorLayerMeta[selectedActor.layer]
    : { label: "Asset point", color: "#f97316" }
  const Icon = selectedActor ? actorLayerIcons[selectedActor.layer] : MousePointerClick

  return (
    <MapControlContainer className="right-3 top-14 bottom-3 w-[min(26rem,calc(100%-1.5rem))] !h-[calc(100%-4.25rem)] max-h-[calc(100%-4.25rem)]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-background/95 shadow-xl backdrop-blur">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: meta.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <Badge variant="secondary" style={{ color: meta.color }}>
                {meta.label}
              </Badge>
            </div>
            <h3 className="mt-3 truncate text-lg font-semibold">
              {selectedActor?.name ?? selectedPoint.label}
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {selectedActor?.summary ??
                "Nearest market actors are ranked from this selected asset point."}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close table"
            title="Close table"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          <DetailRows
            rows={[
              ...(selectedActor
                ? [
                    { label: "Role", value: selectedActor.role },
                    { label: "Region", value: `${selectedActor.region}, ${selectedActor.country}` },
                    { label: "Source", value: selectedActor.source },
                    ...(selectedActor.sizeHa
                      ? [{ label: "Area", value: formatArea(selectedActor.sizeHa) }]
                      : []),
                  ]
                : [{ label: "Point", value: "Selected asset or map location" }]),
              {
                label: "Latitude",
                value: formatCoordinate(selectedPoint.latitude),
              },
              {
                label: "Longitude",
                value: formatCoordinate(selectedPoint.longitude),
              },
              ...(selectedActor?.details ?? []),
            ]}
          />

          {showRoadAnalysis ? (
            <div className="space-y-4">
              {nearestFeatureLayers.map((layer) => (
                <NearestFeatureList
                  key={layer}
                  layer={layer}
                  features={nearestFeatures[layer]}
                  isRouting={isRouting}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              Road analysis is hidden for this selected point.
            </div>
          )}
        </div>
      </div>
    </MapControlContainer>
  )
}

function SiteMetricChart({
  group,
  metric,
  speciesFilter,
  onMetricChange,
  onSpeciesFilterChange,
  disableBoundaryEffect,
}: {
  group: AssetGroup
  metric: SiteMetricKey
  speciesFilter: SpeciesFilter
  onMetricChange: (metric: SiteMetricKey) => void
  onSpeciesFilterChange: (species: SpeciesFilter) => void
  disableBoundaryEffect?: boolean
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
      className={disableBoundaryEffect ? "rounded-2xl" : dashboardFrameClass}
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
  disableBoundaryEffect = false,
}: DashboardAssetMapProps) {
  const navigate = useNavigate()
  const [selectedMetric, setSelectedMetric] =
    React.useState<SiteMetricKey>("portfolioPerformance")
  const [speciesFilter, setSpeciesFilter] =
    React.useState<SpeciesFilter>("all")
  const [focusVersion, setFocusVersion] = React.useState(0)
  const [selectedActorId, setSelectedActorId] = React.useState<string | null>(null)
  const [clickedPoint, setClickedPoint] = React.useState<SelectedPoint | null>(null)
  const [isTableOpen, setIsTableOpen] = React.useState(() => !showHeaderCopy)
  const [nearestFeatures, setNearestFeatures] = React.useState<NearestFeatureGroups>(
    () => createEmptyNearestFeatureGroups()
  )
  const [isRouting, setIsRouting] = React.useState(false)
  const [showRoadAnalysis, setShowRoadAnalysis] = React.useState(true)

  const selectedGroup =
    initialAssetGroups.find((group) => group.id === selectedGroupId) ??
    initialAssetGroups[0]
  const availableSpecies = React.useMemo(
    () => getGroupSpecies(selectedGroup),
    [selectedGroup]
  )
  const accentColor = speciesProfile[availableSpecies[0] ?? "eucalyptus"].color
  const actorGroups = React.useMemo(
    () =>
      actorLayerOrder.reduce<Record<MarketActorLayer, MarketActor[]>>((groups, layer) => {
        groups[layer] = marketActors.filter((actor) => actor.layer === layer)
        return groups
      }, {} as Record<MarketActorLayer, MarketActor[]>),
    []
  )
  const selectedActor =
    marketActors.find((actor) => actor.id === selectedActorId) ?? null
  const selectedAssetPoint = React.useMemo(
    () => ({
      latitude: selectedGroup.mapCenter[0],
      longitude: selectedGroup.mapCenter[1],
      label: selectedGroup.block,
    }),
    [selectedGroup]
  )
  const selectedPoint: SelectedPoint = selectedActor
    ? {
        latitude: selectedActor.latitude,
        longitude: selectedActor.longitude,
        label: selectedActor.name,
      }
    : clickedPoint ?? selectedAssetPoint
  const selectedPointKey = `${selectedPoint.latitude}:${selectedPoint.longitude}:${selectedActor?.id ?? clickedPoint?.label ?? selectedGroup.id}`
  const regionAnalytics = React.useMemo(() => getRegionAnalytics(), [])
  const maxRegionCount = React.useMemo(
    () => Math.max(...regionAnalytics.map((region) => region.count), 1),
    [regionAnalytics]
  )
  const nearestHighlights = React.useMemo(() => {
    if (!showRoadAnalysis) return {}

    return nearestFeatureLayers.reduce<Record<string, NearestHighlight>>((highlights, layer) => {
      const color = marketActorLayerMeta[layer].color
      nearestFeatures[layer].forEach((feature, index) => {
        highlights[feature.id] = {
          color,
          rank: index + 1,
          layer,
        }
      })
      return highlights
    }, {})
  }, [nearestFeatures, showRoadAnalysis])

  React.useEffect(() => {
    if (speciesFilter !== "all" && !availableSpecies.includes(speciesFilter)) {
      setSpeciesFilter("all")
    }
  }, [availableSpecies, speciesFilter])

  React.useEffect(() => {
    setSelectedActorId(null)
    setClickedPoint(null)
    setIsTableOpen(!showHeaderCopy)
  }, [selectedGroup.id, showHeaderCopy])

  React.useEffect(() => {
    setShowRoadAnalysis(true)
    const estimatedFeatures = getEstimatedNearestFeatureGroups(
      selectedPoint,
      selectedActor
    )
    const controller = new AbortController()

    setNearestFeatures(estimatedFeatures)
    setIsRouting(true)

    getNearestFeatureGroupsByRoad(
      selectedPoint,
      selectedActor,
      controller.signal
    )
      .then((features) => {
        if (!controller.signal.aborted) {
          setNearestFeatures(features)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRouting(false)
        }
      })

    return () => controller.abort()
  }, [selectedPointKey, selectedActor])

  const handleSelectGroup = (groupId: string) => {
    onSelectGroup(groupId)
    setFocusVersion((value) => value + 1)
  }

  const focusActor = (actorId: string) => {
    setSelectedActorId(actorId)
    setClickedPoint(null)
    setIsTableOpen(true)
  }

  const focusAssetSite = () => {
    setSelectedActorId(null)
    setClickedPoint(null)
    setIsTableOpen(true)
    setFocusVersion((value) => value + 1)
  }

  return (
    <div
      className={disableBoundaryEffect ? "rounded-2xl" : dashboardFrameClass}
      style={{ ["--chart-accent" as string]: accentColor }}
    >
      <Card
        id="dashboard-asset-map"
        className={`overflow-hidden ${dashboardSurfaceClass}`}
      >
        {showHeaderCopy || showOpenFullMapButton ? (
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
                    Interactive view of your assets, markets, regional boundaries, and route proximity
                  </CardDescription>
                </div>
              ) : (
                <div />
              )}

              {showOpenFullMapButton ? (
                <Button
                  className="w-full cursor-pointer rounded-full p-0 text-base xl:max-w-[260px]"
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
              ) : null}
            </div>
          </CardHeader>
        ) : null}

        <CardContent className={showHeaderCopy || showOpenFullMapButton ? "p-4 xl:p-5" : "p-0"}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="space-y-5">
              <div
                className={cn(
                  "overflow-hidden rounded-[28px] bg-background/70 backdrop-blur-sm",
                  !disableBoundaryEffect && "border"
                )}
              >
                <Map
                  center={selectedGroup.mapCenter}
                  zoom={7}
                  maxZoom={18}
                  className="h-[500px] w-full rounded-none xl:h-[560px]"
                >
                  <MapLayers
                    defaultTileLayer={marketTileLayers[0].name}
                    defaultLayerGroups={defaultMarketMapLayerGroups}
                  >
                    {marketTileLayers.map((tileLayer) => (
                      <MapTileLayer
                        key={tileLayer.name}
                        name={tileLayer.name}
                        url={tileLayer.url}
                        attribution={tileLayer.attribution}
                        darkUrl={tileLayer.darkUrl}
                        darkAttribution={tileLayer.darkAttribution}
                      />
                    ))}

                    <MapViewportFocus
                      group={selectedGroup}
                      focusVersion={focusVersion}
                    />

                    <MapLayerGroup name="Asset blocks">
                      {initialAssetGroups.flatMap((group) => {
                        const maxSubBlockArea = Math.max(
                          ...group.subBlocks.map((subBlock) => subBlock.size),
                          1
                        )

                        return group.subBlocks.flatMap((subBlock, index) => {
                          const polygons = createPolygon(
                            group.mapCenter,
                            index,
                            subBlock.size,
                            subBlock.plantedSize,
                            group.subBlocks.length,
                            maxSubBlockArea
                          )
                          const speciesColor = speciesProfile[subBlock.variety].color
                          const isSelected = group.id === selectedGroup.id
                          const subMetrics = getSubBlockEstimatedMetrics(group, subBlock)

                          return [
                            <MapPolygon
                              key={`${subBlock.id}-outer`}
                              positions={polygons.outer}
                              eventHandlers={{
                                click: (event) => {
                                  event.originalEvent.stopPropagation()
                                  handleSelectGroup(group.id)
                                },
                              }}
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
                                          Managed
                                        </div>
                                        <div className="mt-1 text-base font-semibold">
                                          {subBlock.size.toFixed(2)} ha
                                        </div>
                                      </div>
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
                              eventHandlers={{
                                click: (event) => {
                                  event.originalEvent.stopPropagation()
                                  handleSelectGroup(group.id)
                                },
                              }}
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
                      })}
                    </MapLayerGroup>

                    <RegionalBoundariesLayer
                      regions={regionAnalytics}
                      maxCount={maxRegionCount}
                    />

                    {actorLayerOrder.map((layer) => (
                      <ActorLayerGroup
                        key={layer}
                        layer={layer}
                        actors={actorGroups[layer]}
                        selectedActorId={selectedActorId}
                        nearestHighlights={nearestHighlights}
                        onSelectActor={focusActor}
                      />
                    ))}

                    {clickedPoint ? <ClickPointMarker point={selectedPoint} /> : null}
                    {showRoadAnalysis ? (
                      <NearestFeatureRoutes nearestFeatures={nearestFeatures} />
                    ) : null}

                    <MarketMapClickHandler
                      onSelectPoint={(point) => {
                        setClickedPoint(point)
                        setSelectedActorId(null)
                        setIsTableOpen(true)
                      }}
                    />
                    <MapZoomControl position="top-3 left-3" />
                    <MapLayersControl
                      position="top-3 right-3"
                      tileLayersLabel="Base map"
                      layerGroupsLabel="Map overlays"
                    />

                    <MapControlContainer className="right-16 top-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="border shadow-sm"
                          aria-label="Reset to selected asset"
                          title="Reset to selected asset"
                          onClick={focusAssetSite}
                        >
                          <Sprout className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant={showRoadAnalysis ? "default" : "secondary"}
                          className="border shadow-sm"
                          aria-label={showRoadAnalysis ? "Hide road analysis" : "Show road analysis"}
                          title={showRoadAnalysis ? "Hide road analysis" : "Show road analysis"}
                          onClick={() => setShowRoadAnalysis((value) => !value)}
                        >
                          <Route className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant={isTableOpen ? "default" : "secondary"}
                          className="border shadow-sm"
                          aria-label={isTableOpen ? "Hide map table" : "Show map table"}
                          title={isTableOpen ? "Hide map table" : "Show map table"}
                          onClick={() => setIsTableOpen((value) => !value)}
                        >
                          <PanelRightOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </MapControlContainer>

                    {isTableOpen ? (
                      <MapSideTable
                        selectedActor={selectedActor}
                        selectedPoint={selectedPoint}
                        nearestFeatures={nearestFeatures}
                        isRouting={isRouting}
                        showRoadAnalysis={showRoadAnalysis}
                        onClose={() => setIsTableOpen(false)}
                      />
                    ) : null}
                  </MapLayers>
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
                disableBoundaryEffect={disableBoundaryEffect}
              />
            </div>

            <div
              className={cn(
                "rounded-[28px] bg-background/70 p-4 backdrop-blur-sm",
                !disableBoundaryEffect && "border"
              )}
            >
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
