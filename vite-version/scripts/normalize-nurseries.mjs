import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const databasePath = resolve(scriptDirectory, "../src/app/shop/data/market-databases/nurseries.json")
const legacyDatabase = JSON.parse(readFileSync(databasePath, "utf8"))

if (Array.isArray(legacyDatabase.nurseries)) {
  for (const nursery of legacyDatabase.nurseries) {
    for (const genus of nursery.genera) {
      if (!Array.isArray(genus.varieties)) {
        const legacyVarieties = genus.varieties
        const legacyArrays = {
          pricesPerSeedling: genus.pricesPerSeedling,
          pricesPer100Seedlings: genus.pricesPer100Seedlings,
          pricesPer500Seedlings: genus.pricesPer500Seedlings,
          pricesPer1000Seedlings: genus.pricesPer1000Seedlings,
          capacity: genus.capacity,
          traceability: genus.traceability,
          availability: genus.availability,
        }
        const varietyEntries = []
        const nextArrays = Object.fromEntries(
          Object.keys(legacyArrays).map((key) => [key, []])
        )

        genus.species.forEach((species, speciesIndex) => {
          const names = legacyVarieties[species]?.length
            ? legacyVarieties[species]
            : ["Standard"]

          names.forEach((variety) => {
            varietyEntries.push({ species, variety })
            for (const [key, values] of Object.entries(legacyArrays)) {
              const value = values[speciesIndex] ?? null
              nextArrays[key].push(
                key === "capacity" && value != null
                  ? Math.round(value / names.length)
                  : value
              )
            }
          })
        })

        genus.varieties = varietyEntries
        Object.assign(genus, nextArrays)
      }

      genus.varieties = genus.varieties.map((option, index) => ({
        species: option.species,
        variety: option.variety,
        price: option.price ?? {
          perSeedling: genus.pricesPerSeedling?.[index] || null,
          per100Seedlings: genus.pricesPer100Seedlings?.[index] || null,
          per500Seedlings: genus.pricesPer500Seedlings?.[index] || null,
          per1000Seedlings: genus.pricesPer1000Seedlings?.[index] || null,
        },
        capacity: option.capacity ?? (genus.capacity?.[index] || null),
        availability: option.availability ?? genus.availability?.[index] ?? null,
        traceability: option.traceability ?? genus.traceability?.[index] ?? null,
      }))
      delete genus.pricesPerSeedling
      delete genus.pricesPer100Seedlings
      delete genus.pricesPer500Seedlings
      delete genus.pricesPer1000Seedlings
      delete genus.capacity
      delete genus.traceability
      delete genus.availability
    }
    const varietyCapacities = nursery.genera
      .flatMap((genus) => genus.varieties.map((option) => option.capacity))
      .filter((capacity) => capacity != null)
    nursery.totalCapacity = varietyCapacities.length
      ? varietyCapacities.reduce((sum, capacity) => sum + capacity, 0)
      : null
  }
  const utga = legacyDatabase.nurseries.find((nursery) => nursery.id === "utga-nursery")
  const utgaEucalyptus = utga?.genera.find((genus) => genus.genus === "eucalyptus")
  if (utgaEucalyptus) {
    utgaEucalyptus.varieties[0].price = {
      perSeedling: 0.1351,
      per100Seedlings: 13.51,
      per500Seedlings: 67.55,
      per1000Seedlings: 135.1,
    }
  }
  legacyDatabase.schemaVersion = 4
  writeFileSync(databasePath, `${JSON.stringify(legacyDatabase, null, 2)}\n`, "utf8")
  console.log(`Nested commercial data into variety objects for ${legacyDatabase.nurseries.length} nursery records.`)
  process.exit(0)
}

const usdRates = { USD: 1, UGX: 3700, KES: 129, TZS: 2600 }
const knownSpecies = [
  "Eucalyptus grandis",
  "Eucalyptus urophylla",
  "Eucalyptus nitens",
  "Eucalyptus saligna",
  "Eucalyptus camaldulensis",
  "Eucalyptus grandis x urophylla",
  "Eucalyptus grandis x camaldulensis",
  "Eucalyptus grandis x nitens",
  "Eucalyptus saligna x urophylla",
  "Acacia spp.",
  "Pinus caribaea",
  "Pinus patula",
  "Pinus patula x tecunumanii",
  "Pinus elliottii x caribaea",
  "Pinus maximinoi",
  "Cupressus lusitanica",
  "Melia volkensii",
  "Gmelina arborea",
  "Grevillea robusta",
  "Tectona grandis",
  "Maesopsis eminii",
  "Casuarina equisetifolia",
  "Terminalia spp.",
  "Bamboo seedlings",
]

