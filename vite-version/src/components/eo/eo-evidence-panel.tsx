"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  CanonicalApiUnavailableError,
  CORROBORATION_STATE_LABELS,
  EO_OUTCOME_LABELS,
  EVIDENCE_GRADE_LABELS,
  type ChangeEvidence,
  type EoObservation,
  type EoObservationDetail,
  type SensorLane,
  featureValue,
  fetchChangeEvidence,
  fetchEoObservationDetail,
  fetchEoObservations,
  fetchSpatialAsset,
  SENSOR_LANE_LABELS,
  type SpatialAsset,
} from "@/lib/canonical-api"

const OPTICAL_FEATURE_META = {
  ndvi: { label: "NDVI", color: "#16a34a" },
  ndmi: { label: "NDMI", color: "#0891b2" },
  nbr: { label: "NBR", color: "#b45309" },
} as const

const RADAR_FEATURE_META = {
  s1_vv: { label: "VV", color: "#7c3aed" },
  s1_vh: { label: "VH", color: "#db2777" },
} as const

const SENSOR_LANES: SensorLane[] = ["s2_optical", "s1_ascending", "s1_descending"]

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

function evidenceGradeBadgeVariant(grade: string | null | undefined) {
  return grade === "STRONGER_SUPPORT" ? "default" : grade === "REVIEWABLE" ? "secondary" : "outline"
}

/** A single canonical forest, identified by entity/AOI-version, not by
 * name-matching. `kind: "name"` remains supported for existing call sites
 * (it resolves via `fetchSpatialAsset`), but any caller that already has
 * `entityId`/`aoiVersionId`/`name` (e.g. from `ForestPolygonProperties` or
 * `CoverageSummaryEntry`) should use `kind: "id"` directly -- this is the
 * fix for the real bug where asset resolution was hardcoded to
 * country=UG&spatial_type=reserve.
 */
export type EoEvidenceTarget =
  | { kind: "name"; cfrName: string; country?: string; spatialType?: string }
  | { kind: "id"; entityId: string; aoiVersionId: string; name: string; country?: string }

type SensorLaneObservations = Partial<Record<SensorLane, EoObservation[]>>

