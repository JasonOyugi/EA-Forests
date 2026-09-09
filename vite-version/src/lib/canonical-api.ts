// Local browser bridge to the canonical administrative API
// (backend/app/security.py, backend/app/api/canonical.py).
//
// The canonical admin secret (CANONICAL_API_TOKEN) stays server-side only:
// it is never read from a VITE_* variable, never stored in localStorage/
// sessionStorage, and never appears in a URL. A same-origin loopback
// bootstrap call establishes a short-lived HttpOnly session cookie instead;
// every fetch below just sends `credentials: "include"` so the browser
// attaches that cookie automatically -- this module never touches the
// cookie's value directly (it can't: HttpOnly hides it from JS by design).

let bootstrapPromise: Promise<SessionStatus> | null = null

export type SessionStatus = {
  admin_enabled: boolean
  session_active: boolean
}

async function getStatus(): Promise<SessionStatus> {
  const response = await fetch("/api/canonical/session/status", { credentials: "include" })
  if (!response.ok) throw new Error(`Session status request failed (${response.status})`)
  return response.json() as Promise<SessionStatus>
}

/** Idempotent, memoized: safe to call from multiple components on mount. */
export function ensureCanonicalSession(): Promise<SessionStatus> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const status = await getStatus()
      if (!status.admin_enabled || status.session_active) return status
      const bootstrap = await fetch("/api/canonical/session/bootstrap", {
        method: "POST",
        credentials: "include",
      })
      if (!bootstrap.ok) return status // fall through to the caller's own error handling
      return getStatus()
    })().catch((err) => {
      bootstrapPromise = null // allow a retry on the next call
      throw err
    })
  }
  return bootstrapPromise
}

export class CanonicalApiUnavailableError extends Error {}

export async function canonicalFetch<T>(path: string): Promise<T> {
  const status = await ensureCanonicalSession()
  if (!status.admin_enabled) {
    throw new CanonicalApiUnavailableError(
      "This backend has not enabled the canonical admin capability (set CANONICAL_API_TOKEN)."
    )
  }
  const response = await fetch(path, { credentials: "include" })
  if (response.status === 401 || response.status === 403) {
    bootstrapPromise = null // session may have expired; next call re-bootstraps
    throw new CanonicalApiUnavailableError(
      "The local canonical session is unavailable. Reload the page to retry."
    )
  }
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

// --- shared canonical/EO read-model types -----------------------------------

export type SpatialAsset = {
  entity_id: string
  name: string
  aoi_id: string
  aoi_version_id: string
  world_id: string
  eo_readiness: string | null
  eo_scope: boolean | null
  reported_area_ha: number | null
  polygon_area_ha: number
  geometry_precision_description: string | null
}

export type EoFeatureValue = {
  feature_key: string
  feature_version: string
  value_statistic: string
  value: number | null
  unit: string
  standard_deviation: number | null
  valid_pixel_count: number | null
  total_pixel_count: number | null
  usable_fraction: number | null
  missingness: string | null
}

export type EoOutcome = "success" | "partial" | "no_observation" | "failed"

export type EoObservation = {
  id: string
  series_id: string
  window_start: string
  window_end: string
  outcome: EoOutcome
  reason_codes: string[]
  acquisition_count: number
  eligible_acquisition_count: number
  usable_observation_fraction: number | null
  applied_qa_profile: string
  recorded_at: string
  features: EoFeatureValue[]
}

export type EoObservationDetail = EoObservation & {
  discovery_manifest: { grid?: { crs: string; resolution_m: number; grid_version: string } }
  processing_run: {
    id: string
    processing_version_id: string
    configuration: Record<string, unknown>
    started_at: string | null
    completed_at: string | null
    output_manifest_hash: string | null
  }
  source_items: {
    item_id: string
    collection_key: string
    sensing_start: string
    platform: string | null
    processing_baseline: string | null
  }[]
}

export async function fetchSpatialAsset(cfrName: string): Promise<SpatialAsset | null> {
  const assets = await canonicalFetch<SpatialAsset[]>(
    "/api/canonical/spatial-assets?country=UG&spatial_type=reserve&limit=1000"
  )
  return assets.find((asset) => asset.name === cfrName) ?? null
}

export async function fetchEoObservations(aoiVersionId: string): Promise<EoObservation[]> {
  return canonicalFetch<EoObservation[]>(
    `/api/canonical/eo/observations?aoi_version_id=${aoiVersionId}`
  )
}

export async function fetchEoObservationDetail(observationId: string): Promise<EoObservationDetail> {
  return canonicalFetch<EoObservationDetail>(`/api/canonical/eo/observations/${observationId}`)
}

export function featureValue(observation: EoObservation, key: string): EoFeatureValue | undefined {
  return observation.features.find((f) => f.feature_key === key)
}

export const EO_OUTCOME_LABELS: Record<EoOutcome, string> = {
  success: "Success",
  partial: "Partial",
  no_observation: "No observation",
  failed: "Failed",
}

export type CountryEoStatus = {
  entity_id: string
  name: string
  eo_status: EoOutcome | "not_processed"
  observation_month: string | null
  usable_observation_fraction: number | null
}

export async function fetchCountryEoStatus(): Promise<CountryEoStatus[]> {
  return canonicalFetch<CountryEoStatus[]>(
    "/api/canonical/eo/country-status?country=UG&spatial_type=reserve&limit=1000"
  )
}

export type ForestPolygonProperties = {
  entity_id: string
  geometry_observation_id: string
  name: string
  source_name: string
  country: string
  source_key: string
  source_feature_id: string | null
  publisher: string | null
  dataset_version: string | null
  data_vintage: string | null
  commercial_class: string
  authority_class: string | null
  area_ha: number | null
  geometry_area_ha: number
  retrieved_at: string | null
  reference_url: string | null
  evidence_url: string
}

export type ForestPolygonFeature = {
  type: "Feature"
  id: string
  geometry: GeoJSON.Geometry
  properties: ForestPolygonProperties
}

export type ForestPolygonCollection = {
  type: "FeatureCollection"
  features: ForestPolygonFeature[]
  bbox: [number, number, number, number]
  meta: {
    returned: number
    truncated: boolean
    simplification_degrees: number
    canonical_crs: string
    area_note: string
  }
}

export async function fetchForestPolygons(params: {
  bbox: [number, number, number, number]
  country?: string
  sourceKeys?: string[]
  classes?: string[]
  limit?: number
  zoom?: number
  signal?: AbortSignal
}): Promise<ForestPolygonCollection> {
  const search = new URLSearchParams({
    bbox: params.bbox.join(","),
    limit: String(params.limit ?? 500),
    zoom: String(params.zoom ?? 8),
  })

  if (params.country) search.set("country", params.country)
  if (params.sourceKeys?.length) search.set("source_keys", params.sourceKeys.join(","))
  if (params.classes?.length) search.set("classes", params.classes.join(","))

  const response = await fetch(`/api/canonical/forest-polygons?${search.toString()}`, {
    credentials: "include",
    signal: params.signal,
  })
  if (!response.ok) {
    throw new Error(`Forest polygon request failed (${response.status})`)
  }
  return response.json() as Promise<ForestPolygonCollection>
}
