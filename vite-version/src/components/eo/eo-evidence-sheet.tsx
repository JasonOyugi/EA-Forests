import { useEffect, useMemo, useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { assetUrl } from "@/lib/utils"

/**
 * Public port of the EO evidence sheet (`EoEvidenceDetailSheet` on feature/uganda-cfr-s2-history).
 * Same tabs, wording and honesty rules, but it reads the static snapshot in
 * `public/data/eo/{cc}-evidence.json` (written by `scripts/export-eo-snapshot.py`) instead of the
 * private canonical API, and it leaves out the admin-only provenance identifiers.
 */

type Lane = "s2" | "s1a" | "s1d"
/** [month, outcome, feature1, feature1Sd, feature2, feature2Sd, ...] — oldest month first. */
type ObservationRow = [string, string, ...(number | null)[]]

interface ChangeCandidate {
  stream: string
  features: string[]
  window: [string | null, string | null]
  algorithm: string
  grade: string | null
  reasons: string[]
  confounder: boolean
  regions: { region_count?: number; evidence_cell_count?: number; cell_count_total?: number } | null
}

interface ForestEvidence {
  s2?: ObservationRow[]
  s1a?: ObservationRow[]
  s1d?: ObservationRow[]
  change?: { candidates: ChangeCandidate[]; corroborations: { state: string; window: [string | null, string | null] }[] }
}

interface CountryEvidence {
  features: Record<Lane, string[]>
  forests: Record<string, ForestEvidence>
}

export interface EoEvidenceSelection {
  countryCode: string
  key: string
  name: string
}

const WINDOW_MONTHS = 12
const OBSERVED = new Set(["success", "partial"])

const FEATURE_META: Record<string, { label: string; color: string }> = {
  ndvi: { label: "NDVI", color: "#16a34a" },
  ndmi: { label: "NDMI", color: "#0891b2" },
  nbr: { label: "NBR", color: "#b45309" },
  s1_vv: { label: "VV", color: "#7c3aed" },
  s1_vh: { label: "VH", color: "#db2777" },
}

const STREAM_LABELS: Record<string, string> = {
  s2_optical: "Sentinel-2 optical",
  s1_ascending: "Sentinel-1 radar (ascending)",
  s1_descending: "Sentinel-1 radar (descending)",
}

const GRADE_LABELS: Record<string, string> = {
  PRELIMINARY: "Preliminary",
  REVIEWABLE: "Reviewable",
  STRONGER_SUPPORT: "Stronger support",
}

const CORROBORATION_LABELS: Record<string, string> = {
  SINGLE_STREAM: "Single sensor stream",
  WITHIN_SENSOR_MULTI_STREAM_SUPPORTED: "Multiple streams, one sensor",
  CROSS_SENSOR_SUPPORTED: "Cross-sensor support",
  CROSS_MODALITY_SUPPORTED: "Cross-modality support (optical + radar)",
  SENSOR_DISAGREEMENT: "Sensors disagree on timing",
  INSUFFICIENT_COMMON_SUPPORT: "Insufficient common support",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
}

const evidenceCache = new Map<string, Promise<CountryEvidence>>()

function loadCountryEvidence(countryCode: string) {
  let promise = evidenceCache.get(countryCode)
  if (!promise) {
    promise = fetch(assetUrl(`/data/eo/${countryCode.toLowerCase()}-evidence.json`)).then((response) => {
      if (!response.ok) throw new Error(`EO evidence responded with ${response.status}`)
      return response.json() as Promise<CountryEvidence>
    })
    promise.catch(() => evidenceCache.delete(countryCode))
    evidenceCache.set(countryCode, promise)
  }
  return promise
}

function monthLabel(month: string | null) {
  if (!month) return "–"
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
}

function observedRows(rows: ObservationRow[] | undefined) {
  return (rows ?? []).filter((row) => OBSERVED.has(row[1]))
}

/** Turns snapshot rows into chart points: { month, ndvi, ndvi_sd, ... } for observed months only. */
function toSeries(rows: ObservationRow[] | undefined, features: string[]) {
  return observedRows(rows).map((row) => {
    const point: Record<string, string | number | null> = { month: row[0] }
    features.forEach((key, index) => {
      point[key] = row[2 + index * 2] ?? null
      point[`${key}_sd`] = row[3 + index * 2] ?? null
    })
    return point
  })
}

function OpticalPanel({ rows, features }: { rows?: ObservationRow[]; features: string[] }) {
  const series = useMemo(() => toSeries(rows, features), [rows, features])
  if (!rows?.length) return <p className="text-sm text-muted-foreground">No Sentinel-2 observation processed yet.</p>
  const latest = series.at(-1)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {features.map((key) => (
          <Card key={key} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-xs font-medium" style={{ color: FEATURE_META[key]?.color }}>
                {FEATURE_META[key]?.label ?? key}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4">
              <div className="text-2xl font-semibold">{typeof latest?.[key] === "number" ? (latest[key] as number).toFixed(3) : "–"}</div>
              <div className="text-xs text-muted-foreground">
                spatial SD {typeof latest?.[`${key}_sd`] === "number" ? (latest[`${key}_sd`] as number).toFixed(3) : "–"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Latest observed month ({monthLabel((latest?.month as string) ?? null)}). Derived optical observation: mean and spatial
        standard deviation over the mapped forest's valid target cells. Not a forest-condition or forest-health claim.
      </p>
      {series.length > 1 ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              {features.map((key) => (
                <Line key={key} type="monotone" dataKey={key} name={FEATURE_META[key]?.label ?? key} stroke={FEATURE_META[key]?.color} dot strokeWidth={2} connectNulls={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only one monthly observation has been processed: this is a single-point result, not a trend. Missing months are not interpolated.
        </p>
      )}
      <p className="text-xs text-muted-foreground">{series.length}/{WINDOW_MONTHS} months processed for this forest so far.</p>
    </div>
  )
}

function RadarStreamPanel({ label, rows, features }: { label: string; rows?: ObservationRow[]; features: string[] }) {
  const series = useMemo(() => toSeries(rows, features), [rows, features])
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        {rows?.length ? <Badge variant="outline">{series.length}/{WINDOW_MONTHS}</Badge> : null}
      </div>
      {!rows?.length ? (
        <p className="text-sm text-muted-foreground">No observation processed yet.</p>
      ) : series.length > 1 ? (
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              {features.map((key) => (
                <Line key={key} type="monotone" dataKey={key} name={FEATURE_META[key]?.label ?? key} stroke={FEATURE_META[key]?.color} dot strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Single observation: not a trend.</p>
      )}
    </div>
  )
}

function ChangePanel({ change }: { change?: ForestEvidence["change"] }) {
  if (!change || change.candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No noteworthy observation change under the current method, or insufficient history to evaluate one yet. This is not a
        claim the forest is unchanged.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {change.corroborations.map((c, index) => (
        <div key={index} className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{CORROBORATION_LABELS[c.state] ?? c.state}</Badge>
            <span className="text-xs text-muted-foreground">{monthLabel(c.window[0])} – {monthLabel(c.window[1])}</span>
          </div>
          {c.state === "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Two viewing streams of the same radar instrument agree on timing: this is not cross-sensor confirmation.
            </p>
          )}
        </div>
      ))}
      {change.candidates.map((candidate, index) => (
        <div key={index} className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={candidate.grade === "STRONGER_SUPPORT" ? "default" : candidate.grade === "REVIEWABLE" ? "secondary" : "outline"}>
              {candidate.grade ? GRADE_LABELS[candidate.grade] ?? candidate.grade : "Ungraded"}
            </Badge>
            <Badge variant="outline">{STREAM_LABELS[candidate.stream] ?? candidate.stream}</Badge>
            <span className="text-xs text-muted-foreground">{candidate.features.join(", ")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Candidate window {monthLabel(candidate.window[0])} – {monthLabel(candidate.window[1])}, algorithm {candidate.algorithm}.
            Interpretation: observation change (cause unresolved).
          </p>
          {candidate.reasons.length ? <p className="text-xs text-muted-foreground">{candidate.reasons.join("; ")}</p> : null}
          {candidate.confounder && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Confounder noted: interpret cautiously.</p>
          )}
          {candidate.regions?.region_count ? (
            <p className="text-xs text-muted-foreground">
              Localized to {candidate.regions.region_count} evidence region(s) within the forest ({candidate.regions.evidence_cell_count}/
              {candidate.regions.cell_count_total} analytical cells).
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; features: CountryEvidence["features"]; forest: ForestEvidence | undefined }

export function EoEvidenceSheet({ selection, onClose }: { selection: EoEvidenceSelection | null; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    if (!selection) return
    let cancelled = false
    setState({ status: "loading" })
    loadCountryEvidence(selection.countryCode)
      .then((evidence) => {
        if (!cancelled) setState({ status: "ready", features: evidence.features, forest: evidence.forests[selection.key] })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "EO evidence could not be loaded." })
      })
    return () => {
      cancelled = true
    }
  }, [selection])

  const forest = state.status === "ready" ? state.forest : undefined
  const counts = {
    s2: observedRows(forest?.s2).length,
    s1a: observedRows(forest?.s1a).length,
    s1d: observedRows(forest?.s1d).length,
  }
  const anyObservations = !!(forest?.s2?.length || forest?.s1a?.length || forest?.s1d?.length)

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-none sm:w-[clamp(480px,42vw,720px)]">
        <SheetHeader className="border-b p-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge variant="secondary">Canonical forest</Badge>
            {state.status === "ready" ? (
              <Badge variant="outline">
                Optical {counts.s2}/{WINDOW_MONTHS} · Radar ↑ {counts.s1a}/{WINDOW_MONTHS} · Radar ↓ {counts.s1d}/{WINDOW_MONTHS}
              </Badge>
            ) : null}
          </div>
          <SheetTitle className="text-xl">{selection?.name}</SheetTitle>
          <SheetDescription>
            Real Sentinel-1/2 earth-observation evidence for this forest: not a forest-health, timber, or supply claim.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-4">
            {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading EO evidence…</p>}
            {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}
            {state.status === "ready" && !anyObservations && (
              <p className="text-sm text-muted-foreground">No EO observation has been processed for this forest yet.</p>
            )}
            {state.status === "ready" && anyObservations && (
              <Tabs defaultValue="optical">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="optical">Optical</TabsTrigger>
                  <TabsTrigger value="radar">Radar</TabsTrigger>
                  <TabsTrigger value="change">Change</TabsTrigger>
                </TabsList>
                <TabsContent value="optical" className="pt-4">
                  <OpticalPanel rows={forest?.s2} features={state.features.s2} />
                </TabsContent>
                <TabsContent value="radar" className="space-y-4 pt-4">
                  <RadarStreamPanel label="Ascending" rows={forest?.s1a} features={state.features.s1a} />
                  <Separator />
                  <RadarStreamPanel label="Descending" rows={forest?.s1d} features={state.features.s1d} />
                  <p className="text-xs text-muted-foreground">
                    Ascending and descending are separate viewing geometries and are never merged into one radar line.
                  </p>
                </TabsContent>
                <TabsContent value="change" className="pt-4">
                  <ChangePanel change={forest?.change} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
