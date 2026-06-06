"use client"

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CircleDollarSign,
  FlaskConical,
  Leaf,
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
import { useMapEvents } from "react-leaflet"

import type { ShopDefinition, ShopItem } from "@/app/shop/types"
import {
  marketActorLayerMeta,
  marketActors,
  marketCountryFilters,
  marketRegions,
  marketTileLayers,
  regionalCommercialAnalytics,
  stakeholderAnalyticsLayers,
  type MarketCountry,
  type MarketCountryFilter,
  type MarketActor,
  type MarketActorLayer,
  type MarketRegion,
  type SpeciesCommercialArea,
} from "@/app/shop/data/market-map"
import { ugandaCfrs, type LatLngTuple } from "@/app/shop/data/generated-boundaries"
import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

interface RoundwoodShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
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
  topLayer: MarketActorLayer | null
}

type MarketAnalyticsScope = {
  country: MarketCountryFilter
  regionId: string | null
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

const countryFlagClasses: Record<MarketCountryFilter, string> = {
  Uganda: "flag-row-ug",
  Kenya: "flag-row-ke",
  Tanzania: "flag-row-tz",
  All: "",
}

const defaultMapLayerGroups = [
  "Regional boundaries",
  marketActorLayerMeta.processor.label,
  marketActorLayerMeta.nursery.label,
  marketActorLayerMeta.commercialForest.label,
  marketActorLayerMeta.forestReserve.label,
]

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
    : { label: "Map point", color: "#f97316" }
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
                "Nearest market actors are ranked from this selected point."}
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
                : [{ label: "Point", value: "User selected map location" }]),
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
              <ActorPopup
                actor={actor}
                onFocusActor={onSelectActor}
              />
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

