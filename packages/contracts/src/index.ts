export const HUB_TOPICS = ["policy", "finance", "investments", "genetics", "technology"] as const

export type HubTopicSlug = (typeof HUB_TOPICS)[number]
export type DestinationSurface = "app" | "marketplace" | "external"
export type ReferenceKind =
  | "tool"
  | "product"
  | "service"
  | "investment_asset"
  | "land_asset"
  | "market_record"

export type ReferenceRelationship =
  | "explains"
  | "uses"
  | "supports"
  | "available_from"
  | "related_opportunity"

export interface CrossSurfaceReference {
  id: string
  surface: DestinationSurface
  kind: ReferenceKind
  canonicalId: string
  href: string
  label: string
  eyebrow: string
  description: string
  relationship: ReferenceRelationship
  reason: string
  reviewedAt: string
  disclosure?: string
}

export interface PlatformRoutes {
  corporate: string
  hub: string
  app: string
  marketplace: string
}

const DEFAULT_ROUTES: PlatformRoutes = {
  corporate: "https://www.eaforests.com",
  hub: "https://hub.eaforests.com",
  app: "https://app.eaforests.com",
  marketplace: "https://app.eaforests.com/shop",
}

function safeOrigin(value: string | undefined, fallback: string) {
  if (!value) return fallback
  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, "")
  } catch {
    return fallback
  }
}

export function createPlatformRoutes(values: Partial<PlatformRoutes> = {}): PlatformRoutes {
  return {
    corporate: safeOrigin(values.corporate, DEFAULT_ROUTES.corporate),
    hub: safeOrigin(values.hub, DEFAULT_ROUTES.hub),
    app: safeOrigin(values.app, DEFAULT_ROUTES.app),
    marketplace: safeOrigin(values.marketplace, DEFAULT_ROUTES.marketplace),
  }
}

export function isHubTopicSlug(value: string): value is HubTopicSlug {
  return HUB_TOPICS.includes(value as HubTopicSlug)
}

export function isCrossSurfaceReference(value: unknown): value is CrossSurfaceReference {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<CrossSurfaceReference>
  if (!candidate.id || !candidate.canonicalId || !candidate.label || !candidate.reason) return false
  if (!candidate.href || !candidate.reviewedAt) return false
  if (!["app", "marketplace", "external"].includes(candidate.surface ?? "")) return false
  if (![
    "tool",
    "product",
    "service",
    "investment_asset",
    "land_asset",
    "market_record",
  ].includes(candidate.kind ?? "")) return false
  try {
    new URL(candidate.href)
    return true
  } catch {
    return candidate.href.startsWith("/")
  }
}
