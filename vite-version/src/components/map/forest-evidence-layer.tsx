"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"

import { Badge } from "@/components/ui/badge"
import {
  MapControlContainer,
  MapLayerGroup,
  MapPolygon,
  MapPopup,
  MapTooltip,
  useMapLayerActive,
} from "@/components/ui/map"
import {
  fetchForestPolygons,
  type ForestPolygonFeature,
  type ForestPolygonProperties,
} from "@/lib/canonical-api"

export const DEFAULT_FOREST_EVIDENCE_LAYER_NAME = "Commercial / productive forest areas"

const FOREST_CLASS_LABELS: Record<string, string> = {
  official_forest_reserve: "Official forest reserve",
  gazetted_forest: "Gazetted forest",
  tree_plantation: "Tree plantation",
  planted_tree_candidate: "Planted-tree candidate",
  forest_candidate: "Forest-cover candidate",
  confirmed_commercial_asset: "Confirmed commercial asset",
}

const FOREST_CLASS_STATUS: Record<string, string> = {
  official_forest_reserve: "Legal reserve boundary — not evidence of harvestable supply.",
  gazetted_forest: "Gazetted legal boundary — not confirmed as available supply.",
  tree_plantation: "Plantation land-cover evidence — current commercial availability not verified.",
  planted_tree_candidate: "Third-party planted-tree evidence — not a confirmed commercial asset.",
  forest_candidate: "Forest-cover evidence — not confirmed as commercial supply.",
  confirmed_commercial_asset: "Confirmed commercial asset.",
}

const AUTHORITY_LABELS: Record<string, string> = {
  authoritative_official: "Official / authoritative",
  reported_public_sector_secondary: "Public-sector secondary record",
  third_party_spatial_dataset: "Third-party spatial dataset",
  unverified_repository_derived: "Unverified repository-derived",
  eo_derived: "Earth-observation derived",
}

export function forestClassLabel(commercialClass: string) {
  return FOREST_CLASS_LABELS[commercialClass] ?? commercialClass.replace(/_/g, " ")
}

function forestClassStatus(commercialClass: string) {
  return (
    FOREST_CLASS_STATUS[commercialClass] ?? "Spatial evidence — not confirmed as commercial supply."
  )
}

function authorityLabel(authorityClass: string | null) {
  if (!authorityClass) return "Not recorded"
  return AUTHORITY_LABELS[authorityClass] ?? authorityClass.replace(/_/g, " ")
}

export function polygonPathOptionsForClass(commercialClass: string) {
  switch (commercialClass) {
    case "official_forest_reserve":
      return { color: "#15803d", fillColor: "#15803d", fillOpacity: 0.16, opacity: 0.82, weight: 1.4 }
    case "gazetted_forest":
      return {
        color: "#166534",
        fillColor: "#166534",
        fillOpacity: 0.12,
        opacity: 0.78,
        weight: 1.3,
        dashArray: "6 3",
      }
    case "tree_plantation":
    case "confirmed_commercial_asset":
      return { color: "#b45309", fillColor: "#b45309", fillOpacity: 0.16, opacity: 0.8, weight: 1.3 }
    case "planted_tree_candidate":
    case "forest_candidate":
      return {
        color: "#475569",
        fillColor: "#475569",
        fillOpacity: 0.08,
        opacity: 0.62,
        weight: 1,
        dashArray: "3 4",
      }
    default:
      return { color: "#64748b", fillColor: "#64748b", fillOpacity: 0.1, opacity: 0.7, weight: 1.1 }
  }
}

function forestFeaturePositions(feature: ForestPolygonFeature) {
  const { geometry } = feature
  const toLatLng = (coord: GeoJSON.Position): [number, number] => {
    const [lng, lat] = coord as [number, number]
    return [lat, lng]
  }

  if (geometry.type === "Polygon") {
    return [geometry.coordinates.map((ring) => ring.map(toLatLng))]
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(toLatLng)))
  }
  return null
}

