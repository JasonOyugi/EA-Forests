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
  CanonicalApiUnavailableError,
  EO_OUTCOME_LABELS,
  type EoObservation,
  type EoObservationDetail,
  featureValue,
  fetchEoObservationDetail,
  fetchEoObservations,
  fetchSpatialAsset,
  type SpatialAsset,
} from "@/lib/canonical-api"

const FEATURE_META = {
  ndvi: { label: "Sentinel-2 NDVI", color: "#16a34a" },
  ndmi: { label: "Sentinel-2 NDMI", color: "#0891b2" },
  nbr: { label: "Sentinel-2 NBR", color: "#b45309" },
} as const

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

function outcomeBadgeVariant(outcome: EoObservation["outcome"]) {
  return outcome === "success" ? "outline" : outcome === "failed" ? "destructive" : "secondary"
}

function useEoEvidence(cfrName: string, enabled: boolean) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [asset, setAsset] = React.useState<SpatialAsset | null>(null)
  const [observations, setObservations] = React.useState<EoObservation[] | null>(null)

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const resolvedAsset = await fetchSpatialAsset(cfrName)
        if (cancelled) return
        setAsset(resolvedAsset)
        if (!resolvedAsset) {
          setObservations([])
          return
        }
        const rows = await fetchEoObservations(resolvedAsset.aoi_version_id)
        if (!cancelled) setObservations(rows)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof CanonicalApiUnavailableError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load EO evidence"
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cfrName, enabled])

  return { loading, error, asset, observations }
}

/** Compact content for the existing map popup. */
export function EoEvidenceSummary({
  cfrName,
  onViewDetails,
}: {
  cfrName: string
  onViewDetails: () => void
}) {
  const { loading, error, observations } = useEoEvidence(cfrName, true)
  const latest = observations?.[0]

  return (
    <div className="space-y-2 text-sm">
      {loading && <p className="text-xs text-muted-foreground">Loading Sentinel-2 status…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {observations && observations.length === 0 && (
        <p className="text-xs text-muted-foreground">No Sentinel-2 observation processed yet.</p>
      )}
      {latest && (
        <>
          <div className="flex items-center justify-between">
            <Badge variant={outcomeBadgeVariant(latest.outcome)}>
              Sentinel-2 · {EO_OUTCOME_LABELS[latest.outcome]}
            </Badge>
            <span className="text-xs text-muted-foreground">{monthLabel(latest.window_start)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Usable coverage{" "}
            {latest.usable_observation_fraction != null
              ? `${Math.round(latest.usable_observation_fraction * 100)}%`
              : "n/a"}
          </p>
          {latest.outcome !== "no_observation" && latest.outcome !== "failed" && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(["ndvi", "ndmi", "nbr"] as const).map((key) => (
                <div key={key} className="rounded-md border p-1.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{key}</div>
                  <div className="font-medium">{featureValue(latest, key)?.value?.toFixed(2) ?? "–"}</div>
                </div>
              ))}
            </div>
          )}
          <Button size="sm" variant="secondary" className="w-full" onClick={onViewDetails}>
            View EO evidence
          </Button>
        </>
      )}
    </div>
  )
}

