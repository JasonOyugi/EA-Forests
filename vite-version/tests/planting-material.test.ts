import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { distanceKm, filterOffers, minimumPrices, priceForOffer, selectionsForOffers, validCoordinate } from "../src/app/shop/lib/planting-material.ts"
import type { MaterialEvidence, PlantingMaterialOffer } from "../src/app/shop/data/planting-material-types.ts"

const evidence: MaterialEvidence = { kind: "observed", sourceId: "fixture", url: "https://example.org/price", publishedAt: "2026-09-12", accessedAt: "2026-09-12", confidence: "high", freshness: "current-catalogue", notes: "Test fixture, never production data." }
function offer(id: string, amount: number | null, country = "Uganda"): PlantingMaterialOffer {
  return { id, productId: "p", material: "seedling", scientificName: "Pinus patula", variety: null, provenance: null,
    supplier: { id, name: id, country, station: null, region: null, address: null, coordinate: null, coordinatePrecision: null, coordinateEvidence: null,
      phone: null, email: null, website: null, ordering: null, delivery: null, evidence },
    availability: "unknown", availabilityNote: "Confirm", capacity: null, traceability: null, evidence,
    quotes: [{ amount, quantity: 1, unit: "seedling", currency: "UGX", evidence }] }
}
const single = { quantity: 1, unit: "seedling" as const }

test("A: minimum includes known prices alongside unknown prices", () => {
  assert.equal(minimumPrices([offer("a", 800), offer("b", 600), offer("c", null)], single)[0].amount, 600)
})
test("invalid, unavailable, inactive and dummy suppliers cannot set a minimum", () => {
  const unavailable = offer("unavailable", 10); unavailable.availability = "unavailable"
  const inactive = offer("inactive", 20); inactive.supplier.active = false
  const dummy = offer("dummy", 1)
  assert.equal(minimumPrices([offer("zero", 0), offer("nan", NaN), offer("infinity", Infinity), offer("negative", -1), unavailable, inactive, dummy, offer("valid", 600)], single)[0].amount, 600)
})
test("B: 1 / 100 / 1,000 changes price without inventing discounts", () => {
  const supplier = offer("a", 500)
  assert.equal(priceForOffer(supplier, single)?.amount, 500)
  for (const quantity of [100, 1000]) {
    const price = priceForOffer(supplier, { ...single, quantity })!
    assert.equal(price.amount, 500 * quantity); assert.equal(price.kind, "inferred")
    assert.equal(price.original.amount, 500)
  }
  supplier.quotes.push({ amount: 45000, quantity: 100, unit: "seedling", currency: "UGX", evidence })
  assert.equal(priceForOffer(supplier, { ...single, quantity: 100 })?.amount, 45000)
  assert.equal(priceForOffer(supplier, { ...single, quantity: 100 })?.kind, "observed")
})
test("C: country filtering precedes minimum and preserves each currency", () => {
  const ug = offer("ug", 600), ke = offer("ke", 25, "Kenya")
  ke.quotes[0].currency = "KES"
  assert.equal(minimumPrices([ug, ke], single).length, 2)
  assert.deepEqual(minimumPrices(filterOffers([ug, ke], { country: "Kenya" }, single), single).map((price) => [price.currency, price.amount]), [["KES", 25]])
})
test("D: Haversine, nearest ordering, radii and missing coordinates", () => {
  const origin = { latitude: -1.2921, longitude: 36.8219 }
  const near = offer("near", 800), far = offer("far", 600), unmapped = offer("unmapped", 500)
  near.supplier.coordinate = { latitude: -1.25, longitude: 36.8 }
  far.supplier.coordinate = { latitude: 0.3476, longitude: 32.5825 }
  assert.ok(distanceKm(origin, far.supplier.coordinate) > 500)
  assert.equal(filterOffers([far, unmapped, near], { location: origin }, single)[0].id, "near")
  assert.deepEqual(filterOffers([far, unmapped, near], { location: origin, radiusKm: 50 }, single).map((o) => o.id), ["near"])
  assert.equal(filterOffers([unmapped], {}, single).length, 1)
  assert.equal(validCoordinate(null), false)
  assert.equal(validCoordinate({ latitude: 91, longitude: 0 }), false)
})
test("F/I: seed units and historical or unknown-unit prices remain separate", () => {
  const seed = { ...offer("seed", 1200), material: "seed" } as PlantingMaterialOffer
  seed.quotes = [{ amount: 1200, currency: "KES", quantity: 250, unit: "g", evidence }]
  assert.equal(priceForOffer(seed, single), null)
  assert.equal(priceForOffer(seed, { quantity: .25, unit: "kg" })?.amount, 1200)
  assert.equal(priceForOffer(seed, { quantity: 1, unit: "kg" }), null)
  assert.equal(selectionsForOffers("seed", [seed])[0].unit, "g")
  seed.quotes[0].evidence = { ...evidence, freshness: "historical" }
  assert.equal(priceForOffer(seed, { quantity: 250, unit: "g" }), null)
  seed.quotes[0] = { amount: 10, currency: "KES", quantity: null, unit: "unknown", evidence }
  assert.equal(minimumPrices([seed], { quantity: 1, unit: "kg" }).length, 0)
})
test("H: TFS ingestion retains source, biology, units and actual vintage", () => {
  const rows = JSON.parse(readFileSync(new URL("../src/app/shop/data/source-data/planting-material/tfs-catalogue.json", import.meta.url), "utf8"))
  assert.equal(rows.length, 383)
  const patula = rows.find((row: { accession_no: string }) => row.accession_no === "PIPA088A")
  assert.equal(patula.seeds_per_kg, "125000")
  assert.equal(patula.seedlings_per_kg, "75000")
  assert.equal(patula.planting_altitude, "1800 - 1900")
  assert.equal(patula.seed_preparation, "d")
  assert.equal(patula.updated_at.slice(0, 4), "2017")
})
