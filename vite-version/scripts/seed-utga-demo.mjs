import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const databasePath = resolve(scriptDirectory, "../src/app/shop/data/market-databases/nurseries.json")
const database = JSON.parse(readFileSync(databasePath, "utf8"))

const catalogue = [
  ["eucalyptus", "Eucalyptus grandis", ["Standard", "Improved seed"]],
  ["eucalyptus", "Eucalyptus urophylla", ["Standard", "Seed orchard selected"]],
  ["eucalyptus", "Eucalyptus nitens", ["Standard", "Highland provenance"]],
  ["eucalyptus", "Eucalyptus saligna", ["Standard", "Improved seed"]],
  ["eucalyptus", "Eucalyptus camaldulensis", ["Standard", "Dryland provenance"]],
  ["eucalyptus", "Eucalyptus grandis x urophylla", ["3", "4", "7", "8", "411", "111"]],
  ["eucalyptus", "Eucalyptus grandis x camaldulensis", ["3", "4", "7", "8", "411", "111"]],
  ["eucalyptus", "Eucalyptus grandis x nitens", ["3", "4"]],
  ["eucalyptus", "Eucalyptus saligna x urophylla", ["3", "4"]],
  ["melia", "Melia volkensii", ["Standard", "Dryland selected"]],
  ["gmelina", "Gmelina arborea", ["Standard", "Fast-growth selected"]],
  ["tectona", "Tectona grandis", ["Standard", "Certified teak source"]],
  ["maesopsis", "Maesopsis eminii", ["Standard"]],
  ["grevillea", "Grevillea robusta", ["Standard", "Farm forestry selected"]],
  ["pinus", "Pinus caribaea", ["Standard", "Hondurensis provenance"]],
  ["pinus", "Pinus patula", ["Standard", "Highland provenance"]],
  ["pinus", "Pinus patula x tecunumanii", ["Standard", "PT-01"]],
  ["pinus", "Pinus elliottii x caribaea", ["Standard", "PE-C1"]],
  ["pinus", "Pinus maximinoi", ["Standard", "Improved seed"]],
]

const round = (value) => Number(value.toFixed(4))
const grouped = new Map()
let optionIndex = 0

for (const [genus, species, varieties] of catalogue) {
  const group = grouped.get(genus) ?? {
    genus,
    species: [],
    varieties: [],
  }
  group.species.push(species)

  varieties.forEach((variety, varietyIndex) => {
    const unitPrice = round(0.13 + optionIndex * 0.006 + varietyIndex * 0.004)
    group.varieties.push({
      species,
      variety,
      price: {
        perSeedling: unitPrice,
        per100Seedlings: round(unitPrice * 100 * 0.97),
        per500Seedlings: round(unitPrice * 500 * 0.93),
        per1000Seedlings: round(unitPrice * 1000 * 0.9),
      },
      capacity: 10000 + optionIndex * 500 + varietyIndex * 1000,
      availability: ["available", "seasonal", "order_only"][(optionIndex + varietyIndex) % 3],
      traceability: ["verified", "known", "partial"][(optionIndex + varietyIndex) % 3],
    })
  })

  optionIndex += 1
  grouped.set(genus, group)
}

const utga = database.nurseries.find((nursery) => nursery.id === "utga-nursery")
if (!utga) throw new Error("UTGA Nursery was not found")

utga.country = "Uganda"
utga.region = "Wakiso"
utga.address = "UTGA demonstration nursery, Wakiso, Uganda"
utga.genera = [...grouped.values()]
utga.totalCapacity = utga.genera
  .flatMap((genus) => genus.varieties.map((option) => option.capacity))
  .reduce((sum, capacity) => sum + capacity, 0)
utga.transport = "Buyer pickup or regional delivery by arrangement"
utga.certification = "Demonstration certification record"
utga.contact = {
  person: "UTGA Nursery Desk",
  phone: "+256 700 000 000",
  other: "nursery@utga.example",
}
utga.comments = "Dummy variety-level data for testing product filters, prices, capacity, availability, and traceability. Replace with verified commercial records."
utga.source = {
  database: "EA Forests functional demonstration dataset",
  sourceId: "UG-DEMO-UTGA",
  url: null,
  dataVintage: "2026",
  coordinatePrecision: "Demonstration point",
  coordinateConfidence: "Demo",
}

database.lastUpdated = "2026-08-19"
writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8")
console.log(`Seeded UTGA with ${catalogue.length} species and ${utga.genera.flatMap((genus) => genus.varieties).length} variety rows.`)
