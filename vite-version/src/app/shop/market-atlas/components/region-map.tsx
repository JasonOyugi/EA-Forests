import { useEffect, useMemo, useState } from "react"
import { Route } from "lucide-react"
import { useMap } from "react-leaflet"
import {
  Map as LeafletMap,
  MapMarker,
  MapMarkerClusterGroup,
  MapPolygon,
  MapTooltip,
  MapZoomControl,
} from "@/components/ui/map"
import { BasemapLayers } from "@/components/map/basemap-layers"
import { getRegionBoundaries, type MarketCountry, type MarketRegion } from "../../data/market-map"
import type { Actor, ActorMode } from "../types"
import type { MarketConfig } from "../market-config"
import { ActorMapLayer } from "./actor-map-layer"
import { RoadAnalysisLayer } from "./road-analysis-layer"

const COUNTRY_VIEW: Record<MarketCountry, { center: [number, number]; zoom: number }> = {
  Kenya: { center: [0.5, 37.9], zoom: 6 },
  Uganda: { center: [1.5, 32.3], zoom: 7 },
  Tanzania: { center: [-6.5, 35], zoom: 6 },
}
const MAP_HEIGHT = "min(680px, 78svh)"
const DEFAULT_VIEW = { center: [-2.2, 34.7] as [number, number], zoom: 5 }

function boundaryToLatLngs(region: MarketRegion) {
  return getRegionBoundaries(region).map((ring) => ring.map(([lat, lng]) => [lat, lng] as [number, number]))
}

function regionCountByMode(actors: Actor[], regionId: string, mode: ActorMode) {
  return actors.filter((actor) => actor.regionId === regionId && actor.modes.includes(mode)).length
}

function MapViewController({ target }: { target: { center: [number, number]; zoom: number } | null }) {
  const map = useMap()
  const lat = target?.center[0]
  const lng = target?.center[1]
  const zoom = target?.zoom
  useEffect(() => {
    if (lat == null || lng == null || zoom == null) return
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    map.flyTo([lat, lng], zoom, { animate: !reducedMotion, duration: 0.6 })
  }, [map, lat, lng, zoom])
  return null
}

interface RegionMapProps {
  market: MarketConfig
  country: MarketCountry
  regions: MarketRegion[]
  actorsByMode: Partial<Record<ActorMode, Actor[]>>
  activeMode: ActorMode
  selectedRegionId: string | null
  onRegionSelect: (regionId: string | null) => void
  selectedActorId: string | null
  onActorSelect: (actorId: string | null) => void
  onMapActorClick: (actorIds: string[]) => void
  hoveredActorId: string | null
  onActorHover: (actorId: string | null) => void
  view: "regional" | "actors"
  countryActors: Actor[]
}

