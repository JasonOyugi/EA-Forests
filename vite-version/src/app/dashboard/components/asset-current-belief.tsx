"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import assetBeliefsData from "../data/asset-beliefs-v1.json"
import { deriveAnalysisZones, formatMaterialClassLabel } from "../data/asset-intelligence-data"
import type { AssetGroup } from "../data/forestry-data"

type BeliefVariable = {
  variable: string
  prior: { kind: string; mean: number | null; rationale: string }
  evidence: { sensor: string; index: string; summary: string }
  conditioned: Record<string, unknown>
  confidence: "prior_dominated" | "evidence_constrained"
}
type BeliefEntity = { entity_id: string; canonical_name: string; calibrated: boolean; variables: BeliefVariable[] }
const beliefsByEntity: Record<string, BeliefEntity> = Object.fromEntries(
  (assetBeliefsData as { entities: BeliefEntity[] }).entities.map((e) => [e.entity_id, e])
)

function IdentifiabilityBadge({ level }: { level: string }) {
  const color = level === "HIGH" ? "#34d399" : level === "MEDIUM" ? "#fbbf24" : level === "EVIDENCE_CONSTRAINED" ? "#38bdf8" : level === "LOW" || level === "LOW_BUT_ESTIMATED" ? "#fb923c" : level === "PRIOR_DOMINATED" ? "#f59e0b" : "#f87171"
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${color}22`, color }}>
      {level.replace(/_/g, " ")}
    </span>
  )
}

function fmt(n: number | undefined | null, digits = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "--"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n)
}

/**
 * Track v7: Current Belief panel now carries a real, first-class Structure
 * Panel (item 21) -- tree density, DBH prior-vs-posterior, canopy-surface
 * height (EO-derived) vs inferred tree height (modelled) kept explicitly
 * SEPARATE, basal area, and standing volume, all from
 * app/services/tree_population_model.py's real per-stratum importance-
 * sampling posterior, aggregated to asset level. Nothing here is a
 * calibrated field-verified number -- every card says so explicitly.
 */
export function AssetCurrentBelief({ group }: { group: AssetGroup }) {
  const belief = beliefsByEntity[group.id]
  const state = group.assetState
  const zones = deriveAnalysisZones(state)
  const tp = state.tree_population_state
  const strata = state.structural_strata.strata

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Belief</CardTitle>
        <CardDescription>
          Real EO evidence + modelled tree-population state for {group.block} -- an importance-sampling posterior, NOT a calibrated field inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* --- Structure Panel (item 21): tree density / DBH / height / basal area / standing volume --- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Tree density (stems/ha)</div>
            <IdentifiabilityBadge level={tp.identifiability} />
            <p className="mt-2 text-xs">
              P10 {fmt(tp.stems_per_ha.p10, 0)} - P50 {fmt(tp.stems_per_ha.p50, 0)} - P90 {fmt(tp.stems_per_ha.p90, 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total stems: P50 {fmt(tp.total_stems.p50, 0)} (P10 {fmt(tp.total_stems.p10, 0)} - P90 {fmt(tp.total_stems.p90, 0)})</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">DBH (cm)</div>
            <IdentifiabilityBadge level={tp.identifiability} />
            <p className="mt-2 text-xs">
              P10 {fmt(tp.dbh_cm.p10)} - P50 {fmt(tp.dbh_cm.p50)} - P90 {fmt(tp.dbh_cm.p90)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Asset-level mixture across real structural strata -- see per-stratum prior vs posterior below.</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Inferred tree height (m)</div>
            <IdentifiabilityBadge level={tp.identifiability} />
            <p className="mt-2 text-xs">
              P10 {fmt(tp.height_m.p10)} - P50 {fmt(tp.height_m.p50)} - P90 {fmt(tp.height_m.p90)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">MODELLED individual-tree height -- see canopy-surface height (EO-derived) below, kept explicitly separate.</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Basal area (m2/ha)</div>
            <IdentifiabilityBadge level={tp.identifiability} />
            <p className="mt-2 text-xs">
              P10 {fmt(tp.basal_area_m2_per_ha.p10)} - P50 {fmt(tp.basal_area_m2_per_ha.p50)} - P90 {fmt(tp.basal_area_m2_per_ha.p90)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total: P50 {fmt(tp.total_basal_area_m2.p50, 0)} m2</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Standing volume (m3/ha)</div>
            <IdentifiabilityBadge level={tp.identifiability} />
            <p className="mt-2 text-xs">
              P10 {fmt(tp.standing_volume_m3_per_ha.p10)} - P50 {fmt(tp.standing_volume_m3_per_ha.p50)} - P90 {fmt(tp.standing_volume_m3_per_ha.p90)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total: P50 {fmt(tp.standing_volume_m3_total.p50, 0)} m3</p>
          </div>
        </div>

        <div className="rounded-xl border p-3 text-xs">
          <div className="mb-1 font-medium">GEDI L4A biomass cross-check (independent, model-derived evidence)</div>
          <p className="text-muted-foreground">{tp.posterior_predictive_agbd_check.note}</p>
          <p className="mt-1">Implied biomass from tree-population posterior: ~{fmt(tp.posterior_predictive_agbd_check.implied_biomass_total_t_p50_estimate, 0)} t (P50 estimate)</p>
        </div>

        {/* --- Per-stratum structural evidence, DBH prior-vs-posterior, real material-class strata --- */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Real data-driven structural strata ({strata.length}) -- {state.structural_strata.method.slice(0, 140)}...</div>
          {strata.map((s) => {
            const bestClass = Object.entries(s.material_class_probabilities_posterior).sort((a, b) => b[1] - a[1])[0]
            const bestInference = s.candidate_class_inference.find((c) => c.material_class === bestClass?.[0])
            return (
              <div key={s.cluster_id} className="rounded-xl border p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Stratum {s.cluster_id} ({formatMaterialClassLabel(s.label)}, {fmt(s.area_ha, 1)} ha)
                  </span>
                  {bestInference ? <IdentifiabilityBadge level={bestInference.identifiability} /> : null}
                </div>
                <p className="mt-1 text-muted-foreground">
                  Best material class: {bestClass ? formatMaterialClassLabel(bestClass[0]) : "unresolved"} ({bestClass ? Math.round(bestClass[1] * 100) : 0}% posterior)
                </p>
                {bestInference ? (
                  <>
                    <p className="mt-1">
                      DBH prior P50 {fmt(bestInference.dbh_cm.prior.p50)}cm {"->"} posterior P50 {fmt(bestInference.dbh_cm.posterior.p50)}cm (ESS {fmt(bestInference.effective_sample_size, 0)}/{bestInference.n_draws})
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Canopy-surface height (EO-derived, CHMv2): {s.chm_evidence_used ? `p50 ${fmt(s.chm_evidence_used.p50)}m, p98 ${fmt(s.chm_evidence_used.p98)}m` : "not available"} vs. inferred tree height (MODELLED): P50 {fmt(bestInference.height_m.posterior.p50)}m -- kept separate, never merged.
                    </p>
                  </>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Material class mixture (real posterior, per structural stratum)</div>
            <IdentifiabilityBadge level="LOW_BUT_ESTIMATED" />
            <div className="mt-2 space-y-1 text-xs">
              {zones.slice(0, 4).map((z) => (
                <div key={z.id} className="flex justify-between">
                  <span>
                    {formatMaterialClassLabel(z.materialClass)} <span className="opacity-60">(stratum {z.zoneLabel.replace(/_/g, " ")})</span>
                  </span>
                  <span className="font-mono">{Math.round(z.probability * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">GEDI &lt;-&gt; CHMv2 reconciliation (RH98 vs p98)</div>
            <IdentifiabilityBadge level="EO_DERIVED" />
            <p className="mt-2 text-xs text-muted-foreground">
              {(() => {
                const r98 = state.structural_evidence.gedi_chm_reconciliation.by_rh_level["98"] as Record<string, number> | undefined
                if (!r98) return "No matched shots."
                return `Bias ${fmt(r98.bias_gedi_minus_chm_m)}m, RMSE ${fmt(r98.rmse_m)}m over ${fmt(r98.n_pairs, 0)} footprint-matched shots.`
              })()}
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">EO evidence (Sentinel-2 NDVI history)</div>
            <IdentifiabilityBadge level={state.eo_evidence.n_ndvi_observations >= 6 ? "MEDIUM" : state.eo_evidence.n_ndvi_observations >= 1 ? "LOW" : "NOT_IDENTIFIABLE"} />
            <p className="mt-2 text-xs text-muted-foreground">{state.eo_evidence.note}</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">ALOS PALSAR L-band (diagnostic only)</div>
            <IdentifiabilityBadge level="LOW" />
            <p className="mt-2 text-xs text-muted-foreground">
              {state.structural_evidence.palsar_l_band.available ? `${state.structural_evidence.palsar_l_band.acquisition_year} epoch -- not converted to biomass (saturation caveat).` : "Not available for this polygon."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-3 text-xs">
          <div className="mb-2 font-medium">Real nearby processors evaluated (ranked by netback, versioned price evidence)</div>
          <div className="space-y-1.5">
            {state.market_state.processors_evaluated.map((p) => (
              <div key={p.processor} className={`rounded-md px-2 py-1.5 ${p.processor === state.market_state.best_processor ? "bg-emerald-500/10" : ""}`}>
                <div className="flex items-center justify-between">
                  <span>
                    {p.processor} {p.processor === state.market_state.best_processor ? <span className="text-emerald-500">(best)</span> : null} -- {p.distance_km}km ({p.route_source})
                  </span>
                  <span className="font-mono">${p.netback_usd_per_m3_p50}/m3</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{p.price_evidence.evidence_class.replace(/_/g, " ")}</span>
                  <span>
                    ${p.price_evidence.value_usd_per_m3}/m3 ({p.price_evidence.species}, {p.price_evidence.source.slice(0, 60)}...)
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-muted-foreground">{state.market_state.note}</p>
        </div>

        <div className="rounded-xl border p-3 text-xs">
          <div className="mb-1 font-medium">Field calibration design (specific to {group.block}, not generic "inventory needed")</div>
          <p className="text-muted-foreground">
            {state.field_calibration_design.recommended_total_plots_min} plots minimum ({state.field_calibration_design.plot_design}), stratified across the {strata.length} real structural strata:{" "}
            {state.field_calibration_design.plots_by_stratum_at_20_total.map((p) => `${formatMaterialClassLabel(p.label)} (${p.recommended_plots_of_20})`).join(", ")}.
          </p>
          <p className="mt-1">Measures: {state.field_calibration_design.variables_measured.join("; ")}.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {Object.values(state.field_calibration_design.uncertainty_reduction_scenarios).map((s) => (
              <span key={s.n_plots} className="rounded-md bg-muted px-2 py-1">
                {s.n_plots} plots: {s.current_relative_spread_standing_volume}x {"->"} ~{s.illustrative_relative_spread_after}x spread
              </span>
            ))}
          </div>
        </div>

        {belief ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {belief.variables.map((v) => (
              <div key={v.variable} className="rounded-xl border p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{v.variable.replaceAll("_", " ")}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{v.confidence.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{v.evidence.summary}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
