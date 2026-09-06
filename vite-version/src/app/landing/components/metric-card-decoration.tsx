import { assetUrl } from "@/lib/utils"

/** Shared section-colored pixels and brand watermark for editorial metrics. */
export function MetricCardDecoration({ accent = "#10b981" }: { accent?: string }) {
  return (
    <div aria-hidden="true" className="metric-card-decoration pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ color: accent }}>
      <span className="metric-card-pixel" />
      <span className="metric-card-pixel" />
      <span className="metric-card-pixel" />
      <span className="metric-card-pixel" />
      <span
        className="absolute -bottom-12 -right-12 size-36 bg-current opacity-35 sm:-bottom-16 sm:-right-16 sm:size-40"
        style={{
          maskImage: `url("${assetUrl("/favicon-dark.png")}")`,
          WebkitMaskImage: `url("${assetUrl("/favicon-dark.png")}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </div>
  )
}
