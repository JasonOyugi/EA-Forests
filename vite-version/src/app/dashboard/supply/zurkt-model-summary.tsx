import { zurktSupplyModel } from "./preview"
import { number } from "./selectors"

const m = zurktSupplyModel

function fmtUsd(v: number) {
  return `$${v.toFixed(v < 10 ? 2 : 0)}`
}

/**
 * Real backend Monte Carlo output (backend/app/services/supply/
 * zurkt_scenario.py + scripts/zurkt_run_supply_model.py), not a frontend
 * calculation -- see outputs/supply/*.json for the canonical artifacts this
 * mirrors. Every number here answers one of Track 31's acceptance
 * questions; nothing is a decorative chart.
 */
export function ZurktModelSummary() {
  const agg = m.aggregateAnnualSupplyM3
  const curve = m.supplyCurve
  const maxCumulative = curve.length ? curve[curve.length - 1].cumulative_annual_supply_m3_p50 : 1
  const maxCurveCost = Math.max(...curve.map((p) => p.delivered_cost_usd_per_m3_p50), 1)
  const outlookMaxP90 = Math.max(...m.outlookYears.map((y) => y.annual_supply_m3.p90), 1)
  const sensitivityMax = Math.max(...m.sensitivity.map((s) => Math.abs(s.supply_change_pct ?? 0)), 1)

  return (
    <section className="si-spatial-section zurkt-model" aria-label="Zurkt stochastic supply model">
      <div className="si-workspace-heading">
        <div>
          <span className="si-eyebrow">Uncertainty-aware supply model</span>
          <h2>How much could reach {m.processorDisplayName}?</h2>
        </div>
        <span className="si-tag">MODELLED · {m.scenarioVersion}</span>
      </div>

      <div className="si-rail-note">
        <div className="zurkt-two-stage-note">
          <p><strong>Three supply concepts, never blended into one number.</strong> A. PHYSICAL POTENTIAL is standing/
          harvestable volume before any access screen. B. SCENARIO-ADDRESSABLE applies an ASSUMED commercial-access
          fraction (not evidence-based). C. EVIDENCE-SUPPORTED restricts to CFRs with a real, ingested legal/access
          record -- {m.threeTierSupply.note}</p>
        </div>
      </div>

      <div className="zurkt-headline-row">
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">A. Physical potential</span>
          <strong>{number(m.threeTierSupply.physical.p50)} m3</strong>
          <span className="zurkt-range">P10 {number(m.threeTierSupply.physical.p10)} · P90 {number(m.threeTierSupply.physical.p90)}</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">B. Scenario-addressable</span>
          <strong>{number(agg.p50)} m3</strong>
          <span className="zurkt-range">P10 {number(agg.p10)} · P90 {number(agg.p90)}</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">C. Evidence-supported</span>
          <strong>{m.threeTierSupply.evidenceSupported ? number(m.threeTierSupply.evidenceSupported.p50) : "n/a"} m3</strong>
          <span className="zurkt-range">{m.accessState.counts.KNOWN_POTENTIALLY_AVAILABLE} / {m.accessState.counts.KNOWN_POTENTIALLY_AVAILABLE + m.accessState.counts.KNOWN_RESTRICTED_OR_UNAVAILABLE + m.accessState.counts.UNKNOWN} CFRs with real access evidence</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Viable source CFRs</span>
          <strong>{m.viableCfrCount} / {m.cfrCount}</strong>
          <span className="zurkt-range">delivered cost ≤ $60/m3 (scenario screen)</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Marginal CFR</span>
          <strong>{curve.length ? curve[curve.length - 1].canonical_name : "n/a"}</strong>
          <span className="zurkt-range">{curve.length ? `${fmtUsd(curve[curve.length - 1].delivered_cost_usd_per_m3_p50)}/m3` : ""}</span>
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Source concentration <span className="si-tag">per-draw distribution</span></h3>
        <p className="zurkt-caption">Share of aggregate supply held by the biggest 1/5/10 suppliers -- a spread over Monte Carlo worlds, not one P50 read-off.</p>
        <div className="zurkt-threshold-row">
          <div className="zurkt-threshold"><span>Top 1 CFR</span><strong>{Math.round(m.sourceConcentrationDistribution.top1_share.p50 * 100)}%</strong><span className="zurkt-range">P10 {Math.round(m.sourceConcentrationDistribution.top1_share.p10 * 100)}% · P90 {Math.round(m.sourceConcentrationDistribution.top1_share.p90 * 100)}%</span></div>
          <div className="zurkt-threshold"><span>Top 5 CFRs</span><strong>{Math.round(m.sourceConcentrationDistribution.top5_share.p50 * 100)}%</strong><span className="zurkt-range">P10 {Math.round(m.sourceConcentrationDistribution.top5_share.p10 * 100)}% · P90 {Math.round(m.sourceConcentrationDistribution.top5_share.p90 * 100)}%</span></div>
          <div className="zurkt-threshold"><span>Top 10 CFRs</span><strong>{Math.round(m.sourceConcentrationDistribution.top10_share.p50 * 100)}%</strong><span className="zurkt-range">P10 {Math.round(m.sourceConcentrationDistribution.top10_share.p10 * 100)}% · P90 {Math.round(m.sourceConcentrationDistribution.top10_share.p90 * 100)}%</span></div>
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Delivered-cost supply curve <span className="si-tag">P50 per CFR</span></h3>
        <p className="zurkt-caption">Cumulative Zurkt-suitable m3/year, ranked by delivered cost. {curve.length} CFRs.</p>
        <svg viewBox={`0 0 640 200`} className="zurkt-curve-svg" role="img" aria-label="Delivered cost supply curve">
          <polyline
            fill="none" stroke="var(--si-accent)" strokeWidth={2}
            points={curve.map((p) => `${(p.cumulative_annual_supply_m3_p50 / maxCumulative) * 620 + 10},${190 - (p.delivered_cost_usd_per_m3_p50 / maxCurveCost) * 170}`).join(" ")}
          />
        </svg>
        <div className="zurkt-threshold-row">
          {m.volumeBelowCostThreshold.map((t) => (
            <div key={t.delivered_cost_threshold_usd_per_m3} className="zurkt-threshold">
              <span>≤{fmtUsd(t.delivered_cost_threshold_usd_per_m3)}/m3</span>
              <strong>{number(t.cumulative_annual_supply_m3_p50)} m3</strong>
              <span className="zurkt-range">{t.contributing_cfrs} CFRs</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>10-year depletion stress test <span className="si-tag">NOT a forecast</span></h3>
        <p className="zurkt-caption">No age-structured growth model exists for these CFRs, so this is not a real growth forecast -- it is a stress test of harvest depletion vs. an assumed net stock-change rate. See zurkt-10yr-outlook-v3.json for the exact priors.</p>
        <div className="zurkt-outlook-bars">
          {m.outlookYears.map((y) => (
            <div key={y.year} className="zurkt-outlook-bar" title={`Year ${y.year}: P10 ${number(y.annual_supply_m3.p10)} · P50 ${number(y.annual_supply_m3.p50)} · P90 ${number(y.annual_supply_m3.p90)} m3`}>
              <div className="zurkt-outlook-range" style={{ height: `${(y.annual_supply_m3.p90 / outlookMaxP90) * 100}%` }}>
                <div className="zurkt-outlook-p50" style={{ height: `${(y.annual_supply_m3.p50 / y.annual_supply_m3.p90) * 100}%` }} />
              </div>
              <span>Y{y.year}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Sensitivity <span className="si-tag">one variable at a time</span></h3>
        <p className="zurkt-caption">Ranked by impact on aggregate P50 annual supply. Base case: {number(m.sensitivity.length ? agg.p50 : 0)} m3.</p>
        <div className="zurkt-sensitivity-list">
          {m.sensitivity.map((s) => (
            <div key={s.perturbation} className="zurkt-sensitivity-row">
              <span className="zurkt-sensitivity-label">{s.perturbation.replaceAll("_", " ")}</span>
              <div className="zurkt-sensitivity-bar-track">
                <div
                  className={`zurkt-sensitivity-bar ${(s.supply_change_pct ?? 0) < 0 ? "is-negative" : "is-positive"}`}
                  style={{ width: `${(Math.abs(s.supply_change_pct ?? 0) / sensitivityMax) * 100}%` }}
                />
              </div>
              <span className="zurkt-sensitivity-value">{s.supply_change_pct}% supply · {s.cost_change_pct}% cost</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Demand reliability <span className="si-tag">draw-wise dispatch, not a fake LOW/MED/HIGH fact</span></h3>
        <p className="zurkt-caption">Evergreen's real intake capacity is not known. Every Monte Carlo world dispatches its own cheapest-first CFR ranking, so required CFR count and marginal cost below are distributions, not single reads off one curve.</p>
        <div className="zurkt-threshold-row">
          {m.demandReliability.map((d) => (
            <div key={d.demand_m3_per_year} className="zurkt-threshold">
              <span>{number(d.demand_m3_per_year)} m3/yr</span>
              <strong>{Math.round(d.p_supply_meets_demand * 100)}%</strong>
              <span className="zurkt-range">P(supply≥demand) · {d.required_source_cfr_count.p50 ?? "n/a"} CFRs (P50) · shortfall P50 {number(d.shortfall_m3.p50)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Uncertainty decomposition <span className="si-tag">grouped-collapse approximation</span></h3>
        <p className="zurkt-caption">Approximate share of aggregate-supply variance attributable to each uncertainty group -- not satellite/EO uncertainty, but access/legal and stocking that dominate.</p>
        <div className="zurkt-sensitivity-list">
          {m.uncertaintyDecomposition.map((g) => (
            <div key={g.uncertainty_group} className="zurkt-sensitivity-row">
              <span className="zurkt-sensitivity-label">{g.uncertainty_group.replaceAll("_", " ")}</span>
              <div className="zurkt-sensitivity-bar-track">
                <div className="zurkt-sensitivity-bar is-positive" style={{ width: `${Math.min(g.approx_share_of_variance * 100, 100)}%` }} />
              </div>
              <span className="zurkt-sensitivity-value">~{Math.round(g.approx_share_of_variance * 100)}% of variance</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Top verification priorities <span className="si-tag">approximate, not formal EVSI</span></h3>
        <p className="zurkt-caption">(P90-P10 uncertainty ÷ P50) × share of aggregate P50 supply. Field variables recommended per target.</p>
        <div className="si-operation-items zurkt-verification-grid">
          {m.verificationPriorities.slice(0, 6).map((v, i) => (
            <div key={v.entity_id} className="zurkt-verification-card">
              <span className="zurkt-rank">#{i + 1}</span>
              <strong>{v.canonical_name}</strong>
              <span className="zurkt-range">{v.road_km != null ? `${v.road_km} km road` : `${v.distance_km} km straight-line`} · VOI-proxy {v.value_of_information_proxy.toFixed(2)}</span>
              <span className="zurkt-range">{Math.round(v.commercial_contribution_share * 100)}% of aggregate supply</span>
            </div>
          ))}
        </div>
      </div>

      <div className="zurkt-chart-block">
        <h3>Field verification plan <span className="si-tag">EVSI re-simulation, top {m.fieldProgramme.length}</span></h3>
        <p className="zurkt-caption">Each row re-simulates the full model with that CFR's ONE variable collapsed to its true (verified) value -- ranked by the resulting reduction in expected shortfall at 150,000 m3/yr demand.</p>
        <div className="si-operation-items zurkt-verification-grid">
          {m.fieldProgramme.map((f) => (
            <div key={`${f.entity_id}-${f.variable_to_measure}`} className="zurkt-verification-card">
              <span className="zurkt-rank">#{f.priority}</span>
              <strong>{f.canonical_name} · {f.variable_to_measure.replaceAll("_", " ")}</strong>
              <span className="zurkt-range">{f.recommended_method}</span>
              <span className="zurkt-range">shortfall −{number(f.expected_decision_impact.expected_shortfall_reduction_m3)} m3 · reliability +{(f.expected_decision_impact.reliability_gain * 100).toFixed(1)}pp</span>
            </div>
          ))}
        </div>
      </div>

      <div className="si-rail-note">
        <div className="zurkt-two-stage-note">
          <p>{m.knownSimplifications.length} documented modelling simplifications (species treated as eucalyptus-equivalent, no age-structured growth model -- the 10-year outlook above is a depletion stress test, not a forecast -- verification priority uses both a transparent proxy AND a real EVSI re-simulation above) -- see zurkt-uganda-scenario-v3.json for the full list and every prior's rationale, including the hierarchical uncertainty model. The v1 Jinja placeholder analysis is preserved untouched in the *-v1.json files, not deleted.</p>
        </div>
      </div>
    </section>
  )
}
