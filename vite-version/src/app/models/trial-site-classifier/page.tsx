"use client"

import * as React from "react"
import { useMapEvents } from "react-leaflet"
import {
  AlertTriangle,
  BarChart3,
  Info,
  LoaderCircle,
  MapPinned,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Map,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import {
  createPlaceholderSelectedClimateProfile,
  fetchSelectedClimateProfileFromSiteClassifier,
} from "./classify-selected-point"
import { classifyClimateAnalogues } from "./climate-distance"
import { loadTrialClassifierArtifacts } from "./data"
import {
  buildInitialRankingWeights,
  rankVarietiesForSiteGroup,
  type RankingWeights,
} from "./trial-performance-ranking"
import type {
  ClimateMatch,
  RankedTrialPerformanceRow,
  SelectedClimateProfile,
  TrialClassifierArtifacts,
  TrialSiteClimateProfile,
  TrialSiteRegistryRow,
  VarietyCrossSiteSummary,
  VarietyDistribution,
} from "./types"

const genusGroups = [
  {
    key: "eucalyptus_clonal_hybrid",
    label: "Eucalyptus clonal/hybrid",
  },
  {
    key: "eucalyptus_pure_species",
    label: "Eucalyptus pure species",
  },
  { key: "pine", label: "Pine" },
  { key: "corymbia", label: "Corymbia" },
]

const siteAnalysisTileLayers = [
  {
    name: "Street",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
  {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
]

export interface SelectedPoint {
  latitude: number
  longitude: number
}

interface SelectedVariety {
  row: RankedTrialPerformanceRow
  match: ClimateMatch
}

export interface TrialArtifactsState {
  artifacts: TrialClassifierArtifacts | null
  loading: boolean
  error: string | null
}

type RankingMetricConfig =
  TrialClassifierArtifacts["rankingConfig"]["available_metrics"][number]

const rankingWeightEpsilon = 0.000001

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-"
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-"
  }

  return `${Math.round(value * 100)}%`
}

function startCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getVectorKeys(artifacts: TrialClassifierArtifacts | null) {
  if (!artifacts) return []
  const firstVector = artifacts.climateProfiles.find((profile) =>
    Boolean(profile.scaled_climate_vector)
  )?.scaled_climate_vector

  if (!firstVector) return []
  if (Array.isArray(firstVector)) {
    return firstVector.map((_, index) => `v${index}`)
  }

  return Object.keys(firstVector)
}

function getRankingWeightTotal(
  weights: RankingWeights,
  metrics: RankingMetricConfig[]
) {
  return metrics.reduce(
    (total, metric) => total + Math.max(0, weights[metric.key] ?? 0),
    0
  )
}

function normalizeRankingWeights(
  weights: RankingWeights,
  metrics: RankingMetricConfig[],
  fallbackWeights: RankingWeights
) {
  const total = getRankingWeightTotal(weights, metrics)
  if (total <= rankingWeightEpsilon) return fallbackWeights

  return Object.fromEntries(
    metrics.map((metric) => [
      metric.key,
      Math.max(0, weights[metric.key] ?? 0) / total,
    ])
  )
}

function rebalanceRankingWeights({
  current,
  metrics,
  changedKey,
  nextValue,
  fallbackWeights,
}: {
  current: RankingWeights
  metrics: RankingMetricConfig[]
  changedKey: string
  nextValue: number
  fallbackWeights: RankingWeights
}) {
  const clampedValue = Math.min(1, Math.max(0, nextValue))
  const remainingWeight = Math.max(0, 1 - clampedValue)
  const changedMetric = metrics.find((metric) => metric.key === changedKey)
  const activeOtherMetrics = metrics.filter((metric) => {
    if (metric.key === changedKey) return false
    return !metric.optional || (current[metric.key] ?? 0) > rankingWeightEpsilon
  })
  const otherTotal = getRankingWeightTotal(current, activeOtherMetrics)

  if (!changedMetric) return normalizeRankingWeights(current, metrics, fallbackWeights)
  if (remainingWeight <= rankingWeightEpsilon) {
    return Object.fromEntries(
      metrics.map((metric) => [metric.key, metric.key === changedKey ? 1 : 0])
    )
  }

  if (otherTotal <= rankingWeightEpsilon) {
    const otherShare = activeOtherMetrics.length
      ? remainingWeight / activeOtherMetrics.length
      : 0
    return Object.fromEntries(
      metrics.map((metric) => [
        metric.key,
        metric.key === changedKey
          ? clampedValue
          : activeOtherMetrics.some((item) => item.key === metric.key)
            ? otherShare
            : 0,
      ])
    )
  }

  return Object.fromEntries(
    metrics.map((metric) => [
      metric.key,
      metric.key === changedKey
        ? clampedValue
        : activeOtherMetrics.some((item) => item.key === metric.key)
          ? ((current[metric.key] ?? 0) / otherTotal) * remainingWeight
          : 0,
    ])
  )
}

function createTrialMarkerIcon(isSelected: boolean) {
  return (
    <span
      className={cn(
        "block size-3 rounded-full border-2 border-white shadow",
        isSelected ? "bg-emerald-700" : "bg-sky-700"
      )}
    />
  )
}

function formatClimateMetric(
  profile: TrialSiteClimateProfile | undefined,
  key: string,
  suffix: string,
  digits = 1
) {
  const value = profile?.long_term_climate?.[key]
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${formatNumber(value, digits)}${suffix}`
}

function getClimateProfile(
  artifacts: TrialClassifierArtifacts,
  site: TrialSiteRegistryRow
) {
  return (
    artifacts.climateProfiles.find((profile) => profile.site_id === site.site_id) ??
    undefined
  )
}

function getTopRowsForSiteGroup({
  artifacts,
  siteId,
  genusGroup,
  limit = 5,
}: {
  artifacts: TrialClassifierArtifacts
  siteId: string
  genusGroup: string
  limit?: number
}) {
  return artifacts.defaultTopRows
    .filter((row) => row.site_id === siteId && row.genus_group === genusGroup)
    .sort(
      (a, b) =>
        (a.rank_default_within_site_group ?? Number.MAX_SAFE_INTEGER) -
        (b.rank_default_within_site_group ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, limit)
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

function TrialSiteTopRows({
  artifacts,
  siteId,
}: {
  artifacts: TrialClassifierArtifacts
  siteId: string
}) {
  return (
    <div className="space-y-3">
      {genusGroups.map((group) => {
        const rows = getTopRowsForSiteGroup({
          artifacts,
          siteId,
          genusGroup: group.key,
        })

        return (
          <div key={group.key} className="rounded-md border bg-background/70 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Top 5 {group.label}
            </div>
            {rows.length ? (
              <ol className="mt-2 space-y-1.5">
                {rows.map((row, index) => (
                  <li
                    key={`${row.site_id}-${row.genus_group}-${row.entry}-${row.age_months}`}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-2 text-xs"
                  >
                    <span className="font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {row.entry}
                      </span>
                      <span className="text-muted-foreground">
                        {row.age_months} mo, survival {formatPercent(row.survival_rate)}
                      </span>
                    </span>
                    <span className="font-medium">
                      {formatNumber(row.default_composite_score, 2)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                No ranked entries for this group.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrialSitePopup({
  site,
  artifacts,
}: {
  site: TrialSiteRegistryRow
  artifacts: TrialClassifierArtifacts
}) {
  const profile = getClimateProfile(artifacts, site)
  const yearRange = profile?.climate_profile_year_range
  const climateYears = yearRange
    ? `${yearRange.start_year}-${yearRange.end_year}`
    : "Current artifact"
  const summary = profile
    ? `Site-classification profile: ${formatClimateMetric(
        profile,
        "annual_ppt_mm",
        " mm"
      )} annual rainfall, ${formatClimateMetric(
        profile,
        "mean_tmean_c",
        " C"
      )} mean temperature, and ${formatClimateMetric(
        profile,
        "annual_water_deficit_mm",
        " mm"
      )} annual water deficit.`
    : "Site-classification profile is not available for this trial site."

  return (
    <div className="max-h-[34rem] w-[26rem] overflow-y-auto bg-background">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2 text-emerald-700">
              Trial site
            </Badge>
            <h3 className="text-base font-semibold leading-tight">
              {site.site_name}
            </h3>
          </div>
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-700" />
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {summary}
        </p>
      </div>
      <div className="space-y-3 p-4">
        <DetailRows
          rows={[
            {
              label: "Coordinates",
              value: `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}`,
            },
            {
              label: "Climate source",
              value: profile?.climate_profile_source
                ? startCase(profile.climate_profile_source)
                : "-",
            },
            { label: "Climate years", value: climateYears },
            {
              label: "Rainfall",
              value: formatClimateMetric(profile, "annual_ppt_mm", " mm"),
            },
            {
              label: "Mean temp",
              value: formatClimateMetric(profile, "mean_tmean_c", " C"),
            },
            {
              label: "Water deficit",
              value: formatClimateMetric(
                profile,
                "annual_water_deficit_mm",
                " mm"
              ),
            },
            {
              label: "Trial groups",
              value: site.available_genus_groups.map(startCase).join(", "),
            },
          ]}
        />
        <TrialSiteTopRows artifacts={artifacts} siteId={site.site_id} />
      </div>
    </div>
  )
}

export function TrialSiteClassifierMap({
  artifacts,
  loading,
  error,
  selectedPoint,
  matches = [],
  onPointSelected,
  selectOn = "click",
}: TrialArtifactsState & {
  selectedPoint: SelectedPoint | null
  matches?: ClimateMatch[]
  onPointSelected: (point: SelectedPoint) => void
  selectOn?: "click" | "doubleClick"
  title?: string
  description?: string
}) {
  if (loading) {
    return (
      <Card className="border-border/70 bg-background/75">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading trial classifier artifacts.
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-300/70 bg-red-50/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Trial artifacts unavailable
          </CardTitle>
          <CardDescription className="text-red-800/80">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!artifacts) return null

  return (
    <Card className="overflow-hidden border-border/70 bg-background/75">
      <CardContent className="p-0">
        <div className="h-[520px]">
          <Map
            center={[
              selectedPoint?.latitude ?? -6.4,
              selectedPoint?.longitude ?? 36.2,
            ]}
            zoom={6}
            maxZoom={15}
            doubleClickZoom={selectOn !== "doubleClick"}
            className="min-h-0 rounded-none"
          >
            <MapLayers defaultTileLayer="Street">
              {siteAnalysisTileLayers.map((tileLayer) => (
                <MapTileLayer
                  key={tileLayer.name}
                  name={tileLayer.name}
                  url={tileLayer.url}
                  attribution={tileLayer.attribution}
                />
              ))}
              <MapLayersControl tileLayersLabel="Map type" position="top-3 right-3" />
              <MapZoomControl position="top-3 left-3" />
              <PointSelectionEvents
                onPointSelected={onPointSelected}
                selectOn={selectOn}
              />
              {artifacts.sites.map((site) => (
                <MapMarker
                  key={site.site_id}
                  position={[site.latitude, site.longitude]}
                  icon={createTrialMarkerIcon(
                    matches.some((match) => match.site.site_id === site.site_id)
                  )}
                >
                  <MapPopup className="w-[min(28rem,calc(100vw-3rem))] p-0">
                    <TrialSitePopup site={site} artifacts={artifacts} />
                  </MapPopup>
                </MapMarker>
              ))}
              {selectedPoint ? (
                <MapMarker
                  position={[selectedPoint.latitude, selectedPoint.longitude]}
                  icon={
                    <span className="block size-5 rounded-full border-2 border-white bg-emerald-500 shadow ring-4 ring-emerald-500/25" />
                  }
                >
                  <MapPopup>
                    <div className="space-y-1">
                      <div className="font-semibold">Selected point</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPoint.latitude.toFixed(5)},{" "}
                        {selectedPoint.longitude.toFixed(5)}
                      </div>
                    </div>
                  </MapPopup>
                </MapMarker>
              ) : null}
            </MapLayers>
          </Map>
        </div>
      </CardContent>
    </Card>
  )
}

function PointSelectionEvents({
  onPointSelected,
  selectOn = "click",
}: {
  onPointSelected: (point: SelectedPoint) => void
  selectOn?: "click" | "doubleClick"
}) {
  const handlePointSelected = React.useCallback(
    (event: { latlng: { lat: number; lng: number } }) => {
      onPointSelected({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      })
    },
    [onPointSelected]
  )

  useMapEvents(
    selectOn === "doubleClick"
      ? { dblclick: handlePointSelected }
      : { click: handlePointSelected }
  )

  return null
}

export function useTrialArtifacts(enabled = true): TrialArtifactsState {
  const [artifacts, setArtifacts] =
    React.useState<TrialClassifierArtifacts | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    loadTrialClassifierArtifacts(controller.signal)
      .then(setArtifacts)
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Trial classifier artifacts could not be loaded."
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return { artifacts, loading, error }
}

function PointPanel({
  sites,
  selectedPoint,
  onPointSelected,
  placeholderActive,
  isLoadingClimateProfile,
  climateProfileError,
  mapActionLabel = "Click",
}: {
  sites: TrialSiteRegistryRow[]
  selectedPoint: SelectedPoint | null
  onPointSelected: (point: SelectedPoint) => void
  placeholderActive: boolean
  isLoadingClimateProfile: boolean
  climateProfileError: string | null
  mapActionLabel?: string
}) {
  return (
    <Card className="border-border/70 bg-background/75">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="h-4 w-4" />
          Site selection
        </CardTitle>
        <CardDescription>
          {mapActionLabel} the map, type coordinates, or choose a trial site as the selected point.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Latitude
            <Input
              type="number"
              step="0.000001"
              value={selectedPoint?.latitude ?? ""}
              onChange={(event) =>
                onPointSelected({
                  latitude: Number(event.target.value),
                  longitude: selectedPoint?.longitude ?? 0,
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Longitude
            <Input
              type="number"
              step="0.000001"
              value={selectedPoint?.longitude ?? ""}
              onChange={(event) =>
                onPointSelected({
                  latitude: selectedPoint?.latitude ?? 0,
                  longitude: Number(event.target.value),
                })
              }
            />
          </label>
        </div>

        <div className="grid gap-1.5">
          <Label>Known trial site</Label>
          <Select
            value=""
            onValueChange={(siteId) => {
              const site = sites.find((item) => item.site_id === siteId)
              if (site) {
                onPointSelected({
                  latitude: site.latitude,
                  longitude: site.longitude,
                })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Jump to a trial site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.site_id} value={site.site_id}>
                  {site.site_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm">
          <div className="font-medium text-foreground">
            Climate profile status
          </div>
          <p className="mt-1 text-muted-foreground">
            {isLoadingClimateProfile
              ? "Running the Earth Engine-backed site classifier for the selected point."
              : placeholderActive
                ? "Climate extraction is unavailable for this point. Analogue sites are ranked by coordinate proximity with low confidence."
              : "Climate vector detected. Analogue sites are ranked by weighted climate distance."}
          </p>
          {climateProfileError ? (
            <p className="mt-2 text-xs text-amber-700">{climateProfileError}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ClimateMatchPanel({ matches }: { matches: ClimateMatch[] }) {
  return (
    <Card className="border-border/70 bg-background/75">
      <CardHeader>
        <CardTitle className="text-base">Climate analogue sites</CardTitle>
        <CardDescription>
          Top 3 trial sites returned by the classifier for the selected point.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.length ? (
          matches.map((match, index) => (
            <div
              key={match.site.site_id}
              className="rounded-md border border-border/70 bg-background/70 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {index + 1}. {match.site.site_name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(match.coordinate_distance_km, 1)} km from selected point
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    match.confidence === "high" && "border-emerald-300 text-emerald-700",
                    match.confidence === "medium" && "border-amber-300 text-amber-700",
                    match.confidence === "low" && "border-slate-300 text-slate-600"
                  )}
                >
                  {match.confidence} confidence
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="font-medium text-foreground">Drivers: </span>
                  {match.similarity_drivers.join(", ")}
                </div>
                <div>
                  <span className="font-medium text-foreground">Mismatches: </span>
                  {match.mismatch_drivers.join(", ")}
                </div>
              </div>
              {match.outside_trial_envelope_warning ? (
                <div className="mt-3 flex gap-2 rounded-md border border-amber-300/70 bg-amber-50/80 p-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{match.outside_trial_envelope_warning}</span>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-md border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Select a point to calculate analogue trial sites.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RankingControls({
  artifacts,
  weights,
  setWeights,
  climateVariableKeys,
  climateVariableWeights,
  setClimateVariableWeights,
}: {
  artifacts: TrialClassifierArtifacts
  weights: RankingWeights
  setWeights: React.Dispatch<React.SetStateAction<RankingWeights>>
  climateVariableKeys: string[]
  climateVariableWeights: RankingWeights
  setClimateVariableWeights: React.Dispatch<React.SetStateAction<RankingWeights>>
}) {
  const rankingMetrics = artifacts.rankingConfig.available_metrics
  const fallbackWeights = React.useMemo(
    () => buildInitialRankingWeights(artifacts.rankingConfig),
    [artifacts.rankingConfig]
  )
  const rankingWeightTotal = getRankingWeightTotal(weights, rankingMetrics)

  return (
    <Card className="border-border/70 bg-background/75">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4" />
          Ranking priorities
        </CardTitle>
        <CardDescription className="flex items-center justify-between gap-3">
          <span>Scores are recalculated from precomputed component z-score columns.</span>
          <Badge variant="outline">
            Total {Math.round(rankingWeightTotal * 100)}%
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rankingMetrics.map((metric) => {
          const value = weights[metric.key] ?? 0

          return (
            <div key={metric.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{metric.label}</div>
                  {metric.assumption ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {metric.assumption}
                    </div>
                  ) : null}
                </div>
                <Badge variant="secondary">{Math.round(value * 100)}%</Badge>
              </div>
              <div className="flex items-center gap-3">
                {metric.optional ? (
                  <Checkbox
                    checked={value > 0}
                    onCheckedChange={(checked) =>
                      setWeights((current) =>
                        rebalanceRankingWeights({
                          current,
                          metrics: rankingMetrics,
                          changedKey: metric.key,
                          nextValue: checked === true ? 0.15 : 0,
                          fallbackWeights,
                        })
                      )
                    }
                  />
                ) : null}
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={value}
                  onChange={(event) =>
                    setWeights((current) =>
                      rebalanceRankingWeights({
                        current,
                        metrics: rankingMetrics,
                        changedKey: metric.key,
                        nextValue: Number(event.target.value),
                        fallbackWeights,
                      })
                    )
                  }
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )
        })}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() =>
            setWeights(
              normalizeRankingWeights(fallbackWeights, rankingMetrics, fallbackWeights)
            )
          }
        >
          <RotateCcw className="h-4 w-4" />
          Reset default weights
        </Button>

        {climateVariableKeys.length ? (
          <div className="space-y-3 border-t border-border/70 pt-4">
            <div>
              <div className="text-sm font-medium">Climate distance weights</div>
              <div className="text-xs text-muted-foreground">
                These apply to the scaled TerraClimate vectors from the site classifier.
              </div>
            </div>
            {climateVariableKeys.slice(0, 8).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-28 truncate text-xs">{startCase(key)}</Label>
                <Input
                  type="range"
                  min="0"
                  max="3"
                  step="0.25"
                  value={climateVariableWeights[key] ?? 1}
                  onChange={(event) =>
                    setClimateVariableWeights((current) => ({
                      ...current,
                      [key]: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <span className="w-8 text-right text-xs">
                  {(climateVariableWeights[key] ?? 1).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function VarietyTable({
  rows,
  match,
  onSelect,
}: {
  rows: RankedTrialPerformanceRow[]
  match: ClimateMatch
  onSelect: (selection: SelectedVariety) => void
}) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
        No latest-age ranked entries are available for this site and group.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Rank</TableHead>
            <TableHead>Variety</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">DBH</TableHead>
            <TableHead className="text-right">Height</TableHead>
            <TableHead className="text-right">Stem</TableHead>
            <TableHead className="text-right">Survival</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.site_id}-${row.genus_group}-${row.entry}`}>
              <TableCell className="font-medium">{row.runtime_rank}</TableCell>
              <TableCell>
                <div className="font-medium">{row.entry}</div>
                <div className="text-xs text-muted-foreground">
                  {row.trial_family} - {row.age_months} months
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.runtime_composite_score, 3)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.mean_dbh_cm, 1)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.mean_height_m, 1)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.mean_stem_score, 1)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.survival_rate)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => onSelect({ row, match })}
                >
                  <BarChart3 className="h-4 w-4" />
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function VarietyGroups({
  artifacts,
  matches,
  weights,
  onSelect,
}: {
  artifacts: TrialClassifierArtifacts
  matches: ClimateMatch[]
  weights: RankingWeights
  onSelect: (selection: SelectedVariety) => void
}) {
  return (
    <Tabs defaultValue="eucalyptus_clonal_hybrid" className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="w-max min-w-full justify-start">
          {genusGroups.map((group) => (
            <TabsTrigger key={group.key} value={group.key}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {genusGroups.map((group) => (
        <TabsContent key={group.key} value={group.key} className="space-y-4">
          {matches.length ? (
            matches.map((match) => {
              const rows = rankVarietiesForSiteGroup({
                siteId: match.site.site_id,
                genusGroup: group.key,
                performanceRows: artifacts.performanceRows,
                defaultTopRows: artifacts.defaultTopRows,
                rankingConfig: artifacts.rankingConfig,
                weights,
              })

              return (
                <Card
                  key={`${match.site.site_id}-${group.key}`}
                  className="border-border/70 bg-background/75"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {match.site.site_name}
                        </CardTitle>
                        <CardDescription>
                          {group.label} ranked within site, group, and latest measurement age.
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {match.site.available_genus_groups.includes(group.key)
                          ? "Available"
                          : "No trial group"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <VarietyTable rows={rows} match={match} onSelect={onSelect} />
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-border/70 bg-background/75">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Select a point before ranking analogue-site varieties.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function buildHistogramData(distribution: VarietyDistribution) {
  return distribution.histogram.counts.map((count, index) => ({
    bin:
      distribution.histogram.bins[index] !== undefined
        ? Number(distribution.histogram.bins[index].toFixed(2))
        : index,
    count,
  }))
}

function buildKdeData(distribution: VarietyDistribution) {
  return distribution.kde.x.map((x, index) => ({
    x: Number(x.toFixed(2)),
    density: distribution.kde.y[index] ?? 0,
  }))
}

function DistributionCharts({
  distributions,
}: {
  distributions: VarietyDistribution[]
}) {
  if (!distributions.length) {
    return (
      <div className="rounded-md border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
        Distribution arrays are not available for this variety.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {distributions.slice(0, 3).map((distribution) => (
        <div key={distribution.metric} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{distribution.label}</div>
              <div className="text-xs text-muted-foreground">
                n={distribution.n}, mean {formatNumber(distribution.mean, 2)}, p50{" "}
                {formatNumber(distribution.p50, 2)}
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-48 rounded-md border border-border/70 p-3">
              <ChartContainer
                config={{ count: { label: "Count", color: "#047857" } }}
                className="h-full w-full"
              >
                <BarChart data={buildHistogramData(distribution)}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="bin" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="h-48 rounded-md border border-border/70 p-3">
              <ChartContainer
                config={{ density: { label: "KDE", color: "#2563eb" } }}
                className="h-full w-full"
              >
                <LineChart data={buildKdeData(distribution)}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="x" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="density"
                    stroke="var(--color-density)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StabilityPanel({
  summary,
}: {
  summary: VarietyCrossSiteSummary | undefined
}) {
  if (!summary) {
    return (
      <div className="rounded-md border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
        No cross-site summary is available for this variety.
      </div>
    )
  }

  const stats = [
    ["Sites tested", summary.n_sites.toString()],
    ["Stability", startCase(summary.stability_class)],
    ["Mean rank", formatNumber(summary.mean_default_rank, 1)],
    ["Best rank", formatNumber(summary.best_default_rank, 0)],
    ["Worst rank", formatNumber(summary.worst_default_rank, 0)],
    ["Cross-site survival", formatPercent(summary.cross_site_survival_rate)],
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-border/70 bg-background/70 p-3"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
        {summary.sites_tested}
      </div>
    </div>
  )
}

function VarietyDrawer({
  selection,
  artifacts,
  onOpenChange,
}: {
  selection: SelectedVariety | null
  artifacts: TrialClassifierArtifacts | null
  onOpenChange: (open: boolean) => void
}) {
  const row = selection?.row
  const distributions = React.useMemo(() => {
    if (!row || !artifacts) return []
    return artifacts.distributions.filter(
      (distribution) =>
        distribution.site_id === row.site_id &&
        distribution.genus_group === row.genus_group &&
        distribution.entry === row.entry &&
        distribution.age_months === row.age_months
    )
  }, [artifacts, row])

  const stabilitySummary = React.useMemo(() => {
    if (!row || !artifacts) return undefined
    return artifacts.crossSiteSummaries.find(
      (summary) =>
        summary.entry === row.entry && summary.genus_group === row.genus_group
    )
  }, [artifacts, row])

  return (
    <Drawer open={Boolean(selection)} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="overflow-y-auto sm:max-w-3xl">
        {row ? (
          <>
            <DrawerHeader className="border-b border-border/70">
              <DrawerTitle>{row.entry}</DrawerTitle>
              <DrawerDescription>
                {row.site_name} - {startCase(row.genus_group)} - {row.age_months} months
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-6 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Runtime score", formatNumber(row.runtime_composite_score, 3)],
                  ["Survival", formatPercent(row.survival_rate)],
                  ["Mean DBH", `${formatNumber(row.mean_dbh_cm, 1)} cm`],
                  ["Mean height", `${formatNumber(row.mean_height_m, 1)} m`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-border/70 bg-background/70 p-3"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Distributions</h3>
                <DistributionCharts distributions={distributions} />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Cross-site summary</h3>
                <StabilityPanel summary={stabilitySummary} />
              </section>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function CaveatsPanel() {
  const caveats = [
    "Stem form direction is assumed higher-is-better; verify with the trial codebook.",
    "Survival is inferred as live measured rows divided by recorded tree rows; D/dead rows are treated as dead.",
    "Volume is a proxy: pi * (dbh_cm / 200)^2 * height_m * 0.45.",
    "Climate profiles use TerraClimate through the backend Earth Engine site classifier for 2015-2024; failed live point extractions fall back to coordinate proximity.",
    "Different groups and ages should not be compared unless age-normalized.",
  ]

  return (
    <Card className="border-border/70 bg-background/75">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          Caveats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm text-muted-foreground">
          {caveats.map((caveat) => (
            <div key={caveat} className="rounded-md border border-border/70 bg-background/70 p-3">
              {caveat}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface TrialSiteClassifierAnalysisProps {
  selectedPoint?: SelectedPoint | null
  onSelectedPointChange?: (point: SelectedPoint) => void
  hideMap?: boolean
  selectionMode?: "click" | "doubleClick"
  artifactsState?: TrialArtifactsState
}

export function TrialSiteClassifierAnalysis({
  selectedPoint: controlledSelectedPoint,
  onSelectedPointChange,
  hideMap = false,
  selectionMode = "click",
  artifactsState,
}: TrialSiteClassifierAnalysisProps = {}) {
  const internalArtifactsState = useTrialArtifacts(!artifactsState)
  const { artifacts, loading, error } = artifactsState ?? internalArtifactsState
  const [internalSelectedPoint, setInternalSelectedPoint] = React.useState<SelectedPoint | null>({
    latitude: -8.15151,
    longitude: 35.4027,
  })
  const [rankingWeights, setRankingWeights] = React.useState<RankingWeights>({})
  const [climateVariableWeights, setClimateVariableWeights] =
    React.useState<RankingWeights>({})
  const [selectedVariety, setSelectedVariety] =
    React.useState<SelectedVariety | null>(null)
  const [selectedClimateProfile, setSelectedClimateProfile] =
    React.useState<SelectedClimateProfile | null>(null)
  const [isLoadingClimateProfile, setIsLoadingClimateProfile] =
    React.useState(false)
  const [climateProfileError, setClimateProfileError] =
    React.useState<string | null>(null)
  const isSelectedPointControlled = controlledSelectedPoint !== undefined
  const selectedPoint = isSelectedPointControlled
    ? controlledSelectedPoint
    : internalSelectedPoint
  const setSelectedPoint = React.useCallback(
    (point: SelectedPoint) => {
      if (!isSelectedPointControlled) {
        setInternalSelectedPoint(point)
      }
      onSelectedPointChange?.(point)
    },
    [isSelectedPointControlled, onSelectedPointChange]
  )

  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  )

  React.useEffect(() => {
    if (!artifacts) return
    const initialWeights = buildInitialRankingWeights(artifacts.rankingConfig)
    setRankingWeights(
      normalizeRankingWeights(
        initialWeights,
        artifacts.rankingConfig.available_metrics,
        initialWeights
      )
    )
  }, [artifacts])

  const climateVariableKeys = React.useMemo(
    () => getVectorKeys(artifacts),
    [artifacts]
  )

  React.useEffect(() => {
    if (!climateVariableKeys.length) return
    setClimateVariableWeights((current) => {
      const nextWeights = { ...current }
      climateVariableKeys.forEach((key) => {
        nextWeights[key] = nextWeights[key] ?? 1
      })
      return nextWeights
    })
  }, [climateVariableKeys])

  React.useEffect(() => {
    if (!artifacts || !selectedPoint) {
      setSelectedClimateProfile(null)
      return
    }

    const controller = new AbortController()
    setIsLoadingClimateProfile(true)
    setClimateProfileError(null)

    fetchSelectedClimateProfileFromSiteClassifier({
      point: selectedPoint,
      apiBaseUrl,
      trialProfiles: artifacts.climateProfiles,
      signal: controller.signal,
    })
      .then(setSelectedClimateProfile)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error
            ? error.message
            : "The site classifier could not extract a climate profile."
        setSelectedClimateProfile(
          createPlaceholderSelectedClimateProfile(selectedPoint, [message])
        )
        setClimateProfileError(message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingClimateProfile(false)
        }
      })

    return () => controller.abort()
  }, [apiBaseUrl, artifacts, selectedPoint])

  const matches = React.useMemo(() => {
    if (!artifacts || !selectedClimateProfile) return []
    return classifyClimateAnalogues({
      selectedProfile: selectedClimateProfile,
      trialProfiles: artifacts.climateProfiles,
      variableWeights: climateVariableWeights,
      limit: 3,
    })
  }, [artifacts, climateVariableWeights, selectedClimateProfile])

  const placeholderActive = Boolean(
    selectedClimateProfile?.climate_profile_status === "placeholder" ||
      artifacts?.climateProfiles.every((profile) => !profile.scaled_climate_vector)
  )

  return (
      <div className="@container/main space-y-5 px-4 lg:px-6">
        {loading ? (
          <Card className="border-border/70 bg-background/75">
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading trial classifier artifacts.
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-300/70 bg-red-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Trial artifacts unavailable
              </CardTitle>
              <CardDescription className="text-red-800/80">
                {error}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {artifacts ? (
          <>
            <div className="grid gap-5">
              {!hideMap ? (
                <TrialSiteClassifierMap
                  artifacts={artifacts}
                  loading={loading}
                  error={error}
                  selectedPoint={selectedPoint}
                  matches={matches}
                  onPointSelected={setSelectedPoint}
                  selectOn={selectionMode}
                />
              ) : null}

              <div className="space-y-5">
                <PointPanel
                  sites={artifacts.sites}
                  selectedPoint={selectedPoint}
                  onPointSelected={setSelectedPoint}
                  placeholderActive={placeholderActive}
                  isLoadingClimateProfile={isLoadingClimateProfile}
                  climateProfileError={climateProfileError}
                  mapActionLabel={
                    selectionMode === "doubleClick" ? "Double-click" : "Click"
                  }
                />
                <ClimateMatchPanel matches={matches} />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="space-y-5">
                <RankingControls
                  artifacts={artifacts}
                  weights={rankingWeights}
                  setWeights={setRankingWeights}
                  climateVariableKeys={climateVariableKeys}
                  climateVariableWeights={climateVariableWeights}
                  setClimateVariableWeights={setClimateVariableWeights}
                />
                <CaveatsPanel />
              </div>
              <VarietyGroups
                artifacts={artifacts}
                matches={matches}
                weights={rankingWeights}
                onSelect={setSelectedVariety}
              />
            </div>

            <Card className="border-border/70 bg-background/75">
              <CardHeader>
                <CardTitle className="text-base">Runtime scoring contract</CardTitle>
                <CardDescription>
                  {artifacts.rankingConfig.recommended_runtime_formula}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChartPreview rows={artifacts.defaultTopRows.slice(0, 24)} />
              </CardContent>
            </Card>

            <VarietyDrawer
              selection={selectedVariety}
              artifacts={artifacts}
              onOpenChange={(open) => {
                if (!open) setSelectedVariety(null)
              }}
            />
          </>
        ) : null}
      </div>
  )
}

export default function TrialSiteClassifierPage() {
  return (
    <BaseLayout
      title="Trial-site classifier"
      description="Match selected sites to analogue trials and rank varieties using precomputed performance evidence."
    >
      <TrialSiteClassifierAnalysis />
    </BaseLayout>
  )
}

function AreaChartPreview({ rows }: { rows: RankedTrialPerformanceRow[] | TrialClassifierArtifacts["defaultTopRows"] }) {
  const chartRows = rows.map((row) => ({
    entry: row.entry.length > 12 ? `${row.entry.slice(0, 12)}...` : row.entry,
    score:
      typeof row.default_composite_score === "number"
        ? Number(row.default_composite_score.toFixed(3))
        : 0,
  }))

  return (
    <div className="h-56">
      <ChartContainer
        config={{ score: { label: "Default score", color: "#0f766e" } }}
        className="h-full w-full"
      >
        <AreaChart data={chartRows}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="entry" tickLine={false} axisLine={false} hide />
          <YAxis tickLine={false} axisLine={false} width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-score)"
            fill="var(--color-score)"
            fillOpacity={0.18}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
