"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import assetBeliefsData from "../data/asset-beliefs-v1.json"
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
  const color = level === "HIGH" ? "#34d399" : level === "MEDIUM" ? "#fbbf24" : level === "LOW" ? "#fb923c" : "#f87171"
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${color}22`, color }}>
      {level.replace("_", " ")}
    </span>
  )
}

function band(value: number, low: number, high: number): "Low" | "Moderate" | "High" {
  if (value < low) return "Low"
  if (value < high) return "Moderate"
  return "High"
}

const DISTURBANCE_LABELS: Record<string, string> = {
  STABLE: "Stable",
  POSSIBLE_DISTURBANCE: "Possible disturbance",
  UNKNOWN: "Unknown",
}

/** Concise, decision-facing synthesis of the asset's current modelled
 * state -- 3-5 rows, each traceable to a real belief/state variable. Raw
 * NDVI/NBR/NDMI/CHM/GEDI numbers live in the Evidence & methodology
 * disclosure below, not here. */
export function AssetCurrentBelief({ group }: { group: AssetGroup }) {
  const belief = beliefsByEntity[group.id]
  const state = group.assetState
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
    { label: "Species-mix confidence", value: "LOW", badge: true },
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
          <p className="mt-2 text-muted-foreground">Real distances; scenario pricing, not an observed offer.</p>
        </div>

        <details className="group rounded-xl border p-3 text-xs">
          <summary className="cursor-pointer select-none font-medium text-muted-foreground">Evidence &amp; methodology</summary>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>{state.eo_evidence.note} Belief conditioning is a heuristic bounded-nudge, not a calibrated Bayesian posterior.</p>
            {belief?.variables.map((v) => (
              <p key={v.variable}>
                <span className="font-medium">{v.variable.replaceAll("_", " ")}:</span> {v.evidence.summary}
              </p>
            ))}
            {state.structural_evidence ? (
              <p>
                {state.structural_evidence.clip_method}. CHMv2 median height {state.structural_evidence.chmv2.stats.height_m_p50}m, P98 {state.structural_evidence.chmv2.stats.height_m_p98}m.
                GEDI: {state.structural_evidence.gedi.n_shots_quality_flag_1}/{state.structural_evidence.gedi.n_shots_sampled} quality footprints, rh98 mean {state.structural_evidence.gedi.rh98_quality_mean_m}m.
              </p>
            ) : null}
            <p>{state.market_state.note}</p>
            <p>{state.valuation_state.note}</p>
            <p>{state.volume_state.volume_by_year_note}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
