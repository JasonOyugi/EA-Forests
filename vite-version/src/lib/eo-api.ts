// Client for the public, unauthenticated EO read model (`backend/app/api/eo_public.py`,
// GET /api/eo/public/country-status). Never call `/api/canonical/eo/*` from the browser — those
// routes require a private admin bearer token that must never reach client code.
const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api"

export type EoAoiStatus = "success" | "partial" | "no_observation" | "failed" | "not_processed"

export interface EoAoiStatusRow {
  entityId: string
  name: string
  aoiId: string
  /** GeoJSON geometry as a JSON string, or null if this AOI has no boundary yet. */
  geometry: string | null
  status: EoAoiStatus
  observationMonth: string | null
  usableObservationFraction: number | null
}

export async function fetchCountryEoStatus(countryIso2: string, signal?: AbortSignal): Promise<EoAoiStatusRow[]> {
  const response = await fetch(`${apiBase}/eo/public/country-status?country=${encodeURIComponent(countryIso2)}&limit=2000`, { signal })
  if (!response.ok) {
    throw new Error(`EO status service responded with ${response.status}`)
  }
  return response.json()
}
