"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"
import {
  AlertTriangle,
  Database,
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
import {
  agreementFamilyOptions,
  dataTypeOptions,
  defaultSiteClassificationForm,
  dynamicMetricGroupOptions,
  type AgreementFamily,
  type DynamicMetricGroup,
  type SiteClassificationForm,
  type SiteModelDataType,
  type SiteModelSource,
  staticMetricGroupOptions,
  summaryLevelOptions,
  type StaticMetricGroup,
  type SummaryLevel,
  sourceOptions,
} from "@/app/models/data"

type TableRowValue = string | number | boolean | null
type TableRowRecord = Record<string, TableRowValue>

interface BackendError {
  scope: string
  source?: string
  message: string
}

interface BackendEarthEngineStatus {
  available: boolean
  authenticated: boolean
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
  description,
  options,
  values,
  onToggle,
  required = false,
}: {
  title: string
  description: string
  options: T[]
  values: T[]
  onToggle: (nextValues: T[]) => void
  required?: boolean
}) {
  return (
    <Card className="gap-4 border-border/70 bg-background/70 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-5">
        {options.map((option) => {
          const isChecked = values.includes(option)
          const disableToggleOff = required && isChecked && values.length === 1

          return (
            <label
              key={option}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/75 px-3 py-3 text-sm"
            >
              <Checkbox
                checked={isChecked}
                disabled={disableToggleOff}
                onCheckedChange={(checked) =>
                  onToggle(toggleSelection(values, option, checked === true))
                }
              />
              <div className="space-y-1">
                <div className="font-medium">{startCase(option)}</div>
                <div className="text-xs text-muted-foreground">
                  Notebook option: <code>{option}</code>
                </div>
              </div>
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

  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  )

  const runPayload = React.useMemo(
    () =>
      JSON.stringify(
        {
          site_id: "selected_coordinate",
          lon: lockedCoordinate?.lon ?? null,
          lat: lockedCoordinate?.lat ?? null,
          start_year: draftForm.startYear,
          end_year: draftForm.endYear,
          sources: draftForm.sources,
          data_types: draftForm.dataTypes,
          dynamic_metric_groups: draftForm.dynamicMetricGroups,
          static_metric_groups: draftForm.staticMetricGroups,
          summary_levels: draftForm.summaryLevels,
          agreement_families: draftForm.agreementFamilies,
          climate_buffer_m: 5000,
          topo_buffer_m: 300,
          min_overlap: 12,
        },
        null,
        2
      ),
    [draftForm, lockedCoordinate]
  )

  const runSiteClassification = React.useCallback(async () => {
    if (!lockedCoordinate) {
      setRunError("Double-click on the map first to lock a coordinate.")
      return
    }

    setIsRunning(true)
    setRunError(null)

    try {
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
          agreement_families: draftForm.agreementFamilies,
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

      setResult(parsed as BackendSiteClassificationResponse)
    } catch (error) {
      setResult(null)
      setRunError(
        error instanceof Error ? error.message : "The backend request failed."
      )
    } finally {
      setIsRunning(false)
    }
  }, [apiBaseUrl, draftForm, lockedCoordinate])

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

  const setSummaryLevels = (summaryLevels: SummaryLevel[]) => {
    setDraftForm((current) => ({ ...current, summaryLevels }))
  }

  const setAgreementFamilies = (agreementFamilies: AgreementFamily[]) => {
    setDraftForm((current) => ({ ...current, agreementFamilies }))
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

  return (
    <BaseLayout
      title="Model 1: Site classification"
      description="Double-click anywhere on the map to lock coordinates, choose the model parameters, then run the Python backend and review the returned tables below."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <Card className="gap-4 overflow-hidden border-border/70 bg-background/75 py-0">
              <CardHeader className="border-b border-border/70 px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1">
                    <MapPinned className="size-3.5" />
                    Blank coordinate map
                  </Badge>
                  <Badge variant="outline">
                    Double-click to lock point
                  </Badge>
                  {lockedCoordinate ? (
                    <Badge variant="outline">
                      {lockedCoordinate.lat.toFixed(4)}, {lockedCoordinate.lon.toFixed(4)}
                    </Badge>
                  ) : null}
                  {result?.earth_engine ? (
                    <Badge
                      variant="outline"
                      className={
                        result.earth_engine.authenticated
                          ? "border-emerald-300 text-emerald-700"
                          : "border-amber-300 text-amber-700"
                      }
                    >
                      {result.earth_engine.authenticated
                        ? "Earth Engine ready"
                        : "Earth Engine needs auth"}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="mt-2 text-xl">
                  Lock coordinates directly from the map
                </CardTitle>
                <CardDescription>
                  The model runs against one coordinate. Double-click on the map to place the
                  point, adjust any parameters you want, and then run the model.
                </CardDescription>
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
                        <div className="rounded-full border border-white/80 bg-emerald-600 p-1.5 text-white shadow-lg">
                          <MapPinned className="size-4" />
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
                  <CardDescription>
                    Choose the coordinate and the notebook parameters you want to send to Python.
                  </CardDescription>
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
                      disabled={isRunning || !lockedCoordinate}
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

              <Card className="gap-4 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-emerald-700" />
                    <CardTitle className="text-base">Executed payload</CardTitle>
                  </div>
                  <CardDescription>
                    This is the request body that will be sent to the Python backend.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5">
                  <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-slate-950 px-4 py-4 text-xs text-slate-100">
                    {runPayload}
                  </pre>
                  {result?.earth_engine ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {result.earth_engine.message}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SelectionGroup
              title="Sources"
              description="Pick which climate providers to include in the run."
              options={sourceOptions}
              values={draftForm.sources}
              onToggle={setSources}
              required
            />
            <SelectionGroup
              title="Data types"
              description="Choose whether the backend should return dynamic tables, static tables, or both."
              options={dataTypeOptions}
              values={draftForm.dataTypes}
              onToggle={setDataTypes}
              required
            />
            <SelectionGroup
              title="Dynamic metric groups"
              description="These filter the dynamic climate columns returned by the backend."
              options={dynamicMetricGroupOptions}
              values={draftForm.dynamicMetricGroups}
              onToggle={setDynamicMetricGroups}
            />
            <SelectionGroup
              title="Static metric groups"
              description="These filter the topography and soil outputs for the selected point."
              options={staticMetricGroupOptions}
              values={draftForm.staticMetricGroups}
              onToggle={setStaticMetricGroups}
            />
            <SelectionGroup
              title="Summary levels"
              description="Choose which dynamic table summaries should be returned below."
              options={summaryLevelOptions}
              values={draftForm.summaryLevels}
              onToggle={setSummaryLevels}
              required
            />
            <SelectionGroup
              title="Agreement families"
              description="These drive the cross-source agreement report."
              options={agreementFamilyOptions}
              values={draftForm.agreementFamilies}
              onToggle={setAgreementFamilies}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-border/70 bg-background/55 px-5 py-5">
              <div className="text-sm font-medium text-foreground">
                Model outputs
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Once you run the model, the relevant backend tables appear below for the locked
                coordinate.
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

            <ModelTableCard
              title="Monthly climatology summary"
              description="Dynamic climate table grouped by source and month."
              rows={monthlyRows}
            />
            <ModelTableCard
              title="Annual summary"
              description="Annualized dynamic climate table for the selected run period."
              rows={annualRows}
            />
            <ModelTableCard
              title="Static site metrics"
              description="Topography and soil outputs derived from the locked coordinate."
              rows={result?.static_table ?? []}
            />
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
