import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import type { Actor, ActorMode } from "../types"
import { EvidenceBadge } from "./evidence-badge"

function actorLocationLabel(actor: Actor) {
  return [actor.townSite, actor.districtCounty, actor.regionState, actor.country].filter(Boolean)[0] ?? actor.country
}

function buildColumns(mode: ActorMode): ColumnDef<Actor>[] {
  const nameColumn: ColumnDef<Actor> = {
    id: "name",
    header: "Actor",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.name}</p>
        <p className="truncate text-xs text-muted-foreground">{row.original.primaryRole ?? row.original.actorType}</p>
      </div>
    ),
  }
  const locationColumn: ColumnDef<Actor> = {
    id: "location",
    header: "Location",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{actorLocationLabel(row.original)}</span>,
  }
  const evidenceColumn: ColumnDef<Actor> = {
    id: "evidence",
    header: "Evidence",
    cell: ({ row }) => <EvidenceBadge evidenceClass={row.original.evidenceClass} />,
  }
  const currentnessColumn: ColumnDef<Actor> = {
    id: "currentness",
    header: "Currentness",
    cell: ({ row }) => <span className="text-sm capitalize text-muted-foreground">{row.original.currentness ?? "unknown"}</span>,
  }
  const contactColumn: ColumnDef<Actor> = {
    id: "contact",
    header: "Contact / website",
    cell: ({ row }) => {
      const actor = row.original
      if (!actor.website && !actor.email && !actor.phone) return <span className="text-sm text-muted-foreground">—</span>
      return (
        <div className="space-y-0.5 text-sm">
          {actor.website && (
            <a
              href={actor.website.startsWith("http") ? actor.website : `https://${actor.website}`}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="block truncate text-[var(--market-accent)] hover:underline"
            >
              {actor.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {!actor.website && (actor.email || actor.phone) && (
            <span className="text-muted-foreground">{actor.email ?? actor.phone}</span>
          )}
        </div>
      )
    },
  }

  if (mode === "seeds") {
    return [
      nameColumn,
      { id: "offering", header: "Seed source / offering", cell: ({ row }) => <span className="text-sm">{row.original.actorType ?? "—"}</span> },
      { id: "species", header: "Species / genetics", cell: ({ row }) => <span className="text-sm">{row.original.species ?? "—"}</span> },
      locationColumn,
      currentnessColumn,
      contactColumn,
      evidenceColumn,
    ]
  }

  if (mode === "seedlings") {
    return [
      nameColumn,
      { id: "species", header: "Species / genetics", cell: ({ row }) => <span className="text-sm">{row.original.species ?? "—"}</span> },
      { id: "capacity", header: "Capacity", cell: ({ row }) => <span className="text-sm">{row.original.seedlingCapacityPerYear ?? "—"}</span> },
      locationColumn,
      contactColumn,
      evidenceColumn,
    ]
  }

  if (mode === "silviculture" || mode === "harvest_haulage") {
    const serviceField = mode === "silviculture" ? "silvicultureServices" : "harvestHaulageServices"
    return [
      nameColumn,
      {
        id: "services",
        header: mode === "silviculture" ? "Silviculture services" : "Harvest & haulage services",
        cell: ({ row }) => <span className="text-sm">{row.original[serviceField] ?? row.original.primaryRole ?? "—"}</span>,
      },
      { id: "geography", header: "Geography", cell: ({ row }) => <span className="text-sm">{actorLocationLabel(row.original)}</span> },
      contactColumn,
      evidenceColumn,
    ]
  }

  // wood
  return [
    { ...nameColumn, header: "Processor" },
    { id: "product", header: "Product / raw material", cell: ({ row }) => <span className="text-sm">{row.original.processorProducts ?? row.original.rawMaterialSpecies ?? "—"}</span> },
    {
      id: "capacity",
      header: "Capacity / utilisation",
      cell: ({ row }) => {
        const capacity = row.original.annualCapacityM3
        const utilisation = row.original.utilisationPct
        if (capacity == null && utilisation == null) return <span className="text-sm text-muted-foreground">—</span>
        return (
          <span className="text-sm">
            {capacity != null ? `${capacity.toLocaleString()} m³/yr` : null}
            {capacity != null && utilisation != null ? " · " : null}
            {utilisation != null ? `${utilisation}% utilised` : null}
          </span>
        )
      },
    },
    { id: "radius", header: "Sourcing radius", cell: ({ row }) => <span className="text-sm">{row.original.sourcingRadiusKm != null ? `${row.original.sourcingRadiusKm} km` : "—"}</span> },
    locationColumn,
    contactColumn,
    evidenceColumn,
  ]
}

/** Drops a column when every visible row's cell would render only the "—" placeholder. */
function dropEmptyColumns(columns: ColumnDef<Actor>[], actors: Actor[]): ColumnDef<Actor>[] {
  const alwaysKeep = new Set(["name", "location", "evidence", "currentness"])
  return columns.filter((column) => {
    if (!column.id || alwaysKeep.has(column.id)) return true
    return actors.some((actor) => {
      switch (column.id) {
        case "species":
          return !!actor.species
        case "capacity":
          return !!actor.seedlingCapacityPerYear || actor.annualCapacityM3 != null || actor.utilisationPct != null
        case "contact":
          return !!(actor.website || actor.email || actor.phone)
        case "services":
          return !!(actor.silvicultureServices || actor.harvestHaulageServices || actor.primaryRole)
        case "product":
          return !!(actor.processorProducts || actor.rawMaterialSpecies)
        case "radius":
          return actor.sourcingRadiusKm != null
        case "offering":
          return !!actor.actorType
        default:
          return true
      }
    })
  })
}

interface ActorTableProps {
  mode: ActorMode
  actors: Actor[]
  selectedActorId: string | null
  onActorSelect: (actorId: string) => void
  hoveredActorId: string | null
  onActorHover: (actorId: string | null) => void
  emptyState: string
}

export function ActorTable({
  mode,
  actors,
  selectedActorId,
  onActorSelect,
  hoveredActorId,
  onActorHover,
  emptyState,
}: ActorTableProps) {
  const columns = dropEmptyColumns(buildColumns(mode), actors)
  const table = useReactTable({ data: actors, columns, getCoreRowModel: getCoreRowModel() })

  if (actors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyState}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-muted/40">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const isSelected = row.original.id === selectedActorId
            const isHovered = row.original.id === hoveredActorId
            return (
              <tr
                key={row.id}
                onClick={() => onActorSelect(row.original.id)}
                onMouseEnter={() => onActorHover(row.original.id)}
                onMouseLeave={() => onActorHover(null)}
                className={cn(
                  "cursor-pointer border-b last:border-0 transition-colors",
                  isSelected && "bg-[var(--market-accent-soft)]",
                  !isSelected && isHovered && "bg-muted/50"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
