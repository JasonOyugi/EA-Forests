"use client"

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react"
import {
  Building2,
  CircleDollarSign,
  FlaskConical,
  Leaf,
  MapPin,
  MapPinned,
  MousePointerClick,
  PanelRightOpen,
  Pause,
  Play,
  Route,
  RotateCw,
  ShieldCheck,
  Trees,
  X,
  type LucideIcon,
} from "lucide-react"
import { useMap, useMapEvents } from "react-leaflet"

import { MetricCardDecoration } from "@/app/landing/components/metric-card-decoration"
import {
  BasicSsmtControlCard,
  BasicSsmtLayerControl,
  useBasicSsmtLayerController,
} from "@/app/maps/basic-ssmt-layer"
import {
  marketActorLayerMeta,
  marketActors,
  marketCountryFilters,
  marketRegions,
  marketTileLayers,
  getRegionBoundaries,
  pointInMarketRegion,
  stakeholderAnalyticsLayers,
  type MarketCountry,
  type MarketCountryFilter,
  type MarketActor,
  type MarketActorLayer,
  type MarketProcessorCategory,
  type MarketRegion,
} from "@/app/shop/data/market-map"
import {
  getCentralForestReserveAreaHa,
  getCentralForestReserveRecord,
} from "@/app/shop/data/market-databases"
import { ugandaCfrs, type LatLngTuple } from "@/app/shop/data/generated-boundaries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapResizeHandle, MapResizeInvalidator } from "@/components/map/map-resize-handle"
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
import { cn } from "@/lib/utils"

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
  topLayer: MarketActorLayer | null
}

type MarketAnalyticsScope = {
  country: MarketCountryFilter
  regionId: string | null
}

type DiameterFilter = "all" | "le-20" | "21-30" | "gt-30" | "unknown"

const diameterFilterOptions: Array<{ value: DiameterFilter; label: string }> = [
  { value: "all", label: "Any minimum" },
  { value: "le-20", label: "<= 20 cm" },
  { value: "21-30", label: "21-30 cm" },
  { value: "gt-30", label: "> 30 cm" },
  { value: "unknown", label: "Not specified" },
]

const processorCategoryOrder: MarketProcessorCategory[] = [
  "Sawmill",
  "Veneer / Plywood",
  "MDF / Panel Board",
  "Pulp / Paper",
  "Poles / Energy",
]

function toDiameterBand(minDiameterCm: number | null): DiameterFilter {
  if (minDiameterCm == null) return "unknown"
  if (minDiameterCm <= 20) return "le-20"
  if (minDiameterCm <= 30) return "21-30"
  return "gt-30"
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
  commercialForest: "Nearest large commercial forests",
}

const countryFlagClasses: Record<MarketCountryFilter, string> = {
  Uganda: "flag-row-ug",
  Kenya: "flag-row-ke",
  Tanzania: "flag-row-tz",
  All: "",
}

const actorLayerIcons: Record<MarketActorLayer, LucideIcon> = {
  processor: Building2,
  nursery: Leaf,
  commercialForest: Trees,
  trialSite: FlaskConical,
  forestReserve: ShieldCheck,
}

