import wellnessProductsInventory from "../data/wellness-products.json"
import hospitalServicesInventory from "../data/hospital-services.json"
import type { ShopDefinition, ShopItem, ShopSlug } from "../types"

export const shopDefinitions: Record<ShopSlug, ShopDefinition> = {
  "wellness-products": {
    slug: "wellness-products",
    name: "Personal Care",
    shortName: "Personal Care",
    description: "Supplements, skincare, and weight-management products from Prodigy Healthcare.",
    heroTitle: "Personal care marketplace",
    heroDescription:
      "Shop everyday personal care, supplements, and skincare curated by Prodigy Healthcare.",
    heroBadge: "Personal care commerce",
    metrics: [
      { label: "Categories", value: "Supplements - Skincare - Weight Management" },
      { label: "Fulfilment", value: "Direct to your door" },
    ],
    emptyState: "No personal care products match the current filter.",
  },
  "hospital-services": {
    slug: "hospital-services",
    name: "Hospital Supplies",
    shortName: "Hospital Care",
    description: "Dialysis consumables, disinfectants, vascular access, wound care supplies and many more.",
    heroTitle: "Hospital care marketplace",
    heroDescription:
      "Source dialysis consumables, high-level disinfectants, vascular access devices, and wound care supplies trusted by hospitals and dialysis centers.",
    heroBadge: "Hospital care commerce",
    metrics: [
      { label: "Delivery model", value: "Bulk order / per unit" },
      { label: "Coverage", value: "Dialysis - Disinfectants - Vascular Access - Wound Care" },
    ],
    emptyState: "No hospital care supplies match the current filter.",
  },
}

export const shopInventoryMap: Record<ShopSlug, ShopItem[]> = {
  "wellness-products": wellnessProductsInventory as ShopItem[],
  "hospital-services": hospitalServicesInventory as ShopItem[],
}

export const shopList = Object.values(shopDefinitions)

export function isValidShopSlug(value: string): value is ShopSlug {
  return value in shopDefinitions
}
