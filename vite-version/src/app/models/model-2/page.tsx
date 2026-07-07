"use client"

import * as React from "react"
import {
  AlertTriangle,
  Banknote,
  Download,
  LoaderCircle,
  Play,
  RotateCcw,
  Trees,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { BaseLayout } from "@/components/layouts/base-layout"
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
import {
  convertMoney,
  CurrencySelect,
  type CurrencyCode,
  formatMoney as formatCurrencyMoney,
  useCurrencyRates,
} from "@/app/models/currency"
import { ModelAssumptionsDisclosure } from "@/app/models/components/model-assumptions-disclosure"

type LabourMix = "unskilled" | "skilled"
type ValueMode = "perHa" | "total"
type TableRowValue = string | number | boolean | null
type TableRowRecord = Record<string, TableRowValue>

interface ThinningControl {
  id: string
  enabled: boolean
  year: number
  fraction: number
  price: number
}

interface ViabilityForm {
  rotationYear: number
  thinning: boolean
  qtyWeight: number
  wageWeight: number
  labourMix: LabourMix
  skilledFactor: number
  d1: number
  d2: number
  initialTreesPerHa: number
  areaHa: number
  thinnings: ThinningControl[]
  priceFinalTree: number
  discountRate: number
}

interface ViabilityResponse {
  request: Record<string, unknown>
  base_currency?: CurrencyCode
  assumptions: string[]
  warnings: string[]
  cost_rows: TableRowRecord[]
  cost_section_summary: TableRowRecord[]
  revenue_rows: TableRowRecord[]
  cashflow_rows: TableRowRecord[]
  metrics: Record<string, number | null>
  library: {
    labour_categories: TableRowRecord[]
    non_labour_items: TableRowRecord[]
    operation_recipes: TableRowRecord[]
    section_order: string[]
  }
}

interface ViabilityLibraries {
  labour_categories: TableRowRecord[]
  non_labour_items: TableRowRecord[]
  operation_recipes: TableRowRecord[]
}

interface CashflowChartRow {
  year: number
  net: number
  cumulative: number
}

interface WaterfallRow {
  section: string
  label: string
  base: number
  cost: number
  total: number
  fill: string
}

const UGX_PER_USD = 3700

const defaultForm: ViabilityForm = {
  rotationYear: 8,
  thinning: true,
  qtyWeight: 1,
  wageWeight: 1,
  labourMix: "skilled",
  skilledFactor: 0.75,
  d1: 0.85,
  d2: 0.75,
  initialTreesPerHa: 1111,
  areaHa: 1,
  thinnings: [
    { id: "first", enabled: true, year: 4, fraction: 0.3, price: 5_000 / UGX_PER_USD },
    { id: "second", enabled: true, year: 7, fraction: 0.3, price: 8_000 / UGX_PER_USD },
  ],
  priceFinalTree: 35_000 / UGX_PER_USD,
  discountRate: 0.15,
}

const cashflowChartConfig = {
  net: {
    label: "Net cashflow",
    color: "#2563eb",
  },
  cumulative: {
    label: "Cumulative cashflow",
    color: "#16a34a",
  },
} satisfies ChartConfig

const waterfallChartConfig = {
  cost: {
    label: "Cost",
    color: "#2563eb",
  },
  base: {
    label: "Prior total",
    color: "transparent",
  },
} satisfies ChartConfig

const sectionColors = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#0f766e",
  "#7c3aed",
  "#be123c",
  "#475569",
  "#0891b2",
]

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return `${formatNumber(value * 100, 2)}%`
}

function getNumeric(row: TableRowRecord, key: string) {
  const value = row[key]
  return typeof value === "number" ? value : Number(value ?? 0)
}

function getSectionLabel(section: string) {
  if (section.startsWith("Silviculture")) return "Silviculture"
  if (section === "Site access & boundary") return "Access"
  if (section === "Land preparation") return "Land prep"
  if (section === "Planting material") return "Seedlings"
  if (section === "Layout & soil work") return "Layout"
  if (section === "Planting operations") return "Planting"
  if (section === "Labour welfare & ops") return "Welfare"
  if (section === "Tools, PPE and others") return "Tools/PPE"
  return section
}

