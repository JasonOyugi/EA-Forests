"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"
import {
  AlertTriangle,
  Download,
  Factory,
  LoaderCircle,
  MapPinned,
  Play,
  RotateCcw,
  Route,
  Trees,
  TrendingUp,
  Truck,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  Map,
  MapMarker,
  MapPolyline,
  MapPopup,
  MapTileLayer,
} from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { marketActors, marketTileLayers } from "@/app/shop/data/market-map"
import {
  convertMoney,
  CurrencySelect,
  type CurrencyCode,
  formatMoney as formatCurrencyMoney,
  useCurrencyRates,
} from "@/app/models/currency"
import { ModelAssumptionsDisclosure } from "@/app/models/components/model-assumptions-disclosure"

type Species = "euc" | "pine"
type FellingMethod = "chainsaw" | "harvester"
type ExtractionMethod = "manual" | "tractor" | "bell_logger"
type LoadingMethod = "manual" | "machine"
type EquipmentRegime = "rented" | "owned"
type HaulageMode = "direct" | "aggregation"
type PriceMode = "per_m3" | "per_tonne"
type TableRowValue = string | number | boolean | null
type TableRowRecord = Record<string, TableRowValue>

interface LockedCoordinate {
  lat: number
  lon: number
}

interface RoundwoodForm {
  species: Species
  processorCount: number
  useProcessorSpecs: boolean
  fellingMethod: FellingMethod
  extractionMethod: ExtractionMethod
  loadingMethod: LoadingMethod
  equipmentRegime: EquipmentRegime
  harvestAreaHa: number
  stemsPerHa: number
  meanTreeDbh: number
  stdTreeDbh: number
  meanTreeH: number
  stdTreeH: number
  meanTreeDensity: number
  stdTreeDensity: number
  formFactor: number
  lossG1: number
  lossG2: number
  lossG3: number
  lossReject: number
  priceMode: PriceMode
  g1DbhMin: number
  g1HMin: number
  g2DbhMin: number
  g2HMin: number
  g3DbhMin: number
  g3HMin: number
  priceG1: number
  priceG2: number
  priceG3: number
  priceReject: number
  vMensuration: number
  vFelling: number
  vExtraction: number
  vLoading: number
  vHaulage: number
  vRegulatory: number
  vMisc: number
  lambdaWage: number
  lambdaPrice: number
  pAllowance: number
  pPermit: number
  haulageMode: HaulageMode
  roadDistanceFactor: number
  forestToNodeKm: number
  payloadDirectM3: number
  payloadForestToNodeM3: number
  payloadNodeToFactoryM3: number
  nDraws: number
}

interface RoundwoodProcessorResult {
  processor: string
  processor_lat: number
  processor_lon: number
  species: Species
  straight_line_km: number
  road_km: number
  duration_min: number | null
  route_source: string
  route_latlon: [number, number][]
  distance_method: string
  warning: string | null
  buyer_spec: Record<string, unknown>
  scenario: Record<string, unknown>
  metrics: Record<string, number | null>
  grade_rows: TableRowRecord[]
  section_summary: TableRowRecord[]
  cost_rows: TableRowRecord[]
  revenue_rows: TableRowRecord[]
  cashflow_rows: TableRowRecord[]
}

interface RoundwoodResponse {
  request: Record<string, unknown>
  base_currency?: CurrencyCode
  coordinate: LockedCoordinate
  assumptions: string[]
  warnings: string[]
  rankings: TableRowRecord[]
  processors: RoundwoodProcessorResult[]
  library: {
    processor_catalog: TableRowRecord[]
    buyer_specs: TableRowRecord[]
    labour_categories: TableRowRecord[]
    non_labour_items: TableRowRecord[]
    quantity_library: TableRowRecord[]
    section_order: string[]
  }
}

interface RoundwoodLibraries {
  labour_categories: TableRowRecord[]
  non_labour_items: TableRowRecord[]
  quantity_library: TableRowRecord[]
  buyer_specs: TableRowRecord[]
}

const UGX_PER_USD = 3700

const defaultForm: RoundwoodForm = {
  species: "euc",
  processorCount: 3,
  useProcessorSpecs: true,
  fellingMethod: "chainsaw",
  extractionMethod: "tractor",
  loadingMethod: "manual",
  equipmentRegime: "rented",
  harvestAreaHa: 1,
  stemsPerHa: 545,
  meanTreeDbh: 35,
  stdTreeDbh: 5,
  meanTreeH: 10,
  stdTreeH: 3,
  meanTreeDensity: 0.7,
  stdTreeDensity: 0.05,
  formFactor: 0.45,
  lossG1: 0.1,
  lossG2: 0.1,
  lossG3: 0.1,
  lossReject: 0,
  priceMode: "per_tonne",
  g1DbhMin: 30,
  g1HMin: 2.7,
  g2DbhMin: 20,
  g2HMin: 2.7,
  g3DbhMin: 15,
  g3HMin: 2.7,
  priceG1: 125000 / UGX_PER_USD,
  priceG2: 115000 / UGX_PER_USD,
  priceG3: 105000 / UGX_PER_USD,
  priceReject: 0,
  vMensuration: 0.5,
  vFelling: 0.5,
  vExtraction: 0.5,
  vLoading: 0.5,
  vHaulage: 0.5,
  vRegulatory: 0.5,
  vMisc: 0.5,
  lambdaWage: 0.5,
  lambdaPrice: 0.5,
  pAllowance: 0.5,
  pPermit: 0.5,
  haulageMode: "aggregation",
  roadDistanceFactor: 1.25,
  forestToNodeKm: 7,
  payloadDirectM3: 10,
  payloadForestToNodeM3: 8,
  payloadNodeToFactoryM3: 12,
  nDraws: 30000,
}

