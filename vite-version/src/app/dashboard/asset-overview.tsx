"use client"

import * as React from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ChartAreaInteractive } from "./components/chart-area-interactive"
import { DashboardAssetMap } from "./components/dashboard-asset-map"
import { createDashboardCalendarEvents } from "./components/dashboard-events"
import { DataTable } from "./components/data-table"
import { DashboardViewToggle } from "./components/dashboard-view-toggle"
import { SectionCards } from "./components/section-cards"
import { SpeciesAllocation } from "./components/species-allocation"
import { AssetCurrentBelief } from "./components/asset-current-belief"
import { initialAssetGroups } from "./data/forestry-data"
import type { MetricKey } from "./components/chart-area-interactive"
import type { CalendarEvent } from "@/app/calendar/types"

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
}
function fmtNum(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(v)
}

export default function Page() {
  const chartRef = React.useRef<HTMLDivElement | null>(null)
  const assetMapRef = React.useRef<HTMLDivElement | null>(null)
  const tableRef = React.useRef<HTMLDivElement | null>(null)
  const [metric, setMetric] = React.useState<MetricKey>("portfolioValue")
  const [tableTab, setTableTab] = React.useState<"assets" | "transactions" | "activity-logs" | "documents">("assets")
  const [transactionsHighlightKey] = React.useState(0)
  const [dashboardEvents, setDashboardEvents] = React.useState<CalendarEvent[]>(() => createDashboardCalendarEvents())
  const [selectedAssetMapId, setSelectedAssetMapId] = React.useState(initialAssetGroups[0]?.id ?? "")

  const selectedGroup = React.useMemo(
    () => initialAssetGroups.find((g) => g.id === selectedAssetMapId) ?? initialAssetGroups[0],
    [selectedAssetMapId]
  )
  const state = selectedGroup?.assetState

  const handleMetricCardClick = (nextMetric: MetricKey) => {
    setMetric(nextMetric)
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const handleAssetMapOpen = (groupId: string) => {
    setSelectedAssetMapId(groupId)
    assetMapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (!state) return null

  const v = state.volume_state
  const val = state.valuation_state
  const netbackP50 = val.netback_usd_per_m3.p50

  return (
    <BaseLayout title="Asset Intelligence" description="Real canonical assets, real EO evidence, real modelled state -- no fabricated forestry data">
      <div className="@container/main px-4 lg:px-6 space-y-6 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {initialAssetGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedAssetMapId(g.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${g.id === selectedGroup.id ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {g.block} <span className="opacity-60">· {g.country}</span>
              </button>
            ))}
          </div>
          <DashboardViewToggle />
        </div>

        <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">{selectedGroup.block}</strong> -- {selectedGroup.summaryDescription}
        </div>

        <SectionCards
          onForestAreaClick={() => handleMetricCardClick("landManaged")}
          onVolumeClick={() => handleMetricCardClick("expectedVolume")}
          onNetbackClick={() => handleMetricCardClick("expectedPrice")}
          onValueClick={() => handleMetricCardClick("portfolioValue")}
          forestArea={`${fmtNum(state.asset_identity.area_ha)} ha`}
          forestAreaSummary={`Real canonical AOI polygon area (${state.asset_identity.epistemic_status})`}
          standingVolume={`${fmtNum(v.merchantable_volume_m3.p50)} m3`}
          volumeRangeLabel="MODELLED, LOW ID."
          volumeSummary={`P10 ${fmtNum(v.merchantable_volume_m3.p10)} - P90 ${fmtNum(v.merchantable_volume_m3.p90)} m3 merchantable`}
          bestNetback={`${fmtUsd(netbackP50)}/m3`}
          netbackTrendUp={netbackP50 >= 0}
          netbackSummary={netbackP50 >= 0 ? "Scenario price covers harvest/haul/regulatory cost" : "Scenario price does NOT cover harvest/haul/regulatory cost at this distance -- see market state"}
          assetValue={`${fmtUsd(val.asset_value_usd.p50)}`}
          assetValueTrendUp={val.asset_value_usd.p50 >= 0}
          assetValueSummary={`P10 ${fmtUsd(val.asset_value_usd.p10)} - P90 ${fmtUsd(val.asset_value_usd.p90)} -- ${val.note}`}
        />

        <div ref={chartRef} id="portfolio-summary-chart">
          <ChartAreaInteractive metric={metric} onMetricChange={setMetric} />
        </div>

        <AssetCurrentBelief group={selectedGroup} />

        <SpeciesAllocation />

        <div ref={assetMapRef}>
          <DashboardAssetMap selectedGroupId={selectedAssetMapId} onSelectGroup={setSelectedAssetMapId} />
        </div>
      </div>
      <div ref={tableRef} className="@container/main px-4 lg:px-6" id="dashboard-data-table">
        <div className="pb-3">
          <h2 className="text-xl font-semibold tracking-tight">Asset records</h2>
        </div>
        <DataTable
          activeTab={tableTab}
          onActiveTabChange={setTableTab}
          transactionsHighlightKey={transactionsHighlightKey}
          events={dashboardEvents}
          onEventsChange={setDashboardEvents}
          onAssetMapOpen={handleAssetMapOpen}
        />
      </div>
    </BaseLayout>
  )
}
