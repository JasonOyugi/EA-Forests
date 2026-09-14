import type {
  MaterialCoordinate, MaterialFilters, MaterialPrice, MaterialQuote,
  MaterialSelection, PlantingMaterialOffer,
} from "../data/planting-material-types"

export const seedlingSelections: MaterialSelection[] = [1, 100, 1000].map((quantity) => ({ quantity, unit: "seedling" }))

export function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

export function validCoordinate(value: MaterialCoordinate | null | undefined): value is MaterialCoordinate {
  return !!value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180
}

export function distanceKm(a: MaterialCoordinate, b: MaterialCoordinate): number {
  const rad = (n: number) => n * Math.PI / 180
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

export function offerDistance(offer: PlantingMaterialOffer | undefined, location?: MaterialCoordinate | null) {
  return offer && validCoordinate(location) && validCoordinate(offer.supplier.coordinate)
    ? distanceKm(location, offer.supplier.coordinate) : null
}

export function isEligibleOffer(offer: PlantingMaterialOffer) {
  return offer.supplier.active !== false && offer.availability !== "unavailable"
    && !/(?:^|[-_\s])(?:dummy|test|demo)(?:$|[-_\s])/i.test([offer.id, offer.supplier.id, offer.supplier.name].join(" "))
    && !/\bdummy\b|\btest[-_ ]record\b|replace with verified/i.test(
      [offer.id, offer.supplier.name, offer.evidence.notes].join(" ")
    )
}

export function selectionKey(selection: MaterialSelection) {
  return `${selection.quantity}:${selection.unit}:${selection.packLabel ?? ""}`
}

export function selectionLabel(selection: MaterialSelection) {
  if (selection.unit === "unknown") return "Supplier pack (confirm size)"
  if (selection.unit === "packet") return selection.packLabel ?? `${selection.quantity} packet${selection.quantity === 1 ? "" : "s"}`
  if (selection.unit === "seedling") return `${selection.quantity.toLocaleString("en-US")} seedling${selection.quantity === 1 ? "" : "s"}`
  return `${selection.quantity.toLocaleString("en-US")} ${selection.unit}`
}

export function quoteMassGrams(quote: MaterialSelection | MaterialQuote) {
  if (!validPrice(quote.quantity)) return null
  if (quote.unit === "kg") return quote.quantity * 1000
  if (quote.unit === "g") return quote.quantity
  return "massGrams" in quote && validPrice(quote.massGrams) ? quote.massGrams : null
}

export function selectionsForOffers(material: "seedling" | "seed", offers: PlantingMaterialOffer[]): MaterialSelection[] {
  if (material === "seedling") return seedlingSelections
  const selections = new Map<string, MaterialSelection>()
  for (const offer of offers) {
    for (const quote of offer.quotes) {
      if (quote.unit === "unknown" || !validPrice(quote.quantity)) continue
      const selection = { quantity: quote.quantity, unit: quote.unit, packLabel: quote.packLabel }
      selections.set(selectionKey(selection), selection)
    }
  }
  // Never invent a pack size for a supplier that has not published one.
  return selections.size ? [...selections.values()].sort((a, b) => (quoteMassGrams(a) ?? 0) - (quoteMassGrams(b) ?? 0))
    : [{ quantity: 1, unit: "unknown" }]
}

export function priceForOffer(offer: PlantingMaterialOffer, selection: MaterialSelection): MaterialPrice | null {
  if (!isEligibleOffer(offer) || !validPrice(selection.quantity) || selection.unit === "unknown") return null
  const candidates: MaterialPrice[] = []
  for (const quote of offer.quotes) {
    if (!validPrice(quote.amount) || !validPrice(quote.quantity) || !/^[A-Z]{3}$/.test(quote.currency)
      || quote.evidence.freshness !== "current-catalogue" || quote.unit === "unknown") continue
    let factor: number | null = null
    let kind = quote.evidence.kind
    let note = "Supplier-quoted price"
    if (quote.unit === selection.unit && quote.quantity === selection.quantity
      && (quote.unit !== "packet" || quote.packLabel === selection.packLabel)) {
      factor = 1
    } else if (offer.material === "seedling" && quote.unit === "seedling" && selection.unit === "seedling" && quote.quantity === 1) {
      factor = selection.quantity
      kind = "inferred"
      note = "Estimated from unit price; no bulk discount assumed"
    } else if (offer.material === "seed") {
      const sourceMass = quoteMassGrams(quote)
      const requestedMass = quoteMassGrams(selection)
      // Equivalent mass is comparable; unquoted quantities are not offered as retail packs.
      if (sourceMass && requestedMass && sourceMass === requestedMass) {
        factor = 1
        kind = "derived"
        note = "Equivalent mass; original supplier quote retained"
      }
    }
    if (factor === null || !validPrice(quote.amount * factor) || kind === "unknown") continue
    candidates.push({ ...selection, amount: quote.amount * factor, currency: quote.currency, kind, note,
      offerId: offer.id, supplierName: offer.supplier.name, original: quote,
      perUnit: quote.amount * factor / selection.quantity })
  }
  // An actual bulk quote takes precedence over an estimate from a unit quote.
  return candidates.sort((a, b) => Number(a.kind === "inferred") - Number(b.kind === "inferred") || a.amount - b.amount)[0] ?? null
}

/** A separate minimum for each currency: raw shilling amounts are never compared across currencies. */
export function minimumPrices(offers: PlantingMaterialOffer[], selection: MaterialSelection): MaterialPrice[] {
  const byCurrency = new Map<string, MaterialPrice>()
  for (const offer of offers) {
    const price = priceForOffer(offer, selection)
    if (price && (!byCurrency.has(price.currency) || price.amount < byCurrency.get(price.currency)!.amount)) {
      byCurrency.set(price.currency, price)
    }
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

export function filterOffers(offers: PlantingMaterialOffer[], filters: MaterialFilters, selection: MaterialSelection) {
  return offers.filter((offer) => {
    if (!isEligibleOffer(offer)) return false
    if (filters.country && filters.country !== "all" && offer.supplier.country !== filters.country) return false
    if (filters.region && filters.region !== "all" && offer.supplier.region !== filters.region) return false
    if (filters.supplier && filters.supplier !== "all" && offer.supplier.id !== filters.supplier) return false
    if (filters.variety && filters.variety !== "all" && ![offer.variety, offer.provenance].includes(filters.variety)) return false
    if (filters.availability && filters.availability !== "all" && offer.availability !== filters.availability) return false
    const distance = offerDistance(offer, filters.location)
    if (filters.location && filters.radiusKm && (distance === null || distance > filters.radiusKm)) return false
    const price = priceForOffer(offer, selection)
    if (filters.pricedOnly && !price) return false
    if (filters.maxPrice != null && (!price || price.currency !== filters.priceCurrency || price.amount > filters.maxPrice)) return false
    return true
  }).sort((a, b) => (offerDistance(a, filters.location) ?? Infinity) - (offerDistance(b, filters.location) ?? Infinity)
    || a.supplier.name.localeCompare(b.supplier.name) || a.id.localeCompare(b.id))
}

export function formatMaterialMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount).replace(/\u00a0/g, " ")
}

export function materialAvailability(offers: PlantingMaterialOffer[]) {
  if (!offers.length) return "No matching suppliers"
  if (offers.some((offer) => offer.availability === "available")) return "Listed as available — confirm stock"
  if (offers.some((offer) => offer.availability === "seasonal")) return "Seasonal — confirm stock"
  return "Confirm availability with supplier"
}
