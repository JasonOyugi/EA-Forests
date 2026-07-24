"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPinned,
  GripVertical,
  Plus,
} from "lucide-react"

import { Calendar as FullCalendar } from "@/app/calendar/components/calendar"
import type { CalendarEvent } from "@/app/calendar/types"
import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { deriveEventDates, getRecentPaymentRows, getUpcomingPaymentRows } from "./dashboard-events"
import {
  getGroupEstimatedMetrics,
  getSubBlockEstimatedMetrics,
  groupPlantedSize,
  groupSize,
  groupVarieties,
  initialAssetGroups,
} from "../data/forestry-data"
import type {
  AssetGroup,
  Country,
} from "../data/forestry-data"

export {
  buildGroupMetricSeries,
  formatVarietyLabel,
  getGroupEstimatedMetrics,
  getGroupSpecies,
  getSubBlockEstimatedMetrics,
  groupPlantedSize,
  groupSize,
  initialAssetGroups,
  speciesProfile,
} from "../data/forestry-data"
export type {
  AssetGroup,
  AssetSubBlock as SubBlock,
  SiteMetricKey,
  TreeVariety,
} from "../data/forestry-data"

type TableView = "assets" | "transactions" | "activity-logs" | "documents"

export type PaymentRow = {
  invoice: string
  description: string
  dueDate: string
  amount: number
  status: "paid" | "pending" | "overdue" | "received" | "cancelled" | "scheduled"
}

type ActivityLogRow = {
  activity: string
  activityName: string
  operation: string
  status: "completed" | "in progress" | "scheduled"
  contractor: string
}

type DocumentRow = {
  date: string
  document: string
  status: "verified" | "pending review" | "action required"
  lastModified: string
}

type SortColumn =
  | "area"
  | "plantedArea"
  | "age"
  | "estimatedVolume"
  | "estimatedValuation"
  | "investmentPlaced"
type SortOrder = "asc" | "desc"

function groupAge(g: AssetGroup) {
  return Math.max(...g.subBlocks.map((s) => s.age))
}

function formatTableNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTableCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function scalePolygon(
  positions: [number, number][],
  ratio: number
): [number, number][] {
  const centroid = positions.reduce(
    (acc, [lat, lng]) => [acc[0] + lat / positions.length, acc[1] + lng / positions.length],
    [0, 0]
  ) as [number, number]

  return positions.map(([lat, lng]) => [
    centroid[0] + (lat - centroid[0]) * ratio,
    centroid[1] + (lng - centroid[1]) * ratio,
  ])
}

function kmToLatitudeDegrees(kilometers: number) {
  return kilometers / 110.574
}

function kmToLongitudeDegrees(kilometers: number, latitude: number) {
  const kilometersPerDegree = 111.32 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.12)
  return kilometers / kilometersPerDegree
}

export function createPolygon(
  center: [number, number],
  index: number,
  totalArea: number,
  plantedArea: number,
  layoutCount = 1,
  layoutMaxArea = totalArea
) {
  const columns = Math.min(3, Math.max(1, layoutCount))
  const rows = Math.ceil(layoutCount / columns)
  const row = Math.floor(index / columns)
  const column = index % columns
  const rowItemCount = Math.min(columns, Math.max(layoutCount - row * columns, 1))
  const maxSideKm = Math.sqrt(Math.max(layoutMaxArea, 0.25) * 0.01)
  const pitchKm = Math.max(maxSideKm * 1.9, 0.85)
  const latitudeCenter =
    center[0] + kmToLatitudeDegrees((rows - 1) / 2 * pitchKm - row * pitchKm)
  const longitudeCenter =
    center[1] +
    kmToLongitudeDegrees((column - (rowItemCount - 1) / 2) * pitchKm, center[0])
  const areaKm2 = Math.max(totalArea, 0.25) * 0.01
  const aspectRatio = 0.82 + (index % 3) * 0.16
  const widthKm = Math.sqrt(areaKm2 * aspectRatio)
  const heightKm = Math.sqrt(areaKm2 / aspectRatio)
  const halfHeight = kmToLatitudeDegrees(heightKm / 2)
  const halfWidth = kmToLongitudeDegrees(widthKm / 2, latitudeCenter)

  const outer = [
    [latitudeCenter + halfHeight, longitudeCenter - halfWidth],
    [latitudeCenter + halfHeight, longitudeCenter + halfWidth],
    [latitudeCenter - halfHeight, longitudeCenter + halfWidth],
    [latitudeCenter - halfHeight, longitudeCenter - halfWidth],
  ] as [number, number][]

  const plantedRatio =
    totalArea > 0 ? Math.sqrt(Math.max(plantedArea, 0.01) / totalArea) : 0.52
  const inner = scalePolygon(outer, Math.min(Math.max(plantedRatio, 0.12), 0.96))

  return { outer, inner }
}