const processorActors = marketActors.filter((actor) => actor.layer === "processor")
const defaultTileLayer = marketTileLayers[0]

const processorChartConfig = {
  profit_usd: {
    label: "Profit",
    color: "#15803d",
  },
} satisfies ChartConfig

const gradeChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#2563eb",
  },
  delivered_m3: {
    label: "Delivered m3",
    color: "#0f766e",
  },
} satisfies ChartConfig

const waterfallChartConfig = {
  cashflow: {
    label: "Cashflow",
    color: "#2563eb",
  },
} satisfies ChartConfig

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function startCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatRouteSource(value: string) {
  if (value === "osrm") return "OSRM road trace"
  if (value === "fallback_distance_factor") return "Fallback factor"
  return startCase(value)
}

function getNumeric(row: TableRowRecord | undefined, key: string) {
  if (!row) return 0
  const value = row[key]
  return typeof value === "number" ? value : Number(value ?? 0)
}

function downloadCSV(rows: TableRowRecord[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(",")].concat(
    rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ""
          return `"${String(value).replace(/"/g, '""')}"`
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

function buildPayload(
  form: RoundwoodForm,
  coordinate: LockedCoordinate,
  libraries: RoundwoodLibraries | null
) {
  return {
    lon: coordinate.lon,
    lat: coordinate.lat,
    species: form.species,
    processor_count: form.processorCount,
    use_processor_specs: form.useProcessorSpecs,
    felling_method: form.fellingMethod,
    extraction_method: form.extractionMethod,
    loading_method: form.loadingMethod,
    equipment_regime: form.equipmentRegime,
    harvest_area_ha: form.harvestAreaHa,
    stems_per_ha: form.stemsPerHa,
    mean_tree_dbh: form.meanTreeDbh,
    std_tree_dbh: form.stdTreeDbh,
    mean_tree_h: form.meanTreeH,
    std_tree_h: form.stdTreeH,
    mean_tree_density: form.meanTreeDensity,
    std_tree_density: form.stdTreeDensity,
    form_factor: form.formFactor,
    g1_dbh_min: form.g1DbhMin,
    g1_h_min: form.g1HMin,
    g2_dbh_min: form.g2DbhMin,
    g2_h_min: form.g2HMin,
    g3_dbh_min: form.g3DbhMin,
    g3_h_min: form.g3HMin,
    loss_g1: form.lossG1,
    loss_g2: form.lossG2,
    loss_g3: form.lossG3,
    loss_reject: form.lossReject,
    price_mode: form.priceMode,
    price_g1: form.priceG1,
    price_g2: form.priceG2,
    price_g3: form.priceG3,
    price_reject: form.priceReject,
    v_mensuration: form.vMensuration,
    v_felling: form.vFelling,
    v_extraction: form.vExtraction,
    v_loading: form.vLoading,
    v_haulage: form.vHaulage,
    v_regulatory: form.vRegulatory,
    v_misc: form.vMisc,
    lambda_wage: form.lambdaWage,
    lambda_price: form.lambdaPrice,
    p_allowance: form.pAllowance,
    p_permit: form.pPermit,
    haulage_mode: form.haulageMode,
    road_distance_factor: form.roadDistanceFactor,
    forest_to_node_km: form.forestToNodeKm,
    payload_direct_m3: form.payloadDirectM3,
    payload_forest_to_node_m3: form.payloadForestToNodeM3,
    payload_node_to_factory_m3: form.payloadNodeToFactoryM3,
    n_draws: form.nDraws,
    ...(libraries
      ? {
          labour_categories: libraries.labour_categories,
          non_labour_items: libraries.non_labour_items,
          quantity_library: libraries.quantity_library,
          buyer_specs: libraries.buyer_specs,
        }
      : {}),
  }
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
    map.flyTo([coordinate.lat, coordinate.lon], Math.max(map.getZoom(), 8), {
      duration: 0.8,
    })
  }, [coordinate, map])

  return null
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          if (Number.isFinite(nextValue)) onChange(nextValue)
        }}
      />
    </label>
  )
}

function RangeField({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        className="h-2 w-full cursor-pointer accent-emerald-700"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="min-w-0 gap-3 border-border/70 bg-background/75 py-5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
        <div className="min-w-0 space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="truncate text-xl">{value}</CardTitle>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="px-5 text-xs text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  )
}

