export type EditorialCategory = "Information" | "Markets" | "Investments" | "Videos" | "Events"

export const editorialActionLabels: Record<EditorialCategory, string> = {
  Information: "Read more",
  Markets: "Go",
  Investments: "Explore",
  Videos: "Watch now",
  Events: "View event",
}

/** Categories that filter the editorial grid (Markets opens the atlas instead). */
export const editorialFilterCategories = ["Information", "Investments", "Videos", "Events"] as const satisfies readonly EditorialCategory[]

/** Window events shared by the grid's toggles and the mobile menu. */
export const EDITORIAL_FILTER_EVENT = "editorial:filter"
export const EDITORIAL_STATE_EVENT = "editorial:state"

export type EditorialSelection = { category: EditorialCategory | "All"; topic: string | null }

export interface EditorialSubsection {
  label: string
  href: string
  /** When set, selecting this subsection filters the editorial grid in place (by category + topic) instead of navigating away. */
  topic?: string
}

/** Sub-sections revealed when a category pill is hovered. Every card on the hub belongs to one section/sub-section pair. */
export const editorialSubsections: Record<EditorialCategory, EditorialSubsection[]> = {
  Information: [
    { label: "Policy & Regulation", href: "#brief", topic: "Policy & Regulation" },
    { label: "Finance & Markets", href: "#brief", topic: "Finance & Markets" },
    { label: "Investments", href: "#brief", topic: "Investments" },
    { label: "Genetics", href: "#brief", topic: "Genetics" },
    { label: "Technology", href: "#brief", topic: "Technology" },
  ],
  Markets: [],
  Investments: [
    { label: "Tested Investments", href: "#brief", topic: "Tested Investments" },
    { label: "Models", href: "#brief", topic: "Models" },
  ],
  Videos: [
  ],
  Events: [],
}