const genusLabels = {
  eucalyptus: "Eucalyptus",
  acacia: "Acacia",
  pinus: "Pine",
  cupressus: "Cypress",
  melia: "Melia",
  gmelina: "Gmelina",
  grevillea: "Grevillea",
  tectona: "Teak",
  maesopsis: "Maesopsis",
  casuarina: "Casuarina",
  terminalia: "Terminalia",
  bamboo: "Bamboo",
  other: "Other",
}

const asNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const normalized = String(value ?? "").replaceAll(",", "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const cleanText = (value) => String(value ?? "").trim()
const roundUsd = (value) => value == null ? null : Number(value.toFixed(4))
const slugify = (value) => value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")

function normalizeSpecies(rawValue, materialTypes) {
  const raw = cleanText(rawValue)
  const lower = raw.toLowerCase()
  const material = materialTypes.map(cleanText).find(Boolean) ?? ""

  if (/^gc\s*550$/i.test(raw)) {
    return { species: "Eucalyptus grandis x camaldulensis", variety: "550" }
  }
  if (/^gu\s*7$/i.test(raw)) {
    return { species: "Eucalyptus grandis x urophylla", variety: "7" }
  }
  if (lower === "clones" && /grandis\s*x\s*urophylla/i.test(material)) {
    return { species: "Eucalyptus grandis x urophylla", variety: "Unspecified clone" }
  }
  if (/^e\.\s*/i.test(raw)) {
    return { species: raw.replace(/^e\.\s*/i, "Eucalyptus "), variety: null }
  }
  if (["eucalyptus", "clonal eucalyptus", "eucalyptus planting material"].includes(lower)) {
    return { species: "Eucalyptus spp.", variety: lower === "clonal eucalyptus" ? "Unspecified clone" : null }
  }
  if (lower === "pine") return { species: "Pinus spp.", variety: null }
  if (lower === "bamboo seedlings") return { species: "Bamboo seedlings", variety: null }
  if (/commercial forestry|specific catalogues|kefri register|other commercial/i.test(raw)) {
    return { species: raw || "Other registered species", variety: null }
  }
  return { species: raw || material || "Other registered species", variety: null }
}

function genusFor(species) {
  const firstWord = species.split(/\s+/)[0].toLowerCase()
  if (firstWord === "pine") return "pinus"
  if (firstWord === "cypress") return "cupressus"
  if (firstWord === "bamboo") return "bamboo"
  return Object.hasOwn(genusLabels, firstWord) ? firstWord : "other"
}

function getLegacyPrice(spec, rawSpecies, canonicalSpecies) {
  const prices = spec.prices ?? {}
  const direct = asNumber(prices[rawSpecies])
  const canonical = asNumber(prices[canonicalSpecies])
  const entries = Object.values(prices).map(asNumber).filter((value) => value != null)
  const legacyPrice = direct ?? canonical ?? (entries.length === 1 ? entries[0] : null)
  if (legacyPrice == null) return null

  const currency = cleanText(spec.price_mode).toUpperCase()
  const rate = usdRates[currency] ?? 1
  return roundUsd(legacyPrice / rate)
}

const usedIds = new Map()
const allSpecies = new Set(knownSpecies)
const nurseries = Object.entries(legacyDatabase).map(([name, record]) => {
  const genusRows = new Map()

  for (const spec of Object.values(record.supply_specs ?? {})) {
    const rawSpecies = (spec.species_or_clones ?? []).filter((value) => cleanText(value))
    const fallbackSpecies = rawSpecies.length ? rawSpecies : (spec.material_types ?? []).filter((value) => cleanText(value))
    const normalized = fallbackSpecies.map((value) => ({
      raw: cleanText(value),
      ...normalizeSpecies(value, spec.material_types ?? []),
    }))
    const genusCapacity = asNumber(spec.capacity)
    const allocatedCapacity = genusCapacity == null || normalized.length === 0
      ? null
      : Math.round(genusCapacity / normalized.length)

    for (const material of normalized) {
      const genus = genusFor(material.species)
      const row = genusRows.get(genus) ?? new Map()
      const existing = row.get(material.species) ?? {
        varieties: [],
        pricePerSeedling: null,
        capacity: null,
        traceability: cleanText(spec.source_traceability) || null,
        availability: cleanText(spec.availability) || null,
      }
      if (material.variety && !existing.varieties.includes(material.variety)) {
        existing.varieties.push(material.variety)
      }
      existing.pricePerSeedling ??= getLegacyPrice(spec, material.raw, material.species)
      existing.capacity ??= allocatedCapacity
      row.set(material.species, existing)
      genusRows.set(genus, row)
      allSpecies.add(material.species)
    }
  }

  const genera = [...genusRows.entries()].map(([genus, speciesMap]) => {
    const species = [...speciesMap.keys()]
    const values = [...speciesMap.values()]
    const varietyRows = species.flatMap((speciesName, speciesIndex) => {
      const value = values[speciesIndex]
      const varieties = value.varieties.length ? value.varieties : ["Standard"]
      return varieties.map((variety) => ({
        species: speciesName,
        variety,
        value,
        varietyCount: varieties.length,
      }))
    })
    return {
      genus,
      species,
      varieties: varietyRows.map(({ species: speciesName, variety, value, varietyCount }) => ({
        species: speciesName,
        variety,
        price: {
          perSeedling: value.pricePerSeedling,
          per100Seedlings: roundUsd(value.pricePerSeedling == null ? null : value.pricePerSeedling * 100),
          per500Seedlings: roundUsd(value.pricePerSeedling == null ? null : value.pricePerSeedling * 500),
          per1000Seedlings: roundUsd(value.pricePerSeedling == null ? null : value.pricePerSeedling * 1000),
        },
        capacity: value.capacity == null ? null : Math.round(value.capacity / varietyCount),
        availability: value.availability,
        traceability: value.traceability,
      })),
    }
  })

  const baseId = slugify(name) || "nursery"
  const duplicateIndex = usedIds.get(baseId) ?? 0
  usedIds.set(baseId, duplicateIndex + 1)
  const id = duplicateIndex === 0 ? baseId : `${baseId}-${duplicateIndex + 1}`
  const capacities = genera.flatMap((genus) => genus.varieties.map((option) => option.capacity)).filter((value) => value != null)
  const legacyTotalCapacity = asNumber(record["Total capacity"])

  return {
    id,
    name,
    lon: asNumber(record.lon),
    lat: asNumber(record.lat),
    country: cleanText(record["Country source"]) || null,
    region: cleanText(record["Region / county"]) || null,
    address: cleanText(record["Published locality / address"]) || null,
    genera,
    totalCapacity: capacities.length
      ? capacities.reduce((sum, capacity) => sum + capacity, 0)
      : legacyTotalCapacity,
    transport: cleanText(record.Transport) || null,
    certification: cleanText(record.Certification) && !/test record/i.test(record.Certification)
      ? cleanText(record.Certification)
      : null,
    contact: {
      person: cleanText(record["Contact person"]) || null,
      phone: cleanText(record.Phone) || null,
      other: cleanText(record.Contact) || null,
    },
    comments: cleanText(record.Comments) || null,
    source: {
      database: cleanText(record.Database) || null,
      sourceId: cleanText(record["Source ID"]) || null,
      url: cleanText(record.Source || record["Additional source URL"]) || null,
      dataVintage: cleanText(record["Data vintage"]) || null,
      coordinatePrecision: cleanText(record["Coordinate precision"]) || null,
      coordinateConfidence: cleanText(record["Coordinate confidence"]) || null,
    },
  }
})

const availableGenera = Object.entries(genusLabels).map(([id, label]) => ({
  id,
  label,
  species: [...allSpecies].filter((species) => genusFor(species) === id).sort(),
}))

const normalizedDatabase = {
  schemaVersion: 4,
  lastUpdated: "2026-08-19",
  currency: "USD",
  availableGenera,
  nurseries,
}

writeFileSync(databasePath, `${JSON.stringify(normalizedDatabase, null, 2)}\n`, "utf8")
console.log(`Normalized ${nurseries.length} nursery records across ${availableGenera.length} genera.`)
