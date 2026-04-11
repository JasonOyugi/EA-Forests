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
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Leaf,
  ShieldCheck,
  GripVertical,
  MessageCircle,
  Trees,
  Plus,
} from "lucide-react"

import { events as calendarEvents, eventDates } from "@/app/calendar/data"
import { Chat } from "@/app/chat/components/chat"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner"
import { useChat, type Conversation, type Message, type User } from "@/app/chat/use-chat"
import conversationsData from "@/app/chat/data/conversations.json"
import messagesData from "@/app/chat/data/messages.json"
import usersData from "@/app/chat/data/users.json"

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

type TableView = "assets" | "transactions" | "activity-logs" | "documents"

type TreeVariety = "eucalyptus" | "pine" | "cypress" | "teak" | "corymbia"
type Activity = "silviculture" | "planting" | "none"
type Country = "Uganda" | "Kenya" | "Tanzania"

type SubBlock = {
  id: string
  subBlock: string
  variety: TreeVariety
  size: number
  plantedSize: number
  age: number
  activity: Activity
  contractor: string
}

type AssetGroup = {
  id: string
  block: string
  location: string
  country: Country
  subBlocks: SubBlock[]
}

type PaymentRow = {
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

function groupVarieties(g: AssetGroup) {
  return [...new Set(g.subBlocks.map((s) => s.variety))].join(", ")
}

function groupSize(g: AssetGroup) {
  return g.subBlocks.reduce((sum, s) => sum + s.size, 0)
}

function groupPlantedSize(g: AssetGroup) {
  return g.subBlocks.reduce((sum, s) => sum + s.plantedSize, 0)
}

function groupAge(g: AssetGroup) {
  return Math.max(...g.subBlocks.map((s) => s.age))
}

const initialAssetGroups: AssetGroup[] = [
  {
    id: "group-1",
    block: "North Ridge A1",
    location: "Northern Region",
    country: "Uganda",
    subBlocks: [
      { id: "sub-1a", subBlock: "A1a", variety: "eucalyptus", size: 32, plantedSize: 29, age: 6, activity: "silviculture", contractor: "GreenCanopy Ltd" },
      { id: "sub-1b", subBlock: "A1b", variety: "corymbia", size: 28, plantedSize: 26, age: 4, activity: "none", contractor: "-" },
      { id: "sub-1c", subBlock: "A1c", variety: "pine", size: 24, plantedSize: 24, age: 3, activity: "planting", contractor: "Timberline Services" },
    ],
  },
  {
    id: "group-2",
    block: "River Bend C2",
    location: "Central Valley",
    country: "Kenya",
    subBlocks: [
      { id: "sub-2a", subBlock: "C2a", variety: "pine", size: 30, plantedSize: 30, age: 3, activity: "planting", contractor: "Timberline Services" },
      { id: "sub-2b", subBlock: "C2b", variety: "teak", size: 26, plantedSize: 26, age: 3, activity: "planting", contractor: "Timberline Services" },
    ],
  },
  {
    id: "group-3",
    block: "Pine Hollow D7",
    location: "Highland Zone",
    country: "Tanzania",
    subBlocks: [
      { id: "sub-3a", subBlock: "D7a", variety: "cypress", size: 60, plantedSize: 50, age: 11, activity: "none", contractor: "-" },
      { id: "sub-3b", subBlock: "D7b", variety: "eucalyptus", size: 52, plantedSize: 44, age: 9, activity: "silviculture", contractor: "GreenCanopy Ltd" },
    ],
  },
  {
    id: "group-4",
    block: "East Valley B4",
    location: "Eastern Plateau",
    country: "Uganda",
    subBlocks: [
      { id: "sub-4a", subBlock: "B4a", variety: "teak", size: 38, plantedSize: 34, age: 4, activity: "silviculture", contractor: "SylvaOps" },
      { id: "sub-4b", subBlock: "B4b", variety: "eucalyptus", size: 30, plantedSize: 27, age: 3, activity: "planting", contractor: "Timberline Services" },
    ],
  },
]

const latestPayments: PaymentRow[] = [
  { invoice: "INV-2026-143", description: "Silviculture crew - North Ridge A1", dueDate: "2026-04-04", amount: 28450, status: "paid" },
  { invoice: "INV-2026-138", description: "Planting materials - River Bend C2", dueDate: "2026-03-27", amount: 19780, status: "received" },
  { invoice: "INV-2026-131", description: "Road maintenance - East Valley B4", dueDate: "2026-02-18", amount: 8920, status: "overdue" },
]

const upcomingPayments: PaymentRow[] = [
  { invoice: "INV-2026-151", description: "Thinning operation - Pine Hollow D7", dueDate: "2026-04-18", amount: 41300, status: "scheduled" },
  { invoice: "INV-2026-154", description: "Seedling replenishment - East Valley B4", dueDate: "2026-04-29", amount: 12700, status: "scheduled" },
  { invoice: "INV-2026-162", description: "Site inspection package", dueDate: "2026-05-12", amount: 6400, status: "scheduled" },
]

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

const countryFlag: Record<Country, string> = {
  Uganda: "UG",
  Kenya: "KE",
  Tanzania: "TZ",
}

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

function PaymentList({ title, payments }: { title: string; payments: PaymentRow[] }) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Invoice list</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.invoice}
            onClick={() => navigate(`/invoice/${payment.invoice}`)}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-muted/50"
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

