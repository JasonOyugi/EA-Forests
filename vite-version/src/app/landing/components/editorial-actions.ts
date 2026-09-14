export type EditorialCategory = "Information" | "Markets" | "Investments" | "Videos" | "Events" | "Models"

export const editorialActionLabels: Record<EditorialCategory, string> = {
  Information: "Read more",
  Markets: "Go",
  Investments: "Learn more",
  Videos: "Watch now",
  Events: "View event",
  Models: "Coming soon",
}

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
    { label: "Core", href: "/shop/forests-land/core-forests" },
    { label: "High Performance", href: "/shop/forests-land/high-performance-forests" },
    { label: "Drylands", href: "/shop/forests-land/dryland-frontier-forests" },
  ],
  Videos: [
  ],
  Events: [
    { label: "Trade", href: "#brief" },
    { label: "Policy", href: "#brief" },
    { label: "Technology", href: "#brief" },
  ],
  Models: [
    { label: "Tested Investment", href: "#brief", topic: "Tested Investment" },
    { label: "Community", href: "#brief", topic: "Community" },
    { label: "Tools", href: "#brief", topic: "Tools" },
    { label: "Site × Species", href: "#brief", topic: "Tools" },
    { label: "Silviculture", href: "#brief", topic: "Tools" },
    { label: "Roundwood", href: "#brief", topic: "Tools" },
  ],
}
