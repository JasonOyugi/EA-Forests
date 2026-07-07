"use client"

import type { FeatureCollection, Geometry } from "geojson"

export type BasicSsmtCountryCode = "KEN" | "TZA" | "UGA"

export interface BasicSsmtProperties {
  country: "Kenya" | "Tanzania" | "Uganda" | string
  country_code: BasicSsmtCountryCode | string
  species_name: string
  genus: string
  species: string
  suitability_name: string
  suitability_rank: number
  soil_suitability?: string | null
  soil_type?: string | null
  soil_description?: string | null
  site_class?: string | null
  maz?: string | null
  maz_zone?: string | null
  tz?: string | null
  frost_risk?: string | null
  source_layer: string
}

export type BasicSsmtFeatureCollection = FeatureCollection<
  Geometry,
  BasicSsmtProperties
>

export interface BasicSsmtCountryMetadata {
  code: BasicSsmtCountryCode
  name: "Kenya" | "Tanzania" | "Uganda"
}

export interface BasicSsmtSpeciesMetadata {
  species_name: string
  genus: string
  species: string
}

export interface BasicSsmtSuitabilityMetadata {
  name: string
  rank: number
  color: string
}

export interface BasicSsmtChunkMetadata {
  country_code: BasicSsmtCountryCode
  genus: string
  species_name: string
  suitability_name: string
  href: string
  feature_count: number
}

export interface BasicSsmtMetadata {
  schema_version: number
  generated_at: string | null
  generated: boolean
  source_layers: Record<BasicSsmtCountryCode, string>
  countries: BasicSsmtCountryMetadata[]
  genera: string[]
  species: BasicSsmtSpeciesMetadata[]
  suitability: BasicSsmtSuitabilityMetadata[]
  chunks: BasicSsmtChunkMetadata[]
  notes?: string[]
}

export interface BasicSsmtFilters {
  countryCode: "all" | BasicSsmtCountryCode
  genus: "all" | string
  speciesName: "all" | string
  suitabilityNames: string[]
}

export const basicSsmtMetadataUrl = "/data/basic-ssmt/metadata.json"

const suitabilityFallbacks: Record<string, BasicSsmtSuitabilityMetadata> = {
  "Very suitable": { name: "Very suitable", rank: 1, color: "#166534" },
  "Moderately suitable": {
    name: "Moderately suitable",
    rank: 2,
    color: "#65a30d",
  },
  "Marginally suitable": {
    name: "Marginally suitable",
    rank: 3,
    color: "#d97706",
  },
  "Not suitable": { name: "Not suitable", rank: 4, color: "#991b1b" },
  "Possibly suitable": {
    name: "Possibly suitable",
    rank: 3.5,
    color: "#ca8a04",
  },
  Unknown: { name: "Unknown", rank: 99, color: "#64748b" },
}

export function getSuitabilityStyle(
  suitabilityName: string | null | undefined,
  metadata: BasicSsmtMetadata | null,
  opacity: number
) {
  const normalizedName = suitabilityName || "Unknown"
  const found = metadata?.suitability.find((item) => item.name === normalizedName)
  const fallback =
    suitabilityFallbacks[normalizedName] ?? suitabilityFallbacks.Unknown
  const meta = found ?? fallback

  return {
    color: meta.color,
    fillColor: meta.color,
    fillOpacity: opacity,
    opacity: Math.min(0.95, opacity + 0.28),
    weight: meta.rank === 1 ? 1.6 : 1.1,
  }
}

export function getDefaultBasicSsmtFilters(
  metadata: BasicSsmtMetadata | null
): BasicSsmtFilters {
  const meliaVolkensii = metadata?.species.find(
    (item) =>
      item.genus.toLowerCase() === "melia" &&
      item.species.toLowerCase() === "volkensii"
  )
  const verySuitable = metadata?.suitability.find(
    (item) => item.name === "Very suitable"
  )

  return {
    countryCode: "all",
    genus: meliaVolkensii?.genus ?? "all",
    speciesName: meliaVolkensii?.species_name ?? "all",
    suitabilityNames: verySuitable
      ? [verySuitable.name]
      : metadata?.suitability.map((item) => item.name) ?? [],
  }
}

export function filterBasicSsmtChunks(
  metadata: BasicSsmtMetadata,
  filters: BasicSsmtFilters
) {
  return metadata.chunks.filter((chunk) => {
    const countryMatches =
      filters.countryCode === "all" || chunk.country_code === filters.countryCode
    const genusMatches = filters.genus === "all" || chunk.genus === filters.genus
    const speciesMatches =
      filters.speciesName === "all" || chunk.species_name === filters.speciesName
    const suitabilityMatches =
      filters.suitabilityNames.length === 0 ||
      filters.suitabilityNames.includes(chunk.suitability_name)

    return countryMatches && genusMatches && speciesMatches && suitabilityMatches
  })
}

