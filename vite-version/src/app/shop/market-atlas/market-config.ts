import type { ActorMode, MarketId } from "./types"

export interface SubModeConfig {
  mode: ActorMode
  /** Word rendered in the title control, e.g. "SEED". */
  label: string
  /** Matches a `.market-atlas[data-market="…"]` CSS hook in src/index.css. */
  dataMarketKey: string
}

export interface MarketConfig {
  id: MarketId
  route: string
  name: string
  heroTitle: string
  subModes: SubModeConfig[]
  /** Sub-mode shown before the user picks one — not necessarily subModes[0] (title display order
   * follows the brief's "SEED / SEEDLINGS" wording, but seedlings has far more actors and is the
   * flagship colour, so it opens active). */
  defaultMode: ActorMode
  nextMarket: MarketId
  emptyState: string
}

export const marketConfigs: Record<MarketId, MarketConfig> = {
  seedlings: {
    id: "seedlings",
    route: "/shop/seedlings",
    name: "Seeds & Seedlings",
    heroTitle: "Seed / Seedling market",
    subModes: [
      { mode: "seeds", label: "Seed", dataMarketKey: "seed" },
      { mode: "seedlings", label: "Seedlings", dataMarketKey: "seedlings" },
    ],
    defaultMode: "seedlings",
    nextMarket: "forestry-services",
    emptyState: "No verified actors in the current dataset for this selection.",
  },
  "forestry-services": {
    id: "forestry-services",
    route: "/shop/forestry-services",
    name: "Forestry Services",
    heroTitle: "Silviculture / Harvest & Haulage",
    subModes: [
      { mode: "silviculture", label: "Silviculture", dataMarketKey: "silviculture" },
      { mode: "harvest_haulage", label: "Harvest + Haulage", dataMarketKey: "harvest_haulage" },
    ],
    defaultMode: "silviculture",
    nextMarket: "wood-markets-map",
    emptyState: "No verified contractors in the current dataset for this selection.",
  },
  "wood-markets-map": {
    id: "wood-markets-map",
    route: "/shop/wood-markets-map",
    name: "Wood Markets",
    heroTitle: "Wood Markets",
    subModes: [{ mode: "wood", label: "Wood Markets", dataMarketKey: "wood" }],
    defaultMode: "wood",
    nextMarket: "seedlings",
    emptyState: "No verified processors in the current dataset for this selection.",
  },
}

export const marketOrder: MarketId[] = ["seedlings", "forestry-services", "wood-markets-map"]

/** Countries with real map polygon coverage (`generated-admin-boundaries.ts` / `market-map.ts`). */
export const mappedCountries = ["Kenya", "Uganda", "Tanzania"] as const
export type MappedCountry = (typeof mappedCountries)[number]

export function isMappedCountry(country: string): country is MappedCountry {
  return (mappedCountries as readonly string[]).includes(country)
}