function MetricPanel({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="roundwood-metric-card rounded-md border p-4"
      style={{ "--metric-color": color } as CSSProperties}
    >
      <div className="flex items-center gap-3">
        <span className="roundwood-metric-icon flex h-9 w-9 items-center justify-center rounded-md">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
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

function formatUsdPrice(value: number | null) {
  if (value == null) return "No price data"

  return `$${value.toFixed(2)} / seedling`
}

function formatUgxPrice(value: number | null) {
  if (value == null) return "No price data"

  return `UGX ${Math.round(value).toLocaleString()} / t`
}

function getCommercialRecords(scope: MarketAnalyticsScope) {
  if (scope.regionId) {
    return regionalCommercialAnalytics.filter((record) => record.regionId === scope.regionId)
  }
  if (scope.country === "All") {
    return regionalCommercialAnalytics
  }

  return regionalCommercialAnalytics.filter((record) => record.country === scope.country)
}

function getCommercialSummary(scope: MarketAnalyticsScope) {
  const records = getCommercialRecords(scope)
  const speciesByName = new globalThis.Map<string, SpeciesCommercialArea>()
  const totalCommercialHa = records.reduce(
    (sum, record) => sum + record.totalCommercialHa,
    0
  )

  records.forEach((record) => {
    record.species.forEach((species) => {
      const current = speciesByName.get(species.species)
      speciesByName.set(species.species, {
        species: species.species,
        hectares: (current?.hectares ?? 0) + species.hectares,
        color: species.color,
      })
    })
  })

  return {
    totalCommercialHa,
    species: [...speciesByName.values()].sort((a, b) => b.hectares - a.hectares),
  }
}

function getAverageSeedlingPrice(actors: MarketActor[]) {
  return average(
    actors
      .filter((actor) => actor.layer === "nursery" && actor.seedlingPriceUsd)
      .map((actor) => actor.seedlingPriceUsd ?? 0)
  )
}

function getAverageG1RoundwoodPrice(actors: MarketActor[]) {
  return average(
    actors
      .filter((actor) => actor.layer === "processor" && actor.g1RoundwoodPriceUgxPerTonne)
      .map((actor) => actor.g1RoundwoodPriceUgxPerTonne ?? 0)
  )
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

function SpeciesPie({
  species,
  totalCommercialHa,
}: {
  species: SpeciesCommercialArea[]
  totalCommercialHa: number
}) {
  let cursor = 0
  const gradient =
    totalCommercialHa > 0 && species.length > 0
      ? species
          .map((item) => {
            const start = cursor
            const end = cursor + (item.hectares / totalCommercialHa) * 100
            cursor = end
            return `${item.color} ${start}% ${end}%`
          })
          .join(", ")
      : "#e5e7eb 0% 100%"

  return (
    <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
      <div
        className="aspect-square rounded-full border shadow-inner"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="space-y-2">
        {species.map((item) => {
          const share = totalCommercialHa > 0 ? (item.hectares / totalCommercialHa) * 100 : 0

          return (
            <div key={item.species} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.species}</span>
              </span>
              <span className="text-right text-muted-foreground">
                {Math.round(item.hectares).toLocaleString()} ha ({share.toFixed(0)}%)
              </span>
            </div>
          )
        })}
        {species.length === 0 ? (
          <p className="text-sm text-muted-foreground">No species split recorded.</p>
        ) : null}
      </div>
    </div>
  )
}

function MarketAnalysis({
  selectedCountry,
  selectedRegionId,
  onCountryChange,
  onRegionChange,
}: {
  selectedCountry: MarketCountryFilter
  selectedRegionId: string | null
  onCountryChange: (country: MarketCountryFilter) => void
  onRegionChange: (regionId: string) => void
}) {
  const countryActors = getActorsForScope({
    country: selectedCountry,
    regionId: null,
  })
  const countryCounts = countActorsByLayer(countryActors)
  const totalCountryStakeholders = countryActors.length
  const countryForestReserveCount = countForestReservesForScope({
    country: selectedCountry,
    regionId: null,
  })
  const countryRegions =
    selectedCountry === "All"
      ? []
      : marketRegions.filter((region) => region.country === selectedCountry)
  const selectedRegion =
    countryRegions.find((region) => region.id === selectedRegionId) ?? countryRegions[0] ?? null
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
  const summaryCommercial = getCommercialSummary(summaryScope)
  const avgSeedlingPrice = getAverageSeedlingPrice(summaryActors)
  const avgG1RoundwoodPrice = getAverageG1RoundwoodPrice(summaryActors)
  const countryFlagClass = countryFlagClasses[selectedCountry]
  const countryMetricCards = [
    {
      icon: BarChart3,
      label: "Total stakeholders",
      value: String(totalCountryStakeholders),
      color: "#0891b2",
    },
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
      label: "Commercial forests",
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
  const regionMetricCards = [
    {
      icon: BarChart3,
      label: "Total stakeholders",
      value: String(regionActors.length),
      color: "#0891b2",
    },
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
      label: "Commercial forests",
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
  const summaryMetricCards = [
    {
      icon: CircleDollarSign,
      label: "Avg. seedling price",
      value: formatUsdPrice(avgSeedlingPrice),
      color: marketActorLayerMeta.nursery.color,
    },
    {
      icon: Route,
      label: "Avg. G1 roundwood",
      value: formatUgxPrice(avgG1RoundwoodPrice),
      color: marketActorLayerMeta.processor.color,
    },
    {
      icon: Trees,
      label: "Total commercial ha",
      value: `${Math.round(summaryCommercial.totalCommercialHa).toLocaleString()} ha`,
      color: marketActorLayerMeta.commercialForest.color,
    },
  ]

  return (
    <section
      className={cn(
        "roundwood-analysis-shell flag-row space-y-4 rounded-[28px] border bg-background/70 p-4 backdrop-blur-sm sm:p-5",
        selectedCountry !== "All" && countryFlagClass,
        selectedCountry !== "All" && "flag-row-active"
      )}
    >
      <div className="rounded-[24px] border-0 bg-background/75 p-4">
        <ToggleGroup
          options={marketCountryFilters.map((country) => ({
            value: country,
            label: country,
          }))}
          value={selectedCountry}
          onChange={onCountryChange}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {countryMetricCards.map((metric) => (
            <MetricPanel key={metric.label} {...metric} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="roundwood-analysis-subcard space-y-4 rounded-[24px] border bg-background/75 p-4">
          {selectedCountry === "All" ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Select Uganda, Kenya, or Tanzania to inspect regional analytics.
            </div>
          ) : (
            <>
              <ToggleGroup
                options={countryRegions.map((region) => ({
                  value: region.id,
                  label: region.name,
                }))}
                value={selectedRegion?.id ?? ""}
                onChange={onRegionChange}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {regionMetricCards.map((metric) => (
                  <MetricPanel key={metric.label} {...metric} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="roundwood-analysis-subcard space-y-4 rounded-[24px] border bg-background/75 p-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {summaryMetricCards.map((metric) => (
              <MetricPanel key={metric.label} {...metric} />
            ))}
          </div>
          <SpeciesPie
            species={summaryCommercial.species}
            totalCommercialHa={summaryCommercial.totalCommercialHa}
          />
        </div>
      </div>
    </section>
  )
}

export function RoundwoodShop({ shop, inventory }: RoundwoodShopProps) {
  const navigate = useNavigate()
  const fallbackItem = inventory[0]
  const firstProcessor = marketActors.find((actor) => actor.layer === "processor")
  const [selectedActorId, setSelectedActorId] = useState<string | null>(
    firstProcessor?.id ?? null
  )
  const [clickedPoint, setClickedPoint] = useState<SelectedPoint | null>(null)
  const [isTableOpen, setIsTableOpen] = useState(true)
  const [selectedCountry, setSelectedCountry] =
    useState<MarketCountryFilter>("Uganda")
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    marketRegions.find((region) => region.country === "Uganda")?.id ?? null
  )
  const [nearestFeatures, setNearestFeatures] = useState<NearestFeatureGroups>(
    () => createEmptyNearestFeatureGroups()
  )
  const [isRouting, setIsRouting] = useState(false)
  const [showRoadAnalysis, setShowRoadAnalysis] = useState(true)

  const actorGroups = useMemo(
    () =>
      actorLayerOrder.reduce<Record<MarketActorLayer, MarketActor[]>>((groups, layer) => {
        groups[layer] = marketActors.filter((actor) => actor.layer === layer)
        return groups
      }, {} as Record<MarketActorLayer, MarketActor[]>),
    []
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
    if (!countryRegions.some((region) => region.id === selectedRegionId)) {
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
  }, [selectedPointKey])

  const regionAnalytics = useMemo(() => getRegionAnalytics(), [])
  const maxRegionCount = Math.max(...regionAnalytics.map((region) => region.count), 1)
  const nearestHighlights = useMemo(
    () => {
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
    },
    [nearestFeatures, showRoadAnalysis]
  )

  const openMarket = () => {
    if (!fallbackItem) return
    navigate(`/shop/${shop.slug}/${fallbackItem.slug}`)
  }

  const focusActor = (actorId: string) => {
    setSelectedActorId(actorId)
    setClickedPoint(null)
    setIsTableOpen(true)
  }

  return (
    <div className="space-y-8">
      <ForestsLandTopBanner />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-800">
              <MapPinned className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Markets map</h2>
              <p className="text-sm text-muted-foreground">
                Sector actors, regional boundaries, CFR footprints, and processor road proximity.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedActorId(firstProcessor?.id ?? null)
                setClickedPoint(null)
                setIsTableOpen(true)
              }}
            >
              <Sprout className="h-4 w-4" />
              Reset view
            </Button>
            <Button onClick={openMarket}>
              Market listings
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border bg-background">
          <Map center={[-2.2, 34.7]} zoom={6} maxZoom={18} className="h-[680px] w-full rounded-none">
            <MapLayers
              defaultTileLayer={marketTileLayers[0].name}
              defaultLayerGroups={defaultMapLayerGroups}
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

              <RegionalBoundariesLayer regions={regionAnalytics} maxCount={maxRegionCount} />

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

              {selectedPoint ? (
                <>
                  {!selectedActor ? <ClickPointMarker point={selectedPoint} /> : null}
                  {showRoadAnalysis ? (
                    <NearestFeatureRoutes
                      nearestFeatures={nearestFeatures}
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
                    variant={showRoadAnalysis ? "default" : "secondary"}
                    className="border shadow-sm"
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
                  onClose={() => setIsTableOpen(false)}
                />
              ) : null}
            </MapLayers>
          </Map>
        </div>
      </section>

      <MarketAnalysis
        selectedCountry={selectedCountry}
        selectedRegionId={selectedRegionId}
        onCountryChange={setSelectedCountry}
        onRegionChange={setSelectedRegionId}
      />
    </div>
  )
}