function useResolvedAsset(target: EoEvidenceTarget | null, enabled: boolean) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [asset, setAsset] = React.useState<SpatialAsset | null>(null)

  const key = target
    ? target.kind === "id"
      ? `id:${target.entityId}:${target.aoiVersionId}`
      : `name:${target.country ?? "UG"}:${target.cfrName}`
    : ""

  React.useEffect(() => {
    if (!enabled || !target) return
    if (target.kind === "id") {
      setAsset({
        entity_id: target.entityId,
        name: target.name,
        aoi_id: "",
        aoi_version_id: target.aoiVersionId,
        world_id: "",
        eo_readiness: null,
        eo_scope: null,
        reported_area_ha: null,
        polygon_area_ha: 0,
        geometry_precision_description: null,
      })
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSpatialAsset(target.cfrName, target.country ?? "UG", target.spatialType ?? "reserve")
      .then((resolved) => {
        if (!cancelled) setAsset(resolved)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof CanonicalApiUnavailableError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to resolve canonical asset"
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return { loading, error, asset }
}

function useEoEvidence(target: EoEvidenceTarget | null, enabled: boolean) {
  const { loading: assetLoading, error: assetError, asset } = useResolvedAsset(target, enabled)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [byLane, setByLane] = React.useState<SensorLaneObservations | null>(null)

  React.useEffect(() => {
    if (!enabled || !asset) {
      if (!assetLoading && enabled) setByLane(asset === null ? {} : null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all(SENSOR_LANES.map((lane) => fetchEoObservations(asset.aoi_version_id, lane)))
      .then((results) => {
        if (cancelled) return
        const next: SensorLaneObservations = {}
        SENSOR_LANES.forEach((lane, i) => {
          next[lane] = results[i]
        })
        setByLane(next)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof CanonicalApiUnavailableError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load EO evidence"
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [asset, assetLoading, enabled])

  return {
    loading: assetLoading || loading,
    error: assetError ?? error,
    asset,
    byLane,
  }
}

function laneCompleteness(observations: EoObservation[] | undefined) {
  const succeeded = (observations ?? []).filter((o) => o.outcome === "success" || o.outcome === "partial")
  return succeeded.length
}

/** Compact content for the existing map popup -- real per-lane
 * completeness, never a single "Sentinel-2" status line regardless of
 * which sensor actually produced the most recent row.
 */
export function EoEvidenceSummary({
  target,
  onViewDetails,
}: {
  target: EoEvidenceTarget
  onViewDetails: () => void
}) {
  const { loading, error, asset, byLane } = useEoEvidence(target, true)
  const anyObservations = byLane ? SENSOR_LANES.some((lane) => (byLane[lane]?.length ?? 0) > 0) : false

  return (
    <div className="space-y-2 text-sm">
      {loading && <p className="text-xs text-muted-foreground">Loading EO coverage…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {asset === null && !loading && !error && (
        <p className="text-xs text-muted-foreground">No canonical AOI resolved for this forest yet.</p>
      )}
      {asset && byLane && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {SENSOR_LANES.map((lane) => (
              <div key={lane} className="rounded-md border p-1.5">
                <div className="text-[10px] uppercase text-muted-foreground">
                  {lane === "s2_optical" ? "Optical" : lane === "s1_ascending" ? "Radar ↑" : "Radar ↓"}
                </div>
                <div className="font-medium">{laneCompleteness(byLane[lane])}/12</div>
              </div>
            ))}
          </div>
          {!anyObservations && (
            <p className="text-xs text-muted-foreground">No EO observation processed yet.</p>
          )}
          <Button size="sm" variant="secondary" className="w-full" onClick={onViewDetails}>
            View EO evidence
          </Button>
        </>
      )}
    </div>
  )
}

function OpticalPanel({ observations }: { observations: EoObservation[] }) {
  const chartData = React.useMemo(
    () =>
      observations
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
  const latest = observations[0]
  if (observations.length === 0) {
    return <p className="text-sm text-muted-foreground">No Sentinel-2 observation processed yet.</p>
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["ndvi", "ndmi", "nbr"] as const).map((key) => {
          const feature = latest ? featureValue(latest, key) : undefined
          const meta = OPTICAL_FEATURE_META[key]
          return (
            <Card key={key}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium" style={{ color: meta.color }}>
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-3">
                <div className="text-2xl font-semibold">{feature?.value?.toFixed(3) ?? "–"}</div>
                <div className="text-xs text-muted-foreground">
                  spatial SD {feature?.standard_deviation?.toFixed(3) ?? "–"}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Derived optical observation -- mean and spatial standard deviation over the
        reserve's valid target cells. Not a forest-condition or forest-health claim.
      </p>
      {chartData.length > 1 ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="ndvi" name="NDVI" stroke={OPTICAL_FEATURE_META.ndvi.color} dot strokeWidth={2} />
              <Line type="monotone" dataKey="ndmi" name="NDMI" stroke={OPTICAL_FEATURE_META.ndmi.color} dot strokeWidth={2} />
              <Line type="monotone" dataKey="nbr" name="NBR" stroke={OPTICAL_FEATURE_META.nbr.color} dot strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only one monthly observation has been processed -- this is a single-point
          result, not a trend. Missing months are not interpolated.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {laneCompleteness(observations)}/12 months processed for this reserve so far.
      </p>
    </div>
  )
}

function RadarStreamPanel({ label, observations }: { label: string; observations: EoObservation[] }) {
  const chartData = React.useMemo(
    () =>
      observations
        .filter((o) => o.outcome === "success" || o.outcome === "partial")
        .slice()
        .reverse()
        .map((o) => ({
          month: o.window_start.slice(0, 7),
          s1_vv: featureValue(o, "s1_vv")?.value ?? null,
          s1_vh: featureValue(o, "s1_vh")?.value ?? null,
        })),
    [observations]
  )
  if (observations.length === 0) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <p className="text-sm text-muted-foreground">No observation processed yet.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <Badge variant="outline">{laneCompleteness(observations)}/12</Badge>
      </div>
      {chartData.length > 1 ? (
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="s1_vv" name="VV" stroke={RADAR_FEATURE_META.s1_vv.color} dot strokeWidth={2} />
              <Line type="monotone" dataKey="s1_vh" name="VH" stroke={RADAR_FEATURE_META.s1_vh.color} dot strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Single observation -- not a trend.</p>
      )}
    </div>
  )
}

function ChangePanel({ aoiVersionId }: { aoiVersionId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [evidence, setEvidence] = React.useState<ChangeEvidence | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchChangeEvidence(aoiVersionId)
      .then((result) => {
        if (!cancelled) setEvidence(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load change evidence")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [aoiVersionId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading change evidence…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!evidence || evidence.candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No noteworthy observation change under the current method, or insufficient history to
        evaluate one yet. This is not a claim the forest is unchanged.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {evidence.corroborations.map((c) => (
        <div key={c.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{CORROBORATION_STATE_LABELS[c.state]}</Badge>
            <span className="text-xs text-muted-foreground">
              {monthLabel(c.reference_window.start)} – {monthLabel(c.reference_window.end)}
            </span>
          </div>
          {c.state === "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Two viewing streams of the same radar instrument agree on timing -- this is not
              cross-sensor confirmation.
            </p>
          )}
        </div>
      ))}
      {evidence.candidates.map((candidate) => (
        <div key={candidate.id} className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={evidenceGradeBadgeVariant(candidate.evidence_grade)}>
              {candidate.evidence_grade ? EVIDENCE_GRADE_LABELS[candidate.evidence_grade] : "Ungraded"}
            </Badge>
            <Badge variant="outline">
              {candidate.sensor_stream === "s2_optical"
                ? SENSOR_LANE_LABELS.s2_optical
                : candidate.sensor_stream === "s1_ascending"
                  ? SENSOR_LANE_LABELS.s1_ascending
                  : candidate.sensor_stream === "s1_descending"
                    ? SENSOR_LANE_LABELS.s1_descending
                    : candidate.sensor_stream}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {candidate.features.join(", ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Candidate window {monthLabel(candidate.candidate_window.start)} –{" "}
            {monthLabel(candidate.candidate_window.end)}, algorithm {candidate.algorithm} v
            {candidate.algorithm_version}. Interpretation: observation change (cause unresolved).
          </p>
          {candidate.evidence_quality?.reasons?.length ? (
            <p className="text-xs text-muted-foreground">{candidate.evidence_quality.reasons.join("; ")}</p>
          ) : null}
          {candidate.confounders && Object.keys(candidate.confounders).length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Confounder noted -- interpret cautiously; see provenance for detail.
            </p>
          )}
          {candidate.spatial_evidence && (
            <p className="text-xs text-muted-foreground">
              Localized to {candidate.spatial_evidence.region_count} evidence region(s) within the
              AOI ({candidate.spatial_evidence.evidence_cell_count}/{candidate.spatial_evidence.cell_count_total} analytical
              cells).
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

/** Large right-side Observatory drawer: overview / optical / radar / change / provenance. */
export function EoEvidenceDetailSheet({
  target,
  open,
  onOpenChange,
}: {
  target: EoEvidenceTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { loading, error, asset, byLane } = useEoEvidence(target, open && !!target)
  const s2 = byLane?.s2_optical ?? []
  const s1a = byLane?.s1_ascending ?? []
  const s1d = byLane?.s1_descending ?? []
  const latestS2 = s2[0]
  const [detail, setDetail] = React.useState<EoObservationDetail | null>(null)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [provenanceOpen, setProvenanceOpen] = React.useState(false)
  const name = target ? (target.kind === "id" ? target.name : target.cfrName) : ""

  React.useEffect(() => {
    setDetail(null)
    setDetailError(null)
    if (!latestS2) return
    let cancelled = false
    fetchEoObservationDetail(latestS2.id)
      .then((row) => {
        if (!cancelled) setDetail(row)
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Failed to load EO provenance")
        }
      })
    return () => {
      cancelled = true
    }
  }, [latestS2])

  const anyObservations = s2.length > 0 || s1a.length > 0 || s1d.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-none sm:w-[clamp(480px,42vw,720px)]"
      >
        <SheetHeader className="border-b p-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Canonical forest</Badge>
            <Badge variant="outline">
              Optical {laneCompleteness(s2)}/12 · Radar ↑ {laneCompleteness(s1a)}/12 · Radar ↓{" "}
              {laneCompleteness(s1d)}/12
            </Badge>
          </div>
          <SheetTitle className="text-xl">{name}</SheetTitle>
          <SheetDescription>
            Real Sentinel-1/2 earth-observation evidence for this canonical asset -- not a
            forest-health, timber, or supply claim.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-6.5rem)]">
          <div className="space-y-6 p-4">
            {loading && <p className="text-sm text-muted-foreground">Loading EO evidence…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {asset === null && !loading && !error && (
              <p className="text-sm text-muted-foreground">
                No canonical AOI has resolved for this forest yet.
              </p>
            )}
            {!anyObservations && asset && !loading && (
              <p className="text-sm text-muted-foreground">
                No EO observation has been processed for this forest yet.
              </p>
            )}

            {asset && anyObservations && (
              <Tabs defaultValue="optical">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="optical">Optical</TabsTrigger>
                  <TabsTrigger value="radar">Radar</TabsTrigger>
                  <TabsTrigger value="change">Change</TabsTrigger>
                  <TabsTrigger value="provenance">Provenance</TabsTrigger>
                </TabsList>

                <TabsContent value="optical" className="pt-4">
                  <OpticalPanel observations={s2} />
                </TabsContent>

                <TabsContent value="radar" className="space-y-4 pt-4">
                  <RadarStreamPanel label="Ascending" observations={s1a} />
                  <Separator />
                  <RadarStreamPanel label="Descending" observations={s1d} />
                  {(s1a.length > 0 || s1d.length > 0) && (
                    <p className="text-xs text-muted-foreground">
                      Ascending and descending are separate viewing geometries and are never
                      merged into one radar line.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="change" className="pt-4">
                  <ChangePanel aoiVersionId={asset.aoi_version_id} />
                </TabsContent>

                <TabsContent value="provenance" className="pt-4">
                  <Collapsible open={provenanceOpen} onOpenChange={setProvenanceOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-sm font-semibold"
                      >
                        Provenance &amp; methods
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform ${provenanceOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 text-sm">
                      {detailError && <p className="text-xs text-destructive">{detailError}</p>}
                      <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-4">
                        <DetailRow label="Entity" value={asset.entity_id} mono />
                        <DetailRow label="AOI version" value={asset.aoi_version_id} mono />
                        <DetailRow
                          label="Latest optical outcome"
                          value={latestS2 ? EO_OUTCOME_LABELS[latestS2.outcome] : "–"}
                        />
                        <DetailRow
                          label="Statistics profile"
                          value={String(detail?.processing_run.configuration.statistics_profile ?? "–")}
                        />
                        <DetailRow
                          label="Source items retained"
                          value={detail ? String(detail.source_items.length) : "–"}
                        />
                        <DetailRow label="Geometry provenance" value="UNVERIFIED_REPOSITORY_DERIVED" />
                        <DetailRow label="EO readiness" value={asset.eo_readiness ?? "–"} />
                      </dl>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "truncate font-mono text-xs" : "text-sm"}>{value}</dd>
    </div>
  )
}
