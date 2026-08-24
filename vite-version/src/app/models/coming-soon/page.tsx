"use client"

import * as React from "react"
import { useParams, Navigate, Link } from "react-router-dom"
import { ArrowLeft, Hourglass, type LucideIcon, LineChart, Dna, Trophy } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ComingSoonModelConfig {
  title: string
  category: "Genetic" | "Commercial" | "Economic"
  description: string
  /** ISO date string the model is expected to ship. */
  expectedAt: string
  icon: LucideIcon
}

const comingSoonModels: Record<string, ComingSoonModelConfig> = {
  "pine-seed-orchard": {
    title: "Pine seed orchard model",
    category: "Genetic",
    description:
      "Seed-orchard establishment cost, rogueing schedule, seed-yield ramp, and genetic-gain-adjusted cashflow for pine improvement programmes.",
    expectedAt: "2026-11-30",
    icon: Dna,
  },
  "ea-genetics-power-rankings": {
    title: "EA genetics power rankings",
    category: "Genetic",
    description:
      "A standing leaderboard ranking commercially available clones and seed sources across East Africa on growth, form, and disease-tolerance trial data.",
    expectedAt: "2027-02-28",
    icon: Trophy,
  },
  "macro-economic-outlook": {
    title: "East Africa forestry macro-economic model",
    category: "Economic",
    description:
      "Region-wide supply/demand, price, and land-use projections for the East African forestry sector, built on trade, FX, and land-cost data.",
    expectedAt: "2027-05-31",
    icon: LineChart,
  },
}

function useCountdown(targetIso: string) {
  const target = React.useMemo(() => new Date(targetIso).getTime(), [targetIso])
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const remaining = Math.max(0, target - now)
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)

  return { days, hours, minutes, seconds, isDone: remaining <= 0 }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-center rounded-2xl border border-border/70 bg-background/75 px-3 py-4">
      <span className="text-3xl font-semibold tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{label}</span>
    </div>
  )
}

export default function ModelComingSoonPage() {
  const { modelSlug } = useParams()
  const config = modelSlug ? comingSoonModels[modelSlug] : undefined

  if (!config) return <Navigate to="/errors/not-found" replace />

  const { days, hours, minutes, seconds, isDone } = useCountdown(config.expectedAt)
  const expectedLabel = new Date(config.expectedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })

  return (
    <BaseLayout title={config.title} description={config.description}>
      <div className="@container/main px-4 lg:px-6">
        <Link to="/models" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground hover:text-emerald-700">
          <ArrowLeft className="size-4" /> Back to models
        </Link>

        <Card className="mt-4 border-border/70 bg-background/75">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <config.icon className="h-5 w-5" />
              </div>
              <Badge variant="outline">{config.category}</Badge>
            </div>
            <CardTitle className="pt-2 text-2xl">{config.title}</CardTitle>
            <CardDescription className="max-w-2xl text-base">{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-6 rounded-2xl border border-dashed border-emerald-700/40 bg-emerald-50/50 p-6 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.14em] text-emerald-700">
                <Hourglass className="size-4" />
                {isDone ? "Launching imminently" : "In development"}
              </div>

              {isDone ? (
                <p className="text-sm text-muted-foreground">This model has reached its target date and is being finalised for release.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <CountdownUnit value={days} label="Days" />
                  <CountdownUnit value={hours} label="Hours" />
                  <CountdownUnit value={minutes} label="Minutes" />
                  <CountdownUnit value={seconds} label="Seconds" />
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Expected completion: <span className="font-semibold text-foreground">{expectedLabel}</span>. Dates are estimates and may move as data partnerships close.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
