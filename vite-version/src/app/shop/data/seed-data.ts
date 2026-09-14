import tfsRows from "./source-data/planting-material/tfs-catalogue.json"
import tfsKey from "./source-data/planting-material/tfs-catalogue-key.json"
import type { ShopItem } from "../types"
import type { MaterialSupplier, PlantingMaterialOffer } from "./planting-material-types"
import { accessedAt, emptySeedTechnical, materialEvidence, seedSlug } from "./material-evidence"
import { supplementalSeedOffers } from "./supplemental-planting-data"
import { plantingGallery } from "./planting-images"

const tfsEvidence = materialEvidence("tfs-centres", "https://seed.tfs.go.tz/TSP-Centres", null,
  "Official directory identifies four centres. Catalogue offers are attributed to the central ordering service, not duplicated as branch stock.", true)
export const tfsSupplier: MaterialSupplier = {
  id: "tfs-seed-production", name: "TFS — Directorate of Tree Seed Production", country: "Tanzania", station: "Morogoro central ordering",
  region: "Morogoro", address: "Dodoma Road, Kihonda area, P.O. Box 373, Morogoro",
  coordinate: { latitude: -6.776, longitude: 37.668 }, coordinatePrecision: "Centre vicinity; confirm collection point",
  coordinateEvidence: { ...tfsEvidence, kind: "inferred", confidence: "medium", notes: "Coordinate reused from the existing nursery database (TZ-N001); centre vicinity, not a surveyed entrance." },
  phone: "+255626578465", email: "seed@tfs.go.tz", website: "https://seed.tfs.go.tz/order-online",
  ordering: "Contact central ordering with the scientific name and source number. Confirm the supplying centre, current price and seed lot.",
  delivery: "Confirm dispatch or collection arrangements with the centre.", evidence: tfsEvidence,
  branches: [
    { name: "Morogoro", address: "Dodoma Road, Kihonda; shares the station headquarters compound.", phone: "+255626578465", sourceUrl: "https://seed.tfs.go.tz/TSP-Centres" },
    { name: "Lushoto", address: "Jaegerstal area, about 2 km from Lushoto along Magamba Road; P.O. Box 258.", phone: "+255626578502", sourceUrl: "https://seed.tfs.go.tz/TSP-Centres" },
    { name: "Iringa", address: "Kibwabwa area, about 7 km from Iringa on the Mbeya Highway; P.O. Box 1121.", phone: "+255626578476", sourceUrl: "https://seed.tfs.go.tz/TSP-Centres" },
    { name: "Shinyanga", address: "Shinyanga Municipal Council; P.O. Box 167.", phone: "+255626578518", sourceUrl: "https://seed.tfs.go.tz/TSP-Centres" },
  ],
}

const number = (value: string) => /^\d+(?:\.\d+)?$/.test(value.trim()) && Number(value) > 0 ? Number(value) : null
export const tfsSeedOffers: PlantingMaterialOffer[] = tfsRows.map((row) => {
  const evidence = materialEvidence(`tfs-catalogue-${row.id}`, "https://seed.tfs.go.tz/catalog", row.updated_at.slice(0, 10),
    "Catalogue is publicly accessible, but this record was last updated in 2017. Price is retained as historical; current price and lot availability are unverified. Technical values describe this source, not a germination guarantee.")
  const quote = { amount: number(row.price_per_kg), currency: "TZS", quantity: 1, unit: "kg" as const, evidence }
  return {
    id: `tfs-seed-${row.id}`, productId: `seed-${seedSlug(row.treename_biological)}`, material: "seed",
    supplier: tfsSupplier, scientificName: row.treename_biological, variety: null,
    provenance: row.accession_no, availability: "unknown", availabilityNote: "Catalogue source; confirm current lot and stock.",
    evidence, quotes: [{ ...quote, amount: null, evidence: { ...evidence, kind: "unknown", notes: "No current price verified; request a quotation." } }],
    historicalQuotes: [quote], technical: {
      ...emptySeedTechnical(evidence), sourceNumber: row.accession_no, commonName: row.treename_swahili || null,
      seedsPerKg: number(row.seeds_per_kg), seedlingsPerKg: number(row.seedlings_per_kg),
      pretreatment: row.seed_preparation ? `${tfsKey.pretreatments[row.seed_preparation as keyof typeof tfsKey.pretreatments]?.english ?? "Ask the centre for treatment guidance."} (TFS code ${row.seed_preparation})` : null,
      nursery: row.gardening_time.replace(/Miezi/i, "Months"),
      plantingZones: `TFS planting zones ${row.planting_region}; use the supplier's Tanzania zoning map.`,
      altitude: `${row.planting_altitude} m`, rainfall: `${row.planting_rain} mm`,
      uses: row.tree_uses.split(",").map((code) => `${tfsKey.uses[code.trim() as keyof typeof tfsKey.uses]?.english ?? "Unresolved source code"} (${code.trim()})`).join("; "),
    },
  }
})

export const seedOffers: PlantingMaterialOffer[] = [...tfsSeedOffers, ...supplementalSeedOffers]
export const seedInventory: ShopItem[] = [...new Set(seedOffers.map((offer) => offer.scientificName))].map((name) => {
  const offers = seedOffers.filter((offer) => offer.scientificName === name)
  const gallery = plantingGallery(name)
  return {
    id: `seed-${seedSlug(name)}`, slug: `${seedSlug(name)}-seeds`, shop: "seedlings", name, species: name.split(" ")[0],
    materialType: "Tree seed", plantingMaterialType: "seed", plantingOffers: offers,
    supplierCount: new Set(offers.map((offer) => offer.supplier.id)).size,
    kind: "product", unitLabel: "per supplier-quoted unit", price: 0, priceAvailable: false, currency: "TZS",
    description: `Compare ${name} seed sources, published seed yields and planting guidance. Confirm the seed lot and availability before ordering.`,
    image: gallery[0]?.url ?? "", imageGallery: gallery, tags: ["seed"], stockStatus: "quote", domain: "timber", updatedAt: accessedAt,
  }
})