const activityLogs: ActivityLogRow[] = [
  { activity: "2026-04-08", activityName: "Form pruning pass", operation: "Silviculture", status: "completed", contractor: "GreenCanopy Ltd" },
  { activity: "2026-04-10", activityName: "Density assessment", operation: "Survey", status: "in progress", contractor: "SylvaOps" },
  { activity: "2026-04-16", activityName: "Replanting preparation", operation: "Planting", status: "scheduled", contractor: "Timberline Services" },
  { activity: "2026-04-21", activityName: "Access trail grading", operation: "Infrastructure", status: "scheduled", contractor: "TerrainWorks" },
]

const documents: DocumentRow[] = [
  { date: "2026-04-01", document: "Independent valuation report Q1", status: "verified", lastModified: "2026-04-03 14:18" },
  { date: "2026-03-26", document: "Harvest readiness audit - Pine Hollow D7", status: "pending review", lastModified: "2026-04-07 09:42" },
  { date: "2026-03-19", document: "Contract amendment - GreenCanopy", status: "action required", lastModified: "2026-04-09 11:05" },
]

const countryBoundaryStyle: Record<Country, React.CSSProperties> = {
  Uganda: {
    border: "1px solid transparent",
    background: "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #111111 0%, #facc15 50%, #dc2626 100%) border-box",
  },
  Kenya: {
    border: "1px solid transparent",
    background: "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #111111 0%, #dc2626 50%, #15803d 100%) border-box",
  },
  Tanzania: {
    border: "1px solid transparent",
    background: "linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(90deg, #16a34a 0%, #111111 50%, #2563eb 100%) border-box",
  },
}

const countryPulseClass: Record<Country, string> = {
  Uganda: "country-pulse-ug",
  Kenya: "country-pulse-ke",
  Tanzania: "country-pulse-tz",
}

const countryRowClass: Record<Country, string> = {
  Uganda: "flag-row-ug",
  Kenya: "flag-row-ke",
  Tanzania: "flag-row-tz",
}

const countryStrips: Record<Country, string[]> = {
  Uganda: ["#111111", "#facc15", "#dc2626"],
  Kenya: ["#111111", "#dc2626", "#15803d"],
  Tanzania: ["#16a34a", "#111111", "#2563eb"],
}

function CountryStripeBadge({ country }: { country: Country }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/90 px-2 py-1"
      title={country}
      aria-label={country}
    >
      {countryStrips[country].map((color, index) => (
        <span
          key={`${country}-${index}`}
          className="h-2.5 w-4 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
    received: "bg-emerald-100 text-emerald-800 border-emerald-300",
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    overdue: "bg-rose-100 text-rose-800 border-rose-300",
    cancelled: "bg-slate-100 text-slate-800 border-slate-300",
    scheduled: "bg-blue-100 text-blue-800 border-blue-300",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    "in progress": "bg-sky-100 text-sky-800 border-sky-300",
    verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
    "pending review": "bg-amber-100 text-amber-800 border-amber-300",
    "action required": "bg-rose-100 text-rose-800 border-rose-300",
  }

  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status}
    </Badge>
  )
}