export function getSpeciesForGenus(
  metadata: BasicSsmtMetadata | null,
  genus: "all" | string
) {
  if (!metadata) return []
  return metadata.species.filter(
    (item) => genus === "all" || item.genus === genus
  )
}

export function normalizeSuitabilityName(value: unknown) {
  const raw = String(value ?? "").trim()
  if (!raw) return "Unknown"
  const lower = raw.toLowerCase().replace(/[_-]+/g, " ")

  if (lower.includes("very")) return "Very suitable"
  if (lower.includes("moderate")) return "Moderately suitable"
  if (lower.includes("marginal")) return "Marginally suitable"
  if (lower.includes("not")) return "Not suitable"

  return raw
}

export function getSuitabilityRank(value: unknown) {
  const normalized = normalizeSuitabilityName(value)
  return suitabilityFallbacks[normalized]?.rank ?? 99
}

export function deriveBasicSsmtSpecies(speciesName: unknown) {
  const raw = String(speciesName ?? "").trim()
  if (!raw) {
    return { genus: "Unknown/Other", species: "" }
  }

  const aliases: Record<string, { genus: string; species: string }> = {
    a_augustifolia: { genus: "Araucaria", species: "angustifolia" },
    a_cuninghamii: { genus: "Araucaria", species: "cunninghamii" },
    a_hunstenii: { genus: "Araucaria", species: "hunsteinii" },
    a_crassica: { genus: "Acacia", species: "crassicarpa" },
    a_crassicarpa: { genus: "Acacia", species: "crassicarpa" },
    a_mangium: { genus: "Acacia", species: "mangium" },
    a_mang_au: { genus: "Acacia", species: "mangium_auriculoformis" },
    a_mang_auriculof: { genus: "Acacia", species: "mangium_auriculoformis" },
    a_mearnsii: { genus: "Acacia", species: "mearnsii" },
    a_quanzensis: { genus: "Afzelia", species: "quanzensis" },
    c_citrio_citrio: { genus: "Corymbia", species: "citriodora_citriodora" },
    c_citrio_varieg: { genus: "Corymbia", species: "citriodora_variegata" },
    c_citriodora_citriodora: {
      genus: "Corymbia",
      species: "citriodora_citriodora",
    },
    c_citriodora_variegata: {
      genus: "Corymbia",
      species: "citriodora_variegata",
    },
    c_cunninghamiana: { genus: "Casuarina", species: "cunninghamiana" },
    c_equisetifolia: { genus: "Casuarina", species: "equisetifolia" },
    c_henryi: { genus: "Corymbia", species: "henryi" },
    c_henryi_torreliana: { genus: "Corymbia", species: "henryi_torreliana" },
    c_junghunhiana: { genus: "Casuarina", species: "junghunhiana" },
    c_lusitanica: { genus: "Cupressus", species: "lusitanica" },
    c_maculata: { genus: "Corymbia", species: "maculata" },
    c_odorata: { genus: "Cedrella", species: "odorata" },
    c_oligodon: { genus: "Casuarina", species: "oligodon" },
    c_torrel_henryi: { genus: "Corymbia", species: "torreliana_henryi" },
    c_torreliana: { genus: "Corymbia", species: "torreliana" },
    g_arborea: { genus: "Gmelina", species: "arborea" },
    g_robusta: { genus: "Grevillea", species: "robusta" },
    k_anthotheca: { genus: "Khaya", species: "anthotheca" },
    m_eminii: { genus: "Maesopsis", species: "eminii" },
    m_excelsa: { genus: "Milicia", species: "excelsa" },
    m_volkensi: { genus: "Melia", species: "volkensii" },
    m_volkensii: { genus: "Melia", species: "volkensii" },
    t_grandis: { genus: "Tectona", species: "grandis" },
  }

  const alias = aliases[raw.toLowerCase()]
  if (alias) return alias

  const [prefix = "", ...rest] = raw.split(/[_\s]+/).filter(Boolean)
  const normalizedPrefix = prefix.replace(/\.$/, "")
  const genusByInitial: Record<string, string> = {
    E: "Eucalyptus",
    P: "Pinus",
    Grevillia: "Grevillea",
  }

  const genus = genusByInitial[normalizedPrefix] ?? normalizedPrefix
  return {
    genus: genus || "Unknown/Other",
    species: rest.join("_"),
  }
}

export async function loadBasicSsmtMetadata(signal?: AbortSignal) {
  const response = await fetch(basicSsmtMetadataUrl, { signal })
  if (!response.ok) {
    throw new Error(`Basic SSMT metadata is unavailable (${response.status})`)
  }

  return (await response.json()) as BasicSsmtMetadata
}

export async function loadBasicSsmtChunks(
  chunks: BasicSsmtChunkMetadata[],
  signal?: AbortSignal
) {
  const collections = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(chunk.href, { signal })
      if (!response.ok) {
        throw new Error(`Basic SSMT chunk is unavailable: ${chunk.href}`)
      }

      return (await response.json()) as BasicSsmtFeatureCollection
    })
  )

  return collections.flatMap((collection) => collection.features)
}
