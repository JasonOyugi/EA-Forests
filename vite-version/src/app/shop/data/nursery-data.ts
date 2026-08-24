import type { ShopItem, ShopItemVariant } from "../types"
import {
  nurseryDatabase,
  type NurseryGenusSupply,
  type NurseryRecord,
} from "./market-databases"

export interface NurserySpeciesOffer {
  nursery: NurseryRecord
  genus: NurseryGenusSupply
  species: string
  varieties: string[]
  pricePerSeedling: number | null
  pricePer100Seedlings: number | null
  pricePer500Seedlings: number | null
  pricePer1000Seedlings: number | null
  capacity: number | null
  traceability: string | null
  availability: string | null
}

export function normalizeNurseryName(value: string) {
  return value
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/[().,_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getNurserySpeciesOffers(item: Pick<ShopItem, "name" | "nurseryVarietyAliases">) {
  const aliases = (item.nurseryVarietyAliases?.length
    ? [item.name, ...item.nurseryVarietyAliases]
    : [item.name]
  ).map(normalizeNurseryName)

  return nurseryDatabase.nurseries.flatMap((nursery) =>
    nursery.genera.flatMap((genus) =>
      genus.varieties.flatMap((option): NurserySpeciesOffer[] => {
        const searchableValues = [option.species, option.variety].map(normalizeNurseryName)
        const matches = aliases.some((alias) => searchableValues.includes(alias))
        if (!matches) return []

        return [{
          nursery,
          genus,
          species: option.species,
          varieties: [option.variety],
          pricePerSeedling: option.price.perSeedling,
          pricePer100Seedlings: option.price.per100Seedlings,
          pricePer500Seedlings: option.price.per500Seedlings,
          pricePer1000Seedlings: option.price.per1000Seedlings,
          capacity: option.capacity,
          traceability: option.traceability,
          availability: option.availability,
        }]
      })
    )
  )
}

function minimumKnownPrice(values: Array<number | null>) {
  const knownValues = values.filter((value): value is number => value != null)
  return knownValues.length ? Math.min(...knownValues) : null
}

function nurseryVariants(offers: NurserySpeciesOffer[]): ShopItemVariant[] {
  const tiers = [
    { id: "single", label: "1 seedling", count: 1, key: "pricePerSeedling" as const, unitLabel: "per seedling" },
    { id: "100", label: "100 seedlings", count: 100, key: "pricePer100Seedlings" as const, unitLabel: "per 100 seedlings" },
    { id: "500", label: "500 seedlings", count: 500, key: "pricePer500Seedlings" as const, unitLabel: "per 500 seedlings" },
    { id: "1000", label: "1,000 seedlings", count: 1000, key: "pricePer1000Seedlings" as const, unitLabel: "per 1,000 seedlings" },
  ]

  return tiers.flatMap((tier): ShopItemVariant[] => {
    const price = minimumKnownPrice(offers.map((offer) => offer[tier.key]))
    return price == null ? [] : [{
      id: tier.id,
      label: tier.label,
      count: tier.count,
      price,
      unitLabel: tier.unitLabel,
    }]
  })
}

export function normalizeSeedlingShopItem(item: ShopItem): ShopItem {
  if (item.shop !== "seedlings") return item

  const offers = getNurserySpeciesOffers(item)
  const variants = nurseryVariants(offers)
  const perSeedlingPrice = minimumKnownPrice(offers.map((offer) => offer.pricePerSeedling))

  return {
    ...item,
    supplierCount: new Set(offers.map((offer) => offer.nursery.id)).size,
    unitLabel: "per seedling",
    price: perSeedlingPrice ?? item.price / 100,
    priceAvailable: perSeedlingPrice != null,
    currency: nurseryDatabase.currency,
    updatedAt: item.updatedAt ?? nurseryDatabase.lastUpdated,
    variants,
  }
}

export function normalizeSeedlingInventory(items: ShopItem[]) {
  return items.map(normalizeSeedlingShopItem)
}
