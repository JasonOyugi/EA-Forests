export type EditorialCategory = "Information" | "Markets" | "Models" | "Investments" | "Videos" | "Events"

export const editorialActionLabels: Record<EditorialCategory, string> = {
  Information: "Read more",
  Markets: "Go",
  Models: "Use",
  Investments: "Learn more",
  Videos: "Watch now",
  Events: "View event",
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
  Markets: [
    { label: "Seed & Seedlings", href: "/shop/seedlings" },
    { label: "Land & Services", href: "/shop/forests-land" },
    { label: "Sector Map", href: "/shop/sector-map" },
  ],
  Models: [
    { label: "Genetic Models", href: "#brief", topic: "Genetic" },
    { label: "Commercial Models", href: "#brief", topic: "Commercial" },
    { label: "Economic Models", href: "#brief", topic: "Economic" },
  ],
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
}
