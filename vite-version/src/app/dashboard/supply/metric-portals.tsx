import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, ChevronDown, TrendingDown, TrendingUp, Wallet, X, type LucideIcon } from "lucide-react"
import type { CalendarEvent } from "@/app/calendar/types"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { MetricCardDecoration } from "@/app/landing/components/metric-card-decoration"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSupply } from "./context"
import { grades, number, quarterLabel, shortDate } from "./selectors"
import { paymentSummary, type SupplyOperation } from "./operations"

export type MetricPortal = "expected" | "potential" | "utilisation" | "payments"
interface Props {
  expanded: MetricPortal | null
  onExpand: (portal: MetricPortal | null) => void
  operations: SupplyOperation[]
  onEvent: (event: CalendarEvent) => void
}

type SupplySummaryCardProps = {
  portal: MetricPortal
  title: string
  value: ReactNode
  valueTestId?: string
  badgeLabel: string
  badgeIcon: LucideIcon
  summary: string
  summaryIcon: LucideIcon
  footLabel: string
  footAction: string
  toneClassName: string
  decorationAccent: string
  expanded: boolean
  onToggle: (portal: MetricPortal) => void
  children?: ReactNode
}

/** Headline metric card shared with the Asset Intelligence SectionCards design. */
function SupplySummaryCard({
  portal,
  title,
  value,
  valueTestId,
  badgeLabel,
  badgeIcon: BadgeIcon,
  summary,
  summaryIcon: SummaryIcon,
  footLabel,
  footAction,
  toneClassName,
  decorationAccent,
  expanded,
  onToggle,
  children,
}: SupplySummaryCardProps) {
  const toggle = () => onToggle(portal)
  return (
    <BentoTilt className="h-full">
      <Card
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls="supply-metric-detail"
        onClick={toggle}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            toggle()
          }
        }}
        className={`@container/card relative overflow-hidden h-full cursor-pointer shadow-xs investor-card ${toneClassName} ${expanded ? "si-card-open" : ""}`}
      >
        <MetricCardDecoration accent={decorationAccent} />
        <CardHeader className="relative z-10">
          <CardDescription className="font-bold text-foreground">
            {title}
          </CardDescription>
          <CardTitle data-testid={valueTestId} className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="animate-pulse bg-gray">
              <BadgeIcon />
              {badgeLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="relative z-10 flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-2 flex gap-2 font-medium">
            {summary}
            <SummaryIcon className="size-5" />
          </div>
          <div className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{footLabel}</span>
            <span className="inline-flex items-center gap-1">{footAction} <ChevronDown className="size-3.5" /></span>
          </div>
          {children}
        </CardFooter>
      </Card>
    </BentoTilt>
  )
}

