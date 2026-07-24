import diabetesProgramsInventory from "../data/diabetes-programs.json"
import type { ShopDefinition, ShopItem, ShopSlug } from "../types"

export const shopDefinitions: Record<ShopSlug, ShopDefinition> = {
  "diabetes-programs": {
    slug: "diabetes-programs",
    name: "GluCare Diabetes Care",
    shortName: "Diabetes Care",
    description: "Structured, personalized diabetes remission and management programs from GluCare.",
    heroTitle: "Diabetes care programs",
    heroDescription:
      "Explore GluCare's remission-focused programs, from personalized management to nutrition therapy and remote monitoring.",
    heroBadge: "Diabetes care",
    metrics: [
      { label: "Programs", value: "Remission - Management - Nutrition - Monitoring" },
      { label: "Care model", value: "Consultation-led programs" },
    ],
    emptyState: "No diabetes programs match the current filter.",
  },
}

export const shopInventoryMap: Record<ShopSlug, ShopItem[]> = {
  "diabetes-programs": diabetesProgramsInventory as ShopItem[],
}

export const shopList = Object.values(shopDefinitions)

export function isValidShopSlug(value: string): value is ShopSlug {
  return value in shopDefinitions
}