function getSectionRank(section: string) {
  if (section === "Site access & boundary") return 0
  if (section === "Land preparation") return 1
  if (section === "Planting material") return 2
  if (section === "Layout & soil work") return 3
  if (section === "Planting operations") return 4
  if (section.startsWith("Silviculture")) return 5
  if (section === "Labour welfare & ops") return 6
  if (section === "Tools, PPE and others") return 7
  return 8
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
  form: ViabilityForm,
  libraries: ViabilityLibraries | null
) {
  const enabledThinnings = form.thinning
    ? form.thinnings.filter((item) => item.enabled)
    : []

  return {
    rotation_year: form.rotationYear,
    thinning: form.thinning ? "yes" : "no",
    qty_weight: form.qtyWeight,
    wage_weight: form.wageWeight,
    labour_mix: form.labourMix,
    skilled_factor: form.skilledFactor,
    d1: form.d1,
    d2: form.d2,
    initial_trees_per_ha: form.initialTreesPerHa,
    area_ha: form.areaHa,
    thinnings: Object.fromEntries(
      enabledThinnings.map((item) => [String(item.year), item.fraction])
    ),
    price_thinning_tree: Object.fromEntries(
      enabledThinnings.map((item) => [String(item.year), item.price])
    ),
    final_harvest_year: form.rotationYear,
    price_final_tree: form.priceFinalTree,
    discount_rate: form.discountRate,
    ...(libraries
      ? {
          labour_categories: libraries.labour_categories,
          non_labour_items: libraries.non_labour_items,
          operation_recipes: libraries.operation_recipes,
        }
      : {}),
  }
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
        <div className="max-h-[460px] max-w-full overflow-auto">
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
                  <TableRow key={`${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={`${title}-${rowIndex}-${column}`}
                        className="whitespace-nowrap px-4"
                      >
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
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
  rows,
  columns,
  editableColumns,
  onCellChange,
}: {
  rows: TableRowRecord[]
  columns: string[]
  editableColumns: string[]
  onCellChange: (rowIndex: number, column: string, value: TableRowValue) => void
}) {
  const editableColumnSet = new Set(editableColumns)

  return (
    <Card className="min-w-0 gap-4 overflow-hidden border-border/70 bg-background/75 py-5">
      <CardContent className="min-w-0 px-0">
        <div className="max-h-[460px] max-w-full overflow-auto">
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
                <TableRow key={`${rowIndex}`}>
                  {columns.map((column) => {
                    const value = row[column]
                    const isNumber = typeof value === "number"
                    const isEditable = editableColumnSet.has(column)
                    return (
                      <TableCell key={`${rowIndex}-${column}`} className="min-w-32 px-3">
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

export default function ModelTwoPage() {
  const [form, setForm] = React.useState<ViabilityForm>(defaultForm)
  const [result, setResult] = React.useState<ViabilityResponse | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [valueMode, setValueMode] = React.useState<ValueMode>("perHa")
  const [currency, setCurrency] = React.useState<CurrencyCode>("USD")
  const [selectedYear, setSelectedYear] = React.useState(2)
  const [libraries, setLibraries] = React.useState<ViabilityLibraries | null>(null)
  const hasAutoRun = React.useRef(false)

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
    <K extends keyof ViabilityForm>(key: K, value: ViabilityForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const updateThinning = React.useCallback(
    (id: string, nextValues: Partial<ThinningControl>) => {
      setForm((current) => ({
        ...current,
        thinnings: current.thinnings.map((item) =>
          item.id === id ? { ...item, ...nextValues } : item
        ),
      }))
    },
    []
  )

  const runModel = React.useCallback(
    async (
      nextForm = form,
      nextLibraries: ViabilityLibraries | null = libraries
    ) => {
      setIsRunning(true)
      setRunError(null)

      try {
        const response = await fetch(`${apiBaseUrl}/models/commercial-forest-viability`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildPayload(nextForm, nextLibraries)),
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

        setResult(parsed as ViabilityResponse)
      } catch (error) {
        setRunError(
          error instanceof Error ? error.message : "The backend request failed."
        )
      } finally {
        setIsRunning(false)
      }
    },
    [apiBaseUrl, form, libraries]
  )

  const loadDefaultLibraries = React.useCallback(
    async (rotationYear = defaultForm.rotationYear) => {
      const response = await fetch(
        `${apiBaseUrl}/models/commercial-forest-viability/defaults?rotation_year=${rotationYear}`
      )
      const responseText = await response.text()
      const parsed = responseText ? JSON.parse(responseText) : null

      if (!response.ok) {
        throw new Error(
          parsed?.detail ||
            parsed?.message ||
            `Backend defaults request failed with status ${response.status}.`
        )
      }

      return (parsed as { library: ViabilityLibraries }).library
    },
    [apiBaseUrl]
  )

  React.useEffect(() => {
    if (!result || libraries) return
    setLibraries({
      labour_categories: result.library.labour_categories,
      non_labour_items: result.library.non_labour_items,
      operation_recipes: result.library.operation_recipes,
    })
  }, [libraries, result])

  const updateLibraryCell = React.useCallback(
    (table: keyof ViabilityLibraries, rowIndex: number, column: string, value: TableRowValue) => {
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

  React.useEffect(() => {
    if (selectedYear > form.rotationYear) {
      setSelectedYear(form.rotationYear)
    }
  }, [form.rotationYear, selectedYear])

  React.useEffect(() => {
    if (hasAutoRun.current) return
    hasAutoRun.current = true
    void (async () => {
      try {
        const defaults = await loadDefaultLibraries(defaultForm.rotationYear)
        setLibraries(defaults)
        await runModel(defaultForm, defaults)
      } catch {
        await runModel(defaultForm, null)
      }
    })()
  }, [loadDefaultLibraries, runModel])

  const metricSource = result?.metrics ?? {}
  const cashflowRows = result?.cashflow_rows ?? []
  const costRows = result?.cost_rows ?? []
  const revenueRows = result?.revenue_rows ?? []
  const sectionRows = result?.cost_section_summary ?? []
  const activeLibraries = libraries ?? result?.library ?? null
  const valueSuffix = valueMode === "perHa" ? "_per_ha" : ""
  const valueLabel = valueMode === "perHa" ? "per ha" : "total"

  const cashflowChartRows = React.useMemo<CashflowChartRow[]>(
    () =>
      cashflowRows.map((row) => ({
        year: getNumeric(row, "year"),
        net: toSelectedCurrency(getNumeric(row, `net_cashflow${valueSuffix}`)) ?? 0,
        cumulative:
          toSelectedCurrency(getNumeric(row, `cumulative_cashflow${valueSuffix}`)) ?? 0,
      })),
    [cashflowRows, toSelectedCurrency, valueSuffix]
  )

  const waterfallRows = React.useMemo<WaterfallRow[]>(() => {
    const rows = sectionRows
      .filter((row) => getNumeric(row, "year") === selectedYear)
      .sort((left, right) =>
        getSectionRank(String(left.section)) - getSectionRank(String(right.section))
      )

    let cumulative = 0
    return rows.map((row, index) => {
      const section = String(row.section)
      const cost = toSelectedCurrency(getNumeric(row, `cost${valueSuffix}`)) ?? 0
      const base = cumulative
      cumulative += cost
      return {
        section,
        label: getSectionLabel(section),
        base,
        cost,
        total: cumulative,
        fill: sectionColors[index % sectionColors.length],
      }
    })
  }, [sectionRows, selectedYear, toSelectedCurrency, valueSuffix])

  const selectedYearCostRows = React.useMemo(
    () => costRows.filter((row) => getNumeric(row, "year") === selectedYear),
    [costRows, selectedYear]
  )

  const selectedYearTotal = React.useMemo(
    () =>
      selectedYearCostRows.reduce(
        (total, row) => total + getNumeric(row, `cost${valueSuffix}`),
        0
      ),
    [selectedYearCostRows, valueSuffix]
  )

  const resetForm = () => {
    setForm(defaultForm)
    setSelectedYear(2)
    setLibraries(null)
    void runModel(defaultForm, null)
  }

  return (
    <BaseLayout
      title="Silvicultural models"
      description="Simulate silvicultural scenarios and analyze their economic outcomes
      (note: quantity and wage weights move assumptions from low to high input/cost cases; 
      labour mix switches between standard and skilled crews; Discount 1 and Discount 2 reduce later maintenance costs after thinning;
      thinning controls set removal year, share, and price; and final-harvest price, area, stocking density, rotation age, and discount rate drive the investment outputs)"
    >
      <div className="@container/main min-w-0 max-w-full overflow-hidden px-4 lg:px-6">
        <div className="grid min-w-0 max-w-full gap-4">
          <Card className="min-w-0 gap-4 border-border/70 bg-background/75 py-5">
            <CardHeader className="px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Scenario inputs</CardTitle>
                  <CardDescription>
                    Inputs and editable libraries are in USD; outputs can be displayed in another currency.
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
                <NumberField
                  label="Rotation year"
                  value={form.rotationYear}
                  min={4}
                  max={15}
                  onChange={(value) =>
                    updateForm("rotationYear", Math.max(4, Math.min(15, value)))
                  }
                />
                <NumberField
                  label="Area"
                  value={form.areaHa}
                  min={0.1}
                  step={0.1}
                  onChange={(value) => updateForm("areaHa", Math.max(0.1, value))}
                />
              </div>

              <div className="grid gap-4">
                <RangeField
                  label="Quantity weight "
                  value={form.qtyWeight}
                  onChange={(value) => updateForm("qtyWeight", value)}
                />
                <RangeField
                  label="Wage and price weight"
                  value={form.wageWeight}
                  onChange={(value) => updateForm("wageWeight", value)}
                />
              </div>

              <div className="grid gap-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Labour mix</span>
                  <Select
                    value={form.labourMix}
                    onValueChange={(value) =>
                      updateForm("labourMix", value as LabourMix)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skilled">Skilled</SelectItem>
                      <SelectItem value="unskilled">Unskilled</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <RangeField
                  label="Skilled factor"
                  value={form.skilledFactor}
                  min={0.1}
                  step={0.05}
                  onChange={(value) =>
                    updateForm("skilledFactor", Math.max(0.1, Math.min(1, value)))
                  }
                />
              </div>

              <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Thinning</div>
                    <div className="text-xs text-muted-foreground">
                      Maintenance discounts and thinning revenue
                    </div>
                  </div>
                  <Switch
                    checked={form.thinning}
                    onCheckedChange={(checked) => updateForm("thinning", checked)}
                  />
                </div>

                {form.thinning ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4">
                      <RangeField
                        label="Maintenance discount after thinning 1"
                        value={form.d1}
                        step={0.05}
                        onChange={(value) =>
                          updateForm("d1", Math.max(0, Math.min(1, value)))
                        }
                      />
                      <RangeField
                        label="Maintenance discount after thinning 2"
                        value={form.d2}
                        step={0.05}
                        onChange={(value) =>
                          updateForm("d2", Math.max(0, Math.min(1, value)))
                        }
                      />
                    </div>
                    {form.thinnings.map((item, index) => (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-lg border border-border/70 bg-background px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">
                            Thinning {index + 1}
                          </div>
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={(checked) =>
                              updateThinning(item.id, { enabled: checked })
                            }
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <NumberField
                            label="Year"
                            value={item.year}
                            min={1}
                            max={form.rotationYear}
                            onChange={(value) =>
                              updateThinning(item.id, {
                                year: Math.max(
                                  1,
                                  Math.min(form.rotationYear, Math.round(value))
                                ),
                              })
                            }
                          />
                          <NumberField
                            label="Tree price"
                            value={item.price}
                            min={0}
                            step={0.25}
                            onChange={(value) =>
                              updateThinning(item.id, {
                                price: Math.max(0, value),
                              })
                            }
                          />
                        </div>
                        <RangeField
                          label="Removal fraction"
                          value={item.fraction}
                          min={0}
                          max={0.99}
                          step={0.05}
                          onChange={(value) =>
                            updateThinning(item.id, {
                              fraction: Math.max(0, Math.min(0.99, value)),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NumberField
                  label="Initial trees per ha"
                  value={form.initialTreesPerHa}
                  min={0}
                  onChange={(value) =>
                    updateForm("initialTreesPerHa", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Final tree price"
                  value={form.priceFinalTree}
                  min={0}
                  step={0.25}
                  onChange={(value) =>
                    updateForm("priceFinalTree", Math.max(0, value))
                  }
                />
              </div>
              <RangeField
                label="Discount rate"
                value={form.discountRate}
                step={0.01}
                onChange={(value) =>
                  updateForm("discountRate", Math.max(0, Math.min(1, value)))
                }
              />

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button
                  className="w-full gap-2"
                  disabled={isRunning}
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
                  onClick={resetForm}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset example
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-4">
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

            {result?.warnings?.length ? (
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
              description="Base calculations and editable libraries are in USD."
              actions={
                <Button
                  className="gap-2"
                  disabled={isRunning || !activeLibraries}
                  onClick={() => void runModel(form, activeLibraries)}
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
              <Tabs defaultValue="labour" className="min-w-0 space-y-4">
                <div className="max-w-full overflow-x-auto">
                  <TabsList className="w-max min-w-full justify-start">
                    <TabsTrigger value="labour">Labour</TabsTrigger>
                    <TabsTrigger value="non-labour">Non-labour</TabsTrigger>
                    <TabsTrigger value="recipes">Operations</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="labour">
                  <EditableTableCard
                    rows={activeLibraries?.labour_categories ?? []}
                    columns={["labour_code", "wage_min", "wage_max"]}
                    editableColumns={["wage_min", "wage_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("labour_categories", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="non-labour">
                  <EditableTableCard
                    rows={activeLibraries?.non_labour_items ?? []}
                    columns={["item_code", "desc", "unit", "price_min", "price_max"]}
                    editableColumns={["price_min", "price_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("non_labour_items", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="recipes">
                  <EditableTableCard
                    rows={activeLibraries?.operation_recipes ?? []}
                    columns={[
                      "year",
                      "section",
                      "sub_item",
                      "input_type",
                      "code",
                      "qty_min",
                      "qty_max",
                    ]}
                    editableColumns={["qty_min", "qty_max"]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("operation_recipes", rowIndex, column, value)
                    }
                  />
                </TabsContent>
              </Tabs>
            </ModelAssumptionsDisclosure>

            <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                title="NPV per ha"
                value={formatMoney(metricSource.NPV_per_ha)}
                description={`At ${formatPercent(metricSource.IRR)} model IRR`}
                icon={TrendingUp}
              />
              <MetricCard
                title="Total NPV"
                value={formatMoney(metricSource.NPV)}
                description={`${formatNumber(form.areaHa, 1)} ha scenario area`}
                icon={Banknote}
              />
              <MetricCard
                title="Payback"
                value={
                  metricSource.Payback_year
                    ? `Year ${metricSource.Payback_year}`
                    : "No payback"
                }
                description={`${formatMoney(metricSource.Total_revenue_per_ha)} revenue per ha`}
                icon={Trees}
              />
              <MetricCard
                title="Total cost"
                value={formatMoney(metricSource.Total_cost)}
                description={`${formatMoney(metricSource.Total_cost_per_ha)} per ha`}
                icon={Banknote}
              />
            </div>

            <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
              <CardHeader className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-5">
                <div className="min-w-0">
                  <CardTitle>Economic cashflow</CardTitle>
                  <CardDescription>
                    Net yearly cashflow and cumulative cashflow across the rotation.
                  </CardDescription>
                </div>
                <Select
                  value={valueMode}
                  onValueChange={(value) => setValueMode(value as ValueMode)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perHa">Per ha</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="min-w-0 px-5">
                {cashflowChartRows.length ? (
                  <div className="h-[380px] w-full min-w-0 overflow-hidden">
                    <ChartContainer
                      config={cashflowChartConfig}
                      className="h-full min-w-0 w-full"
                    >
                      <ComposedChart
                        data={cashflowChartRows}
                        margin={{ left: 8, right: 8, top: 8, bottom: 20 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("en-US", {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            }).format(Number(value))
                          }
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="net" name={`Net cashflow ${valueLabel}`} radius={[4, 4, 0, 0]}>
                          {cashflowChartRows.map((row) => (
                            <Cell
                              key={`net-${row.year}`}
                              fill={row.net < 0 ? "#dc2626" : "#16a34a"}
                            />
                          ))}
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="cumulative"
                          name={`Cumulative ${valueLabel}`}
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                    Run the model to populate the cashflow chart.
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="waterfall" className="min-w-0 space-y-4">
              <div className="max-w-full overflow-x-auto">
                <TabsList className="w-max min-w-full justify-start">
                <TabsTrigger value="waterfall">Cost waterfall</TabsTrigger>
                <TabsTrigger value="cashflow">Cashflow table</TabsTrigger>
                <TabsTrigger value="costs">Cost details</TabsTrigger>
                <TabsTrigger value="revenues">Revenues</TabsTrigger>
                <TabsTrigger value="libraries">Libraries</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="waterfall" className="min-w-0 space-y-4">
                <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
                  <CardHeader className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-5">
                    <div className="min-w-0">
                      <CardTitle>Year {selectedYear} cost waterfall</CardTitle>
                      <CardDescription>
                        Section totals sum to {formatMoney(selectedYearTotal)} {valueLabel}.
                      </CardDescription>
                    </div>
                    <Select
                      value={String(selectedYear)}
                      onValueChange={(value) => setSelectedYear(Number(value))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: form.rotationYear }, (_, index) => index + 1).map(
                          (year) => (
                            <SelectItem key={year} value={String(year)}>
                              Year {year}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-4 px-5">
                    {waterfallRows.length ? (
                      <div className="h-[380px] w-full min-w-0 overflow-hidden">
                        <ChartContainer
                          config={waterfallChartConfig}
                          className="h-full min-w-0 w-full"
                        >
                          <BarChart
                            data={waterfallRows}
                            margin={{ left: 8, right: 8, top: 8, bottom: 36 }}
                          >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                              dataKey="label"
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              tickMargin={8}
                              height={60}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) =>
                                new Intl.NumberFormat("en-US", {
                                  notation: "compact",
                                  maximumFractionDigits: 1,
                                }).format(Number(value))
                              }
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                              dataKey="base"
                              stackId="waterfall"
                              fill="transparent"
                              isAnimationActive={false}
                            />
                            <Bar dataKey="cost" stackId="waterfall" radius={[4, 4, 0, 0]}>
                              {waterfallRows.map((row) => (
                                <Cell key={row.section} fill={row.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                        Run the model to populate the cost waterfall.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DataTableCard
                  title={`Year ${selectedYear} cost detail`}
                  description="Operation-level cost rows for the selected waterfall year."
                  rows={selectedYearCostRows}
                  columns={[
                    "cost_code",
                    "section",
                    "sub_item",
                    `cost${valueSuffix}`,
                    `labour_cost${valueSuffix}`,
                    `non_labour_cost${valueSuffix}`,
                    "discount_factor",
                    "labour_mandays_total",
                  ]}
                  filename={`year-${selectedYear}-cost-detail.csv`}
                />
              </TabsContent>

              <TabsContent value="cashflow">
                <DataTableCard
                  title="Cashflow over rotation"
                  description="Yearly costs, revenues, net cashflow, and cumulative cashflow."
                  rows={cashflowRows}
                  columns={[
                    "year",
                    "cost_per_ha",
                    "revenue_per_ha",
                    "net_cashflow_per_ha",
                    "cumulative_cashflow_per_ha",
                    "cost",
                    "revenue",
                    "net_cashflow",
                    "cumulative_cashflow",
                  ]}
                  filename="commercial-forest-cashflow.csv"
                />
              </TabsContent>

              <TabsContent value="costs">
                <DataTableCard
                  title="All cost rows"
                  description="Notebook cost engine output at year, section, and sub-item level."
                  rows={costRows}
                  columns={[
                    "year",
                    "section",
                    "sub_item",
                    "cost_per_ha",
                    "base_cost_per_ha",
                    "labour_cost_per_ha",
                    "non_labour_cost_per_ha",
                    "discount_factor",
                    "labour_mandays_total",
                    "cost_code",
                  ]}
                  filename="commercial-forest-cost-rows.csv"
                />
              </TabsContent>

              <TabsContent value="revenues">
                <DataTableCard
                  title="Revenue schedule"
                  description="Thinning and final-harvest revenue generated from the stand assumptions."
                  rows={revenueRows}
                  columns={[
                    "year",
                    "trees_before",
                    "trees_removed",
                    "trees_after",
                    "thinning_revenue",
                    "final_harvest_revenue",
                    "revenue",
                  ]}
                  filename="commercial-forest-revenues.csv"
                />
              </TabsContent>

              <TabsContent value="libraries" className="space-y-4">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">Backend input dataframes</h2>
                    <p className="text-sm text-muted-foreground">
                      Only dataframe value columns are editable; codes, labels, and descriptions are fixed.
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    disabled={isRunning || !activeLibraries}
                    onClick={() => void runModel(form, activeLibraries)}
                  >
                    {isRunning ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Apply dataframe changes
                  </Button>
                </div>
                <EditableTableCard
                  rows={activeLibraries?.labour_categories ?? []}
                  columns={["labour_code", "wage_min", "wage_max"]}
                  editableColumns={["wage_min", "wage_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("labour_categories", rowIndex, column, value)
                  }
                />
                <EditableTableCard
                  rows={activeLibraries?.non_labour_items ?? []}
                  columns={["item_code", "desc", "unit", "price_min", "price_max"]}
                  editableColumns={["price_min", "price_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("non_labour_items", rowIndex, column, value)
                  }
                />
                <EditableTableCard
                  rows={activeLibraries?.operation_recipes ?? []}
                  columns={[
                    "year",
                    "section",
                    "sub_item",
                    "input_type",
                    "code",
                    "qty_min",
                    "qty_max",
                  ]}
                  editableColumns={["qty_min", "qty_max"]}
                  onCellChange={(rowIndex, column, value) =>
                    updateLibraryCell("operation_recipes", rowIndex, column, value)
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