function eoLayerNameForScope(country: MarketCountryFilter) {
  return country === "All" ? "East Africa EO" : `${country} EO`
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
  selectedActor: MarketActor | null,
  layers: NearestFeatureLayer[] = nearestFeatureLayers
) {
  return layers.reduce<NearestFeatureGroups>((groups, layer) => {
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
  signal: AbortSignal,
  layers: NearestFeatureLayer[] = nearestFeatureLayers
) {
  const entries = await Promise.all(
    layers.map(async (layer) => [
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

function countForestReservesForRegion(region: MarketRegion) {
  if (region.country !== "Uganda") return 0

  return ugandaCfrs.filter((cfr) =>
    pointInMarketRegion(cfr.center[0], cfr.center[1], region)
  ).length
}

function countForestReservesForScope(scope: MarketAnalyticsScope) {
  if (scope.country !== "All" && scope.country !== "Uganda") return 0
  if (!scope.regionId) return ugandaCfrs.length

  const region = marketRegions.find((item) => item.id === scope.regionId)
  return region ? countForestReservesForRegion(region) : 0
}

function getRegionAnalytics(country?: MarketCountry): RegionAnalytics[] {
  return marketRegions
    .filter((region) => !country || region.country === country)
    .map((region) => {
      const actors = marketActors.filter(
        (actor) =>
          actor.country === region.country &&
          actor.region === region.name &&
          stakeholderAnalyticsLayers.includes(actor.layer)
      )
      const layerCounts = countActorsByLayer(actors)
      const forestReserveCount = countForestReservesForRegion(region)
      layerCounts.forestReserve = forestReserveCount
      const topLayer =
        stakeholderAnalyticsLayers
          .map((layer) => ({ layer, count: layerCounts[layer] }))
          .sort((a, b) => b.count - a.count)[0]?.layer ?? null

      return {
        ...region,
        count: actors.length + forestReserveCount,
        layerCounts,
        topLayer,
      }
    })
}

function MarketMapClickHandler({
  onSelectPoint,
}: {
  onSelectPoint: (point: SelectedPoint) => void
}) {
  useMapEvents({
    dblclick(event) {
      onSelectPoint({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        label: "Clicked supply point",
      })
    },
  })

  return null
}

function MarketScopeFocus({
  country,
  regionId,
  version,
}: {
  country: MarketCountryFilter
  regionId: string | null
  version: number
}) {
  const map = useMap()

  useEffect(() => {
    const regions = regionId
      ? marketRegions.filter((region) => region.id === regionId)
      : country === "All"
        ? marketRegions
        : marketRegions.filter((region) => region.country === country)
    const bounds = regions.flatMap((region) => getRegionBoundaries(region)).flat()

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: regionId ? 8 : 6 })
    }
  }, [country, map, regionId, version])

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

function ActorPopup({
  actor,
  onFocusActor,
}: {
  actor: MarketActor
  onFocusActor: (actorId: string) => void
}) {
  const meta = marketActorLayerMeta[actor.layer]

  return (
    <div className="max-h-[70vh] w-80 overflow-y-auto bg-background">
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
      </div>
      <div className="space-y-3 p-4">
        <DetailRows
          rows={[
            { label: "Country", value: actor.country },
            { label: "Market region", value: actor.region },
            { label: "Coordinates", value: `${formatCoordinate(actor.latitude)}, ${formatCoordinate(actor.longitude)}` },
            ...actor.details,
          ]}
        />
        <div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => onFocusActor(actor.id)}>
            <MapPin className="h-4 w-4" />
            Focus
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailRows({ rows }: { rows: { label: string; value: string }[] }) {
  const visibleRows = rows.filter((row) => {
    const value = row.value.trim()
    return Boolean(value)
  })

  if (visibleRows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-none border">
      {visibleRows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid grid-cols-[8.25rem_minmax(0,1fr)] border-b text-sm last:border-b-0"
        >
          <div className="bg-muted/70 px-3 py-2 font-medium text-muted-foreground">
            {row.label}
          </div>
          <div className="break-words px-3 py-2 leading-5">{row.value}</div>
        </div>
      ))}
    </div>
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
      <div className="overflow-hidden rounded-none border">
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
  layers,
  onClose,
}: {
  selectedActor: MarketActor | null
  selectedPoint: SelectedPoint
  nearestFeatures: NearestFeatureGroups
  isRouting: boolean
  showRoadAnalysis: boolean
  layers: NearestFeatureLayer[]
  onClose: () => void
}) {
  const meta = selectedActor
    ? marketActorLayerMeta[selectedActor.layer]
    : { label: "Map point", color: "#f97316" }
  const Icon = selectedActor ? actorLayerIcons[selectedActor.layer] : MousePointerClick

  return (
    <MapControlContainer className="right-3 top-14 bottom-3 w-[min(26rem,calc(100%-1.5rem))] !h-[calc(100%-4.25rem)] max-h-[calc(100%-4.25rem)]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border bg-background/95 shadow-xl backdrop-blur">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none text-white"
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
            {!selectedActor ? (
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Nearest market actors are ranked from this selected point.
              </p>
            ) : null}
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
                    { label: "Country", value: selectedActor.country },
                    { label: "Market region", value: selectedActor.region },
                  ]
                : []),
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
              {layers.map((layer) => (
                <NearestFeatureList
                  key={layer}
                  layer={layer}
                  features={nearestFeatures[layer]}
                  isRouting={isRouting}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-none border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              Road analysis is hidden for this selected point.
            </div>
          )}
        </div>
      </div>
    </MapControlContainer>
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
                    { label: "Large commercial forests", value: String(region.layerCounts.commercialForest) },
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
  forestReserves = ugandaCfrs,
  reserveLayerName = "Uganda EO",
  selectedActorId,
  nearestHighlights,
  onSelectActor,
}: {
  layer: MarketActorLayer
  actors: MarketActor[]
  forestReserves?: typeof ugandaCfrs
  reserveLayerName?: string
  selectedActorId: string | null
  nearestHighlights: Record<string, NearestHighlight>
  onSelectActor: (actorId: string) => void
}) {
  const meta = marketActorLayerMeta[layer]
  if (layer === "forestReserve") {
    return (
      <MapLayerGroup name={reserveLayerName}>
        {forestReserves.flatMap((cfr) => {
          const record = getCentralForestReserveRecord(
            cfr.name,
            cfr.center[0],
            cfr.center[1]
          )
          const recordedAreaHa = record ? getCentralForestReserveAreaHa(record) : null

          return cfr.polygons.map((boundary, index) => (
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
                      { label: "Area", value: formatArea(recordedAreaHa ?? cfr.areaHa) },
                      {
                        label: "Legal status",
                        value:
                          record?.reserve_profile.reserve_status.legal_status ??
                          "Central Forest Reserve",
                      },
                      {
                        label: "PPP availability",
                        value:
                          String(record?.reserve_profile.reserve_status.ppp_availability || "") ||
                          "Not recorded",
                      },
                      {
                        label: "Authority",
                        value:
                          String(record?.reserve_profile.reserve_status.management_authority || "") ||
                          "Not recorded",
                      },
                      {
                        label: "Concession status",
                        value:
                          String(record?.reserve_profile.reserve_status.overall_concession_status || "") ||
                          "Not recorded",
                      },
                      {
                        label: "Verification",
                        value:
                          String(
                            record?.reserve_profile.reserve_status.verification ||
                              record?.verification ||
                              ""
                          ) || "Not recorded",
                      },
                      { label: "Source", value: String(record?.["Data source"] ?? "Ugandabmap.kml") },
                      { label: "Footprints", value: String(cfr.polygons.length) },
                      ...(record?.Comments
                        ? [{ label: "Descriptor", value: String(record.Comments) }]
                        : []),
                    ]}
                  />
                </div>
              </MapPopup>
              <MapTooltip side="top">
                {cfr.name} CFR
              </MapTooltip>
            </MapPolygon>
          ))
        })}
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
              <ActorPopup
                actor={actor}
                onFocusActor={onSelectActor}
              />
            </MapPopup>
            <MapTooltip side="top">{actor.name}</MapTooltip>
          </MapMarker>
        ))}
      </MapMarkerClusterGroup>
    </MapLayerGroup>
  )
}

