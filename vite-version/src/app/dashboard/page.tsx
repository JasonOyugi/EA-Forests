"use client"

import * as React from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import {
  ChartAreaInteractive,
  compactCurrency,
  compactNumber,
  generatePortfolioSeries,
  portfolioSeriesReferenceDate,
} from "./components/chart-area-interactive"
import { DataTable, groupPlantedSize, groupSize, initialAssetGroups, upcomingPayments } from "./components/data-table"
import { SectionCards } from "./components/section-cards"
import type { MetricKey } from "./components/chart-area-interactive"

export default function Page() {
  const chartRef = React.useRef<HTMLDivElement | null>(null)
  const tableRef = React.useRef<HTMLDivElement | null>(null)
  const [metric, setMetric] = React.useState<MetricKey>("portfolioValue")
  const [tableTab, setTableTab] = React.useState<"assets" | "transactions" | "activity-logs" | "documents">("assets")
  const [transactionsHighlightKey, setTransactionsHighlightKey] = React.useState(0)
  const series = React.useMemo(
    () => generatePortfolioSeries(portfolioSeriesReferenceDate),
    []
  )
  const totals = React.useMemo(() => {
    const plantedArea = initialAssetGroups.reduce((sum, group) => sum + groupPlantedSize(group), 0)
    const acquiredArea = initialAssetGroups.reduce((sum, group) => sum + groupSize(group), 0)
    return { plantedArea, acquiredArea }
  }, [])
  const pendingTotals = React.useMemo(() => {
    const amount = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0)
    return { amount, count: upcomingPayments.length }
  }, [])
  const plantedAreaLabel = totals.plantedArea.toFixed(2)
  const acquiredAreaLabel = totals.acquiredArea.toFixed(2)

  const getPoint = React.useCallback(
    (label: string) => series.find((point) => point.label === label),
    [series]
  )
  const getTrend = React.useCallback((currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return { isUp: currentValue >= 0, label: currentValue >= 0 ? "+0.0%" : "-0.0%" }
    }

    const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    const sign = delta >= 0 ? "+" : ""
    return {
      isUp: delta >= 0,
      label: `${sign}${delta.toFixed(2)}%`,
    }
  }, [])

  const portfolioPoint = getPoint("T1 2027") ?? series[series.length - 1]
  const portfolioCurrentTrendPoint = getPoint("T3 2026") ?? series[series.length - 1]
  const portfolioPreviousPoint = getPoint("T2 2026") ?? series[Math.max(series.length - 2, 0)]
  const portfolioTrend = getTrend(
    portfolioCurrentTrendPoint?.portfolioValue ?? 0,
    portfolioPreviousPoint?.portfolioValue ?? portfolioCurrentTrendPoint?.portfolioValue ?? 0
  )

  const landPoint = getPoint("T3 2026") ?? series[series.length - 1]
  const landPreviousPoint = getPoint("T2 2026") ?? series[Math.max(series.length - 2, 0)]
  const landTrend = getTrend(
    landPoint?.landManaged ?? 0,
    landPreviousPoint?.landManaged ?? landPoint?.landManaged ?? 0
  )
  const volumeTrend = getTrend(
    landPoint?.expectedVolume ?? 0,
    landPreviousPoint?.expectedVolume ?? landPoint?.expectedVolume ?? 0
  )

  const handleMetricCardClick = (nextMetric: MetricKey) => {
    setMetric(nextMetric)
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handlePaymentsCardClick = () => {
    setTableTab("transactions")
    setTransactionsHighlightKey((value) => value + 1)
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <BaseLayout title="Investor Dashboard" description="Welcome to your admin dashboard: see your portfolio's performance this season">
      <div className="@container/main px-4 lg:px-6 space-y-6">
        <SectionCards
          onMetricCardClick={handleMetricCardClick}
          onPaymentsCardClick={handlePaymentsCardClick}
          portfolioValue={compactCurrency(portfolioPoint?.portfolioValue ?? 0)}
          portfolioTrendLabel={portfolioTrend.label}
          portfolioTrendUp={portfolioTrend.isUp}
          portfolioSummary={`Estimated valuation of ${plantedAreaLabel} ha planted and ${acquiredAreaLabel} ha acquired`}
          landManaged={`${compactNumber(landPoint?.landManaged ?? 0)} ha`}
          landTrendLabel={landTrend.label}
          landTrendUp={landTrend.isUp}
          landSummary={`Managed footprint across Uganda, Kenya, and Tanzania`}
          estimatedVolume={`${compactNumber(landPoint?.expectedVolume ?? 0)} m3`}
          volumeTrendLabel={volumeTrend.label}
          volumeTrendUp={volumeTrend.isUp}
          volumeSummary={`Standing timber estimate at ${landPoint?.label ?? "current horizon"} across planted blocks`}
          pendingPayments={compactCurrency(pendingTotals.amount)}
          pendingInvoicesLabel={`${pendingTotals.count} invoices`}
          pendingSummary={`Scheduled contractor and operations payments awaiting release`}
        />
        <div ref={chartRef} id="portfolio-summary-chart">
          <ChartAreaInteractive metric={metric} onMetricChange={setMetric} />
        </div>
      </div>
      <div ref={tableRef} className="@container/main" id="dashboard-data-table">
        <DataTable
          activeTab={tableTab}
          onActiveTabChange={setTableTab}
          transactionsHighlightKey={transactionsHighlightKey}
        />
      </div>
    </BaseLayout>
  )
}
