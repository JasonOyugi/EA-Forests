/** Planned launch dates shared by the landing cards and the coming-soon pages (ISO yyyy-mm-dd). */
export const launchDates = {
  eaForestryExpertChatbot: "2026-10-27",
} as const

/** "Coming soon: 4 weeks" style label; falls back to days in the final week, then "any day". */
export function comingSoonLabel(isoDate: string, now = new Date()) {
  const days = Math.ceil((new Date(`${isoDate}T00:00:00Z`).getTime() - now.getTime()) / 86_400_000)
  // Deliberately never the bare "Coming soon", which the landing grid reserves for tinted cards.
  if (days <= 0) return "Coming soon: any day"
  if (days < 7) return `Coming soon: ${days} ${days === 1 ? "day" : "days"}`
  const weeks = Math.round(days / 7)
  return `Coming soon: ${weeks} ${weeks === 1 ? "week" : "weeks"}`
}
