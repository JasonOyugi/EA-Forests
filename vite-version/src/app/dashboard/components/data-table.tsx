"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  CheckCheck,
  EllipsisVertical,
  GripVertical,
  Columns2,
  Loader,
  PlayCircle,
  Calendar,
  AlertTriangle,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { schema } from "../schemas/task-schema"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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

type TaskRow = z.infer<typeof schema>
type TableView = "live-projects" | "growers" | "crew-leads" | "field-documents"

type ColumnConfig = {
  titleLabel: string
  typeLabel: string
  typeBadge?: boolean
  reviewerLabel: string
  addGrowerColumn?: boolean
  allActivities: TaskRow[]
}

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent cursor-move"
    >
      <GripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function getStatusBadge(status: string) {
  const statusConfig = {
    Done: {
      icon: CircleCheckBig,
      className: "text-green-500 dark:text-green-400",
    },
    Completed: {
      icon: CheckCheck,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    "In Progress": {
      icon: Loader,
      className: "text-blue-500 dark:text-blue-400 animate-spin",
    },
    Scheduled: {
      icon: Calendar,
      className: "text-slate-500 dark:text-slate-400",
    },
    Active: {
      icon: PlayCircle,
      className: "text-amber-500 dark:text-amber-400",
    },
    "At Risk": {
      icon: AlertTriangle,
      className: "text-red-500 dark:text-red-400",
    },
    Current: {
      icon: CircleCheckBig,
      className: "text-green-500 dark:text-green-400",
    },
    Past: {
      icon: CheckCheck,
      className: "text-slate-500 dark:text-slate-400",
    },
    Pending: {
      icon: Calendar,
      className: "text-amber-500 dark:text-amber-400",
    },
  } as const

  const config = statusConfig[status as keyof typeof statusConfig]
  const Icon = config?.icon ?? Loader

  return (
    <Badge variant="outline" className="text-muted-foreground px-1.5 gap-1.5">
      <Icon className={`size-4 ${config?.className ?? ""}`} />
      {status}
    </Badge>
  )
}

function createColumns(config: ColumnConfig): ColumnDef<TaskRow>[] {
  const columns: ColumnDef<TaskRow>[] = [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "header",
      header: config.titleLabel,
      cell: ({ row }) => (
        <TableCellViewer item={row.original} allActivities={config.allActivities} />
      ),
      enableHiding: false,
    },
  ]

  if (config.addGrowerColumn) {
    columns.push({
      accessorKey: "grower",
      header: "Grower",
      cell: ({ row }) => (
        <div className="w-28">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3.5" />
            {row.original.grower ?? "Unlinked"}
          </Badge>
        </div>
      ),
    })
  }

  columns.push(
    {
      accessorKey: "type",
      header: config.typeLabel,
      cell: ({ row }) =>
        config.typeBadge ? (
          <div className="w-32">
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {row.original.type}
            </Badge>
          </div>
        ) : (
          <div className="w-24">{row.original.type}</div>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "target",
      header: () => <div className="w-full">Target</div>,
      cell: ({ row }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
              loading: `Saving ${row.original.header}`,
              success: "Done",
              error: "Error",
            })
          }}
        >
          <Label htmlFor={`${row.original.id}-target`} className="sr-only">
            Target
          </Label>
          <Input
            className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
            defaultValue={row.original.target}
            id={`${row.original.id}-target`}
          />
        </form>
      ),
    },
    {
      accessorKey: "limit",
      header: () => <div className="w-full">Actual</div>,
      cell: ({ row }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
              loading: `Saving ${row.original.header}`,
              success: "Done",
              error: "Error",
            })
          }}
        >
          <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
            Actual
          </Label>
          <Input
            className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
            defaultValue={row.original.limit}
            id={`${row.original.id}-limit`}
          />
        </form>
      ),
    },
    {
      accessorKey: "reviewer",
      header: config.reviewerLabel,
      cell: ({ row }) => row.original.reviewer,
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 cursor-pointer"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Make a copy</DropdownMenuItem>
            <DropdownMenuItem>Favorite</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }
  )

  return columns
}