function NearestFeatureRoutes({
  nearestFeatures,
  layers,
  selectedActorId,
  onSelectActor,
}: {
  nearestFeatures: NearestFeatureGroups
  layers: NearestFeatureLayer[]
  selectedActorId: string | null
  onSelectActor: (actorId: string) => void
}) {
  return (
    <>
      {layers.flatMap((layer) => {
        const color = marketActorLayerMeta[layer].color

        return nearestFeatures[layer].flatMap((feature, index) => {
          const positions = feature.routeCoordinates
          if (!positions?.length) return []

          return [
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
      {layers.flatMap((layer) => {
        const color = marketActorLayerMeta[layer].color

        return nearestFeatures[layer].map((feature, index) => (
          <MapMarker
            key={`nearest-marker-${feature.id}`}
            position={[feature.latitude, feature.longitude]}
            icon={
              <ActorPin
                actor={feature}
                active={feature.id === selectedActorId}
                highlight={{
                  color,
                  rank: index + 1,
                  layer,
                }}
              />
            }
            iconAnchor={[20, 20]}
            zIndexOffset={1000 + (layers.length - index) * 10}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelectActor(feature.id) }}
          >
            <MapPopup className="w-80 p-0">
              <ActorPopup
                actor={feature}
                onFocusActor={onSelectActor}
              />
            </MapPopup>
            <MapTooltip side="top">
              {nearestFeatureLabels[layer]} #{index + 1}: {feature.name}
            </MapTooltip>
          </MapMarker>
        ))
      })}
    </>
  )
}

function MetricPanel({
  icon: Icon,
  label,
  value,
  color,
  note,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  note?: string
  className?: string
}) {
  return (
    <div
      className={cn("roundwood-metric-card relative overflow-hidden rounded-none border p-4", className)}
      style={{ "--metric-color": color } as CSSProperties}
    >
      <MetricCardDecoration accent={color} watermark={<Icon className="size-28" />} />
      <div className="relative z-10 pr-12">
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
      {note ? (
        <p className="relative z-10 mt-3 text-xs leading-5 text-muted-foreground">{note}</p>
      ) : null}
    </div>
  )
}

function getActorsForScope(scope: MarketAnalyticsScope) {
  const region = scope.regionId
    ? marketRegions.find((item) => item.id === scope.regionId)
    : null

  return marketActors.filter((actor) => {
    if (!stakeholderAnalyticsLayers.includes(actor.layer)) return false
    if (scope.country !== "All" && actor.country !== scope.country) return false
    if (region && (actor.country !== region.country || actor.region !== region.name)) {
      return false
    }

    return true
  })
}

function average(values: number[]) {
  if (values.length === 0) return null

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatSeedlingPrice(value: number | null) {
  if (value == null) return "No price data"

  return `USD ${value.toFixed(2)} / seedling`
}

function formatUgxPrice(value: number | null) {
  if (value == null) return "No price data"

  return `UGX ${Math.round(value).toLocaleString()} / t`
}

function getAverageSeedlingPrice(actors: MarketActor[]) {
  const nurseryRecords = actors.filter((actor) => actor.layer === "nursery")
  const pricedRecords = nurseryRecords.filter(
    (actor) => actor.seedlingPriceUsdPerSeedling != null
  )

  return {
    value: average(
      pricedRecords.map((actor) => actor.seedlingPriceUsdPerSeedling ?? 0)
    ),
    pricedCount: pricedRecords.length,
    totalCount: nurseryRecords.length,
  }
}

function getAverageG1RoundwoodPrice(actors: MarketActor[]) {
  const processorRecords = actors.filter((actor) => actor.layer === "processor")
  const pricedRecords = processorRecords.filter(
    (actor) => actor.g1RoundwoodPriceUgxPerTonne != null
  )

  return {
    value: average(
      pricedRecords.map((actor) => actor.g1RoundwoodPriceUgxPerTonne ?? 0)
    ),
    pricedCount: pricedRecords.length,
    totalCount: processorRecords.length,
  }
}

function formatRecordCoverage(
  recordedCount: number,
  totalCount: number,
  recordedLabel: string,
  missingLabel: string
) {
  if (totalCount === 0) return missingLabel

  return `${recordedCount} of ${totalCount} ${recordedLabel}`
}

function getForestReservesForScope(scope: MarketAnalyticsScope) {
  if (scope.country !== "All" && scope.country !== "Uganda") return []
  if (!scope.regionId) return ugandaCfrs

  const region = marketRegions.find((item) => item.id === scope.regionId)
  if (!region || region.country !== "Uganda") return []

  return ugandaCfrs.filter((cfr) =>
    pointInMarketRegion(cfr.center[0], cfr.center[1], region)
  )
}

function getCommercialForestActorsForScope(scope: MarketAnalyticsScope) {
  const region = scope.regionId
    ? marketRegions.find((item) => item.id === scope.regionId)
    : null

  return marketActors.filter((actor) => {
    if (actor.layer !== "commercialForest") return false
    if (scope.country !== "All" && actor.country !== scope.country) return false
    if (region && (actor.country !== region.country || actor.region !== region.name)) {
      return false
    }

    return true
  })
}

function getForestCoverSummary(scope: MarketAnalyticsScope) {
  const forestReserves = getForestReservesForScope(scope)
  const commercialForests = getCommercialForestActorsForScope(scope)
  const commercialForestsWithArea = commercialForests.filter(
    (actor) => actor.sizeHa != null
  )
  const forestReserveHa = forestReserves.reduce(
    (sum, cfr) =>
      sum +
      (getCentralForestReserveAreaHa(
        getCentralForestReserveRecord(cfr.name, cfr.center[0], cfr.center[1])
      ) ??
        cfr.areaHa),
    0
  )
  const commercialForestHa = commercialForestsWithArea.reduce(
    (sum, actor) => sum + (actor.sizeHa ?? 0),
    0
  )

  return {
    forestReserveHa,
    commercialForestHa,
    commercialForestAreaCount: commercialForestsWithArea.length,
    commercialForestTotalCount: commercialForests.length,
    totalForestCoverHa: forestReserveHa + commercialForestHa,
  }
}

type CommercialSpeciesArea = {
  species: string
  hectares: number
  color: string
}

function getCommercialSpeciesSummary(actors: MarketActor[]) {
  const totals = new globalThis.Map<string, CommercialSpeciesArea>()

  actors
    .filter((actor) => actor.layer === "commercialForest")
    .forEach((actor) => {
      actor.commercialSpeciesAreas?.forEach((item) => {
        const current = totals.get(item.species)
        totals.set(item.species, {
          species: item.species,
          hectares: (current?.hectares ?? 0) + item.hectares,
          color: item.color,
        })
      })
    })

  return [...totals.values()].sort((a, b) => b.hectares - a.hectares)
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? "default" : "outline"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

function MapControlCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-none border bg-background/80 p-3 shadow-sm">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  )
}

function MarketMapControls({
  selectedCountry,
  selectedRegionId,
  selectedPoint,
  showRoadAnalysis,
  activeLayerGroups,
  layerGroups,
  ssmtController,
  showSsmt = true,
  showRegionFocus = true,
  showOverlayToggle = true,
  processorCategoryOptions,
  selectedProcessorCategory,
  onProcessorCategoryChange,
  speciesOptions,
  selectedProcessorSpecies,
  onProcessorSpeciesChange,
  selectedDiameterFilter,
  onDiameterFilterChange,
  onCountryChange,
  onRegionChange,
  onRoadAnalysisChange,
  onLayerGroupsChange,
}: {
  selectedCountry: MarketCountryFilter
  selectedRegionId: string | null
  selectedPoint: SelectedPoint | null
  showRoadAnalysis: boolean
  activeLayerGroups: string[]
  layerGroups: string[]
  ssmtController: ReturnType<typeof useBasicSsmtLayerController>
  showSsmt?: boolean
  showRegionFocus?: boolean
  showOverlayToggle?: boolean
  processorCategoryOptions?: MarketProcessorCategory[]
  selectedProcessorCategory?: MarketProcessorCategory | "all"
  onProcessorCategoryChange?: (category: MarketProcessorCategory | "all") => void
  speciesOptions?: string[]
  selectedProcessorSpecies?: string
  onProcessorSpeciesChange?: (species: string) => void
  selectedDiameterFilter?: DiameterFilter
  onDiameterFilterChange?: (filter: DiameterFilter) => void
  onCountryChange: (country: MarketCountryFilter) => void
  onRegionChange: (regionId: string) => void
  onRoadAnalysisChange: (visible: boolean) => void
  onLayerGroupsChange: (groups: string[]) => void
}) {
  const regions =
    selectedCountry === "All"
      ? []
      : marketRegions.filter((region) => region.country === selectedCountry)
  const allRegionsValue = "__all_regions__"

  return (
    <div className={cn("grid gap-3", showSsmt ? "xl:grid-cols-2 2xl:grid-cols-4" : "xl:grid-cols-3")}>
      <MapControlCard title="Map area">
        <ToggleGroup
          options={marketCountryFilters.map((country) => ({
            value: country,
            label: country,
          }))}
          value={selectedCountry}
          onChange={onCountryChange}
        />
      </MapControlCard>

      {showRegionFocus ? (
        <MapControlCard title="Region focus">
          {selectedCountry === "All" ? (
            <p className="text-sm text-muted-foreground">Showing all countries and regions.</p>
          ) : (
            <ToggleGroup
              options={[
                { value: allRegionsValue, label: "All regions" },
                ...regions.map((region) => ({ value: region.id, label: region.name })),
              ]}
              value={selectedRegionId ?? allRegionsValue}
              onChange={(value) =>
                onRegionChange(value === allRegionsValue ? "" : value)
              }
            />
          )}
        </MapControlCard>
      ) : null}

      {showSsmt ? <BasicSsmtControlCard controller={ssmtController} /> : null}

      <MapControlCard title="Road analysis">
        <Button
          type="button"
          variant={showRoadAnalysis ? "default" : "outline"}
          aria-pressed={showRoadAnalysis}
          disabled={!selectedPoint}
          onClick={() => onRoadAnalysisChange(!showRoadAnalysis)}
        >
          <Route className="h-4 w-4" />
          {showRoadAnalysis ? "On" : "Off"}
        </Button>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {selectedPoint
            ? "Routes show the nearest processors, nurseries, and commercial forests."
            : "Double-click the map or select an item to analyse travel routes."}
        </p>
      </MapControlCard>

      {processorCategoryOptions && onProcessorCategoryChange && selectedProcessorCategory ? (
        <MapControlCard title="Processor class">
          <ToggleGroup
            options={[
              { value: "all", label: "All classes" },
              ...processorCategoryOptions.map((category) => ({ value: category, label: category })),
            ]}
            value={selectedProcessorCategory}
            onChange={(value) =>
              onProcessorCategoryChange(value as MarketProcessorCategory | "all")
            }
          />
        </MapControlCard>
      ) : null}

      {speciesOptions && onProcessorSpeciesChange && selectedProcessorSpecies ? (
        <MapControlCard title="Species">
          <ToggleGroup
            options={[
              { value: "all", label: "All species" },
              ...speciesOptions.map((species) => ({ value: species, label: species })),
            ]}
            value={selectedProcessorSpecies}
            onChange={onProcessorSpeciesChange}
          />
        </MapControlCard>
      ) : null}

      {selectedDiameterFilter && onDiameterFilterChange ? (
        <MapControlCard title="Minimum diameter">
          <ToggleGroup
            options={diameterFilterOptions}
            value={selectedDiameterFilter}
            onChange={(value) => onDiameterFilterChange(value as DiameterFilter)}
          />
        </MapControlCard>
      ) : null}

      {showOverlayToggle ? (
        <div className="rounded-none border bg-background/80 p-3 shadow-sm xl:col-span-2 2xl:col-span-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Map overlays
          </div>
          <div className="flex flex-wrap gap-2">
            {layerGroups.map((name) => {
              const active = activeLayerGroups.includes(name)
              return (
                <Button
                  key={name}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() =>
                    onLayerGroupsChange(
                      active
                        ? activeLayerGroups.filter((group) => group !== name)
                        : [...activeLayerGroups, name]
                    )
                  }
                >
                  {name}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SpeciesDataNotice({
  speciesAreas,
  commercialForestAreaCount,
  commercialForestTotalCount,
}: {
  speciesAreas: CommercialSpeciesArea[]
  commercialForestAreaCount: number
  commercialForestTotalCount: number
}) {
  if (speciesAreas.length > 0) {
    const totalHa = speciesAreas.reduce((sum, item) => sum + item.hectares, 0)

    return (
      <div className="roundwood-species-panel rounded-none border bg-background/75 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Large commercial forest species split</h3>
          <span className="text-xs text-muted-foreground">
            {Math.round(totalHa).toLocaleString()} ha recorded
          </span>
        </div>
        <div className="space-y-2">
          {speciesAreas.map((item) => {
            const share = totalHa > 0 ? (item.hectares / totalHa) * 100 : 0

            return (
              <div key={item.species} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.species}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(item.hectares).toLocaleString()} ha ({share.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, share)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="roundwood-species-panel rounded-none border border-dashed bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
      No species-area split is recorded for this scope. Large commercial forest area
      coverage: {commercialForestAreaCount} of {commercialForestTotalCount} mapped
      large commercial forest records include hectares.
    </div>
  )
}

function MarketAnalysis({
  selectedCountry,
  selectedRegionId,
  onCountryChange,
  onRegionChange,
  variant = "sector",
}: {
  selectedCountry: MarketCountryFilter
  selectedRegionId: string | null
  onCountryChange: (country: MarketCountryFilter) => void
  onRegionChange: (regionId: string) => void
  variant?: "sector" | "wood-markets"
}) {
  const isWoodMarkets = variant === "wood-markets"
  const countryActors = getActorsForScope({
    country: selectedCountry,
    regionId: null,
  })
  const countryCounts = countActorsByLayer(countryActors)
  const countryForestReserveCount = countForestReservesForScope({
    country: selectedCountry,
    regionId: null,
  })
  const countryRegions =
    selectedCountry === "All"
      ? []
      : marketRegions.filter((region) => region.country === selectedCountry)
  const selectedRegion = selectedRegionId
    ? countryRegions.find((region) => region.id === selectedRegionId) ?? null
    : null
  const regionActors = selectedRegion
    ? getActorsForScope({
        country: selectedRegion.country,
        regionId: selectedRegion.id,
      })
    : []
  const regionCounts = countActorsByLayer(regionActors)
  const regionForestReserveCount = selectedRegion
    ? countForestReservesForScope({
        country: selectedRegion.country,
        regionId: selectedRegion.id,
      })
    : 0
  const summaryScope: MarketAnalyticsScope = selectedRegion
    ? { country: selectedRegion.country, regionId: selectedRegion.id }
    : { country: selectedCountry, regionId: null }
  const summaryActors = getActorsForScope(summaryScope)
  const forestCover = getForestCoverSummary(summaryScope)
  const avgSeedlingPrice = getAverageSeedlingPrice(summaryActors)
  const avgG1RoundwoodPrice = getAverageG1RoundwoodPrice(summaryActors)
  const commercialSpeciesAreas = getCommercialSpeciesSummary(summaryActors)
  const countryFlagClass = countryFlagClasses[selectedCountry]
  const countryMetricCards = isWoodMarkets
    ? [
        {
          icon: Building2,
          label: "Processors",
          value: String(countryCounts.processor),
          color: marketActorLayerMeta.processor.color,
        },
      ]
    : [
    {
      icon: Leaf,
      label: "Nurseries",
      value: String(countryCounts.nursery),
      color: marketActorLayerMeta.nursery.color,
    },
    {
      icon: FlaskConical,
      label: "Trial sites",
      value: String(countryCounts.trialSite),
      color: marketActorLayerMeta.trialSite.color,
    },
    {
      icon: Building2,
      label: "Processors",
      value: String(countryCounts.processor),
      color: marketActorLayerMeta.processor.color,
    },
    {
      icon: Trees,
      label: "Large commercial forests",
      value: String(countryCounts.commercialForest),
      color: marketActorLayerMeta.commercialForest.color,
    },
    {
      icon: ShieldCheck,
      label: "Forest reserves",
      value: String(countryForestReserveCount),
      color: marketActorLayerMeta.forestReserve.color,
    },
  ]
  const regionMetricCards = isWoodMarkets
    ? [
        {
          icon: Building2,
          label: "Processors",
          value: String(regionCounts.processor),
          color: marketActorLayerMeta.processor.color,
        },
      ]
    : [
    {
      icon: Leaf,
      label: "Nurseries",
      value: String(regionCounts.nursery),
      color: marketActorLayerMeta.nursery.color,
    },
    {
      icon: FlaskConical,
      label: "Trial sites",
      value: String(regionCounts.trialSite),
      color: marketActorLayerMeta.trialSite.color,
    },
    {
      icon: Building2,
      label: "Processors",
      value: String(regionCounts.processor),
      color: marketActorLayerMeta.processor.color,
    },
    {
      icon: Trees,
      label: "Large commercial forests",
      value: String(regionCounts.commercialForest),
      color: marketActorLayerMeta.commercialForest.color,
    },
    {
      icon: ShieldCheck,
      label: "Forest reserves",
      value: String(regionForestReserveCount),
      color: marketActorLayerMeta.forestReserve.color,
    },
  ]
  const summaryMetricCards = isWoodMarkets
    ? [
        {
          icon: Route,
          label: "Avg. G1 roundwood",
          value: formatUgxPrice(avgG1RoundwoodPrice.value),
          color: marketActorLayerMeta.processor.color,
          note: formatRecordCoverage(
            avgG1RoundwoodPrice.pricedCount,
            avgG1RoundwoodPrice.totalCount,
            "processor records include G1 UGX/t",
            "No processor records in this scope"
          ),
        },
      ]
    : [
    {
      icon: CircleDollarSign,
      label: "Avg. seedling price",
      value: formatSeedlingPrice(avgSeedlingPrice.value),
      color: marketActorLayerMeta.nursery.color,
      note: formatRecordCoverage(
        avgSeedlingPrice.pricedCount,
        avgSeedlingPrice.totalCount,
        "nursery records include price",
        "No nursery records in this scope"
      ),
    },
    {
      icon: Route,
      label: "Avg. G1 roundwood",
      value: formatUgxPrice(avgG1RoundwoodPrice.value),
      color: marketActorLayerMeta.processor.color,
      note: formatRecordCoverage(
        avgG1RoundwoodPrice.pricedCount,
        avgG1RoundwoodPrice.totalCount,
        "processor records include G1 UGX/t",
        "No processor records in this scope"
      ),
    },
    {
      icon: Trees,
      label: "Forest cover area",
      value:
        forestCover.totalForestCoverHa > 0
          ? formatArea(forestCover.totalForestCoverHa)
          : "Not recorded",
      color: marketActorLayerMeta.commercialForest.color,
      note:
        `CFR footprints: ${formatArea(forestCover.forestReserveHa)}. ` +
        `Large commercial forests: ${formatArea(forestCover.commercialForestHa)} ` +
        `(${forestCover.commercialForestAreaCount} of ${forestCover.commercialForestTotalCount} records).`,
    },
  ]

  return (
    <section
      className={cn(
        "roundwood-analysis-shell flag-row space-y-4 rounded-[28px] border bg-background/70 p-4 backdrop-blur-sm sm:p-5",
        selectedCountry !== "All" && countryFlagClass
      )}
    >
      <div className="rounded-[24px] border-0 bg-background/75 p-4">
        <Select value={selectedCountry} onValueChange={(value) => onCountryChange(value as MarketCountryFilter)}>
          <SelectTrigger className="group h-auto w-full max-w-[420px] rounded-[24px] border-0 bg-card p-4 text-left shadow-sm dark:bg-card" aria-label="Country overview">
            <div className="min-w-0 py-1">
              <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <MapPinned className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate">{selectedCountry} overview</span>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {marketCountryFilters.map((country) => (
              <SelectItem key={country} value={country}>{country} overview</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className={cn("mt-4 grid gap-3", isWoodMarkets ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3")}>
          {countryMetricCards.map((metric) => (
            <MetricPanel key={metric.label} {...metric} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="roundwood-analysis-subcard space-y-4 rounded-[24px] border bg-background/75 p-4">
          <Select
            value={selectedRegionId ?? "all"}
            onValueChange={(value) => onRegionChange(value === "all" ? "" : value)}
            disabled={selectedCountry === "All"}
          >
            <SelectTrigger className="group h-auto w-full max-w-[420px] rounded-[24px] border-0 bg-card p-4 text-left shadow-sm dark:bg-card" aria-label="Regional overview">
              <div className="min-w-0 py-1">
                <div className="truncate text-xl font-semibold text-foreground">
                  {selectedRegion?.name ?? "All regions"}
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {countryRegions.map((region) => (
                <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCountry === "All" ? (
            <div className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
              Select Uganda, Kenya, or Tanzania to inspect regional analytics.
            </div>
          ) : selectedRegion ? (
            <>
              <div className={cn("grid gap-3", isWoodMarkets ? "grid-cols-1" : "sm:grid-cols-2")}>
                {regionMetricCards.map((metric) => (
                  <MetricPanel key={metric.label} {...metric} />
                ))}
              </div>
            </>
          ) : !isWoodMarkets ? (
            <div className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
              Select a region to view its summary.
            </div>
          ) : null}
        </div>

        <div className="roundwood-analysis-subcard space-y-4 rounded-[24px] border bg-background/75 p-4">
          <div className={cn("grid gap-3", isWoodMarkets ? "grid-cols-1" : "sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3")}>
            {summaryMetricCards.map((metric) => (
              <MetricPanel key={metric.label} {...metric} className={isWoodMarkets ? "p-6" : undefined} />
            ))}
          </div>
          {!isWoodMarkets ? (
            <SpeciesDataNotice
              speciesAreas={commercialSpeciesAreas}
              commercialForestAreaCount={forestCover.commercialForestAreaCount}
              commercialForestTotalCount={forestCover.commercialForestTotalCount}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function RoundwoodShopBase({
  variant,
  summaryDisclosure = false,
}: {
  variant: "sector" | "wood-markets"
  summaryDisclosure?: boolean
}) {
  const isWoodMarkets = variant === "wood-markets"
  const visibleActorLayers = useMemo<MarketActorLayer[]>(
    () => (isWoodMarkets ? ["processor"] : actorLayerOrder),
    [isWoodMarkets]
  )
  const visibleNearestFeatureLayers = useMemo<NearestFeatureLayer[]>(
    () => (isWoodMarkets ? ["processor"] : nearestFeatureLayers),
    [isWoodMarkets]
  )
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [clickedPoint, setClickedPoint] = useState<SelectedPoint | null>(null)
  const [isTableOpen, setIsTableOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] =
    useState<MarketCountryFilter>("Uganda")
  const eoLayerName = eoLayerNameForScope(selectedCountry)
  const layerGroupOptions = useMemo(
    () => isWoodMarkets
      ? [marketActorLayerMeta.processor.label]
      : [
          "Regional boundaries",
          ...actorLayerOrder
            .filter((layer) => layer !== "forestReserve")
            .map((layer) => marketActorLayerMeta[layer].label),
          eoLayerName,
        ],
    [eoLayerName, isWoodMarkets]
  )
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    null
  )
  const [nearestFeatures, setNearestFeatures] = useState<NearestFeatureGroups>(
    () => createEmptyNearestFeatureGroups()
  )
  const [isRouting, setIsRouting] = useState(false)
  const [showRoadAnalysis, setShowRoadAnalysis] = useState(false)
  const [mapHeight, setMapHeight] = useState(680)
  const [isSummaryPinned, setIsSummaryPinned] = useState(false)
  const [isMapLive, setIsMapLive] = useState(!summaryDisclosure)
  const [scopeFocusVersion, setScopeFocusVersion] = useState(0)
  const [activeLayerGroups, setActiveLayerGroups] = useState<string[]>([])
  const [selectedProcessorCategory, setSelectedProcessorCategory] = useState<
    MarketProcessorCategory | "all"
  >("all")
  const [selectedProcessorSpecies, setSelectedProcessorSpecies] =
    useState<string>("all")
  const [selectedDiameterFilter, setSelectedDiameterFilter] =
    useState<DiameterFilter>("all")
  const ssmtController = useBasicSsmtLayerController(false)
  const regionAnalytics = useMemo(() => getRegionAnalytics(), [])

  useEffect(() => {
    setActiveLayerGroups((groups) => groups.filter((group) => layerGroupOptions.includes(group)))
  }, [layerGroupOptions])

  const mapScope = useMemo<MarketAnalyticsScope>(
    () => ({
      country: selectedCountry,
      regionId: isWoodMarkets ? null : selectedRegionId,
    }),
    [isWoodMarkets, selectedCountry, selectedRegionId]
  )
  const scopedActors = useMemo(
    () => getActorsForScope(mapScope),
    [mapScope]
  )
  const processorCategoryOptions = useMemo(
    () =>
      processorCategoryOrder.filter((category) =>
        scopedActors.some(
          (actor) =>
            actor.layer === "processor" &&
            actor.processorProfile?.categories.includes(category)
        )
      ),
    [scopedActors]
  )
  const processorSpeciesOptions = useMemo(
    () =>
      Array.from(
        new Set(
          scopedActors.flatMap((actor) =>
            actor.layer === "processor"
              ? actor.processorProfile?.species ?? []
              : []
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [scopedActors]
  )
  const filteredProcessorIds = useMemo(() => {
    if (!isWoodMarkets) return null

    return new Set(
      scopedActors
        .filter((actor) => actor.layer === "processor")
        .filter((actor) => {
          const profile = actor.processorProfile
          if (!profile) return false
          const categoryMatch =
            selectedProcessorCategory === "all" ||
            profile.categories.includes(selectedProcessorCategory)
          const speciesMatch =
            selectedProcessorSpecies === "all" ||
            profile.species.includes(selectedProcessorSpecies)
          const diameterMatch =
            selectedDiameterFilter === "all" ||
            toDiameterBand(profile.minDiameterCm) === selectedDiameterFilter

          return categoryMatch && speciesMatch && diameterMatch
        })
        .map((actor) => actor.id)
    )
  }, [
    isWoodMarkets,
    scopedActors,
    selectedProcessorCategory,
    selectedProcessorSpecies,
    selectedDiameterFilter,
  ])
  const visibleScopeActors = useMemo(() => {
    if (!isWoodMarkets || !filteredProcessorIds) return scopedActors
    return scopedActors.filter(
      (actor) => actor.layer !== "processor" || filteredProcessorIds.has(actor.id)
    )
  }, [filteredProcessorIds, isWoodMarkets, scopedActors])
  const actorGroups = useMemo(
    () =>
      actorLayerOrder.reduce<Record<MarketActorLayer, MarketActor[]>>((groups, layer) => {
        groups[layer] = visibleScopeActors.filter((actor) => actor.layer === layer)
        return groups
      }, {} as Record<MarketActorLayer, MarketActor[]>),
    [visibleScopeActors]
  )
  const scopedRegions = useMemo(
    () =>
      selectedRegionId
        ? regionAnalytics.filter((region) => region.id === selectedRegionId)
        : selectedCountry === "All"
          ? regionAnalytics
          : regionAnalytics.filter((region) => region.country === selectedCountry),
    [regionAnalytics, selectedCountry, selectedRegionId]
  )
  const scopedForestReserves = useMemo(
    () => getForestReservesForScope(mapScope),
    [mapScope]
  )
  const selectedActor =
    marketActors.find((actor) => actor.id === selectedActorId) ?? null
  const selectedPoint: SelectedPoint | null = selectedActor
    ? {
        latitude: selectedActor.latitude,
        longitude: selectedActor.longitude,
        label: selectedActor.name,
      }
    : clickedPoint
  const selectedPointKey = selectedPoint
    ? `${selectedPoint.latitude}:${selectedPoint.longitude}:${selectedActor?.id ?? "clicked"}`
    : ""

  useEffect(() => {
    if (selectedCountry === "All") {
      setSelectedRegionId(null)
      return
    }

    const countryRegions = marketRegions.filter(
      (region) => region.country === selectedCountry
    )
    if (
      selectedRegionId !== null &&
      !countryRegions.some((region) => region.id === selectedRegionId)
    ) {
      setSelectedRegionId(countryRegions[0]?.id ?? null)
    }
  }, [selectedCountry, selectedRegionId])

  useEffect(() => {
    if (!selectedPoint) {
      setNearestFeatures(createEmptyNearestFeatureGroups())
      setIsRouting(false)
      return
    }

    setShowRoadAnalysis(true)
    const estimatedFeatures = getEstimatedNearestFeatureGroups(
      selectedPoint,
      selectedActor,
      visibleNearestFeatureLayers
    )
    const controller = new AbortController()

    setNearestFeatures(estimatedFeatures)
    setIsRouting(true)

    getNearestFeatureGroupsByRoad(
      selectedPoint,
      selectedActor,
      controller.signal,
      visibleNearestFeatureLayers
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
  }, [selectedPointKey, visibleNearestFeatureLayers])

  useEffect(() => {
    if (selectedActor && !visibleScopeActors.some((actor) => actor.id === selectedActor.id)) {
      setSelectedActorId(null)
      setIsTableOpen(false)
    }
  }, [visibleScopeActors, selectedActor])

  const maxRegionCount = Math.max(...regionAnalytics.map((region) => region.count), 1)
  const nearestHighlights = useMemo(
    () => {
      if (!showRoadAnalysis) return {}

      return visibleNearestFeatureLayers.reduce<Record<string, NearestHighlight>>((highlights, layer) => {
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
    },
    [nearestFeatures, showRoadAnalysis, visibleNearestFeatureLayers]
  )

  const focusActor = (actorId: string) => {
    setSelectedActorId(actorId)
    setClickedPoint(null)
    setIsTableOpen(true)
  }

  const changeCountry = (country: MarketCountryFilter) => {
    const nextEoLayerName = eoLayerNameForScope(country)
    setActiveLayerGroups((groups) =>
      groups.includes(eoLayerName)
        ? [...groups.filter((group) => group !== eoLayerName), nextEoLayerName]
        : groups
    )
    setSelectedCountry(country)
    setSelectedRegionId(
      isWoodMarkets || country === "All"
        ? null
        : marketRegions.find((region) => region.country === country)?.id ?? null
    )
    setScopeFocusVersion((version) => version + 1)
  }

  const changeRegion = (regionId: string) => {
    setSelectedRegionId(regionId || null)
    setScopeFocusVersion((version) => version + 1)
  }

  const summaryExpanded = !summaryDisclosure || (isMapLive && isSummaryPinned)

  const toggleMapLive = () => {
    setIsMapLive((isLive) => {
      if (!isLive) setIsSummaryPinned(true)
      return !isLive
    })
  }

  return (
    <div className={summaryDisclosure ? "space-y-0" : "space-y-8"}>
      <section className="space-y-4">
        {isWoodMarkets ? (
          <MarketMapControls
            selectedCountry={selectedCountry}
            selectedRegionId={selectedRegionId}
            selectedPoint={selectedPoint}
            showRoadAnalysis={showRoadAnalysis}
            activeLayerGroups={activeLayerGroups}
            layerGroups={layerGroupOptions}
            ssmtController={ssmtController}
            showSsmt={false}
            showRegionFocus={false}
            showOverlayToggle={false}
            processorCategoryOptions={processorCategoryOptions}
            selectedProcessorCategory={selectedProcessorCategory}
            onProcessorCategoryChange={setSelectedProcessorCategory}
            speciesOptions={processorSpeciesOptions}
            selectedProcessorSpecies={selectedProcessorSpecies}
            onProcessorSpeciesChange={setSelectedProcessorSpecies}
            selectedDiameterFilter={selectedDiameterFilter}
            onDiameterFilterChange={setSelectedDiameterFilter}
            onCountryChange={changeCountry}
            onRegionChange={changeRegion}
            onRoadAnalysisChange={setShowRoadAnalysis}
            onLayerGroupsChange={setActiveLayerGroups}
          />
        ) : null}

        <div className="sector-map-stage relative overflow-hidden rounded-none border bg-background">
          <div
            className={cn(
              "sector-map-canvas transition-[filter,opacity] duration-700 ease-out",
              !isMapLive && "pointer-events-none brightness-[.38] saturate-[.72]"
            )}
            inert={!isMapLive}
          >
            <Map
              center={[-2.2, 34.7]}
              zoom={6}
              maxZoom={18}
              className="w-full rounded-none"
              style={{ height: mapHeight }}
            >
            <MapLayers
              defaultTileLayer={marketTileLayers[0].name}
              defaultLayerGroups={[]}
              activeLayerGroups={activeLayerGroups}
              onActiveLayerGroupsChange={setActiveLayerGroups}
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

              <MarketScopeFocus
                country={selectedCountry}
                regionId={selectedRegionId}
                version={scopeFocusVersion}
              />
              <MapResizeInvalidator />
              {!isWoodMarkets ? <BasicSsmtLayerControl position="left-15 top-3" initialEnabled={false} /> : null}

              {!isWoodMarkets ? (
                <RegionalBoundariesLayer regions={scopedRegions} maxCount={maxRegionCount} />
              ) : null}

              {visibleActorLayers.map((layer) => (
                <ActorLayerGroup
                  key={layer}
                  layer={layer}
                  actors={actorGroups[layer]}
                  forestReserves={scopedForestReserves}
                  reserveLayerName={eoLayerName}
                  selectedActorId={selectedActorId}
                  nearestHighlights={nearestHighlights}
                  onSelectActor={focusActor}
                />
              ))}

              {selectedPoint ? (
                <>
                  {!selectedActor ? <ClickPointMarker point={selectedPoint} /> : null}
                  {showRoadAnalysis ? (
                    <NearestFeatureRoutes
                      nearestFeatures={nearestFeatures}
                      layers={visibleNearestFeatureLayers}
                      selectedActorId={selectedActorId}
                      onSelectActor={focusActor}
                    />
                  ) : null}
                </>
              ) : null}

              <MarketMapClickHandler
                onSelectPoint={(point) => {
                  setClickedPoint(point)
                  setSelectedActorId(null)
                  setIsTableOpen(true)
                }}
              />
              <MapZoomControl position="top-3 left-3" />
              {!isWoodMarkets ? (
                <MapLayersControl
                  position="right-3 top-3"
                  tileLayersLabel="Base map"
                  layerGroupsLabel="Map overlays"
                />
              ) : null}
              <MapControlContainer className="right-16 top-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={showRoadAnalysis ? "default" : "secondary"}
                    className="border shadow-sm"
                    aria-pressed={showRoadAnalysis}
                    aria-label={showRoadAnalysis ? "Hide road analysis" : "Show road analysis"}
                    title={showRoadAnalysis ? "Hide road analysis" : "Show road analysis"}
                    disabled={!selectedPoint}
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
                    disabled={!selectedPoint}
                    onClick={() => setIsTableOpen((value) => !value)}
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                </div>
              </MapControlContainer>

              {selectedPoint && isTableOpen ? (
                <MapSideTable
                  selectedActor={selectedActor}
                  selectedPoint={selectedPoint}
                  nearestFeatures={nearestFeatures}
                  isRouting={isRouting}
                  showRoadAnalysis={showRoadAnalysis}
                  layers={visibleNearestFeatureLayers}
                  onClose={() => setIsTableOpen(false)}
                />
              ) : null}
            </MapLayers>
            </Map>
            {!summaryDisclosure ? <MapResizeHandle height={mapHeight} onHeightChange={setMapHeight} /> : null}
          </div>

          {!isWoodMarkets ? (
            <>
              <div
                aria-hidden={isMapLive}
                className={cn(
                  "pointer-events-none absolute inset-0 z-[900] flex flex-col justify-between bg-gradient-to-br from-[#07110c]/82 via-[#07110c]/42 to-black/20 p-6 text-white transition-opacity duration-500 sm:p-9 lg:p-12",
                  isMapLive ? "opacity-0" : "opacity-100"
                )}
              >
                <div className="flex items-center justify-between gap-6 text-xs font-semibold uppercase tracking-[.22em] text-white/70">
                  <span>Explore the ecosystem</span>
                  <MapPinned className="size-7 text-emerald-200 sm:size-8" />
                </div>
                <div>
                  <h2 className="landing-display-title text-white">Map of the Sector</h2>
                  <p className="mt-7 max-w-2xl border-t border-white/35 pt-5 text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
                    Explore the people, assets and market activity behind the region&apos;s forestry value chain.
                  </p>
                </div>
              </div>

              {!isMapLive ? (
                <button
                  type="button"
                  onClick={toggleMapLive}
                  className="absolute inset-0 z-[1050] flex items-center justify-center px-6 text-center text-white sm:hidden [@media_(orientation:landscape)]:hidden"
                  aria-label="Activate sector map"
                >
                  <span className="flex max-w-xs flex-col items-center gap-3 rounded-lg border border-white/20 bg-[#07110c]/78 px-5 py-4 text-sm font-medium shadow-xl backdrop-blur-md">
                    <RotateCw className="size-6 text-emerald-300" />
                    Rotate your phone for more map space, then tap to explore
                  </span>
                </button>
              ) : null}

              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={toggleMapLive}
                aria-label={isMapLive ? "Pause sector map" : "Play sector map"}
                aria-pressed={isMapLive}
                className={cn(
                  "sector-map-play absolute left-1/2 top-4 z-[1100] size-14 -translate-x-1/2 rounded-full border border-emerald-200/55 bg-[#07110c]/78 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,.38)] backdrop-blur-md transition-all duration-300 hover:bg-emerald-400 hover:text-emerald-950 hover:shadow-[0_0_32px_rgba(52,211,153,.5)]",
                  isMapLive && "size-11 shadow-[0_0_14px_rgba(52,211,153,.24)]"
                )}
              >
                {isMapLive ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
              </Button>
            </>
          ) : null}
        </div>
      </section>

      {summaryDisclosure ? (
        <section className="border-x border-b border-white/10 bg-[#07110c]">
          <div
            id="sector-map-summary"
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
              summaryExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="sector-summary-flat px-3 pb-6 sm:px-5 sm:pb-8">
                <MarketAnalysis
                  selectedCountry={selectedCountry}
                  selectedRegionId={selectedRegionId}
                  onCountryChange={changeCountry}
                  onRegionChange={changeRegion}
                  variant={variant}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <MarketAnalysis
          selectedCountry={selectedCountry}
          selectedRegionId={selectedRegionId}
          onCountryChange={changeCountry}
          onRegionChange={changeRegion}
          variant={variant}
        />
      )}
    </div>
  )
}

export function SectorMapExperience() {
  return <RoundwoodShopBase variant="sector" summaryDisclosure />
}

export function RoundwoodShop() {
  return <RoundwoodShopBase variant="sector" />
}

export function WoodMarketsMap() {
  return <RoundwoodShopBase variant="wood-markets" />
}