export function RegionMap({
  market,
  country,
  regions,
  actorsByMode,
  activeMode,
  selectedRegionId,
  onRegionSelect,
  selectedActorId,
  onActorSelect,
  onMapActorClick,
  hoveredActorId,
  onActorHover,
  view,
  countryActors,
}: RegionMapProps) {
  const [roadMode, setRoadMode] = useState(false)
  const [hasRoadPoint, setHasRoadPoint] = useState(false)
  useEffect(() => { setRoadMode(false); setHasRoadPoint(false) }, [country, activeMode])
  const activeActors = actorsByMode[activeMode] ?? []

  const regionActorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const actor of activeActors) {
      if (!actor.regionId) continue
      counts.set(actor.regionId, (counts.get(actor.regionId) ?? 0) + 1)
    }
    return counts
  }, [activeActors])

  const maxCount = Math.max(1, ...regionActorCounts.values())

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? null

  const pointActors = useMemo(() => {
    if (!selectedRegionId) return []
    return activeActors.filter(
      (actor) =>
        actor.regionId === selectedRegionId &&
        actor.locations.some((location) => location.latitude != null && location.longitude != null)
    )
  }, [activeActors, selectedRegionId])

  const mapView = view === "regional" && selectedRegion
    ? { center: selectedRegion.center, zoom: 9 }
    : COUNTRY_VIEW[country] ?? DEFAULT_VIEW

  return (
    // Explicit height (matching the previous 680px sector map): the Map primitive defaults to
    // `size-full`, which inside a stretched grid item resolves against the shell's own height and
    // grows with it, overflowing the region table out of the section.
    <div className="relative">
    <LeafletMap center={mapView.center} zoom={mapView.zoom} className="h-auto min-h-0 w-full" style={{ height: MAP_HEIGHT }}>
      <MapViewController target={mapView} />
      <BasemapLayers />
      <MapZoomControl />
      <RoadAnalysisLayer key={country} country={country} enabled={roadMode} onActorSelect={(id) => onActorSelect(id)} onPointChange={setHasRoadPoint} />

      {view === "regional" && regions.map((region) => {
        const isSelected = region.id === selectedRegionId
        const count = regionActorCounts.get(region.id) ?? 0
        const intensity = 0.18 + 0.55 * (count / maxCount)
        if (selectedRegionId && !isSelected) return null

        return (
          <MapPolygon
            key={`${region.id}-${roadMode}`}
            positions={boundaryToLatLngs(region)}
            pathOptions={{
              color: "var(--market-accent)",
              weight: isSelected ? 2.5 : 1,
              fillColor: "var(--market-accent)",
              fillOpacity: isSelected ? 0.12 : intensity * 0.4,
              interactive: !roadMode,
            }}
            eventHandlers={{
              click: () => { if (!roadMode) onRegionSelect(isSelected ? null : region.id) },
            }}
          >
            <MapTooltip sticky>
              <div className="space-y-1 text-xs">
                <p className="font-semibold">{region.name}</p>
                {market.subModes.map((subMode) => (
                  <p key={subMode.mode} className="text-muted-foreground">
                    {regionCountByMode(actorsByMode[subMode.mode] ?? [], region.id, subMode.mode)} {subMode.label.toLowerCase()}
                  </p>
                ))}
              </div>
            </MapTooltip>
          </MapPolygon>
        )
      })}

      {view === "regional" && selectedRegionId && !roadMode && (
        <MapMarkerClusterGroup
          icon={(count) => (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--market-accent)] bg-[var(--market-canvas)] text-xs font-semibold text-[var(--market-accent)]">
              {count}
            </div>
          )}
        >
          {pointActors.map((actor) => {
            const location = actor.locations.find((loc) => loc.latitude != null && loc.longitude != null)
            if (!location?.latitude || !location.longitude) return null
            const isActive = actor.id === selectedActorId || actor.id === hoveredActorId
            const shade = `var(--market-marker-${(actor.evidenceClass ?? "d").toLowerCase()})`

            return (
              <MapMarker
                key={actor.id}
                position={[location.latitude, location.longitude]}
                icon={
                  <div
                    className="size-4 rounded-full border-2 border-[var(--market-canvas)]"
                    style={{ backgroundColor: shade, outline: isActive ? "2px solid var(--market-accent)" : undefined }}
                  />
                }
                eventHandlers={{
                  click: () => onMapActorClick([actor.id]),
                  mouseover: () => onActorHover(actor.id),
                  mouseout: () => onActorHover(null),
                }}
              />
            )
          })}
        </MapMarkerClusterGroup>
      )}
      {view === "actors" && !roadMode && <ActorMapLayer actors={countryActors} mode={activeMode} selectedActorId={selectedActorId} hoveredActorId={hoveredActorId} onActorSelect={onMapActorClick} onActorHover={onActorHover} />}
    </LeafletMap>
    <div className="absolute right-14 top-3 z-[1000] flex max-w-[min(17rem,calc(100%-4.5rem))] flex-col items-end gap-2">
      <button type="button" aria-pressed={roadMode} aria-label={roadMode ? "Stop selecting road analysis points" : "Analyse road distance from a point"} title={roadMode ? "Stop selecting points" : "Analyse road distances"} onClick={() => setRoadMode((value) => !value)} className={`flex size-9 items-center justify-center rounded-md border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-accent)] ${roadMode ? "border-[var(--market-accent)] bg-[var(--market-accent)] text-[var(--market-canvas)]" : "bg-background text-foreground hover:bg-accent"}`}><Route className="size-4" /></button>
      {roadMode && !hasRoadPoint && <p role="status" className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-sm">Click a point to find the three nearest seedling and wood markets by road.</p>}
    </div>
    </div>
  )
}