function DraggableRow({ row }: { row: Row<TaskRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function buildTable(
  data: TaskRow[],
  columns: ColumnDef<TaskRow>[],
  state: {
    sorting: SortingState
    columnVisibility: VisibilityState
    rowSelection: Record<string, boolean>
    columnFilters: ColumnFiltersState
    pagination: { pageIndex: number; pageSize: number }
  },
  handlers: {
    setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    setSorting: React.Dispatch<React.SetStateAction<SortingState>>
    setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
    setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>
    setPagination: React.Dispatch<
      React.SetStateAction<{ pageIndex: number; pageSize: number }>
    >
  }
) {
  return useReactTable({
    data,
    columns,
    state,
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: handlers.setRowSelection,
    onSortingChange: handlers.setSorting,
    onColumnFiltersChange: handlers.setColumnFilters,
    onColumnVisibilityChange: handlers.setColumnVisibility,
    onPaginationChange: handlers.setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })
}

export function DataTable({
  data: initialData,
  pastPerformanceData = [],
  keyPersonnelData = [],
  focusDocumentsData = [],
}: {
  data: TaskRow[]
  pastPerformanceData?: TaskRow[]
  keyPersonnelData?: TaskRow[]
  focusDocumentsData?: TaskRow[]
}) {
  const [activeTab, setActiveTab] = React.useState<TableView>("live-projects")
  const [data, setData] = React.useState(() => initialData)
  const [growers, setGrowers] = React.useState(() => pastPerformanceData)
  const [keyPersonnel, setKeyPersonnel] = React.useState(() => keyPersonnelData)
  const [focusDocuments, setFocusDocuments] = React.useState(() => focusDocumentsData)
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const sharedState = {
    sorting,
    columnVisibility,
    rowSelection,
    columnFilters,
    pagination,
  }

  const sharedHandlers = {
    setRowSelection,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setPagination,
  }

  const liveProjectColumns = React.useMemo(
    () =>
      createColumns({
        titleLabel: "Activity",
        typeLabel: "Operation",
        typeBadge: true,
        reviewerLabel: "Supervisor",
        addGrowerColumn: false,
        allActivities: data,
      }),
    [data]
  )

  const growerColumns = React.useMemo(
    () =>
      createColumns({
        titleLabel: "Grower",
        typeLabel: "Region",
        reviewerLabel: "Lead",
        allActivities: data,
      }),
    [data]
  )

  const keyPersonnelColumns = React.useMemo(
    () =>
      createColumns({
        titleLabel: "Crew lead",
        typeLabel: "Role",
        reviewerLabel: "Reports to",
        allActivities: data,
      }),
    [data]
  )

  const fieldDocumentColumns = React.useMemo(
    () =>
      createColumns({
        titleLabel: "Document",
        typeLabel: "Type",
        typeBadge: true,
        reviewerLabel: "Owner",
        allActivities: data,
      }),
    [data]
  )

  const table = buildTable(data, liveProjectColumns, sharedState, sharedHandlers)
  const growersTable = buildTable(growers, growerColumns, sharedState, sharedHandlers)
  const keyPersonnelTable = buildTable(
    keyPersonnel,
    keyPersonnelColumns,
    sharedState,
    sharedHandlers
  )
  const focusDocumentsTable = buildTable(
    focusDocuments,
    fieldDocumentColumns,
    sharedState,
    sharedHandlers
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map(({ id }) => id), [data])
  const growerIds = React.useMemo<UniqueIdentifier[]>(() => growers.map(({ id }) => id), [growers])
  const keyPersonnelIds = React.useMemo<UniqueIdentifier[]>(
    () => keyPersonnel.map(({ id }) => id),
    [keyPersonnel]
  )
  const focusDocumentIds = React.useMemo<UniqueIdentifier[]>(
    () => focusDocuments.map(({ id }) => id),
    [focusDocuments]
  )

  function handleDragEndFactory(setter: React.Dispatch<React.SetStateAction<TaskRow[]>>, ids: UniqueIdentifier[]) {
    return (event: DragEndEvent) => {
      const { active, over } = event
      if (active && over && active.id !== over.id) {
        setter((currentData) => {
          const oldIndex = ids.indexOf(active.id)
          const newIndex = ids.indexOf(over.id)
          return arrayMove(currentData, oldIndex, newIndex)
        })
      }
    }
  }

  const handleDragEnd = handleDragEndFactory(setData, dataIds)
  const handleGrowerDragEnd = handleDragEndFactory(setGrowers, growerIds)
  const handleKeyPersonnelDragEnd = handleDragEndFactory(setKeyPersonnel, keyPersonnelIds)
  const handleFocusDocumentsDragEnd = handleDragEndFactory(setFocusDocuments, focusDocumentIds)

  const tableByView = {
    "live-projects": { instance: table, ids: dataIds, onDragEnd: handleDragEnd, columns: liveProjectColumns },
    growers: { instance: growersTable, ids: growerIds, onDragEnd: handleGrowerDragEnd, columns: growerColumns },
    "crew-leads": { instance: keyPersonnelTable, ids: keyPersonnelIds, onDragEnd: handleKeyPersonnelDragEnd, columns: keyPersonnelColumns },
    "field-documents": { instance: focusDocumentsTable, ids: focusDocumentIds, onDragEnd: handleFocusDocumentsDragEnd, columns: fieldDocumentColumns },
  } as const

  const currentConfig = tableByView[activeTab]

  const TableContent = ({
    currentTable,
    currentDataIds,
    handleCurrentDragEnd,
    columnCount,
  }: {
    currentTable: typeof table
    currentDataIds: UniqueIdentifier[]
    handleCurrentDragEnd: (event: DragEndEvent) => void
    columnCount: number
  }) => (
    <>
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleCurrentDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {currentTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {currentTable.getRowModel().rows?.length ? (
                <SortableContext items={currentDataIds} strategy={verticalListSortingStrategy}>
                  {currentTable.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {currentTable.getFilteredSelectedRowModel().rows.length} of {" "}
          {currentTable.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${currentTable.getState().pagination.pageSize}`}
              onValueChange={(value) => currentTable.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20 cursor-pointer" id="rows-per-page">
                <SelectValue placeholder={currentTable.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {currentTable.getState().pagination.pageIndex + 1} of {currentTable.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex cursor-pointer"
              onClick={() => currentTable.setPageIndex(0)}
              disabled={!currentTable.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8 cursor-pointer"
              size="icon"
              onClick={() => currentTable.previousPage()}
              disabled={!currentTable.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8 cursor-pointer"
              size="icon"
              onClick={() => currentTable.nextPage()}
              disabled={!currentTable.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex cursor-pointer"
              size="icon"
              onClick={() => currentTable.setPageIndex(currentTable.getPageCount() - 1)}
              disabled={!currentTable.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TableView)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6 flex-wrap gap-3">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={activeTab} onValueChange={(value) => setActiveTab(value as TableView)}>
          <SelectTrigger className="flex w-fit sm:hidden cursor-pointer" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="live-projects">Activities</SelectItem>
            <SelectItem value="growers">Growers</SelectItem>
            <SelectItem value="crew-leads">Crew leads</SelectItem>
            <SelectItem value="field-documents">Field documents</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 sm:flex">
          <TabsTrigger value="live-projects" className="cursor-pointer">Activities</TabsTrigger>
          <TabsTrigger value="growers" className="cursor-pointer">
            Growers <Badge variant="secondary">{growers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="crew-leads" className="cursor-pointer">
            Crew leads <Badge variant="secondary">{keyPersonnel.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="field-documents" className="cursor-pointer">Field documents</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <Columns2 />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {currentConfig.instance
                .getAllColumns()
                .filter(
                  (column) => typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Plus />
            <span className="hidden lg:inline">
              {activeTab === "growers" ? "Add grower" : "Add work item"}
            </span>
          </Button>
        </div>
      </div>

      <TabsContent value="live-projects" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <TableContent
          currentTable={table}
          currentDataIds={dataIds}
          handleCurrentDragEnd={handleDragEnd}
          columnCount={liveProjectColumns.length}
        />
      </TabsContent>
      <TabsContent value="growers" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <TableContent
          currentTable={growersTable}
          currentDataIds={growerIds}
          handleCurrentDragEnd={handleGrowerDragEnd}
          columnCount={growerColumns.length}
        />
      </TabsContent>
      <TabsContent value="crew-leads" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <TableContent
          currentTable={keyPersonnelTable}
          currentDataIds={keyPersonnelIds}
          handleCurrentDragEnd={handleKeyPersonnelDragEnd}
          columnCount={keyPersonnelColumns.length}
        />
      </TabsContent>
      <TabsContent value="field-documents" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <TableContent
          currentTable={focusDocumentsTable}
          currentDataIds={focusDocumentIds}
          handleCurrentDragEnd={handleFocusDocumentsDragEnd}
          columnCount={fieldDocumentColumns.length}
        />
      </TabsContent>
    </Tabs>
  )
}

const chartConfig = {
  target: {
    label: "Target",
    color: "var(--primary)",
  },
  actual: {
    label: "Actual",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item, allActivities }: { item: TaskRow; allActivities: TaskRow[] }) {
  const isMobile = useIsMobile()
  const relatedActivities = React.useMemo(
    () =>
      item.grower
        ? allActivities.filter((activity) => activity.grower === item.grower)
        : allActivities.filter((activity) => activity.grower === item.header),
    [allActivities, item.grower, item.header]
  )

  const trendData = item.trend ?? [
    { month: "Jan", target: 14, actual: 10 },
    { month: "Feb", target: 18, actual: 13 },
    { month: "Mar", target: 20, actual: 16 },
    { month: "Apr", target: 24, actual: 18 },
    { month: "May", target: 28, actual: 22 },
    { month: "Jun", target: 30, actual: 24 },
  ]

  const isGrowerRow = !item.grower && ["Current", "Past", "Pending", "At Risk"].includes(item.status)
  const drawerDescription = isGrowerRow
    ? `Target ha vs actual ha for ${item.header}, with linked grower activities below.`
    : item.grower
      ? `Target vs actual progress for this activity under ${item.grower}.`
      : "Target vs actual progress for the selected row."

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground h-auto w-fit px-0 text-left cursor-pointer">
          <div className="flex flex-col items-start gap-1">
            <span>{item.header}</span>
            {item.grower ? (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Users className="size-3" />
                {item.grower}
              </Badge>
            ) : item.context ? (
              <span className="text-muted-foreground text-xs">{item.context}</span>
            ) : null}
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>{drawerDescription}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart accessibilityLayer data={trendData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="actual"
                    type="natural"
                    fill="var(--color-actual)"
                    fillOpacity={0.5}
                    stroke="var(--color-actual)"
                    stackId="a"
                  />
                  <Area
                    dataKey="target"
                    type="natural"
                    fill="var(--color-target)"
                    fillOpacity={0.2}
                    stroke="var(--color-target)"
                    stackId="b"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  {isGrowerRow ? "Grower delivery is tracking against plan" : "Activity progress is tracking against plan"}
                  <TrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">{item.context ?? "Use this panel for concise operational context and notes."}</div>
              </div>
              {relatedActivities.length > 0 && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="font-medium">
                      {isGrowerRow ? "Linked live activities" : "Other activities for this grower"}
                    </div>
                    <div className="grid gap-2">
                      {relatedActivities.slice(0, 4).map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div>
                            <div className="font-medium">{activity.header}</div>
                            <div className="text-muted-foreground text-xs">{activity.type}</div>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor={`header-${item.id}`}>{isGrowerRow ? "Grower" : "Activity"}</Label>
              <Input id={`header-${item.id}`} defaultValue={item.header} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={`type-${item.id}`}>{isGrowerRow ? "Region" : "Operation"}</Label>
                <Input id={`type-${item.id}`} defaultValue={item.type} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={`status-${item.id}`}>Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id={`status-${item.id}`} className="w-full cursor-pointer">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Past">Past</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {item.grower && (
              <div className="flex flex-col gap-3">
                <Label htmlFor={`grower-${item.id}`}>Grower</Label>
                <Input id={`grower-${item.id}`} defaultValue={item.grower} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={`target-${item.id}`}>Target</Label>
                <Input id={`target-${item.id}`} defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={`limit-${item.id}`}>Actual</Label>
                <Input id={`limit-${item.id}`} defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor={`reviewer-${item.id}`}>{isGrowerRow ? "Lead" : "Supervisor"}</Label>
              <Input id={`reviewer-${item.id}`} defaultValue={item.reviewer} />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button className="cursor-pointer">Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline" className="cursor-pointer">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
