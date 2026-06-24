"use client"

import * as React from "react"
import L from "leaflet"
import { Filter, Layers3, LoaderCircle } from "lucide-react"
import { useMap } from "react-leaflet"

import {
  filterBasicSsmtChunks,
  getDefaultBasicSsmtFilters,
  getSpeciesForGenus,
  getSuitabilityStyle,
  loadBasicSsmtChunks,
  loadBasicSsmtMetadata,
  type BasicSsmtFeatureCollection,
  type BasicSsmtFilters,
  type BasicSsmtMetadata,
  type BasicSsmtProperties,
} from "@/app/maps/basic-ssmt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MapControlContainer } from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function popupRows(properties: BasicSsmtProperties) {
  return [
    ["Country", properties.country],
    ["Species", properties.species_name],
    ["Genus", properties.genus],
    ["Suitability", properties.suitability_name],
    ["Soil suitability", properties.soil_suitability],
    ["Soil type", properties.soil_type || properties.soil_description],
    ["Site class", properties.site_class],
    ["MAZ", [properties.maz, properties.maz_zone].filter(Boolean).join(" / ")],
    ["Frost risk", properties.frost_risk],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "")
}

function renderPopup(properties: BasicSsmtProperties) {
  const rows = popupRows(properties)
    .map(
      ([label, value]) => `
        <div class="grid grid-cols-[7rem_minmax(0,1fr)] border-b last:border-b-0 text-sm">
          <div class="bg-muted/70 px-3 py-2 font-medium text-muted-foreground">${escapeHtml(label)}</div>
          <div class="px-3 py-2 leading-5">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("")

  return `
    <div class="w-80 bg-background">
      <div class="border-b p-4">
        <div class="mb-2 inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          Basic SSMT
        </div>
        <h3 class="text-base font-semibold leading-tight">${escapeHtml(properties.species_name)}</h3>
        <p class="mt-1 text-sm text-muted-foreground">${escapeHtml(properties.suitability_name)}</p>
      </div>
      <div class="p-4">
        <div class="overflow-hidden rounded-md border">${rows}</div>
      </div>
    </div>
  `
}

function BasicSsmtGeoJsonLayer({
  collection,
  metadata,
  opacity,
}: {
  collection: BasicSsmtFeatureCollection
  metadata: BasicSsmtMetadata
  opacity: number
}) {
  const map = useMap()

  React.useEffect(() => {
    const layer = L.geoJSON(collection, {
      style: (feature) =>
        getSuitabilityStyle(
          feature?.properties?.suitability_name,
          metadata,
          opacity
        ),
      onEachFeature: (feature, leafletLayer) => {
        leafletLayer.bindPopup(
          renderPopup(feature.properties as BasicSsmtProperties),
          { className: "w-80 border-0 p-0" }
        )
      },
    }).addTo(map)

    return () => {
      layer.removeFrom(map)
    }
  }, [collection, map, metadata, opacity])

  return null
}

function updateSuitabilityFilter(
  filters: BasicSsmtFilters,
  suitabilityName: string,
  checked: boolean
): BasicSsmtFilters {
  return {
    ...filters,
    suitabilityNames: checked
      ? Array.from(new Set([...filters.suitabilityNames, suitabilityName]))
      : filters.suitabilityNames.filter((item) => item !== suitabilityName),
  }
}

function StatusLine({
  enabled,
  loading,
  error,
  empty,
  featureCount,
}: {
  enabled: boolean
  loading: boolean
  error: string | null
  empty: boolean
  featureCount: number
}) {
  if (!enabled) return null
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Loading Basic SSMT
      </div>
    )
  }
  if (error) {
    return <p className="text-xs leading-5 text-destructive">{error}</p>
  }
  if (empty) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        No processed Basic SSMT polygons match these filters.
      </p>
    )
  }

  return (
    <p className="text-xs leading-5 text-muted-foreground">
      {featureCount.toLocaleString()} processed polygons loaded.
    </p>
  )
}

export function BasicSsmtLayerControl({
  position = "left-3 top-16",
  className,
}: {
  position?: string
  className?: string
}) {
  const [enabled, setEnabled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [metadata, setMetadata] = React.useState<BasicSsmtMetadata | null>(null)
  const [filters, setFilters] = React.useState<BasicSsmtFilters>(() =>
    getDefaultBasicSsmtFilters(null)
  )
  const [opacity, setOpacity] = React.useState(0.34)
  const [collection, setCollection] =
    React.useState<BasicSsmtFeatureCollection | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!enabled || metadata) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    loadBasicSsmtMetadata(controller.signal)
      .then((nextMetadata) => {
        setMetadata(nextMetadata)
        setFilters(getDefaultBasicSsmtFilters(nextMetadata))
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return
        setError(nextError instanceof Error ? nextError.message : "Basic SSMT metadata could not be loaded.")
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [enabled, metadata])

  const matchingChunks = React.useMemo(
    () => (metadata ? filterBasicSsmtChunks(metadata, filters) : []),
    [filters, metadata]
  )

  React.useEffect(() => {
    if (!enabled || !metadata) {
      setCollection(null)
      return
    }
    if (!metadata.generated) {
      setCollection({ type: "FeatureCollection", features: [] })
      return
    }
    if (matchingChunks.length === 0) {
      setCollection({ type: "FeatureCollection", features: [] })
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    loadBasicSsmtChunks(matchingChunks, controller.signal)
      .then((features) => {
        if (controller.signal.aborted) return
        setCollection({ type: "FeatureCollection", features })
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return
        setError(nextError instanceof Error ? nextError.message : "Basic SSMT polygons could not be loaded.")
        setCollection(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [enabled, matchingChunks, metadata])

  const speciesOptions = React.useMemo(
    () => getSpeciesForGenus(metadata, filters.genus),
    [filters.genus, metadata]
  )
  const featureCount = collection?.features.length ?? 0
  const missingProcessedData = enabled && metadata?.generated === false
  const statusError = error ?? (
    missingProcessedData
      ? "Processed Basic SSMT data is missing. Run npm run preprocess:ssmt to generate map chunks."
      : null
  )
  const empty = enabled && !loading && !statusError && featureCount === 0

  return (
    <>
      {enabled && metadata && collection && collection.features.length > 0 ? (
        <BasicSsmtGeoJsonLayer
          collection={collection}
          metadata={metadata}
          opacity={opacity}
        />
      ) : null}

      <MapControlContainer className={cn(position, className)}>
        <div className="flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-2">
          <Button
            type="button"
            variant={enabled ? "default" : "secondary"}
            className="border shadow-sm"
            aria-expanded={open}
            aria-label="Basic SSMT controls"
            title="Basic SSMT"
            onClick={() => {
              setOpen((value) => !value)
              if (!enabled) setEnabled(true)
            }}
          >
            <Layers3 className="h-4 w-4" />
            Basic SSMT
          </Button>

          {open ? (
            <div className="w-[min(22rem,calc(100vw-1.5rem))] rounded-md border bg-background/96 p-3 shadow-xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">Basic SSMT</div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="basic-ssmt-enabled" className="text-xs">
                    Layer
                  </Label>
                  <Switch
                    id="basic-ssmt-enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Country</Label>
                  <Select
                    value={filters.countryCode}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        countryCode: value as BasicSsmtFilters["countryCode"],
                      }))
                    }
                    disabled={!metadata}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {metadata?.countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Genus</Label>
                  <Select
                    value={filters.genus}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        genus: value,
                        speciesName: "all",
                      }))
                    }
                    disabled={!metadata}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All genera" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genera</SelectItem>
                      {metadata?.genera.map((genus) => (
                        <SelectItem key={genus} value={genus}>
                          {genus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Species</Label>
                  <Select
                    value={filters.speciesName}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        speciesName: value,
                      }))
                    }
                    disabled={!metadata || speciesOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All species</SelectItem>
                      {speciesOptions.map((species) => (
                        <SelectItem
                          key={species.species_name}
                          value={species.species_name}
                        >
                          {species.species_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs">Suitability</Label>
                  <div className="grid gap-2 rounded-md border p-2">
                    {metadata?.suitability.map((suitability) => (
                      <label
                        key={suitability.name}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: suitability.color }}
                          />
                          <span className="truncate">{suitability.name}</span>
                        </span>
                        <Checkbox
                          checked={filters.suitabilityNames.includes(
                            suitability.name
                          )}
                          onCheckedChange={(checked) =>
                            setFilters((current) =>
                              updateSuitabilityFilter(
                                current,
                                suitability.name,
                                checked === true
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="basic-ssmt-opacity" className="text-xs">
                      Opacity
                    </Label>
                    <Badge variant="secondary">
                      {Math.round(opacity * 100)}%
                    </Badge>
                  </div>
                  <input
                    id="basic-ssmt-opacity"
                    type="range"
                    min="0.12"
                    max="0.72"
                    step="0.02"
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <StatusLine
                  enabled={enabled}
                  loading={loading}
                  error={statusError}
                  empty={empty}
                  featureCount={featureCount}
                />
              </div>
            </div>
          ) : null}
        </div>
      </MapControlContainer>
    </>
  )
}
