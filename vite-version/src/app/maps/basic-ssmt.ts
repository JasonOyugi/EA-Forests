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
  return {
    countryCode: "all",
    genus: "all",
    speciesName: "all",
    suitabilityNames: metadata?.suitability.map((item) => item.name) ?? [],
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

  const [prefix = "", ...rest] = raw.split(/[_\s]+/).filter(Boolean)
  const normalizedPrefix = prefix.replace(/\.$/, "")
  const lowerRest = rest.join("_").toLowerCase()
  const genusByInitial: Record<string, string> = {
    E: "Eucalyptus",
    P: "Pinus",
  }

  if (normalizedPrefix === "A") {
    if (lowerRest.includes("araucaria")) {
      return { genus: "Araucaria", species: rest.join("_") }
    }
    if (lowerRest.includes("crassicarpa") || lowerRest.includes("mangium")) {
      return { genus: "Acacia", species: rest.join("_") }
    }

    return { genus: "A", species: rest.join("_") }
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
