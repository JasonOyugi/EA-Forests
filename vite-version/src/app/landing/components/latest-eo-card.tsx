import { useEffect, useMemo, useRef, useState } from "react"
import { GeoJSON, useMap } from "react-leaflet"
import type { Feature, FeatureCollection } from "geojson"
import { geoJSON as leafletGeoJson, type Layer, type LeafletMouseEvent, type Path, type PathOptions } from "leaflet"
import { Map } from "@/components/ui/map"
import { BasemapLayers } from "@/components/map/basemap-layers"
import { useLazyMount } from "@/hooks/use-lazy-mount"
import { assetUrl } from "@/lib/utils"
import { EoEvidenceSheet, type EoEvidenceSelection } from "@/components/eo/eo-evidence-sheet"

export interface EoCountryConfig {
  country: string
  countryCode: "UG" | "KE" | "TZ"
  center: [number, number]
  zoom: number
  source: string
}

// Same countries, framing and polygon sets as the national EO maps (`NationalEoMap` on
// feature/uganda-cfr-s2-history). center/zoom is only the initial view before fitting to the polygons.
export const eoCountries: Record<EoCountryConfig["countryCode"], EoCountryConfig> = {
  UG: { country: "Uganda", countryCode: "UG", center: [1.3, 32.3], zoom: 6, source: "Uganda CFR repository" },
  KE: { country: "Kenya", countryCode: "KE", center: [0.4, 37.9], zoom: 5, source: "Kenya gazetted forest (public ArcGIS)" },
  TZ: { country: "Tanzania", countryCode: "TZ", center: [-6.4, 34.9], zoom: 5, source: "WWF Tanzania forests" },
}

interface EoCountrySummary {
  polygons: number
  observed: number
  areaHa: number
  latestMonth: string | null
}

type LoadState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; forests: FeatureCollection; summary: EoCountrySummary }

// Class styling copied from the national EO map's `polygonPathOptionsForClass`.
function polygonPathOptionsForClass(commercialClass: string): PathOptions {
  switch (commercialClass) {
    case "official_forest_reserve":
      return { color: "#15803d", fillColor: "#15803d", fillOpacity: 0.16, opacity: 0.82, weight: 1.4 }
    case "gazetted_forest":
      return { color: "#166534", fillColor: "#166534", fillOpacity: 0.12, opacity: 0.78, weight: 1.3, dashArray: "6 3" }
    case "forest_candidate":
      return { color: "#475569", fillColor: "#475569", fillOpacity: 0.08, opacity: 0.62, weight: 1, dashArray: "3 4" }
    default:
      return { color: "#64748b", fillColor: "#64748b", fillOpacity: 0.1, opacity: 0.7, weight: 1.1 }
  }
}

function featureStyle(feature?: Feature): PathOptions {
  return polygonPathOptionsForClass((feature?.properties?.class as string | undefined) ?? "")
}


/** Frames the card on the country's actual polygons — a fixed center/zoom leaves most of a
 * small card showing neighbouring countries. */
function FitToForests({ forests }: { forests: FeatureCollection }) {
  const map = useMap()
  useEffect(() => {
    const bounds = leafletGeoJson(forests).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [12, 12], animate: false })
  }, [map, forests])
  return null
}

let summaryPromise: Promise<Record<string, EoCountrySummary>> | null = null

function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return fetch(assetUrl(path), { signal }).then((response) => {
    if (!response.ok) throw new Error(`${path} responded with ${response.status}`)
    return response.json() as Promise<T>
  })
}

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
}

function formatHectares(areaHa: number) {
  return areaHa >= 1_000_000 ? `${(areaHa / 1_000_000).toFixed(1)}M ha` : `${Math.round(areaHa / 1000).toLocaleString()}k ha`
}

/**
 * "Latest EO" map card for the editorial grid, one per country. Renders a static snapshot of the
 * national EO maps' forest polygons (`public/data/eo/*`, exported from the canonical store by
 * `scripts/export-eo-snapshot.py`), because the live polygon API is private/admin-only.
 */
