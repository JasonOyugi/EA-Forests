"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"
import {
  AlertTriangle,
  LoaderCircle,
  MapPinned,
  Play,
  RotateCcw,
  Settings,
} from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Map,
  MapMarker,
  MapPopup,
  MapTileLayer,
} from "@/components/ui/map"
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  agreementFamilyCategoryOptions,
  agreementFamilyCategoryMap,
  dataTypeOptions,
  defaultSiteClassificationForm,
  dynamicMetricGroupOptions,
  type AgreementFamilyCategory,
  type DynamicMetricGroup,
  type SiteClassificationForm,
  type SiteModelDataType,
  type SiteModelSource,
  staticMetricGroupOptions,
  type StaticMetricGroup,
  sourceOptions,
} from "@/app/models/data"

type TableRowValue = string | number | boolean | null
type TableRowRecord = Record<string, TableRowValue>

const EARTH_ENGINE_AUTH_COMMAND = [
  "cd backend",
  "$env:EARTH_ENGINE_PROJECT='your-google-cloud-project-id'",
  "$env:UV_CACHE_DIR='c:\\Users\\JasonOyugi\\Downloads\\EA_Forests\\.uv-cache'",
  "uv run python -m app.auth_earth_engine",
].join("\n")

const earthEngineSources: SiteModelSource[] = [
  "terraclimate",
  "chirps",
  "era5_land_ee",
]

const dynamicSummaryExcludedColumns = new Set([
  "site_id",
  "source",
  "lon",
  "lat",
  "date",
  "year",
  "month",
  "month_name",
  "climate_buffer_m",
  "native_resolution",
  "extraction_method",
])

const sourceColumnSuffixes: Record<SiteModelSource, string[]> = {
  terraclimate: ["terraclimate"],
  chirps: ["chirps"],
  nasa_power: ["nasa_power"],
  era5_land_ee: ["era5_land_ee", "era5_land"],
}

interface BackendError {
  scope: string
  source?: string
  message: string
}

interface BackendEarthEngineStatus {
  available: boolean
  authenticated: boolean
  required?: boolean
  message: string
}

interface BackendSiteClassificationResponse {
  request: Record<string, unknown>
  source_tables: Record<string, TableRowRecord[]>
  source_summaries: Record<string, Record<string, TableRowRecord[]>>
  static_table: TableRowRecord[]
  comparison_table: TableRowRecord[]
  agreement_report: TableRowRecord[]
  agreement_ranking: TableRowRecord[]
  warnings: string[]
  errors: BackendError[]
  earth_engine: BackendEarthEngineStatus
}

interface LockedCoordinate {
  lat: number
  lon: number
}

function startCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toggleSelection<T extends string>(
  values: T[],
  nextValue: T,
  checked: boolean
) {
  if (checked) {
    return values.includes(nextValue) ? values : [...values, nextValue]
  }

  return values.filter((value) => value !== nextValue)
}

function getDynamicMetricBase(column: string) {
  let base = String(column)

  // strip known source suffixes (e.g. _terraclimate, _chirps, _nasa_power, _era5_land)
  for (const source of sourceOptions) {
    for (const suffixName of sourceColumnSuffixes[source]) {
      const suffix = `_${suffixName}`
      if (base.endsWith(suffix)) {
        base = base.slice(0, -suffix.length)
        break
      }
    }
  }

  base = base.toLowerCase()

  // remove common unit-like suffixes
  base = base.replace(/_(mm|c|mj_m2_day|m3_m3|pct|ms|kwh_m2_day|raw_sign|sum)$/, "")

  // canonicalize to a small set of metric keys so metrics align across sources
  if (base.includes("tmin")) return "tmin"
  if (base.includes("tmax")) return "tmax"
  if (base.includes("tmean") || base.includes("temperature") || base.includes("temp")) return "tmean"
  if (base.includes("ppt") || base.includes("precip") || base.includes("rain")) return "ppt"
  if (base.includes("pet")) return "pet"
  if (base.includes("aet") || base.includes("actual_evapotranspiration")) return "aet"
  if (base.includes("runoff")) return "runoff"
  if (base.includes("vpd")) return "vpd"
  if (base.includes("srad") || base.includes("solar") || base.includes("radiation")) return "srad"
  if (base.includes("soil") || base.includes("volumetric") || base.includes("layer")) return "soil_water"
  if (base.includes("wind")) return "wind"

  // fallback: strip non-alphanumeric/underscore and return
  return base.replace(/[^a-z0-9_]/g, "")
}