function paymentStatusHoverClass(status: PaymentRow["status"]) {
  const styles: Record<PaymentRow["status"], string> = {
    paid: "invoice-run-emerald",
    received: "invoice-run-emerald",
    pending: "invoice-run-amber",
    overdue: "invoice-run-rose",
    cancelled: "invoice-run-slate",
    scheduled: "invoice-run-blue",
  }

  return styles[status]
}

function PaymentList({
  title,
  payments,
  className,
}: {
  title: string
  payments: PaymentRow[]
  className?: string
}) {
  const navigate = useNavigate()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Invoice list</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.invoice}
            onClick={() => navigate(`/invoice/${payment.invoice}`)}
            className={`invoice-run-card ${paymentStatusHoverClass(payment.status)} flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-muted/50`}
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{payment.invoice}</p>
              <p className="truncate text-xs text-muted-foreground">{payment.description}</p>
              <p className="text-xs text-muted-foreground">Due {payment.dueDate}</p>
            </div>
            <div className="shrink-0 space-y-1 text-right">
              <p className="text-sm font-semibold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(payment.amount)}
              </p>
              {statusBadge(payment.status)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

type SortableAssetRowProps = {
  group: AssetGroup
  isExpanded: boolean
  onToggle: () => void
  onMapOpen: (groupId: string) => void
}

function SortableAssetRow({ group, isExpanded, onToggle, onMapOpen }: SortableAssetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...countryBoundaryStyle[group.country],
    opacity: isDragging ? 0.65 : 1,
  }
  const metrics = getGroupEstimatedMetrics(group)

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={`cursor-pointer flag-row ${countryRowClass[group.country]} ${isExpanded ? "flag-row-active" : ""}`}
        onClick={onToggle}
      >
        <TableCell
          className="w-8 cursor-grab px-2 text-muted-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </TableCell>

        <TableCell className="w-6 px-1 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>

        <TableCell className="font-medium">{group.block}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{groupVarieties(group)}</TableCell>
        <TableCell>{group.location}</TableCell>
        <TableCell>
          <span className={`font-semibold tracking-wide ${countryPulseClass[group.country]}`}>
            <CountryStripeBadge country={group.country} />
          </span>
        </TableCell>
        <TableCell>{formatTableNumber(groupSize(group))}</TableCell>
        <TableCell>{formatTableNumber(groupPlantedSize(group))}</TableCell>
        <TableCell>{formatTableNumber(groupAge(group))}</TableCell>
        <TableCell>{formatTableNumber(metrics.estimatedVolume)}</TableCell>
        <TableCell>{formatTableCurrency(metrics.estimatedValuation)}</TableCell>
        <TableCell>{formatTableCurrency(metrics.investmentPlaced)}</TableCell>
        <TableCell onClick={(event) => event.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => onMapOpen(group.id)}
          >
            <MapPinned className="h-3.5 w-3.5" />
            Map
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded &&
        group.subBlocks.map((sub) => {
          const subMetrics = getSubBlockEstimatedMetrics(group, sub)

          return (
          <TableRow key={sub.id}>
            <TableCell className="w-8 px-2" />
            <TableCell className="w-6 px-1" />
            <TableCell className="pl-6 text-sm text-muted-foreground">{`${group.block} - ${sub.subBlock}`}</TableCell>
            <TableCell className="text-sm capitalize">{sub.variety}</TableCell>
            <TableCell className="text-sm text-muted-foreground">-</TableCell>
            <TableCell className="text-sm text-muted-foreground">-</TableCell>
            <TableCell className="text-sm">{formatTableNumber(sub.size)}</TableCell>
            <TableCell className="text-sm">{formatTableNumber(sub.plantedSize)}</TableCell>
            <TableCell className="text-sm">{formatTableNumber(sub.age)}</TableCell>
            <TableCell className="text-sm">{formatTableNumber(subMetrics.estimatedVolume)}</TableCell>
            <TableCell className="text-sm">{formatTableCurrency(subMetrics.estimatedValuation)}</TableCell>
            <TableCell className="text-sm">{formatTableCurrency(subMetrics.investmentPlaced)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">-</TableCell>
          </TableRow>
        )})}
    </>
  )
}

