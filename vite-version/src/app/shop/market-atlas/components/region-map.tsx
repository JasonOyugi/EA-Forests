import { useEffect, useMemo } from "react"
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
  useEffect(() => {
    if (!target) return
    map.flyTo(target.center, target.zoom, { duration: 0.6 })
  }, [map, target])
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
  hoveredActorId: string | null
  onActorHover: (actorId: string | null) => void
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
  hoveredActorId,
  onActorHover,
}: RegionMapProps) {
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

  const view = selectedRegion
    ? { center: selectedRegion.center, zoom: 9 }
    : COUNTRY_VIEW[country] ?? DEFAULT_VIEW

  return (
    // Explicit height (matching the previous 680px sector map): the Map primitive defaults to
    // `size-full`, which inside a stretched grid item resolves against the shell's own height and
    // grows with it, overflowing the region table out of the section.
    <LeafletMap center={view.center} zoom={view.zoom} className="h-auto min-h-0 w-full" style={{ height: MAP_HEIGHT }}>
      <MapViewController target={view} />
      <BasemapLayers />
      <MapZoomControl />

      {regions.map((region) => {
        const isSelected = region.id === selectedRegionId
        const count = regionActorCounts.get(region.id) ?? 0
        const intensity = 0.18 + 0.55 * (count / maxCount)
        if (selectedRegionId && !isSelected) return null

        return (
          <MapPolygon
            key={region.id}
            positions={boundaryToLatLngs(region)}
            pathOptions={{
              color: "var(--market-accent)",
              weight: isSelected ? 2.5 : 1,
              fillColor: "var(--market-accent)",
              fillOpacity: isSelected ? 0.12 : intensity * 0.4,
            }}
            eventHandlers={{
              click: () => onRegionSelect(isSelected ? null : region.id),
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

      {selectedRegionId && (
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
                  click: () => onActorSelect(actor.id),
                  mouseover: () => onActorHover(actor.id),
                  mouseout: () => onActorHover(null),
                }}
              />
            )
          })}
        </MapMarkerClusterGroup>
      )}
    </LeafletMap>
  )
}