function formatChartLabel(value: string) {
  return startCase(value.replace(/_terraclimate|_chirps|_nasa_power|_era5_land_ee|_era5_land$/, ""))
}

function isDynamicSummaryMetricColumn(column: string) {
  const base = getDynamicMetricBase(column)
  return !dynamicSummaryExcludedColumns.has(base) && base !== column
}

function columnBelongsToSource(column: string, source: SiteModelSource) {
  return sourceColumnSuffixes[source].some((suffixName) =>
    column.endsWith(`_${suffixName}`)
  )
}

function toChartNumber(value: TableRowValue) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string" && value.trim() !== "") {
    const nextValue = Number(value)
    return Number.isFinite(nextValue) ? nextValue : null
  }
  return null
}

function findDynamicMetricColumn(
  row: TableRowRecord,
  source: SiteModelSource,
  metric: string
) {
  return Object.keys(row).find(
    (column) =>
      isDynamicSummaryMetricColumn(column) &&
      columnBelongsToSource(column, source) &&
      getDynamicMetricBase(column) === metric
  )
}

function formatSourceList(values: string[]) {
  if (!values.length) return ""
  return values.map(startCase).join(", ")
}

function earthEngineBadgeText(status: BackendEarthEngineStatus) {
  if (status.required === false) return "Earth Engine not used"
  return status.authenticated ? "Earth Engine ready" : "Earth Engine needs auth"
}

function earthEngineBadgeClass(status: BackendEarthEngineStatus) {
  if (status.required === false) return "border-border/70 text-muted-foreground"
  return status.authenticated
    ? "border-emerald-300 text-emerald-700"
    : "border-amber-300 text-amber-700"
}

function summarizeBackendErrors(errors: BackendError[]) {
  return errors
    .map((error) =>
      [error.scope, error.source, error.message].filter(Boolean).join(": ")
    )
    .join(" ")
}

function hasSiteClassificationOutput(result: BackendSiteClassificationResponse) {
  return (
    Object.values(result.source_tables ?? {}).some((rows) => rows.length > 0) ||
    result.static_table.length > 0 ||
    result.comparison_table.length > 0 ||
    result.agreement_report.length > 0
  )
}

