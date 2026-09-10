"use client"

import * as React from "react"
import { Satellite } from "lucide-react"

import {
  DEFAULT_FOREST_EVIDENCE_LAYER_NAME,
  ForestEvidenceLayer,
} from "@/components/map/forest-evidence-layer"
import {
  EoEvidenceDetailSheet,
  type EoEvidenceTarget,
} from "@/components/eo/eo-evidence-panel"
import { Map, MapLayers, MapTileLayer, MapZoomControl } from "@/components/ui/map"
import {
  fetchCoverageSummary,
  SENSOR_LANE_LABELS,
  type CoverageSummaryEntry,
  type SensorLane,
} from "@/lib/canonical-api"
import { cn } from "@/lib/utils"

/** One shared national EO map, reused for every country -- per the
 * regional observatory brief's explicit instruction not to build
 * separate duplicated per-country pages. All country-specific behavior
 * comes from the `country` prop (ISO2), never from branching code.
 */
export type EoCountry = "UG" | "KE" | "TZ"

const COUNTRY_LABELS: Record<EoCountry, string> = {
  UG: "Uganda",
  KE: "Kenya",
  TZ: "Tanzania",
}

// Real national centers/zooms -- initial map framing only, not derived data.
const COUNTRY_VIEW: Record<EoCountry, { center: [number, number]; zoom: number }> = {
  UG: { center: [1.3, 32.3], zoom: 7 },
  KE: { center: [0.6, 37.9], zoom: 6 },
  TZ: { center: [-6.4, 34.9], zoom: 6 },
}

const SENSOR_LANES: SensorLane[] = ["s2_optical", "s1_ascending", "s1_descending"]

function summarizeCoverage(entries: CoverageSummaryEntry[]) {
  const totalAois = entries.length
  const perLane: Record<SensorLane, { withAnyMonth: number }> = {
    s2_optical: { withAnyMonth: 0 },
    s1_ascending: { withAnyMonth: 0 },
    s1_descending: { withAnyMonth: 0 },
  }
  for (const entry of entries) {
    for (const lane of SENSOR_LANES) {
      const laneCoverage = entry.lanes[lane]
      if (laneCoverage && laneCoverage.completed_months > 0) {
        perLane[lane].withAnyMonth += 1
      }
    }
  }
  return { totalAois, perLane }
}

interface NationalEoMapProps {
  country: EoCountry
}

export function NationalEoMap({ country }: NationalEoMapProps) {
  const [coverage, setCoverage] = React.useState<CoverageSummaryEntry[] | null>(null)
  const [coverageError, setCoverageError] = React.useState<string | null>(null)
  const [selectedEoEvidenceTarget, setSelectedEoEvidenceTarget] =
    React.useState<EoEvidenceTarget | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setCoverage(null)
    setCoverageError(null)
    fetchCoverageSummary(country)
      .then((entries) => {
        if (!cancelled) setCoverage(entries)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCoverageError(error instanceof Error ? error.message : "Failed to load EO coverage.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [country])

  const summary = React.useMemo(
    () => (coverage ? summarizeCoverage(coverage) : null),
    [coverage]
  )
  const view = COUNTRY_VIEW[country]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-none bg-cyan-50 text-cyan-800">
            <Satellite className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{COUNTRY_LABELS[country]} EO</h2>
            <p className="text-sm text-muted-foreground">
              Canonical Earth-observation coverage for the {COUNTRY_LABELS[country]} national
              estate. Click a forest polygon to view its evidence.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Mapped estate"
          value={summary ? summary.totalAois.toLocaleString() : coverageError ? "—" : "Loading…"}
          detail="Canonical AOIs in this country's frozen EO cohort"
        />
        {SENSOR_LANES.map((lane) => (
          <SummaryCard
            key={lane}
            label={SENSOR_LANE_LABELS[lane]}
            value={
              summary
                ? `${summary.perLane[lane].withAnyMonth.toLocaleString()} / ${summary.totalAois.toLocaleString()}`
                : coverageError
                  ? "—"
                  : "Loading…"
            }
            detail="AOIs with at least one processed month"
          />
        ))}
      </div>
      {coverageError ? (
        <p className="text-sm text-destructive">
          Could not load coverage summary: {coverageError}
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded-none border bg-background">
        <Map center={view.center} zoom={view.zoom} maxZoom={18} className="h-[680px] w-full rounded-none">
          <MapLayers defaultTileLayer="Default" defaultLayerGroups={[DEFAULT_FOREST_EVIDENCE_LAYER_NAME]}>
            <MapTileLayer name="Default" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ForestEvidenceLayer country={country} onViewEoEvidence={setSelectedEoEvidenceTarget} />
            <MapZoomControl position="top-3 left-3" />
          </MapLayers>
        </Map>
      </div>

      <EoEvidenceDetailSheet
        target={selectedEoEvidenceTarget}
        open={selectedEoEvidenceTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedEoEvidenceTarget(null)
        }}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  className,
}: {
  label: string
  value: string
  detail: string
  className?: string
}) {
  return (
    <div className={cn("rounded-none border bg-background p-3", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