export function MetricPortals({ expanded, onExpand, operations, onEvent }: Props) {
  const { data, context, analysis, update } = useSupply()
  const payments = paymentSummary(operations, context.asOf)
  const utilisation = data.processor.utilisation
  const toggle = (portal: MetricPortal) => onExpand(expanded === portal ? null : portal)
  const selectedPeriod = context.quarter ? quarterLabel(context.quarter) : context.horizonMonths === 0 ? "At snapshot date" : `Next ${context.horizonMonths === 60 ? "5 years" : `${context.horizonMonths} months`}`
  return <>
    <section aria-label="Supply analytical controls" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SupplySummaryCard
        portal="expected"
        title="Expected Supply"
        value={<>{number(analysis.expected)} t</>}
        valueTestId="expected-tonnes"
        badgeLabel={analysis.nextDate ? `Next ${shortDate(analysis.nextDate)}` : "No dated supply"}
        badgeIcon={TrendingUp}
        summary={`${selectedPeriod} · ${context.grade === "all" ? "compatible grades" : context.grade}`}
        summaryIcon={TrendingUp}
        footLabel={`Preview forecast${analysis.missingQuantityCount > 0 ? " · partial" : ""}`}
        footAction="Explore grades"
        toneClassName="bg-emerald-400 investor-card-emerald"
        decorationAccent="#34d399"
        expanded={expanded === "expected"}
        onToggle={toggle}
      />
      <SupplySummaryCard
        portal="potential"
        title="Potential Procurable Supply"
        value={<>{number(analysis.potentialTonnes)} t</>}
        valueTestId="potential-tonnes"
        badgeLabel={`${context.radiusKm} km catchment`}
        badgeIcon={TrendingUp}
        summary="Uncommitted · assumed feasible"
        summaryIcon={TrendingUp}
        footLabel="Candidate supply"
        footAction="Review catchment"
        toneClassName="bg-emerald-400 investor-card-emerald"
        decorationAccent="#34d399"
        expanded={expanded === "potential"}
        onToggle={toggle}
      >
        <div
          className="si-radius-row"
          role="group"
          aria-label="Sourcing radius"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
        >
          {([25, 50, 100] as const).map(radius => <button key={radius} aria-pressed={context.radiusKm === radius} onClick={() => update({ radiusKm: radius })}>{radius} km</button>)}
          <span>Preview</span>
        </div>
      </SupplySummaryCard>
      <SupplySummaryCard
        portal="utilisation"
        title="Factory Utilisation"
        value={<>{utilisation.percent.value ?? "—"}%</>}
        badgeLabel={`${utilisation.quarter} snapshot`}
        badgeIcon={TrendingDown}
        summary="Effective input capacity basis"
        summaryIcon={TrendingDown}
        footLabel="Preview record"
        footAction="Inspect capacity"
        toneClassName="bg-rose-400 investor-card-rose"
        decorationAccent="#fb7185"
        expanded={expanded === "utilisation"}
        onToggle={toggle}
      />
      <SupplySummaryCard
        portal="payments"
        title="Payments Pending"
        value={<>UGX {(payments.total / 1e6).toFixed(1)}m</>}
        badgeLabel={`${payments.outstanding.length} obligations`}
        badgeIcon={Wallet}
        summary={`As of ${shortDate(context.asOf)} 2026 · UGX ${(payments.overdue / 1e6).toFixed(1)}m overdue`}
        summaryIcon={Wallet}
        footLabel="Preview obligations"
        footAction="Review due dates"
        toneClassName="bg-lime-200 dark:bg-yellow-300 investor-card-lime"
        decorationAccent="#bef264"
        expanded={expanded === "payments"}
        onToggle={toggle}
      />
    </section>
    {expanded && <section id="supply-metric-detail" className="si-portal" aria-label={`${expanded} detail`}>
      <button className="si-icon-button si-portal-close" aria-label="Close metric detail" onClick={() => onExpand(null)}><X size={18} /></button>
      {expanded === "expected" && <div className="si-grade-disclosure">
        <div><span className="si-eyebrow">Supply composition</span><h2>Find the wood your line needs.</h2><p>Grades filter the map, quarterly outlook and procurement candidates.</p><p className="si-small">{number(analysis.totals.unclassified)} t unclassified is excluded from compatible supply. Grade yields are illustrative, with no calibrated uncertainty interval.</p></div>
        <div className="si-grade-wheel" role="img" aria-label={`Preview grade mix: ${grades.map(grade => `${grade} ${number(analysis.totals[grade])} tonnes`).join(", ")}`} style={{ background: gradeGradient(analysis.totals) }}><div><strong>{number(analysis.expected)}</strong><span>compatible tonnes</span></div></div>
        <div className="si-grade-controls" role="group" aria-label="Grade filter">
          <button aria-pressed={context.grade === "all"} onClick={() => update({ grade: "all" })}>All compatible grades <strong>{number(analysis.totals.G1 + analysis.totals.G2 + analysis.totals.G3)} t</strong></button>
          {grades.map(grade => <button key={grade} aria-pressed={context.grade === grade} onClick={() => update({ grade: context.grade === grade ? "all" : grade })}><span><i className={`si-swatch si-${grade}`} />{grade === "unclassified" ? "Unclassified" : grade}</span><strong>{number(analysis.totals[grade])} t</strong></button>)}
          <span className="si-small">{number(analysis.verifiedTonnes)} t field-verified · all displayed tonnage is preview.</span>
        </div>
      </div>}
      {expanded === "potential" && <div className="si-portal-columns">
        <div><span className="si-eyebrow">Sourcing market</span><h2>{number(analysis.potentialTonnes)} t to investigate.</h2><p>{analysis.potential.length} uncommitted candidates pass the demonstration availability and access assumptions within {context.radiusKm} km.</p><p>Contracted, scheduled and delivered tonnes are excluded. Candidate supply is not a purchase commitment.</p></div>
        <div><h3>What defines this catchment?</h3><p>Great-circle distance from the example processor point. The 50 km starting radius is a preview default; no configured economic sourcing radius is available.</p><p>Road distance, truck access, landholder willingness and acceptable terms need verification.</p>{analysis.costRange && <p><strong>UGX {number(analysis.costRange[0])}–{number(analysis.costRange[1])}/t</strong><br />Illustrative delivered-cost range for costed candidates.</p>}</div>
      </div>}
      {expanded === "utilisation" && <div className="si-portal-columns">
        <div><span className="si-eyebrow">Capacity review · preview only</span><h2>43% of effective capacity unused.</h2><p>{number(utilisation.effectiveCapacityTonnesPerQuarter.value ?? 0)} t/quarter assumed effective capacity; 2,580 t of implied unused capacity in Q2 2026. Installed capacity is missing.</p><p>This does not prove a wood shortage: downtime, demand and line constraints are unresolved.</p><button className="si-text-button" onClick={() => { update({ horizonMonths: 12, quarter: null, grade: "all", pipelineStage: "all" }); onExpand(null); document.getElementById("supply-outlook")?.focus() }}>Compare the intake plan <ArrowDownRight size={16} /></button></div>
        <div><h3>Quarterly history</h3>{utilisation.history.map(row => <div className="si-capacity-row" key={row.quarter}><span>{row.quarter}</span><div><i style={{ width: `${row.percent}%` }} /></div><strong>{row.percent}%</strong></div>)}<p className="si-small">Synthetic snapshot history. The forward intake plan is a separate scenario, not inferred from utilisation.</p></div>
      </div>}
      {expanded === "payments" && <div className="si-portal-columns">
        <div><span className="si-eyebrow">Payment horizon · preview</span><h2>Know what is coming due.</h2><div className="si-payment-buckets">{payments.buckets.map(bucket => <div key={bucket.days}><span>Within {bucket.days} days</span><strong>UGX {(bucket.amount / 1e6).toFixed(1)}m</strong></div>)}</div><p className="si-small">Cumulative windows from {shortDate(context.asOf)} 2026; overdue balances shown separately. These are synthetic UGX obligations, not converted portfolio invoices.</p></div>
        <div className="si-payment-list">{payments.outstanding.map(op => <button key={op.event.id} onClick={() => onEvent(op.event)}><span><strong>{op.event.title.replace("Preview · ", "")}</strong><small>{shortDate(op.event.date.toISOString())} · {op.counterpartyKind} · {op.paymentStatus}</small></span><b>UGX {((op.amountUgx ?? 0) / 1e6).toFixed(1)}m <ArrowUpRight size={14} /></b></button>)}</div>
      </div>}
    </section>}
  </>
}
function gradeGradient(values: Record<string, number>) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0)
  if (!total) return "var(--si-line)"
  let offset = 0
  return `conic-gradient(${grades.map(grade => { const start = offset; offset += values[grade] / total * 100; return `var(--si-${grade}) ${start}% ${offset}%` }).join(", ")})`
}
