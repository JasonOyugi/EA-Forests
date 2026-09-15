import type { ShopItem } from "../types"
import type { MaterialEvidence, PlantingMaterialOffer } from "./planting-material-types"
import { isEligibleOffer, minimumPrices, seedlingSelections, selectionLabel, validCoordinate } from "../lib/planting-material"
import { supplementalSeedlingOffers } from "./supplemental-planting-data"
import { plantingGallery } from "./planting-images"
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
  priceRangeLabel: string | null
  currency: string
  evidenceStatus: "observed" | "inferred"
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
          priceRangeLabel: option.priceRangeLabel ?? null,
          currency: nursery.currency ?? nurseryDatabase.currency,
          evidenceStatus: option.evidenceStatus ?? "observed",
          capacity: option.capacity,
          traceability: option.traceability,
          availability: option.availability,
        }]
      })
    )
  )
}

export function nurseryPlantingOffers(item: ShopItem): PlantingMaterialOffer[] {
  return getNurserySpeciesOffers(item).map((offer, index): PlantingMaterialOffer => {
    const n = offer.nursery
    const evidence: MaterialEvidence = {
      kind: offer.evidenceStatus, sourceId: n.source.sourceId ?? n.id, url: n.source.url,
      publishedAt: n.source.dataVintage, accessedAt: nurseryDatabase.lastUpdated,
      confidence: n.source.url ? "medium" : "unknown", freshness: "unverified",
      notes: [n.comments, n.source.database, "Existing supplier record; current stock and price require confirmation."].filter(Boolean).join(" "),
    }
    const coordinate = n.lat !== null && n.lon !== null ? { latitude: n.lat, longitude: n.lon } : null
    const availability = /unavailable|out.of.stock|inactive/i.test(offer.availability ?? "") ? "unavailable" : "unknown"
    return {
      id: `${item.id}-${n.id}-${index}`, productId: item.id, material: "seedling", scientificName: offer.species,
      variety: offer.varieties.join(", "), provenance: offer.traceability, evidence,
      supplier: { id: n.id, name: n.name, country: n.country, station: null, region: n.region, address: n.address,
        coordinate: validCoordinate(coordinate) ? coordinate : null, coordinatePrecision: n.source.coordinatePrecision,
        coordinateEvidence: evidence, phone: n.contact.phone, email: null, website: n.source.url,
        ordering: n.contact.other, delivery: n.transport, evidence },
      availability, availabilityNote: "Confirm current stock with nursery.", capacity: offer.capacity, traceability: offer.traceability,
      quotes: [[1, offer.pricePerSeedling], [100, offer.pricePer100Seedlings], [500, offer.pricePer500Seedlings], [1000, offer.pricePer1000Seedlings]]
        .map(([quantity, amount]) => ({ quantity, amount, currency: offer.currency, unit: "seedling", evidence })),
    }
  }).filter(isEligibleOffer)
}

export function normalizeSeedlingShopItem(item: ShopItem): ShopItem {
  if (item.shop !== "seedlings" || !item.nurseryVarietyAliases?.length) return item

  const offers = [...nurseryPlantingOffers(item), ...supplementalSeedlingOffers.filter((offer) =>
    [item.name, ...(item.nurseryVarietyAliases ?? [])].map(normalizeNurseryName).includes(normalizeNurseryName(offer.scientificName))
  )]
  const minimum = minimumPrices(offers, seedlingSelections[0])[0]
  const gallery = plantingGallery(item.name)

  return {
    ...item,
    image: gallery[0]?.url ?? "",
    imageGallery: gallery,
    tags: item.tags.filter((tag) => tag !== "new"),
    plantingMaterialType: "seedling",
    plantingOffers: offers,
    supplierCount: new Set(offers.map((offer) => offer.supplier.id)).size,
    observedSupplierCount: new Set(offers.filter((offer) => offer.evidence.kind === "observed").map((offer) => offer.supplier.id)).size,
    inferredSupplierCount: new Set(offers.filter((offer) => offer.evidence.kind === "inferred").map((offer) => offer.supplier.id)).size,
    unitLabel: "per seedling",
    price: minimum?.amount ?? 0,
    priceAvailable: !!minimum,
    currency: minimum?.currency ?? "UGX",
    stockStatus: "quote",
    updatedAt: item.updatedAt ?? nurseryDatabase.lastUpdated,
    variants: seedlingSelections.map((selection) => ({ id: String(selection.quantity), label: selectionLabel(selection),
      count: selection.quantity, price: minimumPrices(offers, selection)[0]?.amount ?? 0, unitLabel: `per ${selectionLabel(selection)}` })),
  }
}

export function normalizeSeedlingInventory(items: ShopItem[]) {
  return items.map(normalizeSeedlingShopItem)
}
