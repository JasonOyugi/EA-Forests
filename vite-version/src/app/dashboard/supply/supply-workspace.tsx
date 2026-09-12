import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowUpRight, CalendarDays, Factory, SlidersHorizontal, X } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { EventDetailDialog } from "@/app/calendar/components/event-detail-dialog"
import type { CalendarEvent } from "@/app/calendar/types"
import { SupplyContext, readContext, writeContext } from "./context"
import { deriveSupply, mapModes, number, pipelineStages, quarterLabel, shortDate } from "./selectors"
import { supplyPreview } from "./preview"
import { createSupplyOperations } from "./operations"
import type { AnalyticalContext } from "./types"
import { MetricPortals, type MetricPortal } from "./metric-portals"
import { SupplyMap } from "./supply-map"
import { OpportunityRail } from "./opportunity-rail"
import { SupplyOutlook } from "./supply-outlook"
import { ZurktModelSummary } from "./zurkt-model-summary"
import { DashboardViewToggle } from "../components/dashboard-view-toggle"
import "./supply.css"

const modeLabels = { supply: "Supply", cost: "Cost", confidence: "Confidence", opportunity: "Opportunity", operations: "Operations" }
export default function SupplyWorkspace() {
  const [params, setParams] = useSearchParams()
  const context = useMemo(() => readContext(params, supplyPreview), [params])
  const analysis = useMemo(() => deriveSupply(supplyPreview, context), [context])
  const operations = useMemo(() => createSupplyOperations(supplyPreview), [])
  const [expanded, setExpanded] = useState<MetricPortal | null>(null)
  const [event, setEvent] = useState<CalendarEvent | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobileSurface, setMobileSurface] = useState<"map" | "list">("map")
  const update = (patch: Partial<AnalyticalContext>) => {
    setParams(previous => writeContext(previous, patch), { replace: true })
    if (patch.selectedSupplyId) setMobileSurface("list")
  }
  const extraFilters = context.pipelineStage !== "all" || context.confidenceFilter !== "all" || context.speciesFilter !== "all"
  const selectedLot = analysis.selected.find(lot => lot.id === context.selectedSupplyId)
  return <BaseLayout><SupplyContext.Provider value={{ data: supplyPreview, context, analysis, update }}>
    <main className="supply-workspace">
      <div className="si-topline"><span className="si-eyebrow">EA Forests / Intelligence workspace</span><DashboardViewToggle /></div>
      <header className="si-header"><div><h1>Supply Intelligence<span>.</span></h1><p>Where your next tonne comes from.</p></div><div className="si-processor-context"><Factory size={21} /><div><strong>{supplyPreview.processor.name} <span className="si-tag">Preview</span></strong><span>{supplyPreview.processor.location}</span></div></div></header>
      <div className="si-preview-notice"><span className="si-tag">Demonstration world</span><p>Illustrative supply, costs and obligations. No live inventory connected.</p><details><summary>Data basis</summary><div><p>Snapshot: 11 Sep 2026. The processor is a scenario placeholder ("Zurkt Uganda") -- no real Zurkt processor facts exist in this repository. Its location is an explicit assumption, not an observed fact. The nearby forests shown ARE real, canonical Uganda CFR AOIs with real distances and real EO observation coverage from the operational database; only their stand volume, grade mix and supply/cost figures remain unmodelled placeholders. No canonical administrative API is called.</p><p>G1 uses a 30 cm legacy tree-DBH threshold; G2/G3 assume 20/15 cm from the roundwood scenario library. All use 2.7 m minimum length. These are not verified log specifications. No volume-to-tonne conversion is applied to the preview.</p><p>“Verified” in the preview pipeline is only a simulated commercial stage. All displayed supply remains unverified synthetic evidence.</p></div></details></div>
      <MetricPortals expanded={expanded} onExpand={setExpanded} operations={operations} onEvent={setEvent} />
      <section className="si-spatial-section" aria-label="Linked supply workspace">
        <div className="si-workspace-heading"><div><span className="si-eyebrow">Sourcing landscape</span><h2>Supply Map</h2></div><div className="si-context-strip" aria-live="polite" aria-atomic="true"><span>{context.radiusKm} km</span><span>{context.grade === "all" ? "All grades" : context.grade}</span><span>{context.quarter ? quarterLabel(context.quarter) : context.horizonMonths === 0 ? "Now" : `${context.horizonMonths === 60 ? "5y" : `${context.horizonMonths}m`} horizon`}</span><strong>{number(analysis.expected)} t compatible</strong></div></div>
        <div className="si-toolbar"><div className="si-modes" role="group" aria-label="Map analytical mode">{mapModes.map(mode => <button key={mode} aria-pressed={context.mapMode === mode} onClick={() => update({ mapMode: mode })}>{modeLabels[mode]}</button>)}</div><button className="si-filter-toggle" aria-expanded={filtersOpen} aria-controls="si-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /> Filters{extraFilters ? " · active" : ""}</button></div>
        {(filtersOpen || context.mapMode === "confidence" || context.mapMode === "operations") && <div id="si-filters" className="si-filters">
          <label>Grade<select value={context.grade} onChange={e => update({ grade: e.target.value as AnalyticalContext["grade"] })}><option value="all">All compatible grades</option><option>G1</option><option>G2</option><option>G3</option><option value="unclassified">Unclassified</option></select></label>
          <label>Species<select value={context.speciesFilter} onChange={e => update({ speciesFilter: e.target.value as AnalyticalContext["speciesFilter"] })}><option value="all">All species</option><option>Eucalyptus</option><option>Pine</option></select></label>
          <label>Evidence<select value={context.confidenceFilter} onChange={e => update({ confidenceFilter: e.target.value as AnalyticalContext["confidenceFilter"] })}><option value="all">All evidence</option><option value="verified">Field verified</option><option value="unverified">Unverified</option><option value="stale">Stale evidence</option></select></label>
          <button className="si-text-button" onClick={() => update({ grade: "all", pipelineStage: "all", confidenceFilter: "all", speciesFilter: "all", quarter: null })}><X size={14} /> Clear filters</button>
        </div>}
        {context.mapMode === "operations" && <div className="si-pipeline" role="group" aria-label="Supply pipeline"><button aria-pressed={context.pipelineStage === "all"} onClick={() => update({ pipelineStage: "all" })}>All stages</button>{pipelineStages.map(stage => <button key={stage} aria-pressed={context.pipelineStage === stage} onClick={() => update({ pipelineStage: context.pipelineStage === stage ? "all" : stage })}>{stage}</button>)}<span>Preview stages</span></div>}
        {extraFilters && <div className="si-active-filters">Active: {context.pipelineStage !== "all" ? `stage ${context.pipelineStage} · ` : ""}{context.confidenceFilter !== "all" ? `${context.confidenceFilter} evidence · ` : ""}{context.speciesFilter !== "all" ? context.speciesFilter : "all species"}<button aria-label="Clear active filters" onClick={() => update({ pipelineStage: "all", confidenceFilter: "all", speciesFilter: "all" })}><X size={13} /></button></div>}
        <div className="si-mobile-switch" role="group" aria-label="Supply presentation"><button aria-pressed={mobileSurface === "map"} onClick={() => setMobileSurface("map")}>Map</button><button aria-pressed={mobileSurface === "list"} onClick={() => setMobileSurface("list")}>{selectedLot ? "Selected supply" : `Candidates (${analysis.opportunities.length})`}</button></div>
        <div className={`si-spatial-grid si-mobile-${mobileSurface}`}><SupplyMap /><OpportunityRail onEvent={setEvent} /></div>
        <div className="si-timebar"><span className="si-eyebrow">Availability horizon</span><div role="group" aria-label="Supply time horizon">{([0, 3, 6, 12, 24, 60] as const).map(months => <button key={months} aria-pressed={context.horizonMonths === months} onClick={() => update({ horizonMonths: months })}>{months === 0 ? "Now" : months === 60 ? "5y" : `${months}m`}</button>)}</div><span>As of 7 Sep 2026 · preview</span></div>
      </section>
      <SupplyOutlook />
      <ZurktModelSummary />
      <section className="si-operations" aria-label="Upcoming operations"><div><span className="si-eyebrow">Next actions</span><h2>On the horizon</h2><Link to="/calendar?source=supply">Open calendar <ArrowUpRight size={15} /></Link></div><div className="si-operation-items">{operations.filter(op => op.event.date >= new Date(`${context.asOf}T00:00:00`)).sort((a, b) => a.event.date.getTime() - b.event.date.getTime()).slice(0, 3).map(op => <button key={op.event.id} onClick={() => setEvent(op.event)}><span className="si-operation-date"><CalendarDays size={15} />{shortDate(op.event.date.toISOString())}</span><strong>{op.event.title.replace("Preview · ", "").replace("Preview forecast · ", "")}</strong><span>Preview · {op.basis === "committed" ? "obligation" : op.basis}<ArrowUpRight size={14} /></span></button>)}</div></section>
      <p className="si-bottom-note">A shared forest state. A processor’s perspective. Evidence and model outputs will enter this workspace through the same stand, specification and provenance contracts.</p>
    </main>
    <EventDetailDialog event={event} open={event !== null} onOpenChange={open => { if (!open) setEvent(null) }} />
  </SupplyContext.Provider></BaseLayout>
}
