import kefriRows from "./source-data/planting-material/kefri-catalogues.json"
import nfaSeedlingRows from "./source-data/uganda/nfa-seedling-price-observations.json"
import { emptySeedTechnical, materialEvidence, seedSlug } from "./material-evidence"
import type { MaterialSupplier, PlantingMaterialOffer } from "./planting-material-types"

const kefriEvidence = materialEvidence("kefri-enterprise-faq", "https://enterprise.kefri.org/faq.php", null,
  "Official FAQ identifies seed sales through KEFRI centres and dispatch for an additional transport charge. Confirm collection arrangements for seedlings.", true)
const kefriSupplier = (branch: string): MaterialSupplier => ({
  id: `kefri-${branch.toLowerCase()}`, name: `KEFRI Enterprise — ${branch}`, country: "Kenya", station: branch,
  region: branch === "Nyeri" ? "Nyeri" : "Kiambu", address: `KEFRI ${branch} centre, Kenya`, coordinate: null,
  coordinatePrecision: null, coordinateEvidence: null, phone: "+254722157414", email: "enterprise@kefri.org",
  website: "https://enterprise.kefri.org/", ordering: "Use the official product page or contact Enterprise to confirm the unit, lot, stock and supplying centre.",
  delivery: "Seed dispatch is available at extra transport cost according to KEFRI's seed FAQ; confirm terms with the centre.", evidence: kefriEvidence,
})

const aliases: Record<string, string> = { "gravillea robusta": "Grevillea robusta", "eucalyptus camaldulensis)": "Eucalyptus camaldulensis", "cypress lustanica": "Cupressus lusitanica" }
const canonicalName = (name: string) => aliases[name.toLowerCase()] ?? name[0].toUpperCase() + name.slice(1).toLowerCase()
const forestryGenus = /^(Acacia|Albizia|Casuarina|Cordia|Croton|Cupressus|Cypress|Eucalyptus|Gmelina|Gravillea|Grevillea|Juniperus|Khaya|Maesopsis|Markhamia|Melia|Milicia|Pinus|Podocarpus|Prunus|Tectona|Terminalia|Vitex) /i

const kefriOffers: PlantingMaterialOffer[] = kefriRows.filter((row) => forestryGenus.test(row.name)).map((row) => {
  const name = canonicalName(row.name)
  const evidence = materialEvidence(`kefri-${row.url.match(/id=(\d+)/)?.[1]}`, row.url, null,
    `Official ${row.branch} ${row.material} catalogue, accessed ${row.accessedAt}. Original name: ${row.name}. Publication date and live stock are not provided.`, true)
  const base = { id: evidence.sourceId, productId: `${row.material}-${seedSlug(name)}`, scientificName: name, supplier: kefriSupplier(row.branch),
    variety: null, provenance: null, availability: "unknown" as const, availabilityNote: "Listed in the official catalogue; confirm stock and final quotation.", evidence }
  if (row.material === "seed") return { ...base, material: "seed", technical: emptySeedTechnical(evidence),
    quotes: [{ amount: row.amount, currency: row.currency, quantity: null, unit: "unknown", evidence: { ...evidence, confidence: "low",
      notes: "The displayed price has no documented mass or pack size. Many entries repeat KES 10. Retained as a source observation, excluded from comparisons pending supplier confirmation; not assumed to be per kg." } }] }
  return { ...base, material: "seedling", capacity: null, traceability: null,
    quotes: [{ amount: row.amount, currency: row.currency, quantity: 1, unit: "seedling", evidence: { ...evidence, confidence: "medium",
      notes: "Individual seedling product in the official Seedlings branch catalogue. No quoted bulk tier. Confirm pot size and the final quote before purchase." } }] }
})

const nfaEvidence = materialEvidence("nfa-seed-management", "https://standards.nfa.go.ug/en/Seed-and-nursery-management/seed-management", null,
  "Official NFA standards identify NTSC as a producer, importer and supplier of tree seed. Species-specific offers below are historical observations, not a current stock assertion.", true)
const nfaSupplier: MaterialSupplier = { id: "nfa-ntsc", name: "NFA — National Tree Seed Centre", country: "Uganda", station: "Namanve",
  region: "Mukono", address: "National Tree Seed Centre, Namanve, Kampala–Jinja Highway, Uganda", coordinate: null, coordinatePrecision: null, coordinateEvidence: null,
  phone: null, email: null, website: "https://nfa.go.ug/", ordering: "Contact NFA / NTSC to request current seed lots, provenance, test certificates and prices.",
  delivery: "Collection and delivery terms require confirmation.", evidence: nfaEvidence }