type SortColumn = "block" | "size" | "age" | "variety" | "country"
type SortOrder = "asc" | "desc"

type SortableAssetRowProps = {
  group: AssetGroup
  isExpanded: boolean
  onToggle: () => void
}

function SortableAssetRow({ group, isExpanded, onToggle }: SortableAssetRowProps) {
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
        <TableCell>{groupSize(group)}</TableCell>
        <TableCell>{groupPlantedSize(group)}</TableCell>
        <TableCell>{groupAge(group)}</TableCell>
      </TableRow>

      {isExpanded &&
        group.subBlocks.map((sub) => (
          <TableRow key={sub.id}>
            <TableCell className="w-8 px-2" />
            <TableCell className="w-6 px-1" />
            <TableCell className="pl-6 text-sm text-muted-foreground">{`${group.block} — ${sub.subBlock}`}</TableCell>
            <TableCell className="text-sm capitalize">{sub.variety}</TableCell>
            <TableCell className="text-sm text-muted-foreground">—</TableCell>
            <TableCell className="text-sm text-muted-foreground">—</TableCell>
            <TableCell className="text-sm">{sub.size}</TableCell>
            <TableCell className="text-sm">{sub.plantedSize}</TableCell>
            <TableCell className="text-sm">{sub.age}</TableCell>
          </TableRow>
        ))}
    </>
  )
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function MiniCalendarPreview() {
  const [month, setMonth] = React.useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = React.useState(() => new Date())

  const counts = React.useMemo(
    () => new Map(eventDates.map((item) => [dateKey(item.date), item.count])),
    []
  )

  const monthLabel = month.toLocaleString("en-US", { month: "long", year: "numeric" })

  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const cells: Array<number | null> = []
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  const selectedEvents = React.useMemo(() => {
    const selectedKey = dateKey(selectedDate)
    return calendarEvents
      .filter((e) => dateKey(e.date) === selectedKey)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3)
  }, [selectedDate])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {"SMTWTFS".split("").map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="h-8" />
          }

          const current = new Date(month.getFullYear(), month.getMonth(), day)
          const key = dateKey(current)
          const count = counts.get(key) ?? 0
          const isSelected = dateKey(selectedDate) === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(current)}
              className={`relative h-8 rounded-md text-xs transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {day}
              {count > 0 && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-md border p-2">
        <p className="mb-1 text-xs font-medium">Events on {selectedDate.toLocaleDateString()}</p>
        {selectedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events scheduled.</p>
        ) : (
          <ul className="space-y-1">
            {selectedEvents.map((event) => (
              <li key={event.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>{" "}
                {event.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MiniChatPreview() {
  const { setSelectedConversation } = useChat()

  const previewConversations = React.useMemo(
    () =>
      [...(conversationsData as Conversation[])]
        .sort(
          (a, b) =>
            new Date(b.lastMessage.timestamp).getTime() -
            new Date(a.lastMessage.timestamp).getTime()
        )
        .slice(0, 5),
    []
  )

  const previewConversationIds = React.useMemo(
    () => new Set(previewConversations.map((conv) => conv.id)),
    [previewConversations]
  )

  const previewMessages = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(messagesData as Record<string, Message[]>).filter(([conversationId]) =>
          previewConversationIds.has(conversationId)
        )
      ),
    [previewConversationIds]
  )

  const previewUsers = usersData as User[]

  React.useEffect(() => {
    setSelectedConversation(previewConversations[0]?.id ?? null)
  }, [previewConversations, setSelectedConversation])

  return (
    <div className="max-h-[430px] min-h-[430px] overflow-hidden rounded-md [&>div]:max-h-[430px] [&>div]:min-h-[430px]">
      <Chat
        conversations={previewConversations}
        messages={previewMessages}
        users={previewUsers}
      />
    </div>
  )
}

export function DataTable() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<TableView>("assets")

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
      let aVal: string | number
      let bVal: string | number

      if (sortConfig.col === "block") {
        aVal = a.block
        bVal = b.block
      } else if (sortConfig.col === "country") {
        aVal = a.country
        bVal = b.country
      } else if (sortConfig.col === "variety") {
        aVal = groupVarieties(a)
        bVal = groupVarieties(b)
      } else if (sortConfig.col === "size") {
        aVal = groupSize(a)
        bVal = groupSize(b)
      } else {
        aVal = groupAge(a)
        bVal = groupAge(b)
      }

      if (typeof aVal === "string") {
        const cmp = aVal.toLowerCase().localeCompare((bVal as string).toLowerCase())
        return sortConfig.order === "asc" ? cmp : -cmp
      }

      return sortConfig.order === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal
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
    if (sortConfig.col !== col) return <span className="ml-1 opacity-30">↕</span>
    return <span className="ml-1">{sortConfig.order === "asc" ? "↑" : "↓"}</span>
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TableView)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <Select value={activeTab} onValueChange={(value) => setActiveTab(value as TableView)}>
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
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("block")}>Block{sortIndicator("block")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("variety")}>Variety{sortIndicator("variety")}</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("country")}>Country{sortIndicator("country")}</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("size")}>Size (ha){sortIndicator("size")}</TableHead>
                  <TableHead>Planted (ha)</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleColumnSort("age")}>Age (yr){sortIndicator("age")}</TableHead>
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
          <PaymentList title="Upcoming payments" payments={upcomingPayments} />
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

      <div className="mt-6 grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>
                <button
                  type="button"
                  onClick={() => navigate("/calendar")}
                  className="cursor-pointer underline-offset-4 transition hover:underline"
                >
                  Calendar
                </button>
              </CardTitle>
            </div>
            <CardDescription>Mini planner preview. Open full calendar to edit.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniCalendarPreview />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <CardTitle>Chat</CardTitle>
              </div>
              <button
                type="button"
                onClick={() => navigate("/chat")}
                className="text-sm font-medium text-primary underline-offset-4 transition hover:underline"
              >
                + see more
              </button>
            </div>
            <CardDescription>Latest five chats in compact full-feature mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniChatPreview />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 px-4 pb-2 lg:grid-cols-2 xl:grid-cols-4 lg:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="inline-flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                Seedlings Shop
              </span>
              <button
                type="button"
                onClick={() => navigate("/shop/seedlings")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-44 overflow-hidden rounded-lg">
              <SeedlingsBanner />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                Forestry Services
              </span>
              <button
                type="button"
                onClick={() => navigate("/shop/forestry-services")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-44 overflow-hidden rounded-lg">
              <ForestryServicesCountdownBanner />
            </div>
          </CardContent>
        </Card>

        <Card className="group border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-card to-blue-500/10 transition-all hover:border-cyan-500/50 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2">
                <Trees className="h-4 w-4 text-cyan-600" />
                Roundwood Market
              </span>
              <button
                type="button"
                onClick={() => navigate("/shop/roundwood")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
            <CardDescription>
              Curated lots, pole classes, and log categories for timber buyers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-cyan-500/20 bg-background/70 p-4 text-sm text-muted-foreground">
              Elegant quick access to the roundwood catalogue with market-ready listings.
            </div>
          </CardContent>
        </Card>

        <Card className="group border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-lime-500/10 transition-all hover:border-emerald-500/50 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2">
                <Trees className="h-4 w-4 text-emerald-600" />
                Forests & Land
              </span>
              <button
                type="button"
                onClick={() => navigate("/shop/forests-land")}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
            <CardDescription>
              Explore managed forest blocks and investment-ready land-linked assets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-emerald-500/20 bg-background/70 p-4 text-sm text-muted-foreground">
              Designed for investor scouting: opportunities, due diligence context, and quick navigation.
            </div>
          </CardContent>
        </Card>
      </div>
      
    </Tabs>
  )
}