export function EoTile({ config, size = "" }: { config: EoCountryConfig; size?: string }) {
  const { ref, shouldMount } = useLazyMount<HTMLDivElement>()
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    if (!shouldMount) return
    const controller = new AbortController()
    summaryPromise ??= fetchJson<Record<string, EoCountrySummary>>("/data/eo/summary.json")
    Promise.all([
      summaryPromise,
      fetchJson<FeatureCollection>(`/data/eo/${config.countryCode.toLowerCase()}-forests.geojson`, controller.signal),
    ])
      .then(([summaries, forests]) => {
        const summary = summaries[config.countryCode]
        setState(summary ? { status: "ready", forests, summary } : { status: "unavailable" })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "unavailable" })
      })
    return () => controller.abort()
  }, [shouldMount, config.countryCode])

  const [selection, setSelection] = useState<EoEvidenceSelection | null>(null)
  // Read through a ref so the memoized GeoJSON layer (rebuilt only when the data changes) always
  // selects into the current country.
  const countryCodeRef = useRef(config.countryCode)
  countryCodeRef.current = config.countryCode

  const forests = state.status === "ready" ? state.forests : null
  const geoJson = useMemo(() => {
    if (!forests) return null
    // Each polygon names itself on hover and opens its EO evidence sheet on click.
    const onEachFeature = (feature: Feature, layer: Layer) => {
      const name = (feature.properties?.name as string | undefined) ?? "Forest"
      const key = feature.properties?.key as string | undefined
      layer.bindTooltip(name, { sticky: true })
      if (!key) return
      layer.on({
        click: (event: LeafletMouseEvent) => {
          event.originalEvent.stopPropagation()
          setSelection({ countryCode: countryCodeRef.current, key, name })
        },
        mouseover: () => (layer as Path).setStyle({ fillOpacity: 0.45, weight: 2.4 }),
        mouseout: () => (layer as Path).setStyle(featureStyle(feature)),
      })
    }
    return (
      <>
        <GeoJSON data={forests} style={featureStyle} onEachFeature={onEachFeature} />
        <FitToForests forests={forests} />
      </>
    )
  }, [forests])

  return (
    <article ref={ref} className={`landing-story-card group relative block overflow-hidden bg-zinc-900 ${size}`}>
      {!shouldMount || state.status === "loading" ? (
        <div className="absolute inset-0 animate-pulse bg-zinc-800" />
      ) : state.status === "ready" ? (
        <Map center={config.center} zoom={config.zoom} className="absolute inset-0 min-h-0 rounded-none" dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false}>
          <BasemapLayers>{geoJson}</BasemapLayers>
        </Map>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-black" />
      )}

      <span className="pointer-events-none absolute left-5 top-5 z-[500] inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-950/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-emerald-100 backdrop-blur-sm sm:left-7 sm:top-7">
        {config.country}: Latest EO
      </span>

      {/* No full-card tint: only the text itself sits on a small dark panel, so the map stays clear. */}
      <div className="landing-card-content pointer-events-none absolute bottom-5 left-5 z-[500] max-w-[calc(100%-2.5rem)] rounded-md bg-black/70 px-4 py-3 text-white backdrop-blur-sm sm:bottom-7 sm:left-7">
        {state.status === "ready" ? (
          <p className="text-sm text-white/70">
            {formatHectares(state.summary.areaHa)} · Sentinel-1/2
            {state.summary.latestMonth ? ` · updated ${formatMonth(state.summary.latestMonth)}` : ""}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-white/45">Boundaries: {config.source}</p>
        {state.status === "ready" ? <p className="mt-1 text-xs text-emerald-200/80">Click any forest for its EO evidence</p> : null}
      </div>

      <EoEvidenceSheet selection={selection} onClose={() => setSelection(null)} />
    </article>
  )
}
