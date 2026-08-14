import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const nurseryPath = path.join(
  projectRoot,
  "src",
  "app",
  "shop",
  "data",
  "market-databases",
  "nurseries.json"
)
const cataloguePath = path.join(
  projectRoot,
  "src",
  "app",
  "shop",
  "data",
  "seedlings.json"
)

const nurseries = JSON.parse(fs.readFileSync(nurseryPath, "utf8"))

const images = {
  eucalyptus:
    "https://files.crtgroupstorage.com/assets/silviculture/627B295A-A403-A78E-B34A-2650F3016798.jpg",
  eucalyptusAlt:
    "https://files.crtgroupstorage.com/assets/silviculture/63DAD0BA-CC9F-0B9C-655B-546A6A26E8A7.jpg",
  pine:
    "https://files.crtgroupstorage.com/assets/silviculture/F1467843-D02B-67BD-FB09-98CEB0D4F747.jpg",
  melia:
    "https://static.wixstatic.com/media/b9a05c_a9337f30a32b4dcc872ec0232647eeb4~mv2.jpg/v1/fill/w_959,h_705,al_c,q_85,enc_avif,quality_auto/b9a05c_a9337f30a32b4dcc872ec0232647eeb4~mv2.jpg",
}

function normalizeMaterial(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/[().,_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getNurseryMaterials(record) {
  return [
    record.Products,
    ...Object.values(record.supply_specs).flatMap((spec) => [
      ...spec.material_types,
      ...spec.species_or_clones,
    ]),
  ]
    .map(normalizeMaterial)
    .filter(Boolean)
}

function nurseryMatches(record, aliases) {
  const materials = new Set(getNurseryMaterials(record))
  return aliases.some((alias) => materials.has(normalizeMaterial(alias)))
}

function packages(basePrice) {
  return [
    {
      id: "small",
      label: "100 seedlings",
      count: 100,
      price: basePrice,
      unitLabel: "per 100 seedlings",
    },
    {
      id: "medium",
      label: "500 seedlings",
      count: 500,
      price: Number((basePrice * 4.6).toFixed(2)),
      unitLabel: "per 500 seedlings",
    },
    {
      id: "large",
      label: "1,000 seedlings",
      count: 1000,
      price: Number((basePrice * 8.8).toFixed(2)),
      unitLabel: "per 1,000 seedlings",
    },
  ]
}

const definitions = [
  {
    key: "gu-7-gu-8",
    name: "Eucalyptus GU 7 / GU 8",
    species: "Eucalyptus",
    materialType: "Clonal material",
    aliases: ["GU 7", "GU 8"],
    description:
      "Named clonal eucalyptus material. The map only includes nurseries whose records explicitly list GU 7 or GU 8.",
    image: images.eucalyptus,
    tags: ["featured", "clonal", "timber"],
    domain: "timber",
    basePrice: 38.99,
  },
  {
    key: "gc-550",
    name: "Eucalyptus GC 550",
    species: "Eucalyptus",
    materialType: "Clonal material",
    aliases: ["GC 550"],
    description:
      "Named eucalyptus clone with supplier availability tied directly to nursery catalogue records.",
    image: images.eucalyptusAlt,
    tags: ["featured", "clonal", "timber"],
    domain: "timber",
    basePrice: 38.99,
  },
  {
    key: "grandis-urophylla",
    name: "Eucalyptus grandis × urophylla",
    species: "Eucalyptus",
    materialType: "Hybrid / clonal material",
    aliases: ["Grandis x Urophylla", "Eucalyptus grandis x urophylla"],
    description:
      "Hybrid material highlighted in the processor information pack for wood-quality potential; suitability remains site dependent.",
    image: images.eucalyptus,
    tags: ["featured", "hybrid", "deck-evidence", "timber"],
    domain: "timber",
    basePrice: 39.99,
  },
  {
    key: "eucalyptus-grandis",
    name: "Eucalyptus grandis",
    species: "Eucalyptus",
    materialType: "Pure species",
    aliases: ["Eucalyptus grandis", "E. grandis"],
    description:
      "Widely recorded commercial eucalyptus planting material across the mapped East African nursery network.",
    image: images.eucalyptusAlt,
    tags: ["featured", "pure-species", "timber"],
    domain: "timber",
    basePrice: 34.99,
  },
  {
    key: "eucalyptus-camaldulensis",
    name: "Eucalyptus camaldulensis",
    species: "Eucalyptus",
    materialType: "Pure species",
    aliases: ["Eucalyptus camaldulensis", "E. camaldulensis"],
    description:
      "Commercial eucalyptus planting material shown only where the nursery record names the species.",
    image: images.eucalyptus,
    tags: ["new", "pure-species", "timber"],
    domain: "timber",
    basePrice: 34.99,
  },
  {
    key: "eucalyptus-saligna-urophylla",
    name: "Eucalyptus saligna × urophylla",
    species: "Eucalyptus",
    materialType: "Hybrid material",
    aliases: ["Saligna x Urophylla", "Eucalyptus saligna x urophylla"],
    description:
      "Information-pack hybrid associated with low splitting risk; no nursery is shown unless it explicitly lists this material.",
    image: images.eucalyptusAlt,
    tags: ["new", "hybrid", "deck-evidence", "timber"],
    domain: "timber",
    basePrice: 39.99,
  },
  {
    key: "eucalyptus-cloeziana",
    name: "Eucalyptus cloeziana",
    species: "Eucalyptus",
    materialType: "Pure species",
    aliases: ["Eucalyptus cloeziana", "Cloeziana"],
    description:
      "Pure eucalyptus species highlighted in the information pack for density, stiffness, and dimensional stability.",
    image: images.eucalyptus,
    tags: ["new", "pure-species", "deck-evidence", "timber"],
    domain: "timber",
    basePrice: 34.99,
  },
  {
    key: "pinus-caribaea",
    name: "Pinus caribaea",
    species: "Pine",
    materialType: "Pure species",
    aliases: ["Pinus caribaea", "P. caribaea"],
    description:
      "Commercial pine planting material recorded across multiple nursery registers in East Africa.",
    image: images
    .pine,
    tags: ["featured", "pure-species", "softwood", "timber"],
    domain: "timber",
    basePrice: 29.99,
  },
  {
    key: "patula-tecunumanii",
    name: "Pinus patula × tecunumanii",
    species: "Pine",
    materialType: "Hybrid material",
    aliases: ["Patula x Tecunumanii", "Pinus patula x tecunumanii"],
    description:
      "Tanzania trials in the information pack identify this hybrid as high-volume material; mapped supply requires an exact nursery listing.",
    image: images.pine,
    tags: ["new", "hybrid", "deck-evidence", "softwood", "timber"],
    domain: "timber",
    basePrice: 34.99,
  },
  {
    key: "elliottii-caribaea",
    name: "Pinus elliottii × caribaea",
    species: "Pine",
    materialType: "Hybrid material",
    aliases: ["Elliottii x Caribaea", "Pinus elliottii x caribaea"],
    description:
      "Information-pack pine hybrid with strong trial performance in suitable sites; availability is not inferred.",
    image: images.pine,
    tags: ["new", "hybrid", "deck-evidence", "softwood", "timber"],
    domain: "timber",
    basePrice: 34.99,
  },
  {
    key: "melia-volkensii",
    name: "Melia volkensii",
    species: "Melia",
    materialType: "Indigenous pure species",
    aliases: ["Melia volkensii"],
    description:
      "Dryland timber and agroforestry species with nursery availability based on explicit catalogue records.",
    image: images.melia,
    tags: ["featured", "indigenous", "agroforestry", "hardwood"],
    domain: "agroforestry",
    basePrice: 29.99,
  },
  {
    key: "gmelina-arborea",
    name: "Gmelina arborea",
    species: "Gmelina",
    materialType: "Pure species",
    aliases: ["Gmelina arborea"],
    description:
      "Fast-growing timber species offered by nurseries that explicitly list Gmelina planting material.",
    image: images.melia,
    tags: ["new", "pure-species", "timber"],
    domain: "timber",
    basePrice: 27.99,
  },
  {
    key: "grevillea-robusta",
    name: "Grevillea robusta",
    species: "Grevillea",
    materialType: "Agroforestry pure species",
    aliases: ["Grevillea robusta"],
    description:
      "Multipurpose agroforestry and timber species with mapped nursery availability.",
    image: images.melia,
    tags: ["new", "agroforestry", "pure-species"],
    domain: "agroforestry",
    basePrice: 24.99,
  },
  {
    key: "maesopsis-eminii",
    name: "Maesopsis eminii",
    species: "Maesopsis",
    materialType: "Indigenous pure species",
    aliases: ["Maesopsis eminii"],
    description:
      "East African timber and restoration species listed by multiple mapped nurseries.",
    image: images.melia,
    tags: ["new", "indigenous", "restoration", "timber"],
    domain: "restoration",
    basePrice: 24.99,
  },
  {
    key: "tectona-grandis",
    name: "Tectona grandis",
    species: "Teak",
    materialType: "Pure species",
    aliases: ["Tectona grandis"],
    description:
      "Teak planting material shown only for nurseries whose catalogues explicitly name the species.",
    image: images.melia,
    tags: ["new", "pure-species", "hardwood", "timber"],
    domain: "timber",
    basePrice: 32.99,
  },
]

const catalogue = definitions.map((definition) => {
  const supplierCount = Object.values(nurseries).filter((record) =>
    nurseryMatches(record, definition.aliases)
  ).length

  return {
    id: `seedlings-${definition.key}`,
    slug: `${definition.key}-seedlings`,
    shop: "seedlings",
    name: definition.name,
    species: definition.species,
    materialType: definition.materialType,
    nurseryVarietyAliases: definition.aliases,
    supplierCount,
    evidenceNote: definition.tags.includes("deck-evidence")
      ? "Genetic material drawn from Information Pack - Large processors_v2.pptx; nursery supply is matched independently."
      : "Nursery supply is matched from the East Africa nursery database.",
    kind: "product",
    unitLabel: "per package",
    price: definition.basePrice,
    currency: "USD",
    description: definition.description,
    image: definition.image,
    tags: definition.tags,
    stockStatus:
      supplierCount === 0 ? "quote" : supplierCount === 1 ? "limited" : "in-stock",
    domain: definition.domain,
    featured: definition.tags.includes("featured"),
    variants: packages(definition.basePrice),
  }
})

fs.writeFileSync(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`)

console.log(
  JSON.stringify(
    catalogue.map(({ name, supplierCount, stockStatus }) => ({
      name,
      supplierCount,
      stockStatus,
    })),
    null,
    2
  )
)
