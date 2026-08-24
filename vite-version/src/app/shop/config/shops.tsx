import seedlingsInventory from "../data/seedlings.json"
import forestsLandInventory from "../data/forests-land.json"
import forestryServicesInventory from "../data/forestry-services.json"
import roundwoodInventory from "../data/roundwood.json"
import { normalizeFlagshipShopItem } from "../lib/flagship-pricing"
import { normalizeSeedlingInventory } from "../data/nursery-data"
import type { ShopDefinition, ShopItem, ShopSlug } from "../types"

export const shopDefinitions: Record<ShopSlug, ShopDefinition> = {
  seedlings: {
    slug: "seedlings",
    name: "Seed & Seedlings",
    shortName: "Seed & Seedlings",
    description: "The best planting material at the right price for forestry and agroforestry establishment.",
    heroTitle: "Seed/Seedling marketplace",
    heroDescription:
      "Source nursery-raised planting material for commercial forestry, grower outreach, and field establishment programs.",
    heroBadge: "Nursery commerce",
    metrics: [
      { label: "Use cases", value: "Timber · Agroforestry · Restoration" },
      { label: "Fulfilment", value: "Tray / batch based" },
    ],
    emptyState: "No seedlings match the current filter.",
  },
  "forests-land": {
    slug: "forests-land",
    name: "Land & services",
    shortName: "Land & Services",
    description: "Browse and select verified land and contractor services for your forestry investments",
    heroTitle: "Forestry opportunities",
    heroDescription:
      "Review managed forest blocks, land-linked opportunities, and forestry assets suitable for pipeline development.",
    heroBadge: "Asset commerce",
    metrics: [
      { label: "Offer type", value: "Blocks · Parcels · Managed sites" },
      { label: "Commercial mode", value: "Quote / diligence led" },
    ],
    emptyState: "No forests or land opportunities match the current filter.",
  },
  "forestry-services": {
    slug: "forestry-services",
    name: "Forestry Services",
    shortName: "Services",
    description: "Operational and advisory services across forestry establishment and management.",
    heroTitle: "Forestry services marketplace",
    heroDescription:
      "Book field operations, technical support, and recurring management services through a structured service shop.",
    heroBadge: "Service commerce",
    metrics: [
      { label: "Delivery model", value: "Per hectare / scoped service" },
      { label: "Coverage", value: "Establishment · Maintenance · Advisory" },
    ],
    emptyState: "No forestry services match the current filter.",
  },
  "sector-map": {
    slug: "sector-map",
    name: "Sector Map",
    shortName: "Markets",
    description: "Structured market access across carbon, roundwood, and sawn timber offtake channels.",
    heroTitle: "Markets marketplace",
    heroDescription:
      "Review downstream markets and vendor channels relevant to forestry value-chain offtake and commercial partnerships.",
    heroBadge: "Market commerce",
    metrics: [
      { label: "Markets", value: "Carbon · Roundwood · Sawn timber" },
      { label: "Commercial mode", value: "Vendor / offtake led" },
    ],
    emptyState: "No market listings match the current filter.",
  },
  "wood-markets-map": {
    slug: "wood-markets-map",
    name: "Wood markets",
    shortName: "Wood markets",
    description: "Processor locations, buyer specs, and roundwood pricing across East Africa.",
    heroTitle: "Wood markets map",
    heroDescription:
      "A processor-only view of the sector map: buyer locations, grade specs, and delivered roundwood pricing, with nurseries, concessions, and forest reserves removed.",
    heroBadge: "Roundwood markets",
    metrics: [
      { label: "Focus", value: "Processors only" },
      { label: "Data", value: "Buyer specs · Grades · Prices" },
    ],
    emptyState: "No processor listings match the current filter.",
  },
}

export const shopInventoryMap: Record<ShopSlug, ShopItem[]> = {
  seedlings: normalizeSeedlingInventory(seedlingsInventory as ShopItem[]),
  "forests-land": (forestsLandInventory as ShopItem[]).map(normalizeFlagshipShopItem),
  "forestry-services": forestryServicesInventory as ShopItem[],
  "sector-map": roundwoodInventory as ShopItem[],
  "wood-markets-map": roundwoodInventory as ShopItem[],
}

export const shopList = Object.values(shopDefinitions).filter(
  (shop) => shop.slug !== "forestry-services"
)

export function isValidShopSlug(value: string): value is ShopSlug {
  return value in shopDefinitions
}
