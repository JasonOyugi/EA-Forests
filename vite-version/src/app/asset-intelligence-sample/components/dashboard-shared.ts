export const dashboardFrameClass = "chart-card-running-boundary rounded-2xl p-[1.5px]"
export const dashboardSurfaceClass =
  "rounded-[calc(var(--radius-xl)+2px)] border-none bg-transparent shadow-none"

export function compactCurrency(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

export function compactNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

export function formatTrimesterTick(label: string, isMobile: boolean) {
  if (!isMobile) return label
  return label.replace(/ (\d{4})$/, (_, year: string) => ` '${year.slice(-2)}`)
}

export function formatYearTick(label: string, isMobile: boolean) {
  if (!isMobile) return label
  return label.slice(-2)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
