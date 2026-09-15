import observations from "./nfa-seedling-price-observations.json"
import sources from "./source-records.json"
import type { LocationEvidence, NurseryOfferEvidence, PriceObservation, ShopItem, SourceRecord } from "../../../types"

type NfaObservation = (typeof observations)[number]
const nfaSourceId = "ug-nfa-seedling-price-list-2024"
const nfaSource = sources.find((source) => source.id === nfaSourceId) as SourceRecord
const nfaLocation: LocationEvidence = {
  country: "Uganda", region: "Kampala", locality: "Namanve Industrial Area",
  address: "Namanve Industrial Area, 12km Kampala-Jinja Highway", precision: "address",
  confidence: 1, sourceIds: [nfaSourceId], evidence: { kind: "observed", confidence: 1, sourceIds: [nfaSourceId] },
}
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }
function materialName(row: NfaObservation) { return row.materialType === "named clone" ? row.variety : row.variety ? `${row.product} - ${row.variety}` : row.product }
function materialType(row: NfaObservation) { return row.materialType === "named clone" ? "Named clone" : row.variety ? "Provenance / improved seed" : "Seedling" }
function priceObservation(row: NfaObservation): PriceObservation {
  return {
    originalAmount: row.amount, originalCurrency: "UGX", unit: "seedling",
    basis: `NFA price list per seedling; ${row.potSizeInches}-inch pot`, priceType: "official_price",
    date: nfaSource.publishedAt, vintage: nfaSource.vintage, seller: "National Forestry Authority Uganda",
    entity: "NFA tree nursery / Namanve Industrial Area", product: row.product,
    specification: [row.variety, row.commonName, `${row.potSizeInches}-inch pot`].filter(Boolean).join("; "),
    sourceIds: [nfaSourceId], evidence: { kind: "observed", confidence: 1, sourceIds: [nfaSourceId] },
  }
}
const grouped = new Map<string, NfaObservation[]>()
for (const row of observations) { const key = `${row.product}|${row.variety ?? ""}|${row.materialType ?? "seedling"}`; grouped.set(key, [...(grouped.get(key) ?? []), row]) }
export const ugandaNfaSeedlingItems: ShopItem[] = [...grouped.entries()].map(([key, rows]) => {
  const first = rows[0]
  const evidence: NurseryOfferEvidence = {
    kind: "nursery-offer", entity: "National Forestry Authority Uganda", product: materialName(first),
    prices: rows.map(priceObservation), location: nfaLocation,
    availability: { status: "unknown", asOf: nfaSource.vintage, sourceIds: [nfaSourceId], evidence: { kind: "observed", confidence: 1, sourceIds: [nfaSourceId] } },
    sourceIds: [nfaSourceId],
  }
  return {
    id: `uganda-nfa-${slugify(key)}`, slug: `${slugify(key)}-seedlings`, shop: "seedlings",
    name: materialName(first), species: first.product, materialType: materialType(first), supplierCount: 1,
    evidenceNote: `Observed in the NFA ${nfaSource.vintage} price list. Current availability is unverified.`,
    kind: "product", unitLabel: "per seedling", price: Math.min(...rows.map((row) => row.amount)), priceAvailable: true,
    currency: "UGX", updatedAt: nfaSource.vintage,
    description: `${first.product}${first.variety ? `, ${first.variety}` : ""} sold by the NFA price list in specified pot sizes.`,
    image: "/eucalyptus.jpg", tags: ["uganda", "nfa-observed", first.materialType === "named clone" ? "named-clone" : "seedling"],
    stockStatus: "quote", domain: "timber", ctaLabel: "Verify availability", evidence,
    variants: rows.map((row) => ({ id: `pot-${row.potSizeInches}`, label: `${row.potSizeInches}-inch pot`, count: 1, price: row.amount, unitLabel: "per seedling" })),
  } satisfies ShopItem
})
export const ugandaSourceRecords = sources as SourceRecord[]
export const ugandaRawObservationCount = observations.length
export const ugandaInferenceAudits: never[] = []
