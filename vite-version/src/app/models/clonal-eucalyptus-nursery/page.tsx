"use client"

import * as React from "react"
import {
  AlertTriangle,
  Banknote,
  Download,
  LoaderCircle,
  Play,
  RotateCcw,
  Sprout,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  convertMoney,
  CurrencySelect,
  type CurrencyCode,
  formatMoney as formatCurrencyMoney,
  useCurrencyRates,
} from "@/app/models/currency"
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

type TableRowValue = string | number | boolean | null
type TableRowRecord = Record<string, TableRowValue>

interface NurseryForm {
  modelYears: number
  discountRate: number
  inflationRate: number
  workingCapitalPctRevenue: number
  motherPlants: number
  shootsPerMotherPerHarvest: number
  harvestsPerYear: number
  cuttingSelectionRate: number
  rootingSuccessRate: number
  acclimatisationSurvivalRate: number
  hardeningSurvivalRate: number
  saleableGradeAcceptanceRate: number
  rootingTrays: number
  rootingCyclesPerYear: number
  baseCapacityUtilisationY1: number
  steadyStateCapacityUtilisation: number
  rampUpYears: number
  marketSalesRate: number
  permanentWorkers: number
  permanentWorkerMonthlyWage: number
  managerMonthlyAllowance: number
  seasonalDailyWage: number
  sellingPricePerPlantY1: number
  annualGeneticAccessFee: number
  royaltyPerSoldPlant: number
  annualCertificationFee: number
  technicalSupportFeePerYear: number
}

interface NurseryResponse {
  request: Record<string, unknown>
  base_currency: CurrencyCode
  assumptions: string[]
  dashboard_rows: Array<{ metric: string; value: TableRowValue; kind: string }>
  metrics: Record<string, number | null>
  production_rows: TableRowRecord[]
  opex_rows: TableRowRecord[]
  financial_rows: TableRowRecord[]
  capex_rows: TableRowRecord[]
  capex_by_year_rows: TableRowRecord[]
  capex_summary: TableRowRecord[]
  sensitivity_rows: TableRowRecord[]
  library: {
    assumptions: TableRowRecord[]
    capex_assets: TableRowRecord[]
  }
}

interface NurseryLibraries {
  assumptions: TableRowRecord[]
  capex_assets: TableRowRecord[]
}

const defaultForm: NurseryForm = {
  modelYears: 10,
  discountRate: 0.15,
  inflationRate: 0.04,
  workingCapitalPctRevenue: 0.05,
  motherPlants: 2500,
  shootsPerMotherPerHarvest: 4,
  harvestsPerYear: 8,
  cuttingSelectionRate: 0.8,
  rootingSuccessRate: 0.68,
  acclimatisationSurvivalRate: 0.9,
  hardeningSurvivalRate: 0.93,
  saleableGradeAcceptanceRate: 0.95,
  rootingTrays: 420,
  rootingCyclesPerYear: 3,
  baseCapacityUtilisationY1: 0.55,
  steadyStateCapacityUtilisation: 0.82,
  rampUpYears: 4,
  marketSalesRate: 0.96,
  permanentWorkers: 1,
  permanentWorkerMonthlyWage: 120,
  managerMonthlyAllowance: 80,
  seasonalDailyWage: 3.5,
  sellingPricePerPlantY1: 0.3,
  annualGeneticAccessFee: 0,
  royaltyPerSoldPlant: 0,
  annualCertificationFee: 0,
  technicalSupportFeePerYear: 0,
}

const financialChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#2563eb",
  },
  opex: {
    label: "OPEX",
    color: "#d97706",
  },
  freeCashflow: {
    label: "Free cashflow",
    color: "#16a34a",
  },
} satisfies ChartConfig

const productionChartConfig = {
  soldPlants: {
    label: "Sold plants",
    color: "#0f766e",
  },
  saleablePlants: {
    label: "Saleable plants",
    color: "#2563eb",
  },
} satisfies ChartConfig

const sensitivityChartConfig = {
  lowNpv: {
    label: "Low NPV",
    color: "#dc2626",
  },
  highNpv: {
    label: "High NPV",
    color: "#16a34a",
  },
} satisfies ChartConfig

function snakeCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function camelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

