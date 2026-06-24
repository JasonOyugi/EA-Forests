"use client"

import type {
  ClimateMatch,
  ClimateVariableWeights,
  SelectedClimateProfile,
  TrialSiteClimateProfile,
} from "./types"

type VectorMap = Record<string, number>

function toVectorMap(
  vector: TrialSiteClimateProfile["scaled_climate_vector"]
): VectorMap | null {
  if (!vector) return null

  if (Array.isArray(vector)) {
    const entries = vector.flatMap((value, index) =>
      typeof value === "number" && Number.isFinite(value)
        ? [[`v${index}`, value] as const]
        : []
    )
    return entries.length ? Object.fromEntries(entries) : null
  }

  const entries = Object.entries(vector).flatMap(([key, value]) =>
    typeof value === "number" && Number.isFinite(value)
      ? [[key, value] as const]
      : []
  )
  return entries.length ? Object.fromEntries(entries) : null
}

function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

function getClimateEnvelopeWarning(
  selectedVector: VectorMap,
  trialVectors: VectorMap[]
) {
  const outsideVariables = Object.keys(selectedVector).filter((key) => {
    const values = trialVectors
      .map((vector) => vector[key])
      .filter((value) => Number.isFinite(value))
    if (!values.length) return false
    const min = Math.min(...values)
    const max = Math.max(...values)
    return selectedVector[key] < min || selectedVector[key] > max
  })

  if (!outsideVariables.length) return null

  return `Selected profile is outside the trial envelope for ${outsideVariables
    .slice(0, 3)
    .join(", ")}.`
}

function scoreClimateDistance(
  selectedVector: VectorMap,
  trialVector: VectorMap,
  variableWeights: ClimateVariableWeights
) {
  const sharedKeys = Object.keys(selectedVector).filter((key) =>
    Number.isFinite(trialVector[key])
  )

  if (!sharedKeys.length) return null

  let weightedSquaredDistance = 0
  let totalWeight = 0
  const deltas = sharedKeys.map((key) => {
    const weight = Math.abs(variableWeights[key] ?? 1)
    const delta = Math.abs(selectedVector[key] - trialVector[key])
    weightedSquaredDistance += weight * delta ** 2
    totalWeight += weight
    return { key, delta }
  })

  if (totalWeight === 0) return null

  const distance = Math.sqrt(weightedSquaredDistance / totalWeight)
  const sortedDeltas = deltas.sort((a, b) => a.delta - b.delta)

  return {
    distance,
    similarityDrivers: sortedDeltas.slice(0, 3).map((item) => item.key),
    mismatchDrivers: sortedDeltas
      .slice(-3)
      .reverse()
      .map((item) => item.key),
  }
}

function confidenceFromClimateDistance(distance: number) {
  if (distance <= 0.75) return "high"
  if (distance <= 1.5) return "medium"
  return "low"
}

export function classifyClimateAnalogues({
  selectedProfile,
  trialProfiles,
  variableWeights = {},
  limit = 3,
}: {
  selectedProfile: SelectedClimateProfile
  trialProfiles: TrialSiteClimateProfile[]
  variableWeights?: ClimateVariableWeights
  limit?: number
}): ClimateMatch[] {
  const selectedVector = toVectorMap(selectedProfile.scaled_climate_vector)
  const trialVectors = trialProfiles
    .map((profile) => toVectorMap(profile.scaled_climate_vector))
    .filter((vector): vector is VectorMap => Boolean(vector))
  const envelopeWarning =
    selectedVector && trialVectors.length
      ? getClimateEnvelopeWarning(selectedVector, trialVectors)
      : null

  const scored = trialProfiles.map((site) => {
    const coordinateDistanceKm = haversineDistanceKm(selectedProfile, site)
    const trialVector = toVectorMap(site.scaled_climate_vector)
    const climateScore =
      selectedVector && trialVector
        ? scoreClimateDistance(selectedVector, trialVector, variableWeights)
        : null

    if (climateScore) {
      return {
        site,
        distance_score: climateScore.distance,
        coordinate_distance_km: coordinateDistanceKm,
        confidence: confidenceFromClimateDistance(climateScore.distance),
        similarity_drivers: climateScore.similarityDrivers,
        mismatch_drivers: climateScore.mismatchDrivers,
        outside_trial_envelope_warning: envelopeWarning,
        used_coordinate_fallback: false,
      } satisfies ClimateMatch
    }

    return {
      site,
      distance_score: coordinateDistanceKm / 250,
      coordinate_distance_km: coordinateDistanceKm,
      confidence: "low",
      similarity_drivers: ["nearest available trial coordinates"],
      mismatch_drivers: ["climate profile unavailable"],
      outside_trial_envelope_warning:
        "Climate profile artifacts are placeholders, so the match is using coordinate proximity until raster or EarthEngine extraction is connected.",
      used_coordinate_fallback: true,
    } satisfies ClimateMatch
  })

  return scored
    .sort((a, b) => a.distance_score - b.distance_score)
    .slice(0, limit)
}
