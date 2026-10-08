import { useEffect, useMemo, useState } from "react"
import { useMapEvents } from "react-leaflet"
import { MapCircleMarker, MapPolyline, MapTooltip } from "@/components/ui/map"
import { allActors } from "../data"
import type { Actor, ActorLocation } from "../types"

type Point = { latitude: number; longitude: number }
type Market = "seedlings" | "wood"
type Destination = { actor: Actor; location: ActorLocation; market: Market }
type RouteResult = Destination & { distanceKm: number; durationMin: number; geometry: [number, number][] | null; snapMeters: number | null }
type Results = Record<Market, RouteResult[]>
const OSRM = "https://router.project-osrm.org"
const coords = ({ latitude, longitude }: Point) => `${longitude},${latitude}`
const marketLabel: Record<Market, string> = { seedlings: "Seedling markets", wood: "Wood markets" }

function destinations(country: string): Destination[] {
  return allActors.flatMap((actor) => {
    if (actor.country !== country) return []
    return actor.locations
      .filter((location) => location.latitude != null && location.longitude != null)
      .flatMap((location) => (["seedlings", "wood"] as Market[])
        .filter((market) => actor.modes.includes(market))
        .map((market) => ({ actor, location, market })))
  })
}

async function distanceTable(origin: Point, items: Destination[], signal: AbortSignal) {
  const results: (Destination & { distanceKm: number; durationMin: number; snapMeters: number | null })[] = []
  const uniquePoints = new Map<string, Destination[]>()
  for (const item of items) {
    const key = `${item.location.latitude}|${item.location.longitude}`
    if (!uniquePoints.has(key)) uniquePoints.set(key, [])
    uniquePoints.get(key)!.push(item)
  }
  const locations = [...uniquePoints.values()]
  // Small matrices keep the public endpoint and URL length bounded. Every mapped actor is
  // considered, so the top three are selected by network distance, not a straight-line shortlist.
  for (let start = 0; start < locations.length; start += 35) {
    const chunk = locations.slice(start, start + 35)
    const positions = [coords(origin), ...chunk.map(([{ location }]) => coords({ latitude: location.latitude!, longitude: location.longitude! }))].join(";")
    const params = new URLSearchParams({ sources: "0", destinations: chunk.map((_, index) => index + 1).join(";"), annotations: "distance,duration" })
    const response = await fetch(`${OSRM}/table/v1/driving/${positions}?${params}`, { signal })
    if (!response.ok) throw new Error(`OSRM table returned ${response.status}`)
    const payload = await response.json() as { code?: string; distances?: (number | null)[][]; durations?: (number | null)[][]; destinations?: { distance?: number }[] }
    if (payload.code !== "Ok" || !payload.distances?.[0]) throw new Error("OSRM returned no distance table")
    chunk.forEach((group, index) => {
      const meters = payload.distances![0][index]
      const seconds = payload.durations?.[0]?.[index]
      if (meters == null || seconds == null) return
      for (const item of group) results.push({ ...item, distanceKm: meters / 1000, durationMin: seconds / 60, snapMeters: payload.destinations?.[index]?.distance ?? null })
    })
  }
  return results
}

async function routeGeometry(origin: Point, destination: Destination, signal: AbortSignal) {
  const location = destination.location
  const params = new URLSearchParams({ overview: "full", geometries: "geojson", alternatives: "false", steps: "false" })
  const response = await fetch(`${OSRM}/route/v1/driving/${coords(origin)};${coords({ latitude: location.latitude!, longitude: location.longitude! })}?${params}`, { signal })
  if (!response.ok) throw new Error(`OSRM route returned ${response.status}`)
  const payload = await response.json() as { routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[]; waypoints?: { distance?: number }[] }
  const route = payload.routes?.[0]
  if (!route?.geometry?.coordinates) throw new Error("OSRM returned no route geometry")
  return { geometry: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]), distanceKm: route.distance != null ? route.distance / 1000 : null, durationMin: route.duration != null ? route.duration / 60 : null, snapMeters: Math.max(payload.waypoints?.[0]?.distance ?? 0, payload.waypoints?.[1]?.distance ?? 0) }
}

