import { MetricCardDecoration } from "./metric-card-decoration"
import type { SectorMetric } from "./sector-data"

export function MetricTile({
  metric,
  size,
  onFocus,
  onSelectInformation,
}: {
  metric: SectorMetric
  size: string
  onFocus?: () => void
  onSelectInformation?: (topic: string) => void
}) {
  const Tag = onSelectInformation ? "article" : "a"

  return (
    <Tag
      href={onSelectInformation ? undefined : metric.website}
      target={onSelectInformation ? undefined : "_blank"}
      rel={onSelectInformation ? undefined : "noopener noreferrer"}
      role={onSelectInformation ? "button" : undefined}
      tabIndex={0}
      className={`editorial-metric-tile group relative flex cursor-pointer flex-col justify-between overflow-hidden border p-6 text-emerald-950 transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/70 dark:text-white dark:focus-visible:ring-white/70 sm:p-7 ${size}`}
      onClick={() => onSelectInformation?.(metric.informationTopic)}
      onKeyDown={(event) => {
        if (onSelectInformation && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          onSelectInformation?.(metric.informationTopic)
        }
      }}
      onDoubleClick={onFocus}
      aria-label={onSelectInformation ? `Open ${metric.informationTopic} information for ${metric.label}` : `Read source for ${metric.label}`}
      style={{
        borderColor: `color-mix(in srgb, ${metric.accent} 48%, transparent)`,
        background: "transparent",
      }}
    >
      <MetricCardDecoration accent={metric.accent} />
      <p className="relative z-10 text-xs font-semibold uppercase tracking-[.2em]" style={{ color: metric.accent }}>Did you know?</p>
      <div className="relative z-10">
        <p className="landing-metric-value font-semibold tracking-[-.03em]">{metric.value}</p>
        <p className="mt-3 text-sm font-medium text-emerald-950/85 dark:text-white/85">{metric.label}</p>
        <p className="mt-2 text-xs leading-5 text-emerald-800/75 dark:text-white/60">{metric.context}</p>
      </div>
    </Tag>
  )
}
