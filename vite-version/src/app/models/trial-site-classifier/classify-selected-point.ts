"use client"

import type { SelectedClimateProfile, TrialSiteClimateProfile } from "./types"

export interface SelectedPoint {
  latitude: number
  longitude: number
}

const classifierStartYear = 2015
const classifierEndYear = 2024

type SiteClassifierAnnualRow = Record<string, number | string | null | undefined>

interface SiteClassifierResult {
  source_summaries?: {
    terraclimate?: {
      annual?: SiteClassifierAnnualRow[]
    }
  }
  errors?: Array<{ message?: string }>
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function meanFinite(values: unknown[]) {
  const numbers = values.flatMap((value) => {
    const number = finiteNumber(value)
    return number === null ? [] : [number]
  })

  if (!numbers.length) return null
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

function annualMean(rows: SiteClassifierAnnualRow[], key: string) {
  return meanFinite(rows.map((row) => row[key]))
}

function buildLongTermClimateFromAnnualRows(rows: SiteClassifierAnnualRow[]) {
  const annualAet = annualMean(rows, "annual_sum_aet_mm_terraclimate")
  const annualPet = annualMean(rows, "annual_sum_pet_mm_terraclimate")
  const annualDef = annualMean(rows, "annual_sum_def_mm_terraclimate")

  return {
    annual_ppt_mm: annualMean(rows, "annual_sum_ppt_mm_terraclimate"),
    mean_tmean_c: annualMean(rows, "annual_mean_tmean_c_terraclimate"),
    mean_tmin_c: annualMean(rows, "annual_mean_tmin_c_terraclimate"),
    mean_tmax_c: annualMean(rows, "annual_mean_tmax_c_terraclimate"),
    annual_aet_mm: annualAet,
    annual_pet_mm: annualPet,
    annual_water_deficit_mm: annualDef,
    annual_runoff_mm: annualMean(rows, "annual_sum_runoff_mm_terraclimate"),
    mean_soil_water_mm: annualMean(rows, "annual_mean_soil_mm_terraclimate"),
    mean_solar_radiation_w_m2: annualMean(
      rows,
      "annual_mean_srad_w_m2_terraclimate"
    ),
    mean_vapor_pressure_kpa: annualMean(
      rows,
      "annual_mean_vap_kpa_terraclimate"
    ),
    mean_vpd_kpa: annualMean(rows, "annual_mean_vpd_kpa_terraclimate"),
    mean_wind_10m_ms: annualMean(rows, "annual_mean_wind_10m_ms_terraclimate"),
    mean_pdsi: annualMean(rows, "annual_mean_pdsi_terraclimate"),
    dry_months_lt_50mm: annualMean(
      rows,
      "annual_sum_dry_month_lt_50mm_terraclimate"
    ),
    dry_months_lt_30mm: annualMean(
      rows,
      "annual_sum_dry_month_lt_30mm_terraclimate"
    ),
    aet_pet_ratio:
      annualAet === null || annualPet === null || annualPet === 0
        ? null
        : annualAet / annualPet,
    def_pet_ratio:
      annualDef === null || annualPet === null || annualPet === 0
        ? null
        : annualDef / annualPet,
  }
}

function scaleAgainstTrialProfiles(
  rawVector: Record<string, number | null>,
  trialProfiles: TrialSiteClimateProfile[]
) {
  const scaledEntries = Object.entries(rawVector).flatMap(([key, value]) => {
    if (value === null || !Number.isFinite(value)) return []

    const trialValues = trialProfiles.flatMap((profile) => {
      const trialValue = finiteNumber(profile.long_term_climate?.[key])
      return trialValue === null ? [] : [trialValue]
    })

    if (trialValues.length < 2) return []

    const mean =
      trialValues.reduce((sum, trialValue) => sum + trialValue, 0) /
      trialValues.length
    const variance =
      trialValues.reduce(
        (sum, trialValue) => sum + (trialValue - mean) ** 2,
        0
      ) / trialValues.length
    const std = Math.sqrt(variance)

    if (!Number.isFinite(std) || std === 0) return []
    return [[key, Number(((value - mean) / std).toFixed(6))] as const]
  })

  return Object.fromEntries(scaledEntries)
}

export function createPlaceholderSelectedClimateProfile(
  point: SelectedPoint,
  notes?: string[]
): SelectedClimateProfile {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    climate_profile_status: "placeholder",
    source: "placeholder_adapter",
    scaled_climate_vector: null,
    notes: [
      "Placeholder output: connect this adapter to the existing site-classifier or EarthEngine endpoint when climate rasters are available.",
      "The UI remains usable by falling back to coordinate-nearest analogue sites with low confidence.",
      ...(notes ?? []),
    ],
  }
}

export function extractSelectedClimateProfileFromSiteClassifierResult(
  point: SelectedPoint,
  result: unknown,
  trialProfiles: TrialSiteClimateProfile[]
): SelectedClimateProfile {
  if (typeof result === "object" && result !== null) {
    const candidate = result as SiteClassifierResult

    const annualRows = candidate.source_summaries?.terraclimate?.annual ?? []
    if (annualRows.length) {
      const rawVector = buildLongTermClimateFromAnnualRows(annualRows)
      const scaledVector = scaleAgainstTrialProfiles(rawVector, trialProfiles)

      if (Object.keys(scaledVector).length) {
        return {
          latitude: point.latitude,
          longitude: point.longitude,
          climate_profile_status: "available",
          source: "site_classifier",
          scaled_climate_vector: scaledVector,
          notes: [
            `Climate vector supplied by the site-classifier TerraClimate Earth Engine model for ${classifierStartYear}-${classifierEndYear}.`,
          ],
        }
      }
    }

    if (candidate.errors?.length) {
      return createPlaceholderSelectedClimateProfile(
        point,
        candidate.errors.map((error) => error.message ?? "Site classifier error.")
      )
    }
  }

  return createPlaceholderSelectedClimateProfile(point)
}

export async function fetchSelectedClimateProfileFromSiteClassifier({
  point,
  apiBaseUrl,
  trialProfiles,
  signal,
}: {
  point: SelectedPoint
  apiBaseUrl: string
  trialProfiles: TrialSiteClimateProfile[]
  signal?: AbortSignal
}): Promise<SelectedClimateProfile> {
  const response = await fetch(`${apiBaseUrl}/models/site-classification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      site_id: "selected_trial_classifier_point",
      lon: point.longitude,
      lat: point.latitude,
      start_year: classifierStartYear,
      end_year: classifierEndYear,
      sources: ["terraclimate"],
      data_types: ["dynamic"],
      dynamic_metric_groups: [
        "temperature",
        "water",
        "demand_stress",
        "radiation_wind",
      ],
      static_metric_groups: [],
      summary_levels: ["annual"],
      agreement_families: ["precipitation"],
      climate_buffer_m: 5000,
      topo_buffer_m: 300,
      min_overlap: 12,
    }),
  })

  const responseText = await response.text()
  const parsed = responseText ? JSON.parse(responseText) : null

  if (!response.ok) {
    throw new Error(
      parsed?.detail ||
        parsed?.message ||
        `Backend request failed with status ${response.status}.`
    )
  }

  return extractSelectedClimateProfileFromSiteClassifierResult(
    point,
    parsed,
    trialProfiles
  )
}
