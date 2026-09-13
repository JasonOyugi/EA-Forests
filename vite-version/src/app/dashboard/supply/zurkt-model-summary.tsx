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
          <p><strong>Two-stage reporting, never blended into one number.</strong> Technical potential is standing
          volume before any legal/commercial-access screen. Commercially addressable supply applies a scenario
          availability fraction on top -- this is NOT inferred from EO or per-CFR verified access status (no such
          data exists yet); it is a broad ASSUMED fraction applied uniformly because every CFR's real access state
          is currently unknown, not because access is known to be partial everywhere.</p>
        </div>
      </div>

      <div className="zurkt-headline-row">
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Technical potential (pre-access-screen)</span>
          <strong>{number(m.technicalPotentialM3.p50)} m3</strong>
          <span className="zurkt-range">P10 {number(m.technicalPotentialM3.p10)} · P90 {number(m.technicalPotentialM3.p90)}</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Commercially addressable annual supply</span>
          <strong>{number(agg.p50)} m3</strong>
          <span className="zurkt-range">P10 {number(agg.p10)} · P90 {number(agg.p90)}</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Viable source CFRs</span>
          <strong>{m.viableCfrCount} / {m.cfrCount}</strong>
          <span className="zurkt-range">delivered cost ≤ $60/m3 (scenario screen)</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Source concentration</span>
          <strong>{m.sourceConcentration.top5_cfrs_share_of_p50_supply != null ? `${Math.round(m.sourceConcentration.top5_cfrs_share_of_p50_supply * 100)}%` : "n/a"}</strong>
          <span className="zurkt-range">top 5 · top 1 {m.sourceConcentration.top1_cfr_share_of_p50_supply != null ? `${Math.round(m.sourceConcentration.top1_cfr_share_of_p50_supply * 100)}%` : "n/a"} · top 10 {m.sourceConcentration.top10_cfrs_share_of_p50_supply != null ? `${Math.round(m.sourceConcentration.top10_cfrs_share_of_p50_supply * 100)}%` : "n/a"}</span>
        </div>
        <div className="zurkt-headline-card">
          <span className="si-eyebrow">Marginal CFR</span>
          <strong>{curve.length ? curve[curve.length - 1].canonical_name : "n/a"}</strong>
          <span className="zurkt-range">{curve.length ? `${fmtUsd(curve[curve.length - 1].delivered_cost_usd_per_m3_p50)}/m3` : ""}</span>
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
        <p className="zurkt-caption">No age-structured growth model exists for these CFRs, so this is not a real growth forecast -- it is a stress test of harvest depletion vs. an assumed net stock-change rate. See zurkt-10yr-outlook-v2.json for the exact priors.</p>
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
        <h3>Demand reliability <span className="si-tag">ladder, not a fake LOW/MED/HIGH fact</span></h3>
        <p className="zurkt-caption">Evergreen's real intake capacity is not known -- this reports P(supply≥demand) and shortfall across a spread of plausible plant sizes instead of asserting one.</p>
        <div className="zurkt-threshold-row">
          {m.demandLadder.map((d) => (
            <div key={d.demand_m3_per_year} className="zurkt-threshold">
              <span>{number(d.demand_m3_per_year)} m3/yr</span>
              <strong>{Math.round(d.p_supply_meets_demand * 100)}%</strong>
              <span className="zurkt-range">P(supply≥demand) · {d.required_source_cfr_count ?? "n/a"} CFRs · shortfall P50 {number(d.shortfall_p50_m3)}</span>
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

      <div className="si-rail-note">
        <div className="zurkt-two-stage-note">
          <p>{m.knownSimplifications.length} documented modelling simplifications (species treated as eucalyptus-equivalent, no age-structured growth model -- the 10-year outlook above is a depletion stress test, not a forecast -- sensitivity is a one-variable approximation, verification priority is a transparent proxy not formal EVSI) -- see zurkt-uganda-scenario-v2.json for the full list and every prior's rationale. The v1 Jinja placeholder analysis is preserved untouched in the *-v1.json files, not deleted.</p>
        </div>
      </div>
    </section>
  )
}
