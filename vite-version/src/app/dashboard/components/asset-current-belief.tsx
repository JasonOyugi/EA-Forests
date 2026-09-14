"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import assetBeliefsData from "../data/asset-beliefs-v1.json"
import { deriveAnalysisZones, formatMaterialClassLabel } from "../data/asset-intelligence-data"
import type { AssetGroup } from "../data/forestry-data"

type BeliefVariable = {
  variable: string
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

function band(value: number, low: number, high: number): "Low" | "Moderate" | "High" {
  if (value < low) return "Low"
  if (value < high) return "Moderate"
  return "High"
}

function fmt(n: number | undefined | null, digits = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return "--"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n)
}

const DISTURBANCE_LABELS: Record<string, string> = {
  STABLE: "Stable",
  POSSIBLE_DISTURBANCE: "Possible disturbance",
  UNKNOWN: "Unknown",
}

/** Best (highest-posterior) material class per real structural stratum,
 * paired with its real per-class identifiability from the tree-population
 * inference -- used only to give "Species-mix confidence" an honest,
 * derived value instead of a hardcoded guess. */
function speciesMixConfidence(state: AssetGroup["assetState"]): string {
  const strata = state.structural_strata.strata
  const anyEvidenceConstrained = strata.some((s) => {
    const best = Object.entries(s.material_class_probabilities_posterior).sort((a, b) => b[1] - a[1])[0]
    const inference = s.candidate_class_inference.find((c) => c.material_class === best?.[0])
    return inference?.identifiability === "EVIDENCE_CONSTRAINED"
  })
  return anyEvidenceConstrained ? "EVIDENCE_CONSTRAINED" : "PRIOR_DOMINATED"
}

/** Concise, decision-facing synthesis of the asset's current modelled
 * state -- 3-5 rows, each traceable to a real belief/state variable. The
 * full tree-population posterior (stems/DBH/height/basal area), per-
 * stratum structural evidence, GEDI<->CHM reconciliation, and field
 * calibration design all remain real and available -- just moved into
 * the Evidence & methodology disclosure below, not the headline rows. */