export function RoadAnalysisLayer({ country, enabled, onActorSelect, onPointChange }: { country: string; enabled: boolean; onActorSelect: (id: string) => void; onPointChange: (hasPoint: boolean) => void }) {
  const [point, setPoint] = useState<Point | null>(null)
  const [results, setResults] = useState<Results>({ seedlings: [], wood: [] })
  const [status, setStatus] = useState<string | null>(null)
  const candidates = useMemo(() => destinations(country), [country])
  const map = useMapEvents({ click: (event) => { if (enabled) setPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng }) } })

  useEffect(() => { setPoint(null); setResults({ seedlings: [], wood: [] }); setStatus(null) }, [country])
  useEffect(() => { if (!enabled) { setPoint(null); setResults({ seedlings: [], wood: [] }); setStatus(null) } }, [enabled])
  useEffect(() => { onPointChange(Boolean(point)) }, [point, onPointChange])
  useEffect(() => {
    if (!point) return
    const traces = [...results.seedlings, ...results.wood].flatMap((result) => result.geometry ?? [])
    if (!traces.length) return
    let south = point.latitude, north = point.latitude, west = point.longitude, east = point.longitude
    for (const [latitude, longitude] of traces) {
      south = Math.min(south, latitude); north = Math.max(north, latitude)
      west = Math.min(west, longitude); east = Math.max(east, longitude)
    }
    const size = map.getSize()
    map.fitBounds([[south, west], [north, east]], {
      paddingTopLeft: [28, 28],
      paddingBottomRight: [Math.min(360, size.x * 0.36), Math.min(200, size.y * 0.3)],
      maxZoom: 10,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.65,
    })
  }, [map, point, results])
  useEffect(() => {
    if (!point) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30000)
    setResults({ seedlings: [], wood: [] })
    setStatus("Calculating road distances to mapped markets…")
    async function calculate() {
      try {
        const ranked = await distanceTable(point!, candidates, controller.signal)
        const top = (["seedlings", "wood"] as Market[]).flatMap((market) => {
          const closestByActor = new Map<string, (typeof ranked)[number]>()
          for (const item of ranked.filter((candidate) => candidate.market === market)) {
            const previous = closestByActor.get(item.actor.id)
            if (!previous || item.distanceKm < previous.distanceKm) closestByActor.set(item.actor.id, item)
          }
          return [...closestByActor.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3)
        })
        const routed = await Promise.all(top.map(async (item) => {
          const route = await routeGeometry(point!, item, controller.signal)
          return { ...item, geometry: route.geometry, distanceKm: route.distanceKm ?? item.distanceKm, durationMin: route.durationMin ?? item.durationMin, snapMeters: route.snapMeters ?? item.snapMeters }
        }))
        if (controller.signal.aborted) return
        setResults({ seedlings: routed.filter((item) => item.market === "seedlings"), wood: routed.filter((item) => item.market === "wood") })
        setStatus(routed.length ? null : "No mapped markets have a drivable route from this point.")
      } catch (error) {
        if (!controller.signal.aborted) setStatus(`Road analysis unavailable: ${error instanceof Error ? error.message : "request failed"}`)
        else setStatus("Road analysis timed out. Try another point.")
      } finally { window.clearTimeout(timeout) }
    }
    void calculate()
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [point, candidates])

  const visibleRoutes = (["wood", "seedlings"] as Market[]).flatMap((market) =>
    results[market].map((item, index) => ({ ...item, index })).filter((item) => item.geometry)
  )

  return <>
    {visibleRoutes.map((item) => <MapPolyline key={`${item.market}-${item.actor.id}-halo`} className="market-route-halo" positions={item.geometry!} pathOptions={{ weight: item.index === 0 ? 9 : 7, opacity: 0.95, interactive: false }} />)}
    {visibleRoutes.map((item) => <MapPolyline key={`${item.market}-${item.actor.id}`} className={`${item.market === "seedlings" ? "market-route-seedlings" : "market-route-wood"} ${item.index === 0 ? "market-route-primary" : ""}`} positions={item.geometry!} pathOptions={{ weight: item.index === 0 ? 6 : 5, opacity: item.index === 0 ? 1 : 0.86, dashArray: item.market === "seedlings" ? "8 5" : undefined, interactive: true }}><MapTooltip>{item.actor.name}: {item.distanceKm.toFixed(1)} km by road</MapTooltip></MapPolyline>)}
    {visibleRoutes.map((item) => <MapCircleMarker key={`${item.market}-${item.actor.id}-end`} className={item.market === "seedlings" ? "market-route-end-seedlings" : "market-route-end-wood"} center={[item.location.latitude!, item.location.longitude!]} radius={5} pathOptions={{ weight: 2, fillOpacity: 1 }}><MapTooltip>{item.actor.name}</MapTooltip></MapCircleMarker>)}
    {point && <MapCircleMarker className="market-route-origin" center={[point.latitude, point.longitude]} radius={7} pathOptions={{ color: "var(--market-accent)", fillColor: "var(--market-accent)", fillOpacity: 1, weight: 3 }}><MapTooltip>Selected point</MapTooltip></MapCircleMarker>}
    {point && <div className="pointer-events-auto absolute bottom-3 right-3 z-[1000] max-h-[min(29rem,70%)] w-[min(26rem,calc(100%-1.5rem))] overflow-y-auto rounded-md border bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur" role="region" aria-label="Road distance analysis">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Road distances from selected point</p><p className="text-xs text-muted-foreground">{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)} · OSRM driving network</p></div><button type="button" className="text-xs text-[var(--market-accent)] underline focus-visible:outline-2" onClick={() => { setPoint(null); setStatus(null); setResults({ seedlings: [], wood: [] }) }}>Clear</button></div>
      {status && <p role="status" className="mt-3 text-xs text-muted-foreground">{status}</p>}
      {!status && (["seedlings", "wood"] as Market[]).map((market) => <div key={market} className="mt-3"><p className="flex items-center gap-2 border-b pb-1 text-xs font-semibold uppercase tracking-wide"><span className={`inline-block h-1 w-5 rounded-full ${market === "seedlings" ? "bg-[var(--market-seedlings-accent)]" : "bg-[var(--market-wood-accent)]"}`} />{marketLabel[market]}</p>{results[market].length ? results[market].map((item, index) => <div key={item.actor.id} className="flex items-start gap-2 border-b py-2 text-xs last:border-0"><span className={`font-semibold ${market === "seedlings" ? "text-[var(--market-seedlings-accent)]" : "text-[var(--market-wood-accent)]"}`}>{index + 1}</span><div className="min-w-0 flex-1"><button type="button" className="max-w-full truncate text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2" onClick={() => onActorSelect(item.actor.id)}>{item.actor.name}</button><p className="truncate text-muted-foreground">{item.location.town ?? item.location.district ?? item.location.region} · {item.location.coordinatePrecision ?? "point accuracy unverified"}</p></div><div className="shrink-0 text-right"><p className="font-semibold">{item.distanceKm.toFixed(1)} km</p><p className="text-muted-foreground">{item.geometry ? "Road" : "Road table"}</p></div></div>) : <p className="py-2 text-xs text-muted-foreground">No mapped {market === "seedlings" ? "seedling" : "wood"} actors with a drivable route.</p>}</div>)}
      {!status && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Routes use the fastest drivable OSM network path. Destination points may be locality centroids; the distance is to the mapped point, not a verified gate.</p>}
    </div>}
  </>
}
