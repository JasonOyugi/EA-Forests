"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Reads the existing administrative /api/canonical/eo/* routes. Those routes
// require CANONICAL_API_TOKEN (backend/README.md) and are documented as a
// local administrative API, never public/multi-tenant auth -- this panel is
// a local-development affordance, not a production public data path. Set
// VITE_CANONICAL_API_TOKEN in a local .env for development use only; never
// ship a real token in a public build.
const DEV_TOKEN = import.meta.env.VITE_CANONICAL_API_TOKEN as string | undefined

type SpatialAsset = {
  entity_id: string
  name: string
  aoi_version_id: string
  eo_readiness: string | null
  eo_scope: boolean | null
}

type FeatureValue = {
  feature_key: string
  value: number | null
  standard_deviation: number | null
  usable_fraction: number | null
}

type Observation = {
  id: string
  window_start: string
  window_end: string
  outcome: "success" | "partial" | "no_observation" | "failed"
  acquisition_count: number
  eligible_acquisition_count: number
  usable_observation_fraction: number | null
  applied_qa_profile: string
  features: FeatureValue[]
}

async function canonicalFetch<T>(path: string): Promise<T> {
  if (!DEV_TOKEN) {
    throw new Error(
      "Set VITE_CANONICAL_API_TOKEN locally to load EO evidence (local admin API only)."
    )
  }
  const response = await fetch(path, { headers: { Authorization: `Bearer ${DEV_TOKEN}` } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

function featureValue(observation: Observation, key: string) {
  return observation.features.find((f) => f.feature_key === key)
}

function outcomeLabel(outcome: Observation["outcome"]) {
  return {
    success: "Success",
    partial: "Partial",
    no_observation: "No observation",
    failed: "Failed",
  }[outcome]
}

export function EoEvidencePanel({ cfrName }: { cfrName: string }) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [observations, setObservations] = React.useState<Observation[] | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const assets = await canonicalFetch<SpatialAsset[]>(
        "/api/canonical/spatial-assets?country=UG&spatial_type=reserve&limit=1000"
      )
      const asset = assets.find((a) => a.name === cfrName)
      if (!asset) {
        setObservations([])
        return
      }
      const rows = await canonicalFetch<Observation[]>(
        `/api/canonical/eo/observations?aoi_version_id=${asset.aoi_version_id}`
      )
      setObservations(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load EO evidence")
    } finally {
      setLoading(false)
    }
  }, [cfrName])

  const chartData = React.useMemo(
    () =>
      (observations ?? [])
        .filter((o) => o.outcome === "success" || o.outcome === "partial")
        .slice()
        .reverse()
        .map((o) => ({
          month: o.window_start.slice(0, 7),
          ndvi: featureValue(o, "ndvi")?.value ?? null,
          ndmi: featureValue(o, "ndmi")?.value ?? null,
          nbr: featureValue(o, "nbr")?.value ?? null,
        })),
    [observations]
  )

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sentinel-2 EO evidence</CardTitle>
        <CardDescription>
          Derived from Sentinel-2 surface reflectance. Not a forest-health, timber, or supply
          claim.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!observations && !loading && (
          <button
            type="button"
            onClick={load}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Load EO evidence history
          </button>
        )}
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {observations && observations.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No canonical AOI resolved for this reserve yet, or no EO analyses run.
          </p>
        )}
        {observations && observations.length > 0 && (
          <>
            {chartData.length > 1 && (
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ndvi" stroke="#16a34a" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="ndmi" stroke="#0891b2" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="nbr" stroke="#b45309" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="space-y-2">
              {observations.slice(0, 6).map((observation) => {
                const ndvi = featureValue(observation, "ndvi")
                const ndmi = featureValue(observation, "ndmi")
                const nbr = featureValue(observation, "nbr")
                return (
                  <li key={observation.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{observation.window_start.slice(0, 7)}</span>
                      <Badge variant={observation.outcome === "success" ? "outline" : "secondary"}>
                        {outcomeLabel(observation.outcome)}
                      </Badge>
                    </div>
                    {(ndvi || ndmi || nbr) && (
                      <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span>NDVI {ndvi?.value?.toFixed(2) ?? "–"} (±{ndvi?.standard_deviation?.toFixed(2) ?? "–"})</span>
                        <span>NDMI {ndmi?.value?.toFixed(2) ?? "–"}</span>
                        <span>NBR {nbr?.value?.toFixed(2) ?? "–"}</span>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {observation.eligible_acquisition_count}/{observation.acquisition_count} acquisitions ·{" "}
                      {observation.usable_observation_fraction != null
                        ? `${Math.round(observation.usable_observation_fraction * 100)}% usable coverage`
                        : "coverage n/a"}{" "}
                      · {observation.applied_qa_profile}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
