import { useSupply } from "./context"
import { grades, number, quarterLabel } from "./selectors"

export function SupplyOutlook() {
  const { context, analysis, update } = useSupply()
  const max = Math.max(1, ...analysis.quarters.flatMap(row => [row.total, row.requirement ?? 0, context.grade === "unclassified" ? row.grades.unclassified : 0])) * 1.12
  const selectedQuarter = analysis.quarters.find(row => row.key === context.quarter)
  return <section className="si-outlook" id="supply-outlook" tabIndex={-1} aria-label="Quarterly supply outlook">
    <div className="si-outlook-title"><div><span className="si-eyebrow">Time meets supply</span><h2>Supply outlook</h2><p>Compatible tonnes against the preview intake plan.</p></div><div className="si-outlook-key"><span><i className="si-requirement-key" /> Intake plan</span><span>Click a quarter to focus the map</span>{context.quarter && <button className="si-text-button" onClick={() => update({ quarter: null })}>Clear quarter</button>}</div></div>
    {analysis.quarters.length === 0 ? <div className="si-empty"><p>The snapshot view has no quarterly outlook. Choose a forward horizon to explore forecast tranches.</p><button className="si-text-button" onClick={() => update({ horizonMonths: 12 })}>Show next 12 months</button></div> : <div className="si-quarter-grid" style={{ gridTemplateColumns: `repeat(${analysis.quarters.length}, minmax(125px, 1fr))` }}>
      {analysis.quarters.map(row => {
        const displayed = context.grade === "all" ? grades.filter(grade => grade !== "unclassified") : [context.grade]
        const total = context.grade === "unclassified" ? row.grades.unclassified : row.total
        return <button key={row.key} className="si-quarter" aria-pressed={context.quarter === row.key} aria-label={`${quarterLabel(row.key)}, ${number(total)} tonnes, ${row.gap === null ? "requirement unavailable" : `${number(row.gap)} tonnes uncovered intake`}`} onClick={() => update({ quarter: context.quarter === row.key ? null : row.key })}>
          <div className="si-quarter-top"><strong>{quarterLabel(row.key)}</strong><span>{number(total)} t</span></div>
          <div className="si-quarter-plot">
            {row.requirement !== null && <span className="si-plan-line" style={{ bottom: `${row.requirement / max * 100}%` }}><span>{number(row.requirement)}</span></span>}
            <div className="si-quarter-stack">{displayed.map(grade => <span key={grade} className={`si-${grade}`} style={{ height: `${row.grades[grade] / max * 100}%` }} title={`${grade}: ${number(row.grades[grade])} t`} />)}</div>
          </div>
          <span className={`si-quarter-gap ${row.gap ? "has-gap" : ""}`}>{row.gap === null ? "No grade demand plan" : row.gap > 0 ? `${number(row.gap)} t uncovered` : "Scenario plan covered"}</span>
        </button>
      })}
    </div>}
    <div className="si-outlook-foot"><span>{context.quarter && selectedQuarter ? `${quarterLabel(context.quarter)} selected · map and candidates focused` : "Full quarters from Oct 2026 · each supply tranche counted once"}</span><span>Filtered supply / full selected-grade intake plan. Uncovered ≠ committed shortfall.</span></div>
    {analysis.beyondCoverage && <p className="si-coverage-note">Only 24 months of preview coverage. Years 3–5 are missing, not zero supply.</p>}
  </section>
}