function downloadCSV(rows: TableRowRecord[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(",")].concat(
    rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) {
            return ""
          }
          const cell = String(value).replace(/"/g, '""')
          return `"${cell}"`
        })
        .join(",")
    )
  )
  const blob = new Blob([csv.join("\r\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function CoordinateMapEvents({
  onCoordinateLock,
}: {
  onCoordinateLock: (coordinate: LockedCoordinate) => void
}) {
  useMapEvents({
    dblclick(event) {
      onCoordinateLock({
        lat: Number(event.latlng.lat.toFixed(6)),
        lon: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })

  return null
}

function CoordinateFocus({
  coordinate,
}: {
  coordinate: LockedCoordinate | null
}) {
  const map = useMap()

  React.useEffect(() => {
    if (!coordinate) return

    map.flyTo([coordinate.lat, coordinate.lon], Math.max(map.getZoom(), 9), {
      duration: 0.8,
    })
  }, [coordinate, map])

  return null
}

function SelectionGroup<T extends string>({
  title,
  options,
  values,
  onToggle,
  required = false,
  showSelectAll = false,
}: {
  title: string
  options: T[]
  values: T[]
  onToggle: (nextValues: T[]) => void
  required?: boolean
  showSelectAll?: boolean
}) {
  const allSelected = options.every((option) => values.includes(option))

  const handleSelectAll = () => {
    if (allSelected) {
      onToggle(values.filter((value) => !options.includes(value)))
      return
    }

    onToggle(Array.from(new Set([...values, ...options])))
  }

  return (
    <Card className="gap-4 border-border/70 bg-background/70 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          {showSelectAll ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleSelectAll}
            >
              {allSelected ? "Clear" : "Select all"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 px-5 grid-cols-1 sm:grid-cols-2">
        {options.map((option) => {
          const isChecked = values.includes(option)
          const disableToggleOff = required && isChecked && values.length === 1

          return (
            <label
              key={option}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/75 px-3 py-2 text-sm"
            >
              <Checkbox
                checked={isChecked}
                disabled={disableToggleOff}
                onCheckedChange={(checked) =>
                  onToggle(toggleSelection(values, option, checked === true))
                }
              />
              <span className="font-medium">{startCase(option)}</span>
            </label>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ModelTableCard({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: TableRowRecord[]
}) {
  if (!rows.length) return null

  const columns = Object.keys(rows[0])

  return (
    <Card className="gap-4 border-border/70 bg-background/75 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="px-4 capitalize">
                  {column.replaceAll("_", " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${title}-${index}`}>
                {columns.map((column) => (
                  <TableCell key={`${title}-${index}-${column}`} className="px-4">
                    {row[column] === null ? "—" : String(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function SiteClassificationPage() {
  const [draftForm, setDraftForm] = React.useState<SiteClassificationForm>(
    defaultSiteClassificationForm
  )
  const [lockedCoordinate, setLockedCoordinate] =
    React.useState<LockedCoordinate | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<BackendSiteClassificationResponse | null>(null)
  const [agreementFamilyCategories, setAgreementFamilyCategories] =
    React.useState<AgreementFamilyCategory[]>(agreementFamilyCategoryOptions)
  const [dynamicSummaryPeriod, setDynamicSummaryPeriod] =
    React.useState<"monthly" | "annual">("monthly")
  const [selectedDynamicSources, setSelectedDynamicSources] =
    React.useState<SiteModelSource[]>(sourceOptions)
  const [selectedDynamicMetrics, setSelectedDynamicMetrics] = React.useState<string[]>([])
  const [earthEngineStatus, setEarthEngineStatus] =
    React.useState<BackendEarthEngineStatus | null>(null)
  const [isCheckingEarthEngine, setIsCheckingEarthEngine] = React.useState(false)

  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  )

  const expandedAgreementFamilies = React.useMemo(
    () =>
      Array.from(
        new Set(
          agreementFamilyCategories.flatMap(
            (category) => agreementFamilyCategoryMap[category]
          )
        )
      ),
    [agreementFamilyCategories]
  )

  const selectedEarthEngineSources = React.useMemo(
    () =>
      draftForm.dataTypes.includes("dynamic")
        ? draftForm.sources.filter((source) => earthEngineSources.includes(source))
        : [],
    [draftForm.dataTypes, draftForm.sources]
  )

  const selectedEarthEngineStaticGroups = React.useMemo(
    () =>
      draftForm.dataTypes.includes("static") &&
      draftForm.staticMetricGroups.includes("topography")
        ? ["topography"]
        : [],
    [draftForm.dataTypes, draftForm.staticMetricGroups]
  )

  const needsEarthEngine =
    selectedEarthEngineSources.length > 0 ||
    selectedEarthEngineStaticGroups.length > 0

  const displayedEarthEngineStatus =
    earthEngineStatus ?? result?.earth_engine ?? null

  const earthEngineReady =
    !needsEarthEngine || displayedEarthEngineStatus?.authenticated === true

  const refreshEarthEngineStatus = React.useCallback(async () => {
    setIsCheckingEarthEngine(true)
    try {
      const response = await fetch(`${apiBaseUrl}/earth-engine/status`)
      const responseText = await response.text()
      const parsed = responseText ? JSON.parse(responseText) : null

      if (!response.ok) {
        throw new Error(
          parsed?.detail ||
            parsed?.message ||
            `Backend status check failed with status ${response.status}.`
        )
      }

      const status = parsed as BackendEarthEngineStatus
      setEarthEngineStatus(status)
      return status
    } catch (error) {
      const status = {
        available: false,
        authenticated: false,
        required: true,
        message:
          error instanceof Error
            ? error.message
            : "Earth Engine status could not be checked.",
      }
      setEarthEngineStatus(status)
      return status
    } finally {
      setIsCheckingEarthEngine(false)
    }
  }, [apiBaseUrl])

  React.useEffect(() => {
    void refreshEarthEngineStatus()
  }, [refreshEarthEngineStatus])

  const runSiteClassification = React.useCallback(async () => {
    if (!lockedCoordinate) {
      setRunError("Double-click on the map first to lock a coordinate.")
      return
    }

    setIsRunning(true)
    setRunError(null)

    try {
      if (needsEarthEngine) {
        const latestStatus = await refreshEarthEngineStatus()

        if (!latestStatus?.authenticated) {
          throw new Error(
            latestStatus?.message ||
              "Google Earth Engine authentication is required for the selected inputs."
          )
        }
      }

      const response = await fetch(`${apiBaseUrl}/models/site-classification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_id: "selected_coordinate",
          lon: lockedCoordinate.lon,
          lat: lockedCoordinate.lat,
          start_year: draftForm.startYear,
          end_year: draftForm.endYear,
          sources: draftForm.sources,
          data_types: draftForm.dataTypes,
          dynamic_metric_groups: draftForm.dynamicMetricGroups,
          static_metric_groups: draftForm.staticMetricGroups,
          summary_levels: draftForm.summaryLevels,
          agreement_families: expandedAgreementFamilies,
          climate_buffer_m: 5000,
          topo_buffer_m: 300,
          min_overlap: 12,
        }),
      })

      const responseText = await response.text()
      const parsed = responseText ? JSON.parse(responseText) : null

      if (!response.ok) {
        throw new Error(
          parsed?.detail ||
            parsed?.message ||
            `Backend request failed with status ${response.status}.`
        )
      }

      const nextResult = parsed as BackendSiteClassificationResponse
      setResult(nextResult)
      if (nextResult?.earth_engine) {
        setEarthEngineStatus(nextResult.earth_engine)
      }

      if (nextResult.errors?.length && !hasSiteClassificationOutput(nextResult)) {
        setRunError(summarizeBackendErrors(nextResult.errors))
      }
    } catch (error) {
      setResult(null)
      setRunError(
        error instanceof Error ? error.message : "The backend request failed."
      )
    } finally {
      setIsRunning(false)
    }
  }, [
    apiBaseUrl,
    draftForm,
    expandedAgreementFamilies,
    lockedCoordinate,
    needsEarthEngine,
    refreshEarthEngineStatus,
  ])

  const updateYear =
    (field: "startYear" | "endYear") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)
      setDraftForm((current) => ({
        ...current,
        [field]: Number.isFinite(nextValue) ? nextValue : current[field],
      }))
    }

  const updateCoordinate =
    (field: "lat" | "lon") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)
      setLockedCoordinate((current) => ({
        lat: field === "lat" ? nextValue : current?.lat ?? 0,
        lon: field === "lon" ? nextValue : current?.lon ?? 0,
      }))
    }

  const setSources = (sources: SiteModelSource[]) => {
    setDraftForm((current) => ({ ...current, sources }))
  }

  const setDataTypes = (dataTypes: SiteModelDataType[]) => {
    setDraftForm((current) => ({ ...current, dataTypes }))
  }

  const setDynamicMetricGroups = (dynamicMetricGroups: DynamicMetricGroup[]) => {
    setDraftForm((current) => ({ ...current, dynamicMetricGroups }))
  }

  const setStaticMetricGroups = (staticMetricGroups: StaticMetricGroup[]) => {
    setDraftForm((current) => ({ ...current, staticMetricGroups }))
  }

  const monthlyRows = React.useMemo(
    () =>
      Object.values(result?.source_summaries ?? {}).flatMap(
        (summary) => summary.monthly ?? []
      ),
    [result]
  )

  const annualRows = React.useMemo(
    () =>
      Object.values(result?.source_summaries ?? {}).flatMap(
        (summary) => summary.annual ?? []
      ),
    [result]
  )

  const dynamicSummaryRows = React.useMemo(
    () =>
      (dynamicSummaryPeriod === "annual" ? annualRows : monthlyRows) ?? [],
    [annualRows, monthlyRows, dynamicSummaryPeriod]
  )

  // Get available sources
  const dynamicSourceOptions = React.useMemo(
    () => Array.from(new Set(dynamicSummaryRows.map((row) => String(row.source)))) as SiteModelSource[],
    [dynamicSummaryRows]
  )

  React.useEffect(() => {
    setSelectedDynamicSources((current) => {
      const availableSources = new Set(dynamicSourceOptions)
      const selectedAvailableSources = current.filter((source) =>
        availableSources.has(source)
      )
      const nextSources =
        selectedAvailableSources.length > 0
          ? selectedAvailableSources
          : dynamicSourceOptions

      if (
        nextSources.length === current.length &&
        nextSources.every((source, index) => source === current[index])
      ) {
        return current
      }

      return nextSources
    })
  }, [dynamicSourceOptions])

  // Get metrics available for each source
  const metricsPerSource = React.useMemo(() => {
    const map: Record<string, Set<string>> = {}
    dynamicSummaryRows.forEach((row) => {
      const source = String(row.source)
      if (!map[source]) {
        map[source] = new Set<string>()
      }
      Object.keys(row).forEach((column) => {
        const base = getDynamicMetricBase(column)
        if (isDynamicSummaryMetricColumn(column)) {
          map[source].add(base)
        }
      })
    })
    return map
  }, [dynamicSummaryRows])

  // Get metrics common to all selected sources
  const commonDynamicMetrics = React.useMemo(() => {
    if (selectedDynamicSources.length === 0) return []
    const sourceSets = selectedDynamicSources.map((s) => metricsPerSource[String(s)] ?? new Set())
    if (sourceSets.length === 0) return []
    const intersection = new Set(sourceSets[0])
    for (let i = 1; i < sourceSets.length; i++) {
      intersection.forEach((metric) => {
        if (!sourceSets[i].has(metric)) {
          intersection.delete(metric)
        }
      })
    }
    return Array.from(intersection)
  }, [selectedDynamicSources, metricsPerSource])

  // Auto-select all common metrics when sources change
  React.useEffect(() => {
    setSelectedDynamicMetrics(commonDynamicMetrics)
  }, [commonDynamicMetrics])


  // Build chart data
  const dynamicChartData = React.useMemo(() => {
    if (selectedDynamicSources.length === 0 || selectedDynamicMetrics.length === 0) {
      return []
    }

    const labelKey = dynamicSummaryPeriod === "annual" ? "year" : "month_name"
    const grouped = new globalThis.Map<string, TableRowRecord>()

    dynamicSummaryRows.forEach((row) => {
      if (!selectedDynamicSources.includes(row.source as SiteModelSource)) {
        return
      }

      const label = String(row[labelKey as keyof TableRowRecord] ?? "")
      const existing = grouped.get(label) ?? { label }

      selectedDynamicMetrics.forEach((metric) => {
        const key = `${metric}__${row.source}`
        const matchedColumn = findDynamicMetricColumn(
          row,
          row.source as SiteModelSource,
          metric
        )
        if (matchedColumn) {
          existing[key] = toChartNumber(row[matchedColumn])
        } else {
          existing[key] = null
        }
      })

      grouped.set(label, existing)
    })

    return Array.from(grouped.values())
  }, [dynamicSummaryRows, dynamicSummaryPeriod, selectedDynamicSources, selectedDynamicMetrics])

  // Build chart config with unique keys for each metric-source combo
  const dynamicChartConfig = React.useMemo(() => {
    const chartColors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#f97316",
      "#06b6d4",
      "#ef4444",
    ]
    const config: Record<string, { label: string; color: string }> = {}
    let colorIndex = 0

    selectedDynamicMetrics.forEach((metric) => {
      selectedDynamicSources.forEach((source) => {
        const key = `${metric}__${source}`
        config[key] = {
          label: `${formatChartLabel(metric)} (${startCase(source)})`,
          color: chartColors[colorIndex % chartColors.length],
        }
        colorIndex++
      })
    })
    return config
  }, [selectedDynamicMetrics, selectedDynamicSources])

  return (
    <BaseLayout
      title="Site classification"
      description="Double-click anywhere on the map to lock coordinates, choose the model parameters, then run the model to fully classify your site."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <Card className="gap-4 py-0">
              <CardHeader className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {lockedCoordinate ? (
                    <Badge variant="outline">
                      {lockedCoordinate.lat.toFixed(4)}, {lockedCoordinate.lon.toFixed(4)}
                    </Badge>
                  ) : null}
                  {result?.earth_engine ? (
                    <Badge
                      variant="outline"
                      className={earthEngineBadgeClass(result.earth_engine)}
                    >
                      {earthEngineBadgeText(result.earth_engine)}
                    </Badge>
                  ) : null}
                  {displayedEarthEngineStatus && !result?.earth_engine ? (
                    <Badge
                      variant="outline"
                      className={earthEngineBadgeClass(displayedEarthEngineStatus)}
                    >
                      {earthEngineBadgeText(displayedEarthEngineStatus)}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Map
                  center={[0.6, 33.2]}
                  zoom={6}
                  doubleClickZoom={false}
                  className="h-[520px] w-full rounded-none"
                >
                  <MapTileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <CoordinateMapEvents onCoordinateLock={setLockedCoordinate} />
                  <CoordinateFocus coordinate={lockedCoordinate} />
                  {lockedCoordinate ? (
                    <MapMarker
                      position={[lockedCoordinate.lat, lockedCoordinate.lon]}
                      icon={
                        <div className="rounded-full text-emerald-700 shadow-lg">
                          <MapPinned className="h-4 w-4" />
                        </div>
                      }
                    >
                      <MapPopup className="w-[min(20rem,calc(100vw-3rem))] p-0">
                        <div className="space-y-3 rounded-[18px] border bg-background p-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Locked coordinate
                            </div>
                            <div className="mt-1 text-sm font-medium">
                              Latitude: {lockedCoordinate.lat.toFixed(6)}
                            </div>
                            <div className="text-sm font-medium">
                              Longitude: {lockedCoordinate.lon.toFixed(6)}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Change this by double-clicking a new point on the map.
                          </p>
                        </div>
                      </MapPopup>
                    </MapMarker>
                  ) : null}
                </Map>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="gap-4 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-emerald-700" />
                    <CardTitle className="text-base">Run configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Latitude</span>
                      <Input
                        type="number"
                        step="0.000001"
                        value={lockedCoordinate?.lat ?? ""}
                        placeholder="Double-click map"
                        onChange={updateCoordinate("lat")}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Longitude</span>
                      <Input
                        type="number"
                        step="0.000001"
                        value={lockedCoordinate?.lon ?? ""}
                        placeholder="Double-click map"
                        onChange={updateCoordinate("lon")}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Start year</span>
                      <Input
                        type="number"
                        value={draftForm.startYear}
                        min={1981}
                        max={draftForm.endYear}
                        onChange={updateYear("startYear")}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">End year</span>
                      <Input
                        type="number"
                        value={draftForm.endYear}
                        min={draftForm.startYear}
                        max={2035}
                        onChange={updateYear("endYear")}
                      />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="w-full gap-2"
                      onClick={() => void runSiteClassification()}
                      disabled={
                        isRunning ||
                        !lockedCoordinate ||
                        (needsEarthEngine && !earthEngineReady)
                      }
                    >
                      {isRunning ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isRunning ? "Running model..." : "Run model"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setLockedCoordinate(null)
                        setRunError(null)
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear coordinate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {needsEarthEngine && !earthEngineReady ? (
                <Card className="gap-4 border-amber-300/70 bg-amber-50/80 py-5">
                  <CardHeader className="px-5">
                    <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                      <AlertTriangle className="h-4 w-4" />
                      Google Earth Engine authentication required
                    </CardTitle>
                    <CardDescription className="text-amber-900/80">
                      Selected Earth Engine inputs:{" "}
                      {formatSourceList([
                        ...selectedEarthEngineSources,
                        ...selectedEarthEngineStaticGroups,
                      ])}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5">
                    <pre className="max-w-full overflow-x-auto rounded-lg border border-amber-300/70 bg-background/80 p-3 text-xs text-foreground">
                      <code>{EARTH_ENGINE_AUTH_COMMAND}</code>
                    </pre>
                    {displayedEarthEngineStatus?.message ? (
                      <p className="text-sm text-amber-900">
                        {displayedEarthEngineStatus.message}
                      </p>
                    ) : null}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void refreshEarthEngineStatus()}
                      disabled={isCheckingEarthEngine}
                    >
                      {isCheckingEarthEngine ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Recheck Earth Engine status
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
            <SelectionGroup
              title="Sources"
              options={sourceOptions}
              values={draftForm.sources}
              onToggle={setSources}
              required
              showSelectAll
            />
            <SelectionGroup
              title="Data types"
              options={dataTypeOptions}
              values={draftForm.dataTypes}
              onToggle={setDataTypes}
              required
              showSelectAll
            />
            <SelectionGroup
              title="Dynamic metric groups"
              options={dynamicMetricGroupOptions}
              values={draftForm.dynamicMetricGroups}
              onToggle={setDynamicMetricGroups}
              showSelectAll
            />
            <SelectionGroup
              title="Static metric groups"
              options={staticMetricGroupOptions}
              values={draftForm.staticMetricGroups}
              onToggle={setStaticMetricGroups}
              showSelectAll
            />
            <div className="xl:col-span-2 2xl:col-span-3">
              <SelectionGroup
                title="Agreement families"
                options={agreementFamilyCategoryOptions}
                values={agreementFamilyCategories}
                onToggle={setAgreementFamilyCategories}
                required
                showSelectAll
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-border/70 bg-background/55 px-5 py-5">
              <div className="text-sm font-medium text-foreground">
                Model outputs
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you run the model, the visual summaries appear below for the locked coordinate.
              </p>
            </div>

            {runError ? (
              <Card className="gap-3 border-red-300/70 bg-red-50/70 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-center gap-2 text-base text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Model run failed
                  </CardTitle>
                  <CardDescription className="text-red-700/80">
                    {runError}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {result?.warnings?.length ? (
              <Card className="gap-3 border-amber-300/70 bg-amber-50/70 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Backend warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5">
                  <div className="space-y-2 text-sm text-amber-900">
                    {result.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {result?.errors?.length ? (
              <Card className="gap-3 border-amber-300/70 bg-amber-50/70 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Source-level errors
                  </CardTitle>
                  <CardDescription className="text-amber-900/80">
                    The backend can still return partial results when some providers fail.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5">
                  <div className="space-y-3 text-sm text-amber-900">
                    {result.errors.map((error, index) => (
                      <div
                        key={`${error.scope}-${error.source ?? "general"}-${index}`}
                        className="rounded-xl border border-amber-300/70 bg-background/70 px-4 py-3"
                      >
                        <div className="font-medium">
                          {error.scope}
                          {error.source ? `: ${error.source}` : ""}
                        </div>
                        <div className="mt-1 text-muted-foreground">{error.message}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="gap-4 border-border/70 bg-background/75 py-5">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4 px-5">
                <div>
                  <CardTitle>Dynamic summary charts</CardTitle>
                  <CardDescription>
                    View monthly and annual climate metrics as bar charts grouped by selected sources or metrics.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCSV(
                      dynamicSummaryRows,
                      `${dynamicSummaryPeriod}-summary.csv`
                    )
                  }
                  disabled={!dynamicSummaryRows.length}
                >
                  Download CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Summary period</div>
                    <Select
                      value={dynamicSummaryPeriod}
                      onValueChange={(value) =>
                        setDynamicSummaryPeriod(value as "monthly" | "annual")
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Data sources</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                      {dynamicSourceOptions.map((source) => {
                        const isSelected = selectedDynamicSources.includes(source)
                        return (
                          <label
                            key={source}
                            className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/75 px-3 py-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedDynamicSources((current) =>
                                    current.includes(source) ? current : [...current, source]
                                  )
                                } else {
                                  setSelectedDynamicSources((current) =>
                                    current.filter((s) => s !== source)
                                  )
                                }
                              }}
                            />
                            <span className="font-medium">{startCase(source)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {commonDynamicMetrics.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        Metrics ({commonDynamicMetrics.length} available)
                      </div>
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {commonDynamicMetrics.map((metric) => {
                          const isSelected = selectedDynamicMetrics.includes(metric)
                          return (
                            <label
                              key={metric}
                              className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/75 px-3 py-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked === true) {
                                    setSelectedDynamicMetrics((current) =>
                                      current.includes(metric) ? current : [...current, metric]
                                    )
                                  } else {
                                    setSelectedDynamicMetrics((current) =>
                                      current.filter((m) => m !== metric)
                                    )
                                  }
                                }}
                              />
                              <span className="font-medium text-xs">{formatChartLabel(metric)}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {dynamicChartData.length && selectedDynamicMetrics.length ? (
                  <div className="h-[420px] w-full">
                    <ChartContainer config={dynamicChartConfig} className="h-full w-full">
                      <BarChart data={dynamicChartData} margin={{ left: 8, right: 8, top: 8, bottom: 28 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={0}
                          tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                          height={60}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        {selectedDynamicMetrics.map((metric) =>
                          selectedDynamicSources.map((source) => {
                            const key = `${metric}__${source}`
                            return (
                              <Bar
                                key={key}
                                dataKey={key}
                                fill={dynamicChartConfig[key]?.color ?? "#3b82f6"}
                                radius={[4, 4, 0, 0]}
                              />
                            )
                          })
                        )}
                      </BarChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <Card className="border-border/70 bg-background/75 py-12 text-center">
                    <div className="text-sm text-muted-foreground">
                      No dynamic summary data available yet. Run the model to populate the charts.
                    </div>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {result?.static_table?.length ? (
                result.static_table.map((row, index) => {
                  const metricRows = Object.entries(row)
                    .filter(
                      ([column, value]) =>
                        typeof value === "number" &&
                        ![
                          "site_id",
                          "source",
                          "metric_group",
                          "native_resolution",
                          "extraction_method",
                        ].includes(column)
                    )
                    .map(([column, value]) => ({
                      metric: formatChartLabel(column),
                      value: Number(value),
                    }))

                  return (
                    <Card key={`${row.metric_group ?? index}-${row.source ?? index}`} className="gap-4 border-border/70 bg-background/75 py-5">
                      <CardHeader className="flex flex-wrap items-center justify-between gap-4 px-5">
                        <div>
                          <CardTitle className="text-base">
                            {row.metric_group ? startCase(String(row.metric_group)) : "Static metrics"}
                          </CardTitle>
                          <CardDescription>
                            {row.source ? startCase(String(row.source)) : "Static site metrics."}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadCSV([row], `static-metrics-${index + 1}.csv`)
                          }
                        >
                          Download CSV
                        </Button>
                      </CardHeader>
                      <CardContent className="px-5">
                        {metricRows.length ? (
                          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {metricRows.map((item) => (
                              <div
                                key={item.metric}
                                className="rounded-lg border border-border/70 bg-background/50 px-4 py-3"
                              >
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  {item.metric}
                                </div>
                                <div className="mt-2 text-lg font-semibold text-foreground">
                                  {item.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                            No static metric values available for this row.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <Card className="border-border/70 bg-background/75 py-12 text-center">
                  <div className="text-sm text-muted-foreground">
                    No static site metrics are available until the model has run.
                  </div>
                </Card>
              )}
            </div>

            <ModelTableCard
              title="Comparison table"
              description="Combined wide table across successful climate sources."
              rows={result?.comparison_table ?? []}
            />
            <ModelTableCard
              title="Agreement report"
              description="Cross-source agreement metrics for the requested families."
              rows={result?.agreement_report ?? []}
            />
            <ModelTableCard
              title="Agreement ranking"
              description="Highest and lowest agreement pairs from the returned report."
              rows={result?.agreement_ranking ?? []}
            />
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