const assumptionToFormKey = Object.fromEntries(
  Object.keys(defaultForm).map((key) => [snakeCase(key), key])
) as Record<string, keyof NurseryForm>

function buildPayload(form: NurseryForm, libraries: NurseryLibraries | null) {
  return {
    ...Object.fromEntries(
    Object.entries(form).map(([key, value]) => [snakeCase(key), value])
    ),
    ...(libraries
      ? {
          assumptions: libraries.assumptions,
          capex_assets: libraries.capex_assets,
        }
      : {}),
  }
}

function getNumeric(row: TableRowRecord | undefined, key: string) {
  if (!row) return 0
  const value = row[key]
  return typeof value === "number" ? value : Number(value ?? 0)
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return `${formatNumber(value * 100, 1)}%`
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
  step = 0.01,
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
  moneyColumns = [],
  formatMoneyValue,
}: {
  title: string
  description: string
  rows: TableRowRecord[]
  columns: string[]
  filename: string
  moneyColumns?: string[]
  formatMoneyValue?: (value: number) => string
}) {
  const moneyColumnSet = new Set(moneyColumns)

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
                    {columns.map((column) => {
                      const value = row[column]
                      return (
                        <TableCell
                          key={`${title}-${rowIndex}-${column}`}
                          className="whitespace-nowrap px-4"
                        >
                          {typeof value === "number"
                            ? moneyColumnSet.has(column) && formatMoneyValue
                              ? formatMoneyValue(value)
                              : formatNumber(value, 2)
                            : value === null || value === undefined
                              ? "n/a"
                              : String(value)}
                        </TableCell>
                      )
                    })}
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
  title,
  description,
  rows,
  columns,
  onCellChange,
}: {
  title: string
  description: string
  rows: TableRowRecord[]
  columns: string[]
  onCellChange: (rowIndex: number, column: string, value: TableRowValue) => void
}) {
  return (
    <Card className="min-w-0 gap-4 overflow-hidden border-border/70 bg-background/75 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
              {rows.map((row, rowIndex) => (
                <TableRow key={`${title}-${rowIndex}`}>
                  {columns.map((column) => {
                    const value = row[column]
                    const isNumber = typeof value === "number"
                    return (
                      <TableCell key={`${title}-${rowIndex}-${column}`} className="min-w-32 px-3">
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

export default function ClonalEucalyptusNurseryPage() {
  const [form, setForm] = React.useState<NurseryForm>(defaultForm)
  const [result, setResult] = React.useState<NurseryResponse | null>(null)
  const [currency, setCurrency] = React.useState<CurrencyCode>("USD")
  const [isRunning, setIsRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [libraries, setLibraries] = React.useState<NurseryLibraries | null>(null)
  const hasAutoRun = React.useRef(false)

  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  )
  const currencyRates = useCurrencyRates(apiBaseUrl)
  const baseCurrency = result?.base_currency ?? "USD"

  const updateForm = React.useCallback(
    <K extends keyof NurseryForm>(key: K, value: NurseryForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }))
      const assumptionKey = snakeCase(String(key))
      setLibraries((current) => {
        if (!current) return current
        return {
          ...current,
          assumptions: current.assumptions.map((row) =>
            row.assumption === assumptionKey ? { ...row, value } : row
          ),
        }
      })
    },
    []
  )

  const toSelectedCurrency = React.useCallback(
    (value: number | null | undefined) =>
      convertMoney(value, baseCurrency, currency, currencyRates.rates),
    [baseCurrency, currency, currencyRates.rates]
  )

  const formatModelMoney = React.useCallback(
    (value: number | null | undefined, digits?: number) =>
      formatCurrencyMoney(toSelectedCurrency(value), currency, digits),
    [currency, toSelectedCurrency]
  )

  const runModel = React.useCallback(
    async (nextForm = form, nextLibraries: NurseryLibraries | null = libraries) => {
      setIsRunning(true)
      setRunError(null)

      try {
        const response = await fetch(`${apiBaseUrl}/models/clonal-eucalyptus-nursery`, {
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

        setResult(parsed as NurseryResponse)
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

  const loadDefaultLibraries = React.useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/models/clonal-eucalyptus-nursery/defaults`)
    const responseText = await response.text()
    const parsed = responseText ? JSON.parse(responseText) : null

    if (!response.ok) {
      throw new Error(
        parsed?.detail ||
          parsed?.message ||
          `Backend defaults request failed with status ${response.status}.`
      )
    }

    return (parsed as { library: NurseryLibraries }).library
  }, [apiBaseUrl])

  React.useEffect(() => {
    if (!result || libraries) return
    setLibraries({
      assumptions: result.library.assumptions,
      capex_assets: result.library.capex_assets,
    })
  }, [libraries, result])

  const updateLibraryCell = React.useCallback(
    (table: keyof NurseryLibraries, rowIndex: number, column: string, value: TableRowValue) => {
      if (table === "assumptions" && column === "value") {
        const row = libraries?.assumptions[rowIndex]
        const assumptionName = typeof row?.assumption === "string" ? row.assumption : ""
        const formKey = assumptionToFormKey[assumptionName] ?? assumptionToFormKey[camelCase(assumptionName)]
        if (formKey) {
          const currentDefault = defaultForm[formKey]
          const numericValue = Number(value)
          setForm((current) => ({
            ...current,
            [formKey]:
              typeof currentDefault === "number" && Number.isFinite(numericValue)
                ? numericValue
                : value,
          }))
        }
      }
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
    [libraries]
  )

  React.useEffect(() => {
    if (hasAutoRun.current) return
    hasAutoRun.current = true
    void (async () => {
      try {
        const defaults = await loadDefaultLibraries()
        setLibraries(defaults)
        await runModel(defaultForm, defaults)
      } catch {
        await runModel(defaultForm, null)
      }
    })()
  }, [loadDefaultLibraries, runModel])

  const financialRows = result?.financial_rows ?? []
  const productionRows = result?.production_rows ?? []
  const opexRows = result?.opex_rows ?? []
  const sensitivityRows = result?.sensitivity_rows ?? []
  const metrics = result?.metrics ?? {}
  const activeLibraries = libraries ?? result?.library ?? null

  const financialChartRows = React.useMemo(
    () =>
      financialRows.map((row) => ({
        year: getNumeric(row, "year"),
        revenue: toSelectedCurrency(getNumeric(row, "revenue")),
        opex: toSelectedCurrency(getNumeric(row, "opex")),
        freeCashflow: toSelectedCurrency(getNumeric(row, "free_cashflow")),
      })),
    [financialRows, toSelectedCurrency]
  )

  const productionChartRows = React.useMemo(
    () =>
      productionRows.map((row) => ({
        year: getNumeric(row, "year"),
        soldPlants: getNumeric(row, "sold_plants"),
        saleablePlants: getNumeric(row, "total_saleable_plants"),
      })),
    [productionRows]
  )

  const sensitivityChartRows = React.useMemo(
    () =>
      sensitivityRows.map((row) => ({
        assumption: String(row.assumption),
        lowNpv: toSelectedCurrency(getNumeric(row, "low_npv")),
        highNpv: toSelectedCurrency(getNumeric(row, "high_npv")),
      })),
    [sensitivityRows, toSelectedCurrency]
  )

  const resetForm = () => {
    setForm(defaultForm)
    setLibraries(null)
    void runModel(defaultForm, null)
  }

  return (
    <BaseLayout
      title="Clonal Eucalyptus Nursery Model"
      description="Investment model for a pragmatic rural clonal eucalyptus nursery, adapted from the notebook production, OPEX, CAPEX, financial, and sensitivity engines."
    >
      <div className="@container/main min-w-0 max-w-full overflow-hidden px-4 lg:px-6">
        <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="min-w-0 gap-4 border-border/70 bg-background/75 py-5">
            <CardHeader className="px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Nursery inputs</CardTitle>
                  <CardDescription>
                    Base calculations are in USD.
                  </CardDescription>
                </div>
                <Badge variant="outline">Model 4</Badge>
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
                  label="Model years"
                  value={form.modelYears}
                  min={1}
                  max={30}
                  onChange={(value) =>
                    updateForm("modelYears", Math.max(1, Math.min(30, Math.round(value))))
                  }
                />
                <NumberField
                  label="Ramp-up years"
                  value={form.rampUpYears}
                  min={1}
                  max={form.modelYears}
                  onChange={(value) =>
                    updateForm("rampUpYears", Math.max(1, Math.round(value)))
                  }
                />
              </div>

              <div className="grid gap-4">
                <RangeField
                  label="Discount rate"
                  value={form.discountRate}
                  onChange={(value) => updateForm("discountRate", value)}
                />
                <RangeField
                  label="Inflation rate"
                  value={form.inflationRate}
                  onChange={(value) => updateForm("inflationRate", value)}
                />
                <RangeField
                  label="Working capital / revenue"
                  value={form.workingCapitalPctRevenue}
                  onChange={(value) => updateForm("workingCapitalPctRevenue", value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NumberField
                  label="Mother plants"
                  value={form.motherPlants}
                  min={0}
                  onChange={(value) => updateForm("motherPlants", Math.max(0, value))}
                />
                <NumberField
                  label="Shoots per mother harvest"
                  value={form.shootsPerMotherPerHarvest}
                  min={0}
                  step={0.1}
                  onChange={(value) =>
                    updateForm("shootsPerMotherPerHarvest", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Harvests per year"
                  value={form.harvestsPerYear}
                  min={0}
                  step={0.5}
                  onChange={(value) => updateForm("harvestsPerYear", Math.max(0, value))}
                />
                <NumberField
                  label="Rooting trays"
                  value={form.rootingTrays}
                  min={0}
                  onChange={(value) => updateForm("rootingTrays", Math.max(0, value))}
                />
                <NumberField
                  label="Rooting cycles / year"
                  value={form.rootingCyclesPerYear}
                  min={0}
                  step={0.5}
                  onChange={(value) =>
                    updateForm("rootingCyclesPerYear", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Selling price / plant"
                  value={form.sellingPricePerPlantY1}
                  min={0}
                  step={0.01}
                  onChange={(value) =>
                    updateForm("sellingPricePerPlantY1", Math.max(0, value))
                  }
                />
              </div>

              <div className="grid gap-4">
                <RangeField
                  label="Rooting success"
                  value={form.rootingSuccessRate}
                  onChange={(value) => updateForm("rootingSuccessRate", value)}
                />
                <RangeField
                  label="Market sales rate"
                  value={form.marketSalesRate}
                  onChange={(value) => updateForm("marketSalesRate", value)}
                />
                <RangeField
                  label="Steady utilisation"
                  value={form.steadyStateCapacityUtilisation}
                  onChange={(value) =>
                    updateForm("steadyStateCapacityUtilisation", value)
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NumberField
                  label="Permanent workers"
                  value={form.permanentWorkers}
                  min={0}
                  step={0.5}
                  onChange={(value) =>
                    updateForm("permanentWorkers", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Monthly worker wage"
                  value={form.permanentWorkerMonthlyWage}
                  min={0}
                  step={5}
                  onChange={(value) =>
                    updateForm("permanentWorkerMonthlyWage", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Manager allowance"
                  value={form.managerMonthlyAllowance}
                  min={0}
                  step={5}
                  onChange={(value) =>
                    updateForm("managerMonthlyAllowance", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Seasonal daily wage"
                  value={form.seasonalDailyWage}
                  min={0}
                  step={0.25}
                  onChange={(value) =>
                    updateForm("seasonalDailyWage", Math.max(0, value))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NumberField
                  label="Annual genetic access"
                  value={form.annualGeneticAccessFee}
                  min={0}
                  step={50}
                  onChange={(value) =>
                    updateForm("annualGeneticAccessFee", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Royalty / sold plant"
                  value={form.royaltyPerSoldPlant}
                  min={0}
                  step={0.01}
                  onChange={(value) =>
                    updateForm("royaltyPerSoldPlant", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Annual certification"
                  value={form.annualCertificationFee}
                  min={0}
                  step={50}
                  onChange={(value) =>
                    updateForm("annualCertificationFee", Math.max(0, value))
                  }
                />
                <NumberField
                  label="Technical support / year"
                  value={form.technicalSupportFeePerYear}
                  min={0}
                  step={50}
                  onChange={(value) =>
                    updateForm("technicalSupportFeePerYear", Math.max(0, value))
                  }
                />
              </div>

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

            <div className="min-w-0 space-y-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Backend input dataframes</h2>
                  <p className="text-sm text-muted-foreground">
                    These are the active pandas dataframe rows from the Python clonal nursery model. Editing values here changes the payload used for the next model run.
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
              <Tabs defaultValue="assumptions" className="min-w-0 space-y-4">
                <div className="max-w-full overflow-x-auto">
                  <TabsList className="w-max min-w-full justify-start">
                    <TabsTrigger value="assumptions">Assumptions dataframe</TabsTrigger>
                    <TabsTrigger value="capex">CAPEX dataframe</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="assumptions">
                  <EditableTableCard
                    title="default_assumptions()"
                    description="Every assumption row from the backend dataframe, including the values used by production, OPEX, finance, capacity, labour, input, overhead, and market calculations."
                    rows={activeLibraries?.assumptions ?? []}
                    columns={[
                      "category",
                      "assumption",
                      "value",
                      "unit",
                      "economic_behaviour",
                      "notes",
                    ]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("assumptions", rowIndex, column, value)
                    }
                  />
                </TabsContent>
                <TabsContent value="capex">
                  <EditableTableCard
                    title="default_capex_assets()"
                    description="CAPEX asset rows used by initial investment, replacement CAPEX, depreciation, and maintenance calculations."
                    rows={activeLibraries?.capex_assets ?? []}
                    columns={[
                      "category",
                      "asset",
                      "qty",
                      "unit_cost",
                      "life_years",
                      "replacement_rule",
                      "notes",
                    ]}
                    onCellChange={(rowIndex, column, value) =>
                      updateLibraryCell("capex_assets", rowIndex, column, value)
                    }
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                title="NPV"
                value={formatModelMoney(metrics.NPV)}
                description={`IRR ${formatPercent(metrics.IRR)}`}
                icon={TrendingUp}
              />
              <MetricCard
                title="Initial CAPEX"
                value={formatModelMoney(metrics.Initial_CAPEX)}
                description={`${formatNumber(metrics.Steady_state_sold_plants, 0)} steady-state sold plants`}
                icon={Warehouse}
              />
              <MetricCard
                title="Total free cashflow"
                value={formatModelMoney(metrics.Total_free_cashflow)}
                description={`Payback year ${metrics.Simple_payback_year ?? "n/a"}`}
                icon={Banknote}
              />
              <MetricCard
                title="Unit margin"
                value={formatModelMoney(metrics.Steady_state_revenue_per_sold_plant, 3)}
                description={`${formatModelMoney(metrics.Steady_state_cash_cost_per_sold_plant, 3)} cash cost / sold plant`}
                icon={Sprout}
              />
            </div>

            <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
              <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <CardTitle>Financial projection</CardTitle>
                  <CardDescription>
                    Revenue, OPEX, and free cashflow across the projection.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 px-5">
                  {financialChartRows.length ? (
                    <div className="h-[360px] w-full min-w-0 overflow-hidden">
                      <ChartContainer config={financialChartConfig} className="h-full w-full">
                        <ComposedChart data={financialChartRows} margin={{ left: 8, right: 8, top: 8, bottom: 20 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="year" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                          <ReferenceLine y={0} stroke="hsl(var(--border))" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="opex" fill="#d97706" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="freeCashflow" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                      Run the model to populate the financial chart.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <CardTitle>Nursery production</CardTitle>
                  <CardDescription>
                    Saleable and sold plants after ramp-up and biological losses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 px-5">
                  {productionChartRows.length ? (
                    <div className="h-[360px] w-full min-w-0 overflow-hidden">
                      <ChartContainer config={productionChartConfig} className="h-full w-full">
                        <BarChart data={productionChartRows} margin={{ left: 8, right: 8, top: 8, bottom: 20 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="year" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="saleablePlants" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="soldPlants" fill="#0f766e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                      Run the model to populate the production chart.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0 overflow-hidden gap-4 border-border/70 bg-background/75 py-5">
              <CardHeader className="px-5">
                <CardTitle>NPV sensitivity</CardTitle>
                <CardDescription>
                  One-way NPV movement using the notebook tornado assumptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-5">
                {sensitivityChartRows.length ? (
                  <div className="h-[380px] w-full min-w-0 overflow-hidden">
                    <ChartContainer config={sensitivityChartConfig} className="h-full w-full">
                      <BarChart data={sensitivityChartRows} layout="vertical" margin={{ left: 120, right: 12, top: 8, bottom: 20 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
                        <YAxis dataKey="assumption" type="category" tickLine={false} axisLine={false} width={118} tick={{ fontSize: 11 }} />
                        <ReferenceLine x={0} stroke="hsl(var(--border))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="lowNpv" fill="#dc2626" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="highNpv" fill="#16a34a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-12 text-center text-sm text-muted-foreground">
                    Run the model to populate sensitivity.
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="financials" className="min-w-0 space-y-4">
              <div className="max-w-full overflow-x-auto">
                <TabsList className="w-max min-w-full justify-start">
                  <TabsTrigger value="financials">Financials</TabsTrigger>
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="opex">OPEX</TabsTrigger>
                  <TabsTrigger value="capex">CAPEX</TabsTrigger>
                  <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="financials">
                <DataTableCard
                  title="Financial model"
                  description="Annual revenue, OPEX, CAPEX, working capital, and free cashflow."
                  rows={financialRows}
                  columns={[
                    "year",
                    "revenue",
                    "opex",
                    "ebitda",
                    "capex",
                    "working_capital_change",
                    "free_cashflow",
                    "cumulative_free_cashflow",
                    "discounted_fcf",
                  ]}
                  filename="clonal-nursery-financials.csv"
                  moneyColumns={[
                    "revenue",
                    "opex",
                    "ebitda",
                    "capex",
                    "working_capital_change",
                    "free_cashflow",
                    "cumulative_free_cashflow",
                    "discounted_fcf",
                  ]}
                  formatMoneyValue={(value) => formatModelMoney(value)}
                />
              </TabsContent>

              <TabsContent value="production">
                <DataTableCard
                  title="Production schedule"
                  description="Cutting supply, rooting capacity, conversion losses, sales, and bottleneck."
                  rows={productionRows}
                  columns={[
                    "year",
                    "capacity_utilisation",
                    "usable_cuttings",
                    "annual_sticking_capacity",
                    "cuttings_stuck",
                    "rooted_cuttings",
                    "total_saleable_plants",
                    "sold_plants",
                    "overall_yield_efficiency",
                    "bottleneck",
                  ]}
                  filename="clonal-nursery-production.csv"
                />
              </TabsContent>

              <TabsContent value="opex">
                <DataTableCard
                  title="OPEX detail"
                  description="Annual cash operating cost rows by item."
                  rows={opexRows}
                  columns={["year", "cost_item", "cost"]}
                  filename="clonal-nursery-opex.csv"
                  moneyColumns={["cost"]}
                  formatMoneyValue={(value) => formatModelMoney(value)}
                />
              </TabsContent>

              <TabsContent value="capex">
                <DataTableCard
                  title="CAPEX asset register"
                  description="Initial asset register with life and replacement rules."
                  rows={result?.capex_rows ?? []}
                  columns={[
                    "category",
                    "asset",
                    "qty",
                    "unit_cost",
                    "life_years",
                    "replacement_rule",
                    "initial_cost",
                  ]}
                  filename="clonal-nursery-capex.csv"
                  moneyColumns={["unit_cost", "initial_cost"]}
                  formatMoneyValue={(value) => formatModelMoney(value)}
                />
              </TabsContent>

              <TabsContent value="sensitivity">
                <DataTableCard
                  title="Sensitivity table"
                  description="Low, base, and high NPV for one-way assumption tests."
                  rows={sensitivityRows}
                  columns={[
                    "assumption",
                    "base_value",
                    "low_value",
                    "high_value",
                    "low_npv",
                    "base_npv",
                    "high_npv",
                    "swing",
                  ]}
                  filename="clonal-nursery-sensitivity.csv"
                  moneyColumns={["low_npv", "base_npv", "high_npv", "swing"]}
                  formatMoneyValue={(value) => formatModelMoney(value)}
                />
              </TabsContent>

            </Tabs>

            {result?.assumptions.length ? (
              <Card className="min-w-0 gap-3 border-border/70 bg-background/75 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="text-base">Model assumptions</CardTitle>
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
