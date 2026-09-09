"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, Sector, XAxis, YAxis } from "recharts"
import { CalendarDays, Factory, TrendingDown, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar as FullCalendar } from "@/app/calendar/components/calendar"
import type { CalendarEvent } from "@/app/calendar/types"
import { SupplyContext, useSupply, readContext, writeContext } from "./supply/context"
import { supplyPreview } from "./supply/preview"
import { deriveSupply, selectedTonnes } from "./supply/selectors"
import { createSupplyOperations, paymentSummary } from "./supply/operations"
import { SupplyMap } from "./supply/supply-map"
import { OpportunityRail } from "./supply/opportunity-rail"
import { DashboardViewToggle } from "./components/dashboard-view-toggle"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { MetricCardDecoration } from "@/app/landing/components/metric-card-decoration"
import { dashboardFrameClass, dashboardSurfaceClass } from "./components/dashboard-shared"
import "./supply/supply.css"

function fmt(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}
function fmtUgx(value: number) {
  return `UGX ${fmt(value / 1000000, 1)}m`
}
function volumeM3(tonnes: number) {
  return tonnes / 0.62
}

type CardSpec = { title: string; value: string; trend: string; up: boolean; summary: string; icon: LucideIcon; onClick: () => void; tone: string; accent: string }
function ProcessorSectionCards({ cards }: { cards: CardSpec[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map((card) => {
      const Trend = card.up ? TrendingUp : TrendingDown
      return <BentoTilt className="h-full" key={card.title}>
        <Card className={`@container/card relative h-full cursor-pointer overflow-hidden shadow-xs investor-card ${card.tone}`} onClick={card.onClick}>
          <MetricCardDecoration accent={card.accent} />
          <CardHeader className="relative z-10">
            <CardDescription className="font-bold text-foreground">{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{card.value}</CardTitle>
            <CardAction><Badge variant="outline" className="animate-pulse bg-gray"><Trend />{card.trend}</Badge></CardAction>
          </CardHeader>
          <CardFooter className="relative z-10 flex-col items-start gap-1.5 text-sm"><div className="line-clamp-2 flex gap-2 font-medium">{card.summary}<card.icon className="size-5" /></div></CardFooter>
        </Card>
      </BentoTilt>
    })}
  </div>
}

function SupplySummary() {
  const { context, analysis, update } = useSupply()
  const chartData = analysis.quarters.map((quarter) => ({
    label: quarter.key.replace("-", " "),
    G1: volumeM3(quarter.grades.G1),
    G2: volumeM3(quarter.grades.G2),
    G3: volumeM3(quarter.grades.G3),
    requirement: quarter.requirement === null ? null : volumeM3(quarter.requirement),
  }))
  const gradeLabel = context.grade === "all" ? "All grades" : context.grade.toUpperCase()
  return <div className="chart-card-running-boundary rounded-xl p-[1.5px]">
    <Card className={`${dashboardSurfaceClass} @container/card`}>
      <CardHeader>
        <div><CardTitle>Supply Summary</CardTitle><CardDescription>Expected recoverable supply by quarter from the synthetic processor scenario. <Badge variant="outline" className="ml-2">{context.radiusKm} km · {gradeLabel}</Badge></CardDescription></div>
        <CardAction className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Radius</span>{([25, 50, 100] as const).map((radius) => <Button key={radius} size="sm" variant={context.radiusKm === radius ? "default" : "outline"} onClick={() => update({ radiusKm: radius })}>{radius} km</Button>)}</div>
          <Select value={context.grade} onValueChange={(value) => update({ grade: value as typeof context.grade })}><SelectTrigger size="sm" className="w-[110px]"><SelectValue placeholder="Grade" /></SelectTrigger><SelectContent><SelectItem value="all">All grades</SelectItem><SelectItem value="G1">G1</SelectItem><SelectItem value="G2">G2</SelectItem><SelectItem value="G3">G3</SelectItem></SelectContent></Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6"><ChartContainer config={{ G1: { label: "G1", color: "#236650" }, G2: { label: "G2", color: "#74a58a" }, G3: { label: "G3", color: "#bbceab" }, requirement: { label: "Required", color: "#89582f" } }} className="aspect-auto h-[250px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-foreground">
        <BarChart data={chartData} margin={{ left: 8, right: 8 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${fmt(Number(value) / 1000, 1)}k`} /><ChartTooltip cursor={{ fill: "rgba(0, 0, 0, 0.1)" }} content={<ChartTooltipContent indicator="line" />} /><Bar dataKey="G1" stackId="supply" fill="#236650" radius={0} barSize={32} /><Bar dataKey="G2" stackId="supply" fill="#74a58a" radius={0} barSize={32} /><Bar dataKey="G3" stackId="supply" fill="#bbceab" radius={0} barSize={32} /></BarChart>
      </ChartContainer></CardContent>
    </Card>
  </div>
}

function SupplyComposition() {
  const { context, analysis } = useSupply()
  const values = context.grade === "all" ? analysis.totals : { G1: context.grade === "G1" ? analysis.totals.G1 : 0, G2: context.grade === "G2" ? analysis.totals.G2 : 0, G3: context.grade === "G3" ? analysis.totals.G3 : 0, unclassified: 0 }
  const data = (["G1", "G2", "G3"] as const).map((grade, index) => ({ grade, amount: values[grade], fill: ["#236650", "#74a58a", "#bbceab"][index] })).filter((item) => item.amount > 0)
  const [active, setActive] = React.useState(data[0]?.grade ?? "G1")
  const activeIndex = Math.max(0, data.findIndex((item) => item.grade === active))
  const activeItem = data[activeIndex] ?? data[0]
  if (!activeItem) return null
  return <div className={dashboardFrameClass} style={{ ["--chart-accent" as string]: activeItem.fill }}><Card className={dashboardSurfaceClass}><CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle>Supply Composition</CardTitle><CardDescription>Expected recoverable supply by processor grade within the selected radius</CardDescription></div><Badge variant="outline">SCENARIO / PREVIEW</Badge></CardHeader><CardContent className="pb-6"><div className="rounded-[28px] bg-gradient-to-br from-background via-background to-muted/30 p-5"><div className="mb-4 text-center"><div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Expected supply</div><div className="mt-2 text-3xl font-semibold">{fmt(volumeM3(analysis.expected), 0)} m3</div></div><div className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-[24px]" style={{ background: "radial-gradient(circle at center, color-mix(in oklch, var(--chart-accent) 10%, transparent), transparent 50%)" }}><ChartContainer config={{ amount: { label: "m3", color: "var(--muted-foreground)" }, ...Object.fromEntries(data.map((item) => [item.grade, { label: item.grade, color: item.fill }])) }} className="mx-auto h-[420px] w-full max-w-[560px]"><PieChart><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Pie data={data} dataKey="amount" nameKey="grade" innerRadius={106} outerRadius={174} stroke="var(--background)" strokeWidth={3} shape={(props) => { const item = props.payload as typeof data[number]; const radius = (props.outerRadius ?? 0) + (item.grade === active ? 10 : 0); return <g><Sector {...props} outerRadius={radius} fill={item.fill} stroke="var(--background)" strokeWidth={item.grade === active ? 5 : 3} /></g> }} onMouseEnter={(_, index) => setActive(data[index].grade)}><Label content={({ viewBox }) => viewBox && "cx" in viewBox && "cy" in viewBox ? <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle"><tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 14} className="fill-foreground text-5xl font-semibold">{fmt(volumeM3(activeItem.amount), 0)} m3</tspan><tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-[11px] uppercase tracking-[0.24em]">expected supply</tspan><tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 44} className="text-sm font-medium" fill={activeItem.fill}>{activeItem.grade}</tspan></text> : null} /></Pie></PieChart></ChartContainer></div></div></CardContent></Card></div>
}

function SupplyTable({ events, onEventsChange }: { events: CalendarEvent[]; onEventsChange: (events: CalendarEvent[]) => void }) {
  const { analysis, context } = useSupply()
  const [tab, setTab] = React.useState("supply")
  const eventDates = events.map((event) => ({ date: event.date, count: 1 }))
  return <Tabs value={tab} onValueChange={setTab} className="w-full flex-col justify-start gap-6"><div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6"><TabsList><TabsTrigger value="supply">Supply</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="activity-logs">Activity logs</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList></div><TabsContent value="supply" className="px-4 lg:px-6"><div className="overflow-x-auto rounded-lg border"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Supply region</TableHead><TableHead>Species</TableHead><TableHead>Location</TableHead><TableHead>Contractor</TableHead><TableHead>Availability</TableHead><TableHead>Expected volume (m3)</TableHead><TableHead>G1 %</TableHead><TableHead>Modelled asset price</TableHead><TableHead>Gross stumpage value</TableHead></TableRow></TableHeader><TableBody>{analysis.selected.map((lot) => { const tonnes = selectedTonnes(lot, context.grade); const total = lot.gradeTonnes.value ? lot.gradeTonnes.value.G1 + lot.gradeTonnes.value.G2 + lot.gradeTonnes.value.G3 : 0; const price = lot.deliveredCostUgxPerT.value === null ? null : Math.round(lot.deliveredCostUgxPerT.value * 0.1); return <TableRow key={lot.id}><TableCell className="font-medium">{lot.name}<div className="text-xs text-muted-foreground">{lot.id} · SCENARIO</div></TableCell><TableCell>{lot.species}</TableCell><TableCell>{lot.position[0].toFixed(2)}, {lot.position[1].toFixed(2)}</TableCell><TableCell>Example contractor</TableCell><TableCell>{lot.availability.planningDate}</TableCell><TableCell>{fmt(volumeM3(tonnes), 0)}</TableCell><TableCell>{total ? `${fmt((lot.gradeTonnes.value?.G1 ?? 0) / total * 100, 0)}%` : "-"}</TableCell><TableCell>{price === null ? "Pending model" : `${fmt(price)} UGX/m3`} <Badge variant="outline" className="ml-1">SCENARIO</Badge></TableCell><TableCell>{price === null ? "-" : fmtUgx(price * volumeM3(tonnes))}</TableCell></TableRow> })}</TableBody></Table></div></TabsContent><TabsContent value="transactions" className="px-4 lg:px-6"><div className="rounded-lg border p-6 text-sm text-muted-foreground">{events.filter((event) => event.type === "payment").length} synthetic payment obligations are linked to the processor preview.</div></TabsContent><TabsContent value="activity-logs" className="px-4 lg:px-6"><div className="rounded-lg border p-6 text-sm text-muted-foreground">Supply verification, mobilisation, and intake activities are synthetic planning events.</div></TabsContent><TabsContent value="documents" className="px-4 lg:px-6"><div className="rounded-lg border p-6 text-sm text-muted-foreground">No observed processor documents are connected to this preview.</div></TabsContent><div className="mt-6 grid gap-4 px-4 lg:px-6"><div className="flex items-center gap-2 p-4"><CalendarDays className="h-5 w-5 text-emerald-700" /><button type="button" onClick={() => undefined} className="font-semibold text-xl">Calendar</button></div><FullCalendar events={events} eventDates={eventDates} onEventsChange={onEventsChange} /></div></Tabs>
}

export default function ProcessorOverview() {
  const [params, setParams] = React.useState(() => new URLSearchParams(window.location.search))
  const [events, setEvents] = React.useState<CalendarEvent[]>(() => createSupplyOperations(supplyPreview).map((operation) => operation.event))
  const context = React.useMemo(() => readContext(params, supplyPreview), [params])
  const analysis = React.useMemo(() => deriveSupply(supplyPreview, context), [context])
  const operations = React.useMemo(() => createSupplyOperations(supplyPreview), [])
  const payments = paymentSummary(operations, context.asOf)
  const update = (patch: Parameters<typeof writeContext>[1]) => setParams((current) => writeContext(current, patch))
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  const cardTone = "bg-emerald-400 investor-card-emerald"
  const cards: CardSpec[] = [
    { title: "Expected Supply", value: `${fmt(volumeM3(analysis.expected))} m3`, trend: `${analysis.selected.length} regions`, up: true, summary: `Within ${context.radiusKm} km · ${context.grade === "all" ? "all grades" : context.grade}`, icon: Factory, onClick: () => scrollTo("supply-summary"), tone: cardTone, accent: "#34d399" },
    { title: "Potential Procurable Supply", value: `${fmt(volumeM3(analysis.potentialTonnes))} m3`, trend: `${analysis.potential.length} candidates`, up: true, summary: "Available for procurement review", icon: TrendingUp, onClick: () => scrollTo("dashboard-data-table"), tone: cardTone, accent: "#34d399" },
    { title: "Factory Utilisation", value: `${fmt(supplyPreview.processor.utilisation.percent.value ?? 0)}%`, trend: "Q2 2026", up: true, summary: "Effective quarterly processor capacity", icon: Factory, onClick: () => scrollTo("supply-summary"), tone: cardTone, accent: "#34d399" },
    { title: "Payments Pending", value: fmtUgx(payments.total), trend: `${payments.outstanding.length} obligations`, up: false, summary: "Synthetic contractor and procurement obligations", icon: Wallet, onClick: () => scrollTo("dashboard-data-table"), tone: "bg-lime-200 dark:bg-yellow-300 investor-card-lime", accent: "#bef264" },
  ]
  return <BaseLayout title="Processor Intelligence Preview" description="Illustrative processor and supply dashboard scenario"><SupplyContext.Provider value={{ data: supplyPreview, context, analysis, update }}><div className="@container/main mt-2 space-y-6 px-4 lg:px-6"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Processor perspective · SCENARIO / PREVIEW</span><DashboardViewToggle /></div><ProcessorSectionCards cards={cards} /><div id="supply-summary"><SupplySummary /></div><SupplyComposition /><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_326px]" id="supply-map"><div className={`${dashboardFrameClass} overflow-hidden`}><Card className={dashboardSurfaceClass}><CardHeader><CardTitle className="flex items-center gap-2"><Factory className="size-5" /> Supply Map</CardTitle><CardDescription>Illustrative supply regions around the simulated processor · {context.radiusKm} km sourcing radius</CardDescription></CardHeader><CardContent className="p-0"><div className="h-[534px]"><SupplyMap /></div></CardContent></Card></div><div className="min-h-[534px] overflow-hidden rounded-xl border"><OpportunityRail onEvent={() => undefined} /></div></div></div><div className="@container/main px-4 lg:px-6" id="dashboard-data-table"><div className="pb-3"><h2 className="text-xl font-semibold tracking-tight">Activity table</h2></div><SupplyTable events={events} onEventsChange={setEvents} /></div></SupplyContext.Provider></BaseLayout>
}
