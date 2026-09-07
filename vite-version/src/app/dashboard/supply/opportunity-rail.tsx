import { ArrowLeft, ArrowUpRight, ChevronRight, ClipboardCheck, MapPin } from "lucide-react"
import { Link } from "react-router-dom"
import type { CalendarEvent } from "@/app/calendar/types"
import { useSupply } from "./context"
import { compatibleTonnes, distanceKm, grades, number, selectedTonnes, shortDate } from "./selectors"
import { verificationDraft } from "./operations"

export function OpportunityRail({ onEvent }: { onEvent: (event: CalendarEvent) => void }) {
  const { data, context, analysis, update } = useSupply()
  const lot = analysis.selected.find(row => row.id === context.selectedSupplyId)
  if (!lot) return <aside className="si-opportunity-rail" aria-label="Nearby opportunities">
    <div className="si-rail-heading"><span className="si-eyebrow">Procurement watch</span><h2>Nearby opportunities <span>{analysis.opportunities.length}</span></h2><p>Feasible first, then timing &amp; compatible tonnes.</p></div>
    <div className="si-opportunity-list">
      {analysis.opportunities.length === 0 && <div className="si-empty"><ClipboardCheck size={24} /><h3>No candidates in this context</h3><p>Widen the radius, extend the horizon or clear filters. Missing supply is not evidence of no forest.</p><button className="si-text-button" onClick={() => update({ radiusKm: 100, horizonMonths: 12, quarter: null, grade: "all", pipelineStage: "all", confidenceFilter: "all", speciesFilter: "all" })}>Broaden the search <ArrowUpRight size={15} /></button></div>}
      {analysis.opportunities.map((row, index) => <button className="si-opportunity" key={row.id} aria-label={`Inspect ${row.name}`} onClick={() => update({ selectedSupplyId: row.id })}>
        <span className="si-opportunity-top"><span>{String(index + 1).padStart(2, "0")} <b>{row.id}</b></span><span className="si-tag">Preview</span></span>
        <strong>{row.name}<ChevronRight size={17} /></strong>
        <span className="si-opportunity-volume">{number(selectedTonnes(row, context.grade))} <small>t {context.grade === "unclassified" ? "unclassified" : "compatible"}</small></span>
        <span className="si-opportunity-bottom"><span>{shortDate(row.availability.planningDate)} · {distanceKm(data.processor.position, row.position).toFixed(0)} km</span><span>{row.feasibility === "unknown" ? "Verify access" : "Review supply"}</span></span>
      </button>)}
    </div>
    <div className="si-rail-note"><span className="si-tag">Rule-based preview</span><p>No calibrated score, buyer competition or financial return is implied.</p></div>
  </aside>
  const mix = lot.gradeTonnes.value
  return <aside className="si-opportunity-rail si-selected-rail" aria-label={`Supply detail: ${lot.name}`}>
    <div className="si-rail-heading"><button className="si-text-button" onClick={() => update({ selectedSupplyId: null })}><ArrowLeft size={16} /> All opportunities</button><div className="si-detail-id"><span className="si-eyebrow">{lot.id}</span><span className="si-tag">Synthetic · unverified</span></div><h2>{lot.name}</h2><p><MapPin size={13} /> {distanceKm(data.processor.position, lot.position).toFixed(1)} km straight-line · {lot.species}</p></div>
    <div className="si-detail-scroll">
      <section><h3>What could I buy?</h3><div className="si-detail-total">{mix ? number(compatibleTonnes(mix, context.grade)) : "—"}<small> t compatible</small></div><p>{shortDate(lot.availability.start)}–{shortDate(lot.availability.end)} {lot.availability.start.slice(0, 4)} · preview window</p><div className="si-mini-grades">{grades.map(grade => <button key={grade} aria-label={`Filter ${grade}`} aria-pressed={context.grade === grade} onClick={() => update({ grade })}><i className={`si-swatch si-${grade}`} />{grade === "unclassified" ? "U" : grade}<b>{mix ? number(mix[grade]) : "—"}</b></button>)}</div><p className="si-small">{number(lot.recoverableTonnes.value ?? 0)} t recoverable including unclassified wood. No standing-volume inventory linked. Availability is unconfirmed.</p></section>
      <section><h3>What might it cost?</h3><strong>{lot.deliveredCostUgxPerT.value === null ? "Not estimated" : `UGX ${number(lot.deliveredCostUgxPerT.value)}/t`}</strong><p>{lot.deliveredCostUgxPerT.value === null ? lot.deliveredCostUgxPerT.missingReason : "Illustrative delivered cost. Harvest, extraction and haulage quotes are not connected."}</p><p className="si-small">Forest-gate / per-tree price: missing. Operator terms and a matched price bridge are required.</p></section>
      <details><summary>Evidence &amp; uncertainty <span>3 gaps</span></summary><div className="si-evidence-list">{lot.evidence.map(evidence => <div key={evidence.kind}><strong>{evidence.label} <span>Missing</span></strong><p>{evidence.detail}</p></div>)}</div><p className="si-small">Quantity provenance: SYNTHETIC · {lot.gradeTonnes.provenance.source}. As of {lot.gradeTonnes.provenance.asOf}. No model or measurement interval; freshness unknown.</p></details>
      <details><summary>Stand &amp; model context</summary><p>{lot.areaHa.value} ha illustrative area. {lot.management}. Source: {lot.sourceIdentity}. No canonical stand identity or reviewed boundary.</p><p>Grading uses legacy tree DBH assumptions, not log small-end diameter. No log-bucking model is implied.</p><div className="si-model-links"><Link to="/models/model-3">Roundwood scenarios <ArrowUpRight size={14} /></Link><Link to="/models/model-2">Silviculture economics <ArrowUpRight size={14} /></Link></div><p className="si-small">Standalone calculators remain available. This preview supplies no measured inventory to them; growth-to-grade effects are not yet supported.</p></details>
    </div>
    <div className="si-next-action"><span className="si-eyebrow">Recommended next step</span><button onClick={() => onEvent(verificationDraft(lot))}><ClipboardCheck size={17} />{lot.nextAction.label}<ArrowUpRight size={16} /></button><p>Review a draft checklist. No contact or assignment is made. Decision value is not estimated.</p></div>
  </aside>
}
