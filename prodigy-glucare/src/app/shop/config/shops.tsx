import wellnessProductsInventory from "../data/wellness-products.json"
import hospitalServicesInventory from "../data/hospital-services.json"
import diabetesProgramsInventory from "../data/diabetes-programs.json"
import type { ShopDefinition, ShopItem, ShopSlug } from "../types"

export const shopDefinitions: Record<ShopSlug, ShopDefinition> = {
  "wellness-products": {
    slug: "wellness-products",
    name: "Prodigy Wellness Store",
    shortName: "Wellness Store",
    description: "Supplements, skincare, and weight-management products from Prodigy Healthcare.",
    heroTitle: "Wellness product marketplace",
    heroDescription:
      "Shop everyday wellness products, supplements, and skincare curated by Prodigy Healthcare.",
    heroBadge: "Wellness commerce",
    metrics: [
      { label: "Categories", value: "Supplements · Skincare · Weight Management" },
      { label: "Fulfilment", value: "Direct to your door" },
    ],
    emptyState: "No wellness products match the current filter.",
  },
  "hospital-services": {
    slug: "hospital-services",
    name: "Prodigy Hospital Supplies",
    shortName: "Hospital Supplies",
    description: "Dialysis consumables, disinfectants, vascular access, and wound care supplies from Prodigy Hospital.",
    heroTitle: "Hospital & dialysis supplies marketplace",
    heroDescription:
      "Source dialysis consumables, high-level disinfectants, vascular access devices, and wound care supplies trusted by hospitals and dialysis centers.",
    heroBadge: "Hospital commerce",
    metrics: [
      { label: "Delivery model", value: "Bulk order / per unit" },
      { label: "Coverage", value: "Dialysis · Disinfectants · Vascular Access · Wound Care" },
    ],
    emptyState: "No hospital supplies match the current filter.",
  },
  "diabetes-programs": {
    slug: "diabetes-programs",
    name: "GluCare Diabetes Programs",
    shortName: "Diabetes Programs",
    description: "Structured, personalised diabetes remission and management programs from GluCare.",
    heroTitle: "Diabetes care programs",
    heroDescription:
      "Explore GluCare's remission-focused programs, from personalised management to nutrition therapy and remote monitoring.",
    heroBadge: "Diabetes care commerce",
    metrics: [
      { label: "Programs", value: "Remission · Management · Nutrition · Monitoring" },
      { label: "Commercial mode", value: "Subscription / per-program" },
    ],
    emptyState: "No diabetes programs match the current filter.",
  },
}

export const shopInventoryMap: Record<ShopSlug, ShopItem[]> = {
  "wellness-products": wellnessProductsInventory as ShopItem[],
  "hospital-services": hospitalServicesInventory as ShopItem[],
  "diabetes-programs": diabetesProgramsInventory as ShopItem[],
}

export const shopList = Object.values(shopDefinitions)

export function isValidShopSlug(value: string): value is ShopSlug {
  return value in shopDefinitions
}