// Species-level seed-supply observations from the government SPGS issue, not seedling price rows.
const nfaHistoricalSeeds = [
  { name: "Eucalyptus grandis", origin: "Fort Portal", price: 90000 },
  { name: "Maesopsis eminii", origin: "Mayuge & Masaka", price: 50000 },
  { name: "Terminalia superba", origin: "Mabira", price: 50000 },
  { name: "Terminalia ivorensis", origin: "Mabira", price: 50000 },
  { name: "Pinus patula", origin: "Echuya", price: 500000 },
]
const nfaOffers: PlantingMaterialOffer[] = nfaHistoricalSeeds.map((row) => {
  const evidence = materialEvidence(`spgs-24-ntsc-${seedSlug(row.name)}`, "https://spgs.mwe.go.ug/sites/files/SPGS%20Issue%2024.pdf", "2009-07",
    "Historical NTSC seed supply in government SPGS Issue 24. Current species/source availability and price have not been verified; origin describes the historical offer only.")
  return { id: evidence.sourceId, productId: `seed-${seedSlug(row.name)}`, scientificName: row.name, material: "seed", supplier: nfaSupplier,
    variety: null, provenance: `${row.origin} (historical)`, availability: "unknown", availabilityNote: "Historical supply record; ask NTSC whether this source is currently offered.", evidence,
    quotes: [{ amount: null, currency: "UGX", quantity: 1, unit: "kg", evidence: { ...evidence, kind: "unknown" } }],
    historicalQuotes: [{ amount: row.price, currency: "UGX", quantity: 1, unit: "kg", evidence }],
    technical: { ...emptySeedTechnical(evidence), origin: `${row.origin} — historical 2009 record` } }
})

const greeningUrl = "https://greeninguganda.com/growing_hass/GREENING_UGANDA_TREE_SEEDS_PRICELIST_2025.pdf"
const greeningEvidence = materialEvidence("greening-uganda-seeds-2025", greeningUrl, "2025", "Supplier's 2025 seed price list; 2026 prices and live stock have not been confirmed.")
const greeningSupplier: MaterialSupplier = { id: "greening-uganda", name: "Greening Uganda", country: "Uganda", station: null, region: "Wakiso",
  address: "Kisubi, Entebbe Road; P.O. Box 20029, Kampala", coordinate: null, coordinatePrecision: null, coordinateEvidence: null,
  phone: "+256776200002", email: "greening.uganda@gmail.com", website: "https://greeninguganda.com/",
  ordering: "Contact the supplier quoting the species and seed origin; confirm current price, availability and seed-lot quality.", delivery: "Confirm transport and collection terms.", evidence: greeningEvidence }
const greeningOffers: PlantingMaterialOffer[] = [
  { name: "Pinus patula", amount: 700000, origin: "Locally collected", row: 92, seeds: 150000, treatment: "No pretreatment required (supplier guidance)." },
  { name: "Eucalyptus grandis", amount: 300000, origin: "Fort Portal, Lendu provenance", row: 49, seeds: 448000, treatment: "No pretreatment required (supplier guidance)." },
  { name: "Cupressus lusitanica", amount: 85000, origin: null, row: 38, seeds: 50000, treatment: "No pretreatment required (supplier guidance)." },
  { name: "Maesopsis eminii", amount: 50000, origin: null, row: 68, seeds: 990, treatment: "No pretreatment required (supplier guidance)." },
  { name: "Melia volkensii", amount: 150000, origin: null, row: 72, seeds: 1700, treatment: "No pretreatment required (supplier guidance)." },
  { name: "Tectona grandis", amount: 60000, origin: null, row: 112, seeds: 1300, treatment: "Soak in cold water for 72 hours (supplier guidance)." },
].map((row) => ({ id: `greening-seed-${row.row}`, productId: `seed-${seedSlug(row.name)}`, scientificName: row.name,
  material: "seed", supplier: greeningSupplier, variety: null, provenance: row.origin, availability: "unknown",
  availabilityNote: "Published in 2025; request current stock and seed-lot details.", evidence: { ...greeningEvidence, sourceId: `greening-2025-row-${row.row}` },
  quotes: [{ amount: null, currency: "UGX", quantity: 1, unit: "kg", evidence: { ...greeningEvidence, kind: "unknown" } }],
  historicalQuotes: [{ amount: row.amount, currency: "UGX", quantity: 1, unit: "kg", evidence: greeningEvidence }],
  technical: { ...emptySeedTechnical(greeningEvidence), origin: row.origin, seedsPerKg: row.seeds, pretreatment: row.treatment },
}))

export const supplementalSeedOffers = [...kefriOffers.filter((offer) => offer.material === "seed"), ...nfaOffers, ...greeningOffers]
export const supplementalSeedlingOffers: PlantingMaterialOffer[] = [...kefriOffers.filter((offer) => offer.material === "seedling"),
  ...nfaSeedlingRows.map((row): PlantingMaterialOffer => {
    const evidence = materialEvidence(`nfa-seedlings-row-${row.row}`, "https://nfa.go.ug/images/NFA_SEEDLINGS_PRICELIST_UPDATED.pdf", "2023–2024",
      "Historical seedling price list. Pot sizes and varieties retained separately; no current stock or price verification.")
    return { id: evidence.sourceId, productId: `seedling-${seedSlug(row.product)}`, scientificName: row.product, supplier: nfaSupplier, material: "seedling",
      variety: `${"variety" in row && row.variety ? `${row.variety}, ` : ""}${row.potSizeInches}-inch pot`, provenance: null, capacity: null, traceability: null,
      availability: "unknown", availabilityNote: "Historical nursery listing; confirm current price and stock.", evidence,
      quotes: [], historicalQuotes: [{ amount: row.amount, currency: "UGX", quantity: 1, unit: "seedling", evidence }] }
  }),
]