interface DataTableProps {
  activeTab: TableView
  onActiveTabChange: (tab: TableView) => void
  transactionsHighlightKey: number
  events: CalendarEvent[]
  onEventsChange: (events: CalendarEvent[]) => void
  onAssetMapOpen: (groupId: string) => void
}

export function DataTable({
  activeTab,
  onActiveTabChange,
  transactionsHighlightKey,
  events,
  onEventsChange,
  onAssetMapOpen,
}: DataTableProps) {
  const navigate = useNavigate()
  const [highlightUpcomingPayments, setHighlightUpcomingPayments] = React.useState(false)

  const assetGroups = initialAssetGroups
  const [rowOrder, setRowOrder] = React.useState<string[]>(() => initialAssetGroups.map((g) => g.id))
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = React.useState<{ col: SortColumn | null; order: SortOrder }>({
    col: null,
    order: "asc",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const displayedGroups = React.useMemo(() => {
    const ordered = rowOrder
      .map((id) => assetGroups.find((g) => g.id === id))
      .filter(Boolean) as AssetGroup[]

    if (!sortConfig.col) return ordered

    return [...ordered].sort((a, b) => {
      const aMetrics = getGroupEstimatedMetrics(a)
      const bMetrics = getGroupEstimatedMetrics(b)

      const aVal =
        sortConfig.col === "area"
          ? groupSize(a)
          : sortConfig.col === "plantedArea"
            ? groupPlantedSize(a)
            : sortConfig.col === "age"
              ? groupAge(a)
              : sortConfig.col === "estimatedVolume"
                ? aMetrics.estimatedVolume
                : sortConfig.col === "estimatedValuation"
                  ? aMetrics.estimatedValuation
                  : aMetrics.investmentPlaced

      const bVal =
        sortConfig.col === "area"
          ? groupSize(b)
          : sortConfig.col === "plantedArea"
            ? groupPlantedSize(b)
            : sortConfig.col === "age"
              ? groupAge(b)
              : sortConfig.col === "estimatedVolume"
                ? bMetrics.estimatedVolume
                : sortConfig.col === "estimatedValuation"
                  ? bMetrics.estimatedValuation
                  : bMetrics.investmentPlaced

      return sortConfig.order === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [assetGroups, rowOrder, sortConfig])
  const latestPayments = React.useMemo(() => getRecentPaymentRows(events).slice(0, 3), [events])
  const upcomingPayments = React.useMemo(() => getUpcomingPaymentRows(events), [events])
  const eventDates = React.useMemo(() => deriveEventDates(events), [events])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setRowOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
      setSortConfig({ col: null, order: "asc" })
    }
  }

  function toggleExpand(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleColumnSort(col: SortColumn) {
    setSortConfig((prev) =>
      prev.col === col
        ? { col, order: prev.order === "asc" ? "desc" : "asc" }
        : { col, order: "asc" }
    )
  }

  function sortIndicator(col: SortColumn) {
    if (sortConfig.col !== col) return <span className="ml-1 opacity-30">+-</span>
    return <span className="ml-1">{sortConfig.order === "asc" ? "^" : "v"}</span>
  }

  React.useEffect(() => {
    if (activeTab !== "transactions" || transactionsHighlightKey === 0) return

    setHighlightUpcomingPayments(true)
    const timeout = window.setTimeout(() => setHighlightUpcomingPayments(false), 2200)
    return () => window.clearTimeout(timeout)
  }, [activeTab, transactionsHighlightKey])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onActiveTabChange(value as TableView)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <Select value={activeTab} onValueChange={(value) => onActiveTabChange(value as TableView)}>
          <SelectTrigger className="flex w-fit cursor-pointer sm:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assets">Assets</SelectItem>
            <SelectItem value="transactions">Transactions</SelectItem>
            <SelectItem value="activity-logs">Activity logs</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
          </SelectContent>
        </Select>

        <TabsList className="hidden sm:flex">
          <TabsTrigger value="assets" className="cursor-pointer">Assets</TabsTrigger>
          <TabsTrigger value="transactions" className="cursor-pointer">Transactions</TabsTrigger>
          <TabsTrigger value="activity-logs" className="cursor-pointer">Activity logs</TabsTrigger>
          <TabsTrigger value="documents" className="cursor-pointer">Documents</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="assets" className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-8 px-2" />
                  <TableHead className="w-6 px-1" />
                  <TableHead>Block</TableHead>
                  <TableHead>Variety</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("area")}>Area (ha){sortIndicator("area")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("plantedArea")}>Planted (ha){sortIndicator("plantedArea")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("age")}>Age (yr){sortIndicator("age")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("estimatedVolume")}>Estimated Volume (m3){sortIndicator("estimatedVolume")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("estimatedValuation")}>Estimated Valuation (USD){sortIndicator("estimatedValuation")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("investmentPlaced")}>Investment Placed (USD){sortIndicator("investmentPlaced")}</TableHead>
                  <TableHead>Map</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={displayedGroups.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayedGroups.map((group) => (
                    <SortableAssetRow
                      key={group.id}
                      group={group}
                      isExpanded={expandedRows.has(group.id)}
                      onToggle={() => toggleExpand(group.id)}
                      onMapOpen={onAssetMapOpen}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div className="mt-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/assets/add")}>
            <Plus className="h-4 w-4" />
            Add asset block
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="transactions" className="px-4 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentList title="Latest payments" payments={latestPayments} />
          <PaymentList
            title="Upcoming payments"
            payments={upcomingPayments}
            className={highlightUpcomingPayments ? "upcoming-payments-flicker" : undefined}
          />
        </div>
      </TabsContent>

      <TabsContent value="activity-logs" className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contractor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.map((log) => (
                <TableRow key={`${log.activity}-${log.activityName}`}>
                  <TableCell>{log.activity}</TableCell>
                  <TableCell className="font-medium">{log.activityName}</TableCell>
                  <TableCell>{log.operation}</TableCell>
                  <TableCell>{statusBadge(log.status)}</TableCell>
                  <TableCell>{log.contractor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="documents" className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.document}>
                  <TableCell>{doc.date}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help font-medium underline decoration-dotted underline-offset-2">
                          {doc.document}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Last modified: {doc.lastModified}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{statusBadge(doc.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <div className="mt-6 grid gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2 p-4">
          <CalendarDays className="h-5 w-5 text-emerald-700" />
          <div>
            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="cursor-pointer underline-offset-4 font-semibold text-xl transition hover:underline"
            >
              Calendar
            </button>
          </div>
        </div>
        <div className="p-0">
          <FullCalendar events={events} eventDates={eventDates} onEventsChange={onEventsChange} />
        </div>
      </div>
      <div className="grid gap-4 px-4 pb-2 lg:px-6">
        <div className=" overflow-hidden rounded-lg">
          <SeedlingsBanner />
        </div>

        <div className="overflow-hidden rounded-lg">
          <ForestryServicesCountdownBanner />
        </div>

        <div className="overflow-hidden rounded-lg">
          <ForestsLandTopBanner />
        </div>

        <div className="overflow-hidden rounded-lg">
          <ForestryServicesSaleBanner />
        </div>
      </div>
      
    </Tabs>
  )
}
