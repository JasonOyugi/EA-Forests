"use client"

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Trees } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { DashboardAssetMap } from "../components/dashboard-asset-map"
import {
  buildSiteGrid,
  compartmentStatusMeta,
  getCompartmentTone,
  getGridColumns,
  getScaleOption,
  summarizeCompartmentStatuses,
  type CompartmentStatus,
} from "../components/dashboard-grid"
import { compactNumber, clamp } from "../components/dashboard-shared"
import {
  formatVarietyLabel,
  getGroupSpecies,
  initialAssetGroups,
  speciesProfile,
} from "../components/data-table"

const statusOrder: CompartmentStatus[] = [
  "thriving",
  "steady",
  "stable",
  "caution",
  "critical",
  "dead",
]

type GridViewMode = "summary" | "full"

export default function DashboardAssetsMapPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("site") ?? initialAssetGroups[0]?.id
  const selectedGroup =
    initialAssetGroups.find((group) => group.id === selectedId) ?? initialAssetGroups[0]
  const gridRef = React.useRef<HTMLDivElement | null>(null)

  const handleSelectGroup = React.useCallback(
    (groupId: string) => {
      const next = new URLSearchParams(searchParams)
      next.set("site", groupId)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const totalPlantedArea = React.useMemo(
    () =>
      selectedGroup.subBlocks.reduce(
        (sum, subBlock) => sum + subBlock.plantedSize,
        0
      ),
    [selectedGroup]
  )
  const activeScale = React.useMemo(
    () => getScaleOption(totalPlantedArea),
    [totalPlantedArea]
  )
  const gridColumns = React.useMemo(
    () => getGridColumns(activeScale.hectaresPerCell),
    [activeScale.hectaresPerCell]
  )
  const { compartments, siteGridCells } = React.useMemo(
    () => buildSiteGrid(selectedGroup, activeScale.hectaresPerCell, gridColumns),
    [activeScale.hectaresPerCell, gridColumns, selectedGroup]
  )

  const [selectedCompartmentId, setSelectedCompartmentId] = React.useState("")
  const [hoveredCompartmentId, setHoveredCompartmentId] = React.useState("")
  const [gridViewMode, setGridViewMode] = React.useState<GridViewMode>("summary")
  const [rangeExpandedIds, setRangeExpandedIds] = React.useState<string[]>([])
  const [dragSelection, setDragSelection] = React.useState<{
    anchorId: string
    currentId: string
  } | null>(null)
  const [tooltipState, setTooltipState] = React.useState<{
    compartmentId: string
    x: number
    y: number
  } | null>(null)
  const suppressClickRef = React.useRef(false)

  React.useEffect(() => {
    if (!compartments.some((compartment) => compartment.id === selectedCompartmentId)) {
      setSelectedCompartmentId(compartments[0]?.id ?? "")
    }
  }, [compartments, selectedCompartmentId])

  React.useEffect(() => {
    setRangeExpandedIds([])
    setDragSelection(null)
    suppressClickRef.current = false
  }, [gridViewMode, selectedGroup.id])

  const selectedCompartment =
    compartments.find((compartment) => compartment.id === selectedCompartmentId) ??
    compartments[0]
  const selectedTone = selectedCompartment
    ? getCompartmentTone(selectedCompartment)
    : compartmentStatusMeta.steady
  const selectedStatusSummary = selectedCompartment
    ? summarizeCompartmentStatuses(selectedCompartment)
    : null

  const highConfidenceCompartments = selectedStatusSummary
    ? selectedStatusSummary.thriving +
      selectedStatusSummary.steady +
      selectedStatusSummary.stable
    : 0
  const cautionCompartments = selectedStatusSummary
    ? selectedStatusSummary.caution + selectedStatusSummary.critical
    : 0
  const lostCompartments = selectedStatusSummary?.dead ?? 0

  const tooltipCompartment = tooltipState
    ? compartments.find((compartment) => compartment.id === tooltipState.compartmentId)
    : null
  const gridSpeciesLabel = React.useMemo(
    () => getGroupSpecies(selectedGroup).map(formatVarietyLabel).join(", "),
    [selectedGroup]
  )
  const totalSubCompartments = compartments.length * 16
  const rectangleSelectionEnabled =
    activeScale.hectaresPerCell === 1 && gridViewMode === "summary"
  const gridModeDescription =
    gridViewMode === "full"
      ? `Full grid opens all ${compactNumber(totalSubCompartments, 0)} sub-compartments at once for a denser condition scan.`
      : rectangleSelectionEnabled
        ? `Summary grid shows ${compartments.length} ${activeScale.label}-scaled blocks across the site; click a block or hold and sweep to open a rectangle of hectare cells.`
        : `Summary grid shows ${compartments.length} ${activeScale.label}-scaled blocks across the site; click a block to inspect its sixteen sub-compartments.`
  const cellIndexByCompartmentId = React.useMemo(() => {
    const entries: Array<[string, number]> = []
    siteGridCells.forEach((cell, index) => {
      if (cell.kind === "compartment") {
        entries.push([cell.compartment.id, index])
      }
    })
    return new Map(entries)
  }, [siteGridCells])

  const getRectangleCompartmentIds = React.useCallback(
    (anchorId: string, targetId: string) => {
      const anchorIndex = cellIndexByCompartmentId.get(anchorId)
      const targetIndex = cellIndexByCompartmentId.get(targetId)

      if (anchorIndex === undefined || targetIndex === undefined) {
        return anchorId === targetId ? [anchorId] : []
      }

      const anchorRow = Math.floor(anchorIndex / gridColumns)
      const anchorColumn = anchorIndex % gridColumns
      const targetRow = Math.floor(targetIndex / gridColumns)
      const targetColumn = targetIndex % gridColumns
      const minRow = Math.min(anchorRow, targetRow)
      const maxRow = Math.max(anchorRow, targetRow)
      const minColumn = Math.min(anchorColumn, targetColumn)
      const maxColumn = Math.max(anchorColumn, targetColumn)

      return siteGridCells.flatMap((cell, index) => {
        if (cell.kind !== "compartment") return []

        const row = Math.floor(index / gridColumns)
        const column = index % gridColumns

        if (
          row < minRow ||
          row > maxRow ||
          column < minColumn ||
          column > maxColumn
        ) {
          return []
        }

        return [cell.compartment.id]
      })
    },
    [cellIndexByCompartmentId, gridColumns, siteGridCells]
  )
  const dragPreviewIds = React.useMemo(
    () =>
      dragSelection
        ? getRectangleCompartmentIds(dragSelection.anchorId, dragSelection.currentId)
        : [],
    [dragSelection, getRectangleCompartmentIds]
  )
  const expandedCompartmentIds = React.useMemo(() => {
    if (gridViewMode === "full") {
      return new Set(compartments.map((compartment) => compartment.id))
    }

    const ids = new Set(rangeExpandedIds)
    dragPreviewIds.forEach((id) => ids.add(id))
    if (selectedCompartmentId) {
      ids.add(selectedCompartmentId)
    }
    return ids
  }, [
    compartments,
    dragPreviewIds,
    gridViewMode,
    rangeExpandedIds,
    selectedCompartmentId,
  ])

  const handleCompartmentHover = (
    compartmentId: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setHoveredCompartmentId(compartmentId)
    if (isMobile || !gridRef.current) return

    const bounds = gridRef.current.getBoundingClientRect()
    const tooltipWidth = 220
    const tooltipHeight = 152
    const x = clamp(
      event.clientX - bounds.left + 18,
      12,
      bounds.width - tooltipWidth - 12
    )
    const y = clamp(
      event.clientY - bounds.top - 18,
      12,
      bounds.height - tooltipHeight - 12
    )

    setTooltipState({ compartmentId, x, y })
  }

  const clearHoverState = () => {
    setHoveredCompartmentId("")
    setTooltipState(null)
  }

  const finalizeDragSelection = React.useCallback(() => {
    if (!dragSelection) return

    const nextIds = getRectangleCompartmentIds(
      dragSelection.anchorId,
      dragSelection.currentId
    )
    const didExpandRange =
      dragSelection.currentId !== dragSelection.anchorId || nextIds.length > 1

    setRangeExpandedIds(didExpandRange ? nextIds : [])
    suppressClickRef.current = didExpandRange
    setDragSelection(null)
  }, [dragSelection, getRectangleCompartmentIds])

  React.useEffect(() => {
    if (!dragSelection) return

    const handlePointerRelease = () => finalizeDragSelection()

    window.addEventListener("pointerup", handlePointerRelease)
    window.addEventListener("pointercancel", handlePointerRelease)

    return () => {
      window.removeEventListener("pointerup", handlePointerRelease)
      window.removeEventListener("pointercancel", handlePointerRelease)
    }
  }, [dragSelection, finalizeDragSelection])

  const handleCompartmentClick = (compartmentId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    setSelectedCompartmentId(compartmentId)

    if (gridViewMode === "summary") {
      setRangeExpandedIds([])
    }
  }

  const handleCompartmentPointerDown = (compartmentId: string) => {
    if (!rectangleSelectionEnabled) return

    setSelectedCompartmentId(compartmentId)
    setDragSelection({ anchorId: compartmentId, currentId: compartmentId })
    suppressClickRef.current = false
  }

  const handleCompartmentPointerEnter = (
    compartmentId: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (!rectangleSelectionEnabled || !dragSelection || (event.buttons & 1) !== 1) {
      return
    }

    if (dragSelection.currentId !== compartmentId) {
      setDragSelection({
        anchorId: dragSelection.anchorId,
        currentId: compartmentId,
      })
    }
  }

  return (
    <BaseLayout
      title="Asset Map"
      description="Drill into hectare-level block health, then inspect sub-compartment performance for the selected site."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="space-y-8">
          <div className="border-b border-border/60 pb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="-ml-3 h-auto px-3 py-2 text-foreground transition-colors hover:text-emerald-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>

          <DashboardAssetMap
            selectedGroupId={selectedGroup.id}
            onSelectGroup={handleSelectGroup}
            showOpenFullMapButton={false}
            showHeaderCopy={false}
          />

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <section className="space-y-5">
              <div className="rounded-[32px] border border-border/70 bg-background/35 p-4 backdrop-blur-sm">
                <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Trees className="h-5 w-5 text-emerald-600" />
                      <h2 className="text-xl font-semibold tracking-tight">
                        {selectedGroup.summaryTitle}
                      </h2>
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                      {selectedGroup.summaryDescription} {gridModeDescription}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <div className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
                        {selectedGroup.location}, {selectedGroup.country}
                      </div>
                      <div className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
                        {totalPlantedArea.toFixed(2)} ha planted
                      </div>
                      <div className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
                        {activeScale.label} per block
                      </div>
                      <div className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
                        {activeScale.detail} footprint
                      </div>
                      <div className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5">
                        Species: {gridSpeciesLabel}
                      </div>
                    </div>
                  </div>

                  <div className="w-full xl:max-w-[290px]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Grid view
                    </div>
                    <ToggleGroup
                      type="single"
                      value={gridViewMode}
                      onValueChange={(value) => {
                        if (value) {
                          setGridViewMode(value as GridViewMode)
                        }
                      }}
                      className="mt-2 grid w-full grid-cols-2 rounded-2xl border border-border/70 bg-background/65 p-1"
                    >
                      <ToggleGroupItem
                        value="summary"
                        className="rounded-xl px-3 py-2 text-sm data-[state=on]:bg-foreground data-[state=on]:text-background"
                      >
                        Summary grid
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="full"
                        className="rounded-xl px-3 py-2 text-sm data-[state=on]:bg-foreground data-[state=on]:text-background"
                      >
                        Full grid
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {rectangleSelectionEnabled
                        ? "Hold a hectare block, then sweep across the grid to open every block inside the rectangle."
                        : "Full grid keeps every hectare expanded so you can compare sub-compartment patterns side by side."}
                    </p>
                  </div>
                </div>

                <div
                  ref={gridRef}
                  className="dashboard-grid-shell relative rounded-[28px] border border-border/70 bg-slate-950/[0.03] p-3"
                >
                  <div
                    className="grid w-full gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {siteGridCells.map((cell) => {
                      if (cell.kind === "empty") {
                        return (
                          <div
                            key={cell.id}
                            aria-hidden
                            className="aspect-square rounded-[8px] opacity-0"
                          />
                        )
                      }

                      const isSelected =
                        cell.compartment.id === selectedCompartment?.id
                      const isHovered =
                        cell.compartment.id === hoveredCompartmentId
                      const isExpanded = expandedCompartmentIds.has(cell.compartment.id)

                      return (
                        <button
                          key={cell.compartment.id}
                          type="button"
                          onClick={() => handleCompartmentClick(cell.compartment.id)}
                          onPointerDown={() =>
                            handleCompartmentPointerDown(cell.compartment.id)
                          }
                          onPointerEnter={(event) =>
                            handleCompartmentPointerEnter(cell.compartment.id, event)
                          }
                          onMouseEnter={(event) =>
                            handleCompartmentHover(cell.compartment.id, event)
                          }
                          onMouseMove={(event) =>
                            handleCompartmentHover(cell.compartment.id, event)
                          }
                          onMouseLeave={clearHoverState}
                          onFocus={() => setHoveredCompartmentId(cell.compartment.id)}
                          onBlur={clearHoverState}
                          className={cn(
                            "dashboard-grid-block aspect-square overflow-hidden rounded-[8px] border",
                            (isSelected || isHovered || isExpanded) && "is-active"
                          )}
                          style={{
                            backgroundColor: cell.compartment.color,
                            ["--grid-block-color" as string]:
                              cell.compartment.color,
                          }}
                          aria-label={`${formatVarietyLabel(
                            cell.compartment.variety
                          )} ${cell.compartment.subBlock} block ${cell.compartment.sequence}`}
                        >
                          {isExpanded ? (
                            <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-px bg-slate-950/25 p-[2px]">
                              {cell.compartment.subCompartments.map((sample) => (
                                <div
                                  key={sample.id}
                                  className="rounded-[2px] border border-white/10"
                                  style={{
                                    backgroundColor:
                                      compartmentStatusMeta[sample.status].background,
                                  }}
                                />
                              ))}
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>

                  {tooltipCompartment && tooltipState && !isMobile ? (
                    <div
                      className="dashboard-grid-tooltip pointer-events-none absolute z-20 w-[220px] rounded-2xl border border-border/80 bg-background/96 p-3 shadow-2xl backdrop-blur-sm"
                      style={{ left: tooltipState.x, top: tooltipState.y }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              speciesProfile[tooltipCompartment.variety].color,
                          }}
                        />
                        <div>
                          <div className="text-sm font-semibold">
                            {formatVarietyLabel(tooltipCompartment.variety)}{" "}
                            {tooltipCompartment.subBlock}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Block {tooltipCompartment.sequence}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <div className="text-muted-foreground">Trees</div>
                          <div className="mt-1 font-semibold">
                            {compactNumber(tooltipCompartment.metrics.totalTrees, 0)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <div className="text-muted-foreground">Volume</div>
                          <div className="mt-1 font-semibold">
                            {compactNumber(tooltipCompartment.metrics.estimatedVolume)} m3
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <div className="text-muted-foreground">Avg. height</div>
                          <div className="mt-1 font-semibold">
                            {tooltipCompartment.metrics.averageHeight.toFixed(1)} m
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <div className="text-muted-foreground">Avg. DBH</div>
                          <div className="mt-1 font-semibold">
                            {tooltipCompartment.metrics.averageDbh.toFixed(1)} cm
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              {selectedCompartment ? (
                <>
                  <div className="rounded-[32px] border border-border/70 bg-background/35 p-5 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Selected block
                        </div>
                        <h3 className="mt-2 text-xl font-semibold">
                          {formatVarietyLabel(selectedCompartment.variety)}{" "}
                          {selectedCompartment.subBlock}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          This block expands into sixteen sub-compartments so an investor can read
                          condition, stocking, and risk at a much more intimate level before the
                          next field report arrives.
                        </p>
                      </div>

                      <div
                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                        style={{
                          backgroundColor: selectedTone.accent,
                          color:
                            selectedTone.label === "Below peak" ? "#052e16" : "#ecfdf5",
                        }}
                      >
                        {selectedTone.label}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-[24px] border border-border/70 bg-slate-950/[0.04] p-3">
                      {selectedCompartment.subCompartments.map((sample) => (
                        <div
                          key={sample.id}
                          className="aspect-square rounded-[6px] border border-white/10"
                          style={{
                            backgroundColor:
                              compartmentStatusMeta[sample.status].background,
                          }}
                        />
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2">
                      {statusOrder.map((status) => (
                        <div
                          key={status}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  compartmentStatusMeta[status].background,
                              }}
                            />
                            <span className="text-sm font-medium">
                              {compartmentStatusMeta[status].label}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {selectedStatusSummary?.[status] ?? 0} / 16
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-border/70 bg-background/35 p-5 backdrop-blur-sm">
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Block analytics
                      </div>
                      <h3 className="mt-2 text-lg font-semibold">
                        Remote snapshot
                      </h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Estimated trees
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {compactNumber(selectedCompartment.metrics.totalTrees, 0)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Estimated volume
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {compactNumber(selectedCompartment.metrics.estimatedVolume)} m3
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Average height
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {selectedCompartment.metrics.averageHeight.toFixed(1)} m
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Average DBH
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {selectedCompartment.metrics.averageDbh.toFixed(1)} cm
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-border/70 bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Live performance mix
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Dark-to-light greens show compartments that are alive and performing,
                            while amber, red, and black signal the blocks that need the most
                            attention.
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {(selectedCompartment.metrics.survivalRate * 100).toFixed(0)}% survival
                        </div>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                        <div className="flex h-full w-full">
                          <div
                            style={{
                              width: `${(highConfidenceCompartments / 16) * 100}%`,
                              backgroundColor: compartmentStatusMeta.thriving.background,
                            }}
                          />
                          <div
                            style={{
                              width: `${(cautionCompartments / 16) * 100}%`,
                              backgroundColor: compartmentStatusMeta.caution.background,
                            }}
                          />
                          <div
                            style={{
                              width: `${(lostCompartments / 16) * 100}%`,
                              backgroundColor: compartmentStatusMeta.dead.background,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Strong to stable compartments</span>
                          <span>{highConfidenceCompartments} / 16</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Alert compartments</span>
                          <span>{cautionCompartments} / 16</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Failed compartments</span>
                          <span>{lostCompartments} / 16</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
