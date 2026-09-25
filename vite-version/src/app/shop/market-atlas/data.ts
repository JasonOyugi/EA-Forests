import marketAtlasFile from "../data/market-atlas/actors.json"
import { marketRegions, type MarketCountry } from "../data/market-map"
import { mappedCountries } from "./market-config"
import type { Actor, ActorMode, EvidenceClass, MarketAtlasFile } from "./types"

export const marketAtlas = marketAtlasFile as unknown as MarketAtlasFile
export const allActors: Actor[] = marketAtlas.actors

const EVIDENCE_RANK: Record<EvidenceClass, number> = { A: 0, B: 1, C: 2, D: 3 }
const CURRENTNESS_RANK: Record<string, number> = {
  current: 0,
  recent: 1,
  verify_current: 1,
  historical: 2,
}

function completenessScore(actor: Actor) {
  const fields = [
    actor.species,
    actor.website,
    actor.email ?? actor.phone,
    actor.summary,
    actor.regionId,
  ]
  return fields.filter((value) => value != null && value !== "").length
}

/**
 * Default actor ordering (brief §5): evidence_class A→D, then source_count desc, then
 * currentness (current before recent before historical), then most recent last_verified_date,
 * then relevant-data completeness. This is "most strongly evidenced first" — never "best".
 */
export function compareActorsByEvidence(a: Actor, b: Actor) {
  const evidenceA = a.evidenceClass ? EVIDENCE_RANK[a.evidenceClass] : 9
  const evidenceB = b.evidenceClass ? EVIDENCE_RANK[b.evidenceClass] : 9
  if (evidenceA !== evidenceB) return evidenceA - evidenceB

  if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount

  const currentnessA = a.currentness ? (CURRENTNESS_RANK[a.currentness] ?? 3) : 3
  const currentnessB = b.currentness ? (CURRENTNESS_RANK[b.currentness] ?? 3) : 3
  if (currentnessA !== currentnessB) return currentnessA - currentnessB

  const dateA = a.lastVerifiedDate ?? ""
  const dateB = b.lastVerifiedDate ?? ""
  if (dateA !== dateB) return dateA < dateB ? 1 : -1

  return completenessScore(b) - completenessScore(a)
}

export function getActorsByMode(mode: ActorMode): Actor[] {
  return allActors.filter((actor) => actor.modes.includes(mode)).sort(compareActorsByEvidence)
}

export function getCountriesForActors(actors: Actor[]): string[] {
  return [...new Set(actors.map((actor) => actor.country))].sort((a, b) => {
    const mappedA = mappedCountries.includes(a as MarketCountry) ? 0 : 1
    const mappedB = mappedCountries.includes(b as MarketCountry) ? 0 : 1
    return mappedA - mappedB || a.localeCompare(b)
  })
}

export function getActorsForRegion(actors: Actor[], regionId: string): Actor[] {
  return actors.filter((actor) => actor.regionId === regionId)
}

export function getUnassignedActors(actors: Actor[], country: string): Actor[] {
  return actors.filter((actor) => actor.country === country && !actor.regionId)
}

/** Region polygons + actor counts for the given country/mode, for the level-1 map view. */
export function getRegionSummaries(actors: Actor[], country: MarketCountry) {
  const countryRegions = marketRegions.filter((region) => region.country === country)
  return countryRegions.map((region) => ({
    region,
    actors: actors.filter((actor) => actor.regionId === region.id),
  }))
}

export function getActorById(id: string): Actor | undefined {
  return allActors.find((actor) => actor.id === id)
}
