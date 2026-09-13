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
  const color = level === "HIGH" ? "#34d399" : level === "MEDIUM" ? "#fbbf24" : level === "LOW" ? "#fb923c" : "#f87171"
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${color}22`, color }}>
      {level.replace("_", " ")}
    </span>
  )
}

/**
 * Track v5-24: Current Belief panel, wiring the real EO belief object
 * (backend/scripts/eo_belief_model.py, heuristic_bounded_nudge,
 * calibrated=false) together with the new AssetState's material/tree/
 * volume identifiability tags. Nothing here is a calibrated posterior --
 * every card says so explicitly.
 */
export function AssetCurrentBelief({ group }: { group: AssetGroup }) {
  const belief = beliefsByEntity[group.id]
  const state = group.assetState
  const zones = deriveAnalysisZones(state)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Belief</CardTitle>
        <CardDescription>
          Real EO evidence + modelled state for {group.block} -- heuristic bounded-nudge conditioning, NOT a calibrated Bayesian posterior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Material class mixture</div>
            <IdentifiabilityBadge level={state.material_state.identifiability} />
            <div className="mt-2 space-y-1 text-xs">
              {zones.slice(0, 3).map((z) => (
                <div key={z.id} className="flex justify-between">
                  <span>{formatMaterialClassLabel(z.materialClass)}</span>
                  <span className="font-mono">{Math.round(z.probability * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Tree population (stems/DBH/height)</div>
            <IdentifiabilityBadge level={state.tree_population_state.dbh_identifiability} />
            <p className="mt-2 text-xs text-muted-foreground">{state.tree_population_state.note}</p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Standing volume</div>
            <IdentifiabilityBadge level={state.volume_state.identifiability} />
            <p className="mt-2 text-xs text-muted-foreground">
              P10 {Math.round(state.volume_state.merchantable_volume_m3.p10)} - P50 {Math.round(state.volume_state.merchantable_volume_m3.p50)} - P90 {Math.round(state.volume_state.merchantable_volume_m3.p90)} m3
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">EO evidence</div>
            <IdentifiabilityBadge level={state.eo_evidence.n_ndvi_observations >= 6 ? "MEDIUM" : state.eo_evidence.n_ndvi_observations >= 1 ? "LOW" : "NOT_IDENTIFIABLE"} />
            <p className="mt-2 text-xs text-muted-foreground">{state.eo_evidence.note}</p>
          </div>
        </div>

        {state.structural_evidence ? (
          <div className="rounded-xl border p-3 text-xs">
            <div className="mb-1 font-medium">Real structural evidence (Meta/WRI CHMv2 + GEDI, pulled this session)</div>
            <p className="text-muted-foreground">{state.structural_evidence.note}</p>
          </div>
        ) : null}

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
        ) : (
          <p className="text-xs text-muted-foreground">No belief snapshot generated for this asset.</p>
        )}
      </CardContent>
    </Card>
  )
}