function ForestPolygonDetails({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid grid-cols-[7rem_minmax(0,1fr)] border-b text-sm last:border-b-0"
        >
          <div className="bg-muted/70 px-3 py-2 font-medium text-muted-foreground">{row.label}</div>
          <div className="px-3 py-2 leading-5">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function ForestPolygonPopup({ properties }: { properties: ForestPolygonProperties }) {
  const pathOptions = polygonPathOptionsForClass(properties.commercial_class)
  const areaLabel = properties.geometry_area_ha
    ? `${Math.round(properties.geometry_area_ha).toLocaleString()} ha`
    : "Not calculated"

  return (
    <div className="space-y-3 bg-background p-4">
      <div>
        <Badge variant="secondary" style={{ color: pathOptions.color }}>
          {forestClassLabel(properties.commercial_class)}
        </Badge>
        <h3 className="mt-2 text-base font-semibold">{properties.name}</h3>
        <div className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {properties.country} · {properties.publisher || properties.source_name}
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold">{areaLabel}</div>
        <div className="text-xs text-muted-foreground">calculated from mapped geometry</div>
      </div>
      <ForestPolygonDetails
        rows={[
          { label: "Source", value: properties.source_name || properties.publisher || "Public source" },
          ...(properties.area_ha
            ? [{ label: "Source-reported", value: `${Math.round(properties.area_ha).toLocaleString()} ha` }]
            : []),
          { label: "Evidence", value: authorityLabel(properties.authority_class) },
          { label: "Version", value: properties.dataset_version || properties.data_vintage || "Not recorded" },
          { label: "Status", value: forestClassStatus(properties.commercial_class) },
        ]}
      />
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Provenance details</summary>
        <div className="mt-2 space-y-1">
          <div>
            Entity <span className="font-mono">{properties.entity_id}</span>
          </div>
          <div>
            Observation <span className="font-mono">{properties.geometry_observation_id}</span>
          </div>
          {properties.reference_url ? (
            <div>
              <a className="underline" href={properties.reference_url} target="_blank" rel="noreferrer">
                Publisher reference
              </a>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  )
}

export type ForestEvidenceLayerProps = {
  /** MapLayerGroup name shown in the layer toggle. Must be unique per map. */
  name?: string
  /** ISO2 country filter (UG/KE/TZ); omit for no country restriction. */
  country?: string
  sourceKeys?: string[]
  classes?: string[]
  limit?: number
}

export function ForestEvidenceLayer({
  name = DEFAULT_FOREST_EVIDENCE_LAYER_NAME,
  country,
  sourceKeys,
  classes,
  limit = 500,
}: ForestEvidenceLayerProps) {
  const map = useMap()
  const active = useMapLayerActive(name)
  const [features, setFeatures] = React.useState<ForestPolygonFeature[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const sourceKeysKey = sourceKeys?.join(",") ?? ""
  const classesKey = classes?.join(",") ?? ""

  const loadViewport = React.useCallback(() => {
    abortRef.current?.abort()
    if (!active) return
    const controller = new AbortController()
    abortRef.current = controller
    const bounds = map.getBounds()
    setLoading(true)
    setError(null)

    fetchForestPolygons({
      bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      country,
      sourceKeys,
      classes,
      limit,
      zoom: map.getZoom(),
      signal: controller.signal,
    })
      .then((collection) => {
        if (controller.signal.aborted) return
        setFeatures(collection.features)
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return
        setFeatures([])
        setError(
          nextError instanceof Error ? nextError.message : "Forest polygon data could not be loaded."
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    // sourceKeys/classes are represented by their joined keys below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, active, country, sourceKeysKey, classesKey, limit])

  const scheduleLoad = React.useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(loadViewport, 250)
  }, [loadViewport])

  React.useEffect(() => {
    if (active) {
      loadViewport()
    } else {
      setFeatures([])
      setError(null)
      setLoading(false)
    }
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [active, loadViewport])

  useMapEvents({
    moveend: scheduleLoad,
    zoomend: scheduleLoad,
  })

  return (
    <MapLayerGroup name={name}>
      {features.map((feature) => {
        const positions = forestFeaturePositions(feature)
        if (!positions) return null
        const pathOptions = polygonPathOptionsForClass(feature.properties.commercial_class)

        return (
          <MapPolygon
            key={feature.id}
            positions={positions as unknown as [number, number][][]}
            pathOptions={pathOptions}
          >
            <MapPopup className="w-80 p-0">
              <ForestPolygonPopup properties={feature.properties} />
            </MapPopup>
            <MapTooltip side="top">{feature.properties.name}</MapTooltip>
          </MapPolygon>
        )
      })}
      {active && (loading || error) ? (
        <MapControlContainer className="bottom-3 left-3">
          <Badge
            variant="secondary"
            className={error ? "border-destructive/50 text-destructive" : "text-muted-foreground"}
          >
            {error ?? "Loading forest evidence…"}
          </Badge>
        </MapControlContainer>
      ) : null}
    </MapLayerGroup>
  )
}