export function AssetCurrentBelief({ group }: { group: AssetGroup }) {
  const belief = beliefsByEntity[group.id]
  const state = group.assetState
  const zones = deriveAnalysisZones(state)
  const tp = state.tree_population_state
  const strata = state.structural_strata.strata
  const beliefByVariable: Record<string, BeliefVariable> = Object.fromEntries(
    (belief?.variables ?? []).map((v) => [v.variable, v] as const)
  )

  const forestedFraction = beliefByVariable.forested_fraction?.conditioned?.mean as number | undefined
  const persistence = beliefByVariable.canopy_persistence?.conditioned?.persistence_score_0to1 as number | undefined
  const disturbanceState = beliefByVariable.disturbance_state?.conditioned?.state as string | undefined

  const summaryRows: { label: string; value: string; badge?: boolean }[] = [
    forestedFraction != null && { label: "Forest cover", value: band(forestedFraction, 0.5, 0.75) },
    persistence != null && { label: "Canopy persistence", value: band(persistence, 0.5, 0.85) },
    disturbanceState && { label: "Disturbance", value: DISTURBANCE_LABELS[disturbanceState] ?? disturbanceState },
    { label: "Volume confidence", value: state.volume_state.identifiability, badge: true },
    { label: "Species-mix confidence", value: speciesMixConfidence(state), badge: true },
  ].filter(Boolean) as { label: string; value: string; badge?: boolean }[]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Belief</CardTitle>
        <CardDescription>What the model currently believes about {group.block}&apos;s forest state.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryRows.map((row) => (
            <div key={row.label} className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">{row.label}</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                {row.badge ? <IdentifiabilityBadge level={row.value} /> : row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-3 text-xs">
          <div className="mb-2 font-medium">Nearby processors (ranked by netback)</div>
          <div className="space-y-1">
            {state.market_state.processors_evaluated.map((p) => (
              <div key={p.processor} className={`flex items-center justify-between rounded-md px-2 py-1 ${p.processor === state.market_state.best_processor ? "bg-emerald-500/10" : ""}`}>
                <span>{p.processor} {p.processor === state.market_state.best_processor ? <span className="text-emerald-500">(best)</span> : null} -- {p.distance_km}km</span>
                <span className="font-mono">${p.netback_usd_per_m3_p50}/m3</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-muted-foreground">Real distances; versioned price evidence, not an observed offer for every processor.</p>
        </div>

        <details className="group rounded-xl border p-3 text-xs">
          <summary className="cursor-pointer select-none font-medium text-muted-foreground">Evidence &amp; methodology</summary>
          <div className="mt-3 space-y-3 text-muted-foreground">
            <p>{state.eo_evidence.note} Belief conditioning is a heuristic bounded-nudge, not a calibrated Bayesian posterior.</p>
            {belief?.variables.map((v) => (
              <p key={v.variable}>
                <span className="font-medium">{v.variable.replaceAll("_", " ")}:</span> {v.evidence.summary}
              </p>
            ))}

            <div>
              <div className="font-medium text-foreground">Tree-population posterior (asset level)</div>
              <p className="mt-1">
                Stems/ha P50 {fmt(tp.stems_per_ha.p50, 0)} (total {fmt(tp.total_stems.p50, 0)}) · DBH P50 {fmt(tp.dbh_cm.p50)}cm · inferred height P50 {fmt(tp.height_m.p50)}m ·
                basal area P50 {fmt(tp.basal_area_m2_per_ha.p50)}m2/ha · standing volume P50 {fmt(tp.standing_volume_m3_per_ha.p50)}m3/ha (total {fmt(tp.standing_volume_m3_total.p50, 0)}m3).
                Identifiability: {tp.identifiability.replace(/_/g, " ")}.
              </p>
              <p className="mt-1">{tp.posterior_predictive_agbd_check.note} Implied biomass ~{fmt(tp.posterior_predictive_agbd_check.implied_biomass_total_t_p50_estimate, 0)}t (P50, GEDI L4A cross-check).</p>
            </div>

            <div>
              <div className="font-medium text-foreground">Real data-driven structural strata ({strata.length})</div>
              <p className="mt-1">{state.structural_strata.method}</p>
              {strata.map((s) => {
                const bestClass = Object.entries(s.material_class_probabilities_posterior).sort((a, b) => b[1] - a[1])[0]
                const bestInference = s.candidate_class_inference.find((c) => c.material_class === bestClass?.[0])
                return (
                  <p key={s.cluster_id} className="mt-1">
                    Stratum {s.cluster_id} ({formatMaterialClassLabel(s.label)}, {fmt(s.area_ha, 1)} ha): best class {bestClass ? formatMaterialClassLabel(bestClass[0]) : "unresolved"} ({bestClass ? Math.round(bestClass[1] * 100) : 0}% posterior)
                    {bestInference ? (
                      <> -- DBH prior P50 {fmt(bestInference.dbh_cm.prior.p50)}cm to posterior P50 {fmt(bestInference.dbh_cm.posterior.p50)}cm (ESS {fmt(bestInference.effective_sample_size, 0)}/{bestInference.n_draws}); canopy-surface height (EO) {s.chm_evidence_used ? `p50 ${fmt(s.chm_evidence_used.p50)}m` : "n/a"} vs. inferred tree height P50 {fmt(bestInference.height_m.posterior.p50)}m, kept separate.</>
                    ) : null}
                  </p>
                )
              })}
            </div>

            <p>
              GEDI&lt;-&gt;CHMv2 reconciliation (RH98 vs p98): {(() => {
                const r98 = state.structural_evidence.gedi_chm_reconciliation.by_rh_level["98"] as Record<string, number> | undefined
                if (!r98) return "no matched shots."
                return `bias ${fmt(r98.bias_gedi_minus_chm_m)}m, RMSE ${fmt(r98.rmse_m)}m over ${fmt(r98.n_pairs, 0)} footprint-matched shots.`
              })()}
              {" "}ALOS PALSAR L-band: {state.structural_evidence.palsar_l_band.available ? `${state.structural_evidence.palsar_l_band.acquisition_year} epoch, diagnostic only (saturation caveat).` : "not available for this polygon."}
            </p>

            <div>
              <div className="font-medium text-foreground">Material class mixture by stratum (real posterior)</div>
              {zones.slice(0, 6).map((z) => (
                <p key={z.id} className="mt-1">
                  {formatMaterialClassLabel(z.materialClass)} ({z.zoneLabel.replace(/_/g, " ")}): {Math.round(z.probability * 100)}%
                </p>
              ))}
            </div>

            <p>
              Field calibration design: {state.field_calibration_design.recommended_total_plots_min} plots minimum ({state.field_calibration_design.plot_design}), stratified as{" "}
              {state.field_calibration_design.plots_by_stratum_at_20_total.map((p) => `${formatMaterialClassLabel(p.label)} (${p.recommended_plots_of_20})`).join(", ")}.
              Measures: {state.field_calibration_design.variables_measured.join("; ")}.
            </p>

            {state.market_state.processors_evaluated.map((p) => (
              <p key={p.processor}>
                {p.processor} price evidence: {p.price_evidence.evidence_class.replace(/_/g, " ").toLowerCase()} -- ${p.price_evidence.value_usd_per_m3}/m3 ({p.price_evidence.species}, {p.price_evidence.source}).
              </p>
            ))}

            <p>{state.market_state.note}</p>
            <p>{state.valuation_state.option_value_method_note}</p>
            <p>{state.valuation_state.note}</p>
            <p>{state.volume_state.volume_by_year_note}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