/** Large right-side detail panel: header / overview / quality / time series / provenance. */
export function EoEvidenceDetailSheet({
  cfrName,
  open,
  onOpenChange,
}: {
  cfrName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { loading, error, asset, observations } = useEoEvidence(cfrName ?? "", open && !!cfrName)
  const latest = observations?.[0]
  const [detail, setDetail] = React.useState<EoObservationDetail | null>(null)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [provenanceOpen, setProvenanceOpen] = React.useState(false)

  React.useEffect(() => {
    setDetail(null)
    setDetailError(null)
    if (!latest) return
    let cancelled = false
    fetchEoObservationDetail(latest.id)
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
  }, [latest])

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
  const hasSeries = chartData.length > 1
  const lastAcquisition = React.useMemo(() => {
    if (!detail?.source_items.length) return null
    return detail.source_items
      .map((item) => item.sensing_start)
      .sort()
      .at(-1)
  }, [detail])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-none sm:w-[clamp(480px,42vw,720px)]"
      >
        <SheetHeader className="border-b p-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Central Forest Reserve</Badge>
            {latest && (
              <Badge variant={outcomeBadgeVariant(latest.outcome)}>
                Sentinel-2 · {EO_OUTCOME_LABELS[latest.outcome]}
              </Badge>
            )}
            <Badge variant="outline">Geometry: unverified, repository-derived</Badge>
          </div>
          <SheetTitle className="text-xl">{cfrName}</SheetTitle>
          <SheetDescription>
            {latest
              ? `Observation period ${monthLabel(latest.window_start)}. Derived from Sentinel-2 surface reflectance -- not a forest-health, timber, or supply claim.`
              : "Sentinel-2 EO evidence for this canonical reserve."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-6.5rem)]">
          <div className="space-y-6 p-4">
            {loading && <p className="text-sm text-muted-foreground">Loading EO evidence…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {asset === null && !loading && !error && (
              <p className="text-sm text-muted-foreground">
                No canonical AOI has resolved for this reserve yet.
              </p>
            )}
            {observations && observations.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No Sentinel-2 observation has been processed for this reserve yet.
              </p>
            )}

            {latest && (
              <>
                {/* Overview */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Overview</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["ndvi", "ndmi", "nbr"] as const).map((key) => {
                      const feature = featureValue(latest, key)
                      const meta = FEATURE_META[key]
                      return (
                        <Card key={key}>
                          <CardHeader className="pb-1">
                            <CardTitle className="text-xs font-medium" style={{ color: meta.color }}>
                              {meta.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1 pb-3">
                            <div className="text-2xl font-semibold">
                              {feature?.value?.toFixed(3) ?? "–"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              spatial SD {feature?.standard_deviation?.toFixed(3) ?? "–"}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mean and spatial standard deviation over the reserve's valid target cells.
                    Spatial SD describes within-reserve variability, not measurement uncertainty.
                  </p>
                </section>

                <Separator />

                {/* Quality / support */}
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Quality &amp; support</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <DetailRow
                      label="Usable coverage"
                      value={
                        latest.usable_observation_fraction != null
                          ? `${Math.round(latest.usable_observation_fraction * 100)}%`
                          : "n/a"
                      }
                    />
                    <DetailRow
                      label="Eligible acquisitions"
                      value={`${latest.eligible_acquisition_count} / ${latest.acquisition_count}`}
                    />
                    <DetailRow label="QA profile" value={latest.applied_qa_profile} />
                    <DetailRow
                      label="Last acquisition"
                      value={lastAcquisition ? new Date(lastAcquisition).toLocaleDateString() : "–"}
                    />
                  </dl>
                </section>

                <Separator />

                {/* Time series */}
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Monthly history</h3>
                  {hasSeries ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} width={32} />
                          <Tooltip />
                          <Line type="monotone" dataKey="ndvi" name="NDVI" stroke={FEATURE_META.ndvi.color} dot strokeWidth={2} />
                          <Line type="monotone" dataKey="ndmi" name="NDMI" stroke={FEATURE_META.ndmi.color} dot strokeWidth={2} />
                          <Line type="monotone" dataKey="nbr" name="NBR" stroke={FEATURE_META.nbr.color} dot strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Only one monthly observation ({monthLabel(latest.window_start)}) has been
                      processed for this reserve. Additional monthly history has not yet been
                      processed -- this is a single-point result, not a trend.
                    </p>
                  )}
                </section>

                <Separator />

                {/* Provenance / methods */}
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
                      <DetailRow label="AOI version" value={asset?.aoi_version_id ?? "–"} mono />
                      <DetailRow label="Sentinel collection" value="COPERNICUS/S2_SR_HARMONIZED" />
                      <DetailRow label="QA profile" value={latest.applied_qa_profile} />
                      <DetailRow
                        label="Statistics profile"
                        value={String(detail?.processing_run.configuration.statistics_profile ?? "–")}
                      />
                      <DetailRow
                        label="Exact observation period"
                        value={`${latest.window_start.slice(0, 10)} – ${latest.window_end.slice(0, 10)}`}
                      />
                      <DetailRow
                        label="Source items retained"
                        value={detail ? String(detail.source_items.length) : "–"}
                      />
                      <DetailRow label="Geometry provenance" value="UNVERIFIED_REPOSITORY_DERIVED" />
                      <DetailRow label="EO readiness" value={asset?.eo_readiness ?? "–"} />
                    </dl>
                  </CollapsibleContent>
                </Collapsible>
              </>
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