function DataTableCard({
  title,
  description,
  rows,
  columns,
  filename,
}: {
  title: string
  description: string
  rows: TableRowRecord[]
  columns: string[]
  filename: string
}) {
  return (
    <Card className="min-w-0 gap-4 overflow-hidden border-border/70 bg-background/75 py-5">
      <CardHeader className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-5">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!rows.length}
          onClick={() => downloadCSV(rows, filename)}
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 px-0">
        <div className="max-h-[430px] max-w-full overflow-auto">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap px-4 capitalize">
                    {column.replaceAll("_", " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, rowIndex) => (
                  <TableRow key={`${title}-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell key={`${title}-${rowIndex}-${column}`} className="whitespace-nowrap px-4">
                        {typeof row[column] === "number"
                          ? formatNumber(Number(row[column]), 2)
                          : row[column] === null || row[column] === undefined
                            ? "n/a"
                            : String(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No rows returned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function EditableTableCard({
  title,
  description,
  rows,
  columns,
  editableColumns,
  onCellChange,
}: {
  title: string
  description: string
  rows: TableRowRecord[]
  columns: string[]
  editableColumns: string[]
  onCellChange: (rowIndex: number, column: string, value: TableRowValue) => void
}) {
  const editableColumnSet = new Set(editableColumns)

  return (
    <Card className="min-w-0 gap-4 overflow-hidden border-border/70 bg-background/75 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-0">
        <div className="max-h-[430px] max-w-full overflow-auto">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap px-4 capitalize">
                    {column.replaceAll("_", " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={`${title}-${rowIndex}`}>
                  {columns.map((column) => {
                    const value = row[column]
                    const isNumber = typeof value === "number"
                    const isEditable = editableColumnSet.has(column)
                    return (
                      <TableCell key={`${title}-${rowIndex}-${column}`} className="min-w-32 px-3">
                        {isEditable ? (
                          <Input
                            type={isNumber ? "number" : "text"}
                            value={value === null || value === undefined ? "" : String(value)}
                            step={isNumber ? "any" : undefined}
                            onChange={(event) => {
                              const parsed = Number(event.target.value)
                              onCellChange(
                                rowIndex,
                                column,
                                isNumber && Number.isFinite(parsed) ? parsed : event.target.value
                              )
                            }}
                          />
                        ) : (
                          <div className="max-w-[260px] whitespace-normal text-sm text-muted-foreground">
                            {value === null || value === undefined ? "n/a" : String(value)}
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ModelThreePage() {
  const [form, setForm] = React.useState<RoundwoodForm>(defaultForm)
  const [lockedCoordinate, setLockedCoordinate] =
    React.useState<LockedCoordinate | null>(null)
  const [result, setResult] = React.useState<RoundwoodResponse | null>(null)
  const [selectedProcessor, setSelectedProcessor] = React.useState("")
  const [isRunning, setIsRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [currency, setCurrency] = React.useState<CurrencyCode>("USD")
  const [libraries, setLibraries] = React.useState<RoundwoodLibraries | null>(null)

  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  )
  const currencyRates = useCurrencyRates(apiBaseUrl)
  const baseCurrency = result?.base_currency ?? "USD"

  const toSelectedCurrency = React.useCallback(
    (value: number | null | undefined) =>
      convertMoney(value, baseCurrency, currency, currencyRates.rates),
    [baseCurrency, currency, currencyRates.rates]
  )

  const formatMoney = React.useCallback(
    (value: number | null | undefined) =>
      formatCurrencyMoney(toSelectedCurrency(value), currency),
    [currency, toSelectedCurrency]
  )

  const updateForm = React.useCallback(
    <K extends keyof RoundwoodForm>(key: K, value: RoundwoodForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const runModel = React.useCallback(
    async (
      coordinate: LockedCoordinate | null = lockedCoordinate,
      nextForm: RoundwoodForm = form
    ) => {
      if (!coordinate) {
        setRunError("Select a coordinate on the map first.")
        return
      }

      setIsRunning(true)
      setRunError(null)

      try {
        const response = await fetch(`${apiBaseUrl}/models/roundwood-production`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildPayload(nextForm, coordinate, libraries)),
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

        setResult(parsed as RoundwoodResponse)
        setSelectedProcessor((parsed as RoundwoodResponse).processors[0]?.processor ?? "")
      } catch (error) {
        setResult(null)
        setRunError(
          error instanceof Error ? error.message : "The backend request failed."
        )
      } finally {
        setIsRunning(false)
      }
    },
    [apiBaseUrl, form, libraries, lockedCoordinate]
  )

  const loadDefaultLibraries = React.useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/models/roundwood-production/defaults`)
    const responseText = await response.text()
    const parsed = responseText ? JSON.parse(responseText) : null

    if (!response.ok) {
      throw new Error(
        parsed?.detail ||
          parsed?.message ||
          `Backend defaults request failed with status ${response.status}.`
      )
    }

    return (parsed as { library: RoundwoodResponse["library"] }).library
  }, [apiBaseUrl])

  React.useEffect(() => {
    if (libraries) return
    void (async () => {
      try {
        const defaults = await loadDefaultLibraries()
        setLibraries({
          labour_categories: defaults.labour_categories,
          non_labour_items: defaults.non_labour_items,
          quantity_library: defaults.quantity_library,
          buyer_specs: defaults.buyer_specs,
        })
      } catch {
        // The model can still run and hydrate libraries from the response.
      }
    })()
  }, [libraries, loadDefaultLibraries])

  React.useEffect(() => {
    if (!result || libraries) return
    setLibraries({
      labour_categories: result.library.labour_categories,
      non_labour_items: result.library.non_labour_items,
      quantity_library: result.library.quantity_library,
      buyer_specs: result.library.buyer_specs,
    })
  }, [libraries, result])

  const updateLibraryCell = React.useCallback(
    (table: keyof RoundwoodLibraries, rowIndex: number, column: string, value: TableRowValue) => {
      setLibraries((current) => {
        if (!current) return current
        return {
          ...current,
          [table]: current[table].map((row, index) =>
            index === rowIndex ? { ...row, [column]: value } : row
          ),
        }
      })
    },
    []
  )

  const handleCoordinateLock = React.useCallback(
    (coordinate: LockedCoordinate) => {
      setLockedCoordinate(coordinate)
      void runModel(coordinate, form)
    },
    [form, runModel]
  )

  const selectedResult = React.useMemo(
    () =>
      result?.processors.find((processor) => processor.processor === selectedProcessor) ??
      result?.processors[0] ??
      null,
    [result, selectedProcessor]
  )

  const rankingRows = result?.rankings ?? []
  const bestResult = result?.processors[0] ?? null
  const bestMetrics = bestResult?.metrics
  const bestProcessor = bestResult?.processor
  const activeLibraries = libraries ?? result?.library ?? null

  const processorChartRows = React.useMemo(
    () =>
      rankingRows.map((row) => ({
        processor: String(row.processor ?? ""),
        profit_usd: toSelectedCurrency(getNumeric(row, "profit_usd")) ?? 0,
        road_km: getNumeric(row, "road_km"),
      })),
    [rankingRows, toSelectedCurrency]
  )

  const gradeChartRows = React.useMemo(
    () =>
      selectedResult?.grade_rows.map((row) => ({
        grade: String(row.grade ?? ""),
        revenue: toSelectedCurrency(getNumeric(row, "revenue")) ?? 0,
        delivered_m3: getNumeric(row, "delivered_m3"),
      })) ?? [],
    [selectedResult, toSelectedCurrency]
  )

  const waterfallRows = React.useMemo(
    () =>
      selectedResult?.section_summary.map((row) => ({
        section: String(row.section ?? ""),
        cashflow: toSelectedCurrency(getNumeric(row, "cashflow")) ?? 0,
      })) ?? [],
    [selectedResult, toSelectedCurrency]
  )

  return (
    <BaseLayout
      title="Roundwood production"
      description="Harvesting, haulage, processor buyer specs, grade yields, and factory-gate cashflow from a selected map coordinate."
    >
      <div className="@container/main min-w-0 max-w-full overflow-hidden px-4 lg:px-6">
        <div className="grid min-w-0 max-w-full gap-4">
          <Card className="min-w-0 gap-4 border-border/70 bg-background/75 py-5">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Scenario inputs</CardTitle>
                  <CardDescription>
                    Routed processor screening and the full roundwood cashflow input stack.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5">
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                rateSource={currencyRates.source}
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Species</span>
                  <Select
                    value={form.species}
                    onValueChange={(value) => updateForm("species", value as Species)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="euc">Eucalyptus</SelectItem>
                      <SelectItem value="pine">Pine</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <Tabs defaultValue="ops" className="space-y-4">
                <div className="max-w-full overflow-x-auto">
                  <TabsList className="w-max min-w-full justify-start">
                    <TabsTrigger value="ops">Ops</TabsTrigger>
                    <TabsTrigger value="stand">Stand</TabsTrigger>
                    <TabsTrigger value="buyer">Buyer</TabsTrigger>
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                    <TabsTrigger value="haulage">Haulage</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="ops" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Felling</span>
                      <Select value={form.fellingMethod} onValueChange={(value) => updateForm("fellingMethod", value as FellingMethod)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chainsaw">Chainsaw</SelectItem>
                          <SelectItem value="harvester">Harvester</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Extraction</span>
                      <Select value={form.extractionMethod} onValueChange={(value) => updateForm("extractionMethod", value as ExtractionMethod)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="tractor">Tractor</SelectItem>
                          <SelectItem value="bell_logger">Bell logger</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Loading</span>
                      <Select value={form.loadingMethod} onValueChange={(value) => updateForm("loadingMethod", value as LoadingMethod)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="machine">Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Equipment</span>
                      <Select value={form.equipmentRegime} onValueChange={(value) => updateForm("equipmentRegime", value as EquipmentRegime)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rented">Rented</SelectItem>
                          <SelectItem value="owned">Owned</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  <div className="grid gap-4">
                    <RangeField label="Mensuration intensity" value={form.vMensuration} onChange={(value) => updateForm("vMensuration", value)} />
                    <RangeField label="Felling intensity" value={form.vFelling} onChange={(value) => updateForm("vFelling", value)} />
                    <RangeField label="Extraction intensity" value={form.vExtraction} onChange={(value) => updateForm("vExtraction", value)} />
                    <RangeField label="Loading intensity" value={form.vLoading} onChange={(value) => updateForm("vLoading", value)} />
                  </div>
                </TabsContent>

                <TabsContent value="stand" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <NumberField label="Harvest area" value={form.harvestAreaHa} min={0.1} step={0.1} onChange={(value) => updateForm("harvestAreaHa", Math.max(0.1, value))} />
                    <NumberField label="Stems per ha" value={form.stemsPerHa} min={1} onChange={(value) => updateForm("stemsPerHa", Math.max(1, value))} />
                    <NumberField label="Mean DBH" value={form.meanTreeDbh} min={1} step={0.5} onChange={(value) => updateForm("meanTreeDbh", Math.max(1, value))} />
                    <NumberField label="DBH std dev" value={form.stdTreeDbh} min={0} step={0.5} onChange={(value) => updateForm("stdTreeDbh", Math.max(0, value))} />
                    <NumberField label="Mean height" value={form.meanTreeH} min={1} step={0.5} onChange={(value) => updateForm("meanTreeH", Math.max(1, value))} />
                    <NumberField label="Height std dev" value={form.stdTreeH} min={0} step={0.5} onChange={(value) => updateForm("stdTreeH", Math.max(0, value))} />
                    <NumberField label="Wood density" value={form.meanTreeDensity} min={0.05} step={0.01} onChange={(value) => updateForm("meanTreeDensity", Math.max(0.05, value))} />
                    <NumberField label="Density std dev" value={form.stdTreeDensity} min={0} step={0.01} onChange={(value) => updateForm("stdTreeDensity", Math.max(0, value))} />
                    <NumberField label="Form factor" value={form.formFactor} min={0.05} max={1} step={0.01} onChange={(value) => updateForm("formFactor", Math.max(0.05, Math.min(1, value)))} />
                  </div>
                  <div className="grid gap-4">
                    <RangeField label="G1 loss" value={form.lossG1} onChange={(value) => updateForm("lossG1", value)} />
                    <RangeField label="G2 loss" value={form.lossG2} onChange={(value) => updateForm("lossG2", value)} />
                    <RangeField label="G3 loss" value={form.lossG3} onChange={(value) => updateForm("lossG3", value)} />
                    <RangeField label="Reject loss" value={form.lossReject} onChange={(value) => updateForm("lossReject", value)} />
                  </div>
                </TabsContent>

                <TabsContent value="buyer" className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Use processor buyer specs</div>
                      <div className="text-xs text-muted-foreground">
                        Mirrors the upstream mapped notebook when enabled. Turn it off to use scenario thresholds and prices like the basic cashflow notebook.
                      </div>
                    </div>
                    <Switch
                      checked={form.useProcessorSpecs}
                      onCheckedChange={(checked) => updateForm("useProcessorSpecs", checked)}
                    />
                  </div>
                  {form.useProcessorSpecs ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                      Grade thresholds, price mode, and grade prices come from each processor&apos;s buyer specification.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium">Price mode</span>
                        <Select
                          value={form.priceMode}
                          onValueChange={(value) =>
                            updateForm("priceMode", value as PriceMode)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_m3">Per m3</SelectItem>
                            <SelectItem value="per_tonne">Per tonne</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <NumberField label="G1 minimum DBH" value={form.g1DbhMin} min={0} step={0.5} onChange={(value) => updateForm("g1DbhMin", Math.max(0, value))} />
                        <NumberField label="G1 minimum height" value={form.g1HMin} min={0} step={0.1} onChange={(value) => updateForm("g1HMin", Math.max(0, value))} />
                        <NumberField label="G2 minimum DBH" value={form.g2DbhMin} min={0} step={0.5} onChange={(value) => updateForm("g2DbhMin", Math.max(0, value))} />
                        <NumberField label="G2 minimum height" value={form.g2HMin} min={0} step={0.1} onChange={(value) => updateForm("g2HMin", Math.max(0, value))} />
                        <NumberField label="G3 minimum DBH" value={form.g3DbhMin} min={0} step={0.5} onChange={(value) => updateForm("g3DbhMin", Math.max(0, value))} />
                        <NumberField label="G3 minimum height" value={form.g3HMin} min={0} step={0.1} onChange={(value) => updateForm("g3HMin", Math.max(0, value))} />
                        <NumberField label="G1 price" value={form.priceG1} min={0} step={0.25} onChange={(value) => updateForm("priceG1", Math.max(0, value))} />
                        <NumberField label="G2 price" value={form.priceG2} min={0} step={0.25} onChange={(value) => updateForm("priceG2", Math.max(0, value))} />
                        <NumberField label="G3 price" value={form.priceG3} min={0} step={0.25} onChange={(value) => updateForm("priceG3", Math.max(0, value))} />
                        <NumberField label="Reject price" value={form.priceReject} min={0} step={0.25} onChange={(value) => updateForm("priceReject", Math.max(0, value))} />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="costs" className="space-y-4">
                  <div className="grid gap-4">
                    <RangeField label="Wage interpolation" value={form.lambdaWage} onChange={(value) => updateForm("lambdaWage", value)} />
                    <RangeField label="Price interpolation" value={form.lambdaPrice} onChange={(value) => updateForm("lambdaPrice", value)} />
                    <RangeField label="Allowance interpolation" value={form.pAllowance} onChange={(value) => updateForm("pAllowance", value)} />
                    <RangeField label="Permit coverage pressure" value={form.pPermit} onChange={(value) => updateForm("pPermit", value)} />
                    <RangeField label="Regulatory intensity" value={form.vRegulatory} onChange={(value) => updateForm("vRegulatory", value)} />
                    <RangeField label="Miscellaneous intensity" value={form.vMisc} onChange={(value) => updateForm("vMisc", value)} />
                  </div>
                  <NumberField label="Simulation draws" value={form.nDraws} min={1000} max={200000} step={1000} onChange={(value) => updateForm("nDraws", Math.max(1000, Math.min(200000, Math.round(value))))} />
                </TabsContent>

                <TabsContent value="haulage" className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Aggregation node</div>
                      <div className="text-xs text-muted-foreground">
                        {form.haulageMode === "aggregation" ? "Forest to node, then node to factory" : "Direct forest to factory"}
                      </div>
                    </div>
                    <Switch
                      checked={form.haulageMode === "aggregation"}
                      onCheckedChange={(checked) => updateForm("haulageMode", checked ? "aggregation" : "direct")}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <NumberField label="Processor count" value={form.processorCount} min={1} max={5} onChange={(value) => updateForm("processorCount", Math.max(1, Math.min(5, Math.round(value))))} />
                    <NumberField label="Fallback road factor" value={form.roadDistanceFactor} min={1} max={3} step={0.05} onChange={(value) => updateForm("roadDistanceFactor", Math.max(1, Math.min(3, value)))} />
                    {form.haulageMode === "aggregation" ? (
                      <>
                        <NumberField label="Forest to node km" value={form.forestToNodeKm} min={0} step={0.5} onChange={(value) => updateForm("forestToNodeKm", Math.max(0, value))} />
                        <NumberField label="Payload forest-node" value={form.payloadForestToNodeM3} min={0.1} step={0.5} onChange={(value) => updateForm("payloadForestToNodeM3", Math.max(0.1, value))} />
                        <NumberField label="Payload node-factory" value={form.payloadNodeToFactoryM3} min={0.1} step={0.5} onChange={(value) => updateForm("payloadNodeToFactoryM3", Math.max(0.1, value))} />
                      </>
                    ) : (
                      <NumberField label="Direct payload" value={form.payloadDirectM3} min={0.1} step={0.5} onChange={(value) => updateForm("payloadDirectM3", Math.max(0.1, value))} />
                    )}
                  </div>
                  <RangeField label="Haulage intensity" value={form.vHaulage} onChange={(value) => updateForm("vHaulage", value)} />
                </TabsContent>
              </Tabs>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button
                  className="w-full gap-2"
                  disabled={isRunning || !lockedCoordinate}
                  onClick={() => void runModel()}
                >
                  {isRunning ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? "Running..." : "Run model"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isRunning}
                  onClick={() => {
                    setForm(defaultForm)
                    setLibraries(null)
                    setResult(null)
                    setSelectedProcessor("")
                    setRunError(null)
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset scenario
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-hidden border-border/70 bg-background/75 py-5">
              <CardHeader className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-5">
                <div>
                  <CardTitle>Production map</CardTitle>
                  <CardDescription>
                    {lockedCoordinate
                      ? `${lockedCoordinate.lat.toFixed(5)}, ${lockedCoordinate.lon.toFixed(5)}`
                      : "Double-click a harvest location to trace road routes and run the scenario."}
                  </CardDescription>
                </div>
                <Badge variant={result ? "default" : "outline"}>
                  {result ? `${result.processors.length} processor runs` : "Awaiting site"}
                </Badge>
              </CardHeader>
              <CardContent className="px-5">
                <div className="h-[520px] min-w-0 overflow-hidden rounded-lg border border-border/70">
                  <Map center={[0.6, 32.3]} zoom={7} className="min-h-[520px] rounded-lg">
                    <CoordinateMapEvents onCoordinateLock={handleCoordinateLock} />
                    <CoordinateFocus coordinate={lockedCoordinate} />
                    <MapTileLayer
                      name={defaultTileLayer.name}
                      url={defaultTileLayer.url}
                      attribution={defaultTileLayer.attribution}
                    />
                    {processorActors.map((actor) => {
                      const isReturned = result?.processors.some(
                        (processor) => processor.processor === actor.name
                      )
                      return (
                        <MapMarker
                          key={actor.id}
                          position={[actor.latitude, actor.longitude]}
                          icon={
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background ${isReturned ? "border-emerald-600 text-emerald-700" : "border-red-500 text-red-600"}`}>
                              <Factory className="h-4 w-4" />
                            </div>
                          }
                        >
                          <MapPopup>
                            <div className="space-y-1 text-sm">
                              <div className="font-semibold">{actor.name}</div>
                              <div className="text-muted-foreground">{actor.region}</div>
                            </div>
                          </MapPopup>
                        </MapMarker>
                      )
                    })}
                    {lockedCoordinate ? (
                      <MapMarker
                        position={[lockedCoordinate.lat, lockedCoordinate.lon]}
                        icon={
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-emerald-900">
                            <MapPinned className="h-4 w-4" />
                          </div>
                        }
                      />
                    ) : null}
                    {lockedCoordinate && result
                      ? result.processors.map((processor) => (
                          <MapPolyline
                            key={`line-${processor.processor}`}
                            positions={processor.route_latlon}
                            pathOptions={{
                              color:
                                processor.processor === result.processors[0]?.processor
                                  ? "#15803d"
                                  : "#2563eb",
                              weight:
                                processor.processor === result.processors[0]?.processor
                                  ? 4
                                  : 2,
                              opacity: 0.75,
                            }}
                          />
                        ))
                      : null}
                  </Map>
                </div>
              </CardContent>
            </Card>

            {runError ? (
              <Card className="min-w-0 gap-3 border-red-300/70 bg-red-50/70 py-5">
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

            {result?.warnings.length ? (
              <Card className="min-w-0 gap-3 border-amber-300/70 bg-amber-50/70 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Model warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-5 text-sm text-amber-900">
                  {result.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <ModelAssumptionsDisclosure
              description="Base calculations, processor prices, wages, and editable libraries are in USD."
              actions={
                <Button
                  className="gap-2"
                  disabled={isRunning || !activeLibraries || !lockedCoordinate}
                  onClick={() => void runModel(lockedCoordinate, form)}
                >
                  {isRunning ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Apply changes
                </Button>
              }
            >
              <Tabs defaultValue="buyer-specs" className="min-w-0 space-y-4">
                <div className="max-w-full overflow-x-auto">
                  <TabsList className="w-max min-w-full justify-start">
                    <TabsTrigger value="buyer-specs">Buyer specs</TabsTrigger>
                    <TabsTrigger value="labour">Labour</TabsTrigger>
                    <TabsTrigger value="non-labour">Non-labour</TabsTrigger>
                    <TabsTrigger value="quantities">Quantity library</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="buyer-specs">
                  <EditableTableCard
                    title="Buyer specs"
                    description="Processor/species grade thresholds and prices used when processor buyer specs are enabled."
                    rows={activeLibraries?.buyer_specs ?? []}
                    columns={[
                      "processor",
                      "species",
                      "price_mode",
                      "grade",
                      "dbh_min",
                      "h_min",
                      "price",
                    ]}
                    editableColumns={["price_mode", "dbh_min", "h_min", "price"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("buyer_specs", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="labour">
                  <EditableTableCard
                    title="Labour library"
                    description="Wage ranges used by the roundwood operation model."
                    rows={activeLibraries?.labour_categories ?? []}
                    columns={["labour_code", "desc", "wage_min", "wage_max"]}
                    editableColumns={["wage_min", "wage_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("labour_categories", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="non-labour">
                  <EditableTableCard
                    title="Non-labour library"
                    description="Equipment, fuel, permit, and miscellaneous price ranges."
                    rows={activeLibraries?.non_labour_items ?? []}
                    columns={["item_code", "desc", "unit", "price_min", "price_max"]}
                    editableColumns={["price_min", "price_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("non_labour_items", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="quantities">
                  <EditableTableCard
                    title="Quantity library"
                    description="Operation productivity and input-use ranges used by Ops, Costs, and Haulage calculations."
                    rows={activeLibraries?.quantity_library ?? []}
                    columns={["section", "path", "qty_min", "qty_max"]}
                    editableColumns={["qty_min", "qty_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("quantity_library", rowIndex, column, value)
                    }
                  />
                </TabsContent>
              </Tabs>
            </ModelAssumptionsDisclosure>

            <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                title="Best processor"
                value={bestProcessor ?? "n/a"}
                description={bestResult ? `${formatNumber(bestResult.road_km, 1)} km routed road distance` : "Run a mapped scenario"}
                icon={Factory}
              />
              <MetricCard
                title="Profit"
                value={formatMoney(bestMetrics?.profit_usd)}
                description={`${formatMoney(bestMetrics?.total_revenue_usd)} revenue`}
                icon={TrendingUp}
              />
              <MetricCard
                title="Delivered volume"
                value={`${formatNumber(bestMetrics?.delivered_volume_m3, 1)} m3`}
                description={`${formatNumber(bestMetrics?.delivered_tonnes, 1)} tonnes`}
                icon={Trees}
              />
              <MetricCard
                title="Total cost"
                value={formatMoney(bestMetrics?.total_cost_usd)}
                description={`${formatNumber(bestMetrics?.total_stems, 0)} harvested stems`}
                icon={Truck}
              />
            </div>

            <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
              <CardHeader className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-5">
                <div className="min-w-0">
                  <CardTitle>Processor comparison</CardTitle>
                  <CardDescription>
                    Ranked by profit after routed haulage, buyer-spec logic, and operating costs.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={!rankingRows.length}
                  onClick={() => downloadCSV(rankingRows, "roundwood-processor-ranking.csv")}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="min-w-0 px-5">
                {processorChartRows.length ? (
                  <div className="h-[340px] w-full min-w-0 overflow-hidden">
                    <ChartContainer config={processorChartConfig} className="h-full min-w-0 w-full">
                      <BarChart data={processorChartRows} margin={{ left: 8, right: 8, top: 8, bottom: 64 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="processor" tickLine={false} axisLine={false} interval={0} angle={-28} textAnchor="end" height={88} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="profit_usd" name="Profit" radius={[4, 4, 0, 0]}>
                          {processorChartRows.map((row) => (
                            <Cell key={row.processor} fill={row.profit_usd < 0 ? "#dc2626" : "#15803d"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                    Select a coordinate to populate the comparison.
                  </div>
                )}
              </CardContent>
            </Card>

            {result?.processors.length ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <Card className="min-w-0 gap-4 border-border/70 bg-background/75 py-5">
                  <CardHeader className="px-5">
                    <CardTitle className="text-base">Processor run</CardTitle>
                    <CardDescription>View grade and cost detail for one result.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5">
                    <Select value={selectedResult?.processor ?? ""} onValueChange={setSelectedProcessor}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {result.processors.map((processor) => (
                          <SelectItem key={processor.processor} value={processor.processor}>
                            {processor.processor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedResult ? (
                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Road distance</div>
                          <div className="mt-1 font-semibold">{formatNumber(selectedResult.road_km, 1)} km</div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Travel time</div>
                          <div className="mt-1 font-semibold">
                            {selectedResult.duration_min === null
                              ? "n/a"
                              : `${formatNumber(selectedResult.duration_min, 1)} min`}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Route source</div>
                          <div className="mt-1 font-semibold">
                            {formatRouteSource(selectedResult.route_source)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Revenue mode</div>
                          <div className="mt-1 font-semibold">
                            {startCase(String(selectedResult.scenario.price_mode ?? ""))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                          <div className="text-xs font-medium uppercase text-muted-foreground">Margin</div>
                          <div className="mt-1 font-semibold">
                            {selectedResult.metrics.margin_pct === null
                              ? "n/a"
                              : `${formatNumber(selectedResult.metrics.margin_pct, 1)}%`}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {selectedResult?.warning ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedResult.warning}
                      </p>
                    ) : null}
                    {selectedResult ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedResult.distance_method}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="min-w-0 grid gap-4 2xl:grid-cols-2">
                  <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
                    <CardHeader className="px-5">
                      <CardTitle className="text-base">Grade revenue</CardTitle>
                      <CardDescription>Delivered yield valued by selected processor specs.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-w-0 px-5">
                      <div className="h-[320px] w-full">
                        <ChartContainer config={gradeChartConfig} className="h-full w-full">
                          <BarChart data={gradeChartRows} margin={{ left: 8, right: 8, top: 8, bottom: 20 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="grade" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
                    <CardHeader className="px-5">
                      <CardTitle className="text-base">Cashflow waterfall</CardTitle>
                      <CardDescription>Costs are negative, revenue is positive.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-w-0 px-5">
                      <div className="h-[320px] w-full">
                        <ChartContainer config={waterfallChartConfig} className="h-full w-full">
                          <BarChart data={waterfallRows} margin={{ left: 8, right: 8, top: 8, bottom: 56 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="section" tickLine={false} axisLine={false} interval={0} angle={-28} textAnchor="end" height={78} tick={{ fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="cashflow" name="Cashflow" radius={[4, 4, 0, 0]}>
                              {waterfallRows.map((row) => (
                                <Cell key={row.section} fill={row.cashflow < 0 ? "#dc2626" : "#15803d"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            <Tabs defaultValue="grades" className="min-w-0 space-y-4">
              <div className="max-w-full overflow-x-auto">
                <TabsList className="w-max min-w-full justify-start">
                  <TabsTrigger value="grades">Grades</TabsTrigger>
                  <TabsTrigger value="costs">Cost rows</TabsTrigger>
                  <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
                  <TabsTrigger value="library">Assumptions</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="grades">
                <DataTableCard
                  title="Grade yields"
                  description="Simulated stems, delivered m3, tonnes, prices, and revenue by grade."
                  rows={selectedResult?.grade_rows ?? []}
                  columns={["grade", "stems", "delivered_m3", "delivered_tonnes", "revenue_qty", "revenue_unit", "price", "revenue"]}
                  filename="roundwood-grade-yields.csv"
                />
              </TabsContent>
              <TabsContent value="costs">
                <DataTableCard
                  title="Cost detail"
                  description="Notebook cost blocks by section and sub-item."
                  rows={selectedResult?.cost_rows ?? []}
                  columns={["section", "sub_item", "cost"]}
                  filename="roundwood-cost-detail.csv"
                />
              </TabsContent>
              <TabsContent value="cashflow">
                <DataTableCard
                  title="Cashflow rows"
                  description="Negative cost rows and positive grade revenue rows."
                  rows={selectedResult?.cashflow_rows ?? []}
                  columns={["section", "sub_item", "cashflow"]}
                  filename="roundwood-cashflow.csv"
                />
              </TabsContent>
              <TabsContent value="library" className="space-y-4">
                <DataTableCard
                  title="Processor catalog"
                  description="Mapped processors and the species available in the buyer-spec catalog."
                  rows={result?.library.processor_catalog ?? []}
                  columns={["name", "lat", "lon", "species"]}
                  filename="roundwood-processor-catalog.csv"
                />
                <EditableTableCard
                  title="Buyer specs"
                  description="Editable processor/species grade thresholds and prices used when processor buyer specs are enabled."
                  rows={libraries?.buyer_specs ?? result?.library.buyer_specs ?? []}
                  columns={[
                    "processor",
                    "species",
                    "price_mode",
                    "grade",
                    "dbh_min",
                    "h_min",
                    "price",
                  ]}
                  editableColumns={["price_mode", "dbh_min", "h_min", "price"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("buyer_specs", rowIndex, column, value)
                  }
                />
                <EditableTableCard
                  title="Labour library"
                  description="Editable wage ranges used by the roundwood operation model."
                  rows={libraries?.labour_categories ?? result?.library.labour_categories ?? []}
                  columns={["labour_code", "desc", "wage_min", "wage_max"]}
                  editableColumns={["wage_min", "wage_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("labour_categories", rowIndex, column, value)
                  }
                />
                <EditableTableCard
                  title="Non-labour library"
                  description="Editable equipment, fuel, permit, and miscellaneous price ranges."
                  rows={libraries?.non_labour_items ?? result?.library.non_labour_items ?? []}
                  columns={["item_code", "desc", "unit", "price_min", "price_max"]}
                  editableColumns={["price_min", "price_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("non_labour_items", rowIndex, column, value)
                  }
                />
                <EditableTableCard
                  title="Quantity library"
                  description="Editable operation productivity and input-use ranges used by Ops, Costs, and Haulage calculations."
                  rows={libraries?.quantity_library ?? result?.library.quantity_library ?? []}
                  columns={["section", "path", "qty_min", "qty_max"]}
                  editableColumns={["qty_min", "qty_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("quantity_library", rowIndex, column, value)
                  }
                />
              </TabsContent>
            </Tabs>

            {result?.assumptions.length ? (
              <Card className="min-w-0 gap-3 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Route className="h-4 w-4" />
                    Model assumptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-5 text-sm text-muted-foreground">
                  {result.assumptions.map((assumption) => (
                    <p key={assumption}>{assumption}</p>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
