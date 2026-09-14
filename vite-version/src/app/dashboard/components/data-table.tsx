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
  ChevronDown,
  ChevronRight,
  MapPinned,
  GripVertical,
  Plus,
} from "lucide-react"

import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner"
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  formatVarietyLabel,
  getGroupEstimatedMetrics,
  groupPlantedSize,
  groupSize,
  groupVarieties,
  initialAssetGroups,
} from "../data/forestry-data"
import type {
  AssetGroup,
  Country,
} from "../data/forestry-data"
import { getAssetLandComposition } from "../data/asset-intelligence-data"

export {
  buildGroupMetricSeries,
  formatVarietyLabel,
  getGroupEstimatedMetrics,
  getGroupSpecies,
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

type SortColumn =
  | "area"
  | "plantedArea"
  | "age"
  | "estimatedVolume"
  | "estimatedValuation"
  | "investmentPlaced"
type SortOrder = "asc" | "desc"

/** Real modelled max material-class probability across this asset's
 * derived zones (0-100), NOT an age in years -- no planting-date record
 * exists for these real reserves. See AssetSubBlock's docstring. */
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

// Track v5-23: fake activity/document/payment records removed -- no
// verified operational record exists for these real reference assets.

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

// statusBadge/paymentStatusHoverClass/PaymentList removed -- no verified payment/invoice/activity record exists for these real assets (Track v5-23).

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

        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <span>{group.block}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-help text-[10px] font-normal uppercase tracking-wide text-muted-foreground"
                >
                  {group.provenance.geometryLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-xs">
                {group.provenance.geometryNote}
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
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
        (() => {
          const composition = getAssetLandComposition(group.assetState)
          const rows = composition.otherAreaHa > 0
            ? [...composition.species, composition.other]
            : composition.species
          return rows.map((entry) => (
            <TableRow key={`${group.id}-${entry.materialClass}`}>
              <TableCell className="w-8 px-2" />
              <TableCell className="w-6 px-1" />
              <TableCell className="pl-6 text-sm text-muted-foreground">{`${group.block} - ${formatVarietyLabel(entry.materialClass)}`}</TableCell>
              <TableCell className="text-sm capitalize">{formatVarietyLabel(entry.materialClass)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm">{formatTableNumber(entry.areaHa)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm">{entry.sharePct.toFixed(0)}%</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
              <TableCell className="text-sm text-muted-foreground">-</TableCell>
            </TableRow>
          ))
        })()}
    </>
  )
}

interface DataTableProps {
  activeTab: TableView
  onActiveTabChange: (tab: TableView) => void
  transactionsHighlightKey: number
  onAssetMapOpen: (groupId: string) => void
}

export function DataTable({
  activeTab,
  onActiveTabChange,
  onAssetMapOpen,
}: DataTableProps) {
  const navigate = useNavigate()

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
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("age")}>Top class %{sortIndicator("age")}</TableHead>
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
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No verified operational records linked to this asset.
        </div>
      </TabsContent>

      <TabsContent value="activity-logs" className="px-4 lg:px-6">
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No verified operational records linked to this asset.
        </div>
      </TabsContent>

      <TabsContent value="documents" className="px-4 lg:px-6">
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No verified operational records linked to this asset.
        </div>
      </TabsContent>

      {/* Track v6-15: demo calendar removed -- no verified operational/field-visit record exists for these assets. */}
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
