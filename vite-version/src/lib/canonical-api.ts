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

/** Homogeneous-stream identity (never blended -- S1 ascending/descending
 * are separate lanes on purpose). `null` means the observation's recipe
 * is not yet in the frontend's known lane set; treat as "unrecognized
 * sensor", never default it to optical. */
export type SensorLane = "s2_optical" | "s1_ascending" | "s1_descending"

export const SENSOR_LANE_LABELS: Record<SensorLane, string> = {
  s2_optical: "Sentinel-2 optical",
  s1_ascending: "Sentinel-1 radar (ascending)",
  s1_descending: "Sentinel-1 radar (descending)",
}

export type EoObservation = {
  id: string
  series_id: string
  recipe_key: string
  collection_key: string
  sensor_lane: SensorLane | null
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

/** Generalised beyond Uganda: `spatialType` defaults to "reserve" (Uganda
 * CFRs) for backward compatibility with existing callers, but Kenya's
 * canonical forests use spatial_type="forest_candidate" -- pass it
 * explicitly for any non-Uganda-CFR lookup. Prefer resolving an asset by
 * `entity_id`/`aoi_version_id` (already present on most canonical map
 * data, e.g. `ForestPolygonProperties`) over this name-matching lookup
 * wherever the caller already has those identifiers.
 */
export async function fetchSpatialAsset(
  cfrName: string,
  country = "UG",
  spatialType = "reserve"
): Promise<SpatialAsset | null> {
  const assets = await canonicalFetch<SpatialAsset[]>(
    `/api/canonical/spatial-assets?country=${country}&spatial_type=${spatialType}&limit=1000`
  )
  return assets.find((asset) => asset.name === cfrName) ?? null
}

export async function fetchEoObservations(
  aoiVersionId: string,
  sensorLane?: SensorLane
): Promise<EoObservation[]> {
  const search = new URLSearchParams({ aoi_version_id: aoiVersionId })
  if (sensorLane) search.set("sensor_lane", sensorLane)
  return canonicalFetch<EoObservation[]>(`/api/canonical/eo/observations?${search.toString()}`)
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

export async function fetchCountryEoStatus(country = "UG"): Promise<CountryEoStatus[]> {
  return canonicalFetch<CountryEoStatus[]>(
    `/api/canonical/eo/country-status?country=${country}&spatial_type=reserve&limit=1000`
  )
}

/** Real per-lane completeness for one canonical forest -- backend-computed
 * (never re-derive "x/12" in the browser). A lane absent from `lanes` was
 * never queried at all for this AOI; a lane present with
 * `completed_months: 0` was queried and genuinely has no successful month
 * yet. Both are real, different states.
 */
export type CoverageLane = {
  completed_months: number
  target_months: number
  latest_observation_month: string | null
  latest_outcome: EoOutcome | null
  latest_usable_support: number | null
}

export type CoverageSummaryEntry = {
  entity_id: string
  name: string
  aoi_id: string
  aoi_version_id: string
  country: string
  lanes: Partial<Record<SensorLane, CoverageLane>>
  latest_corroboration_state?: CorroborationState
}

/** One real map-scale request per country -- never one request per AOI
 * per sensor. Works identically for country="UG" and country="KE".
 */
export async function fetchCoverageSummary(
  country: string,
  targetMonths = 12
): Promise<CoverageSummaryEntry[]> {
  return canonicalFetch<CoverageSummaryEntry[]>(
    `/api/canonical/eo/coverage-summary?country=${country}&target_months=${targetMonths}`
  )
}

// --- Change evidence (observatory v0.2) --------------------------------

/** Evidence-quality grade: an execution-gate pass (e.g. "3 months of
 * history") is NOT the same as scientific sufficiency. Never a calibrated
 * probability -- display as a label, not a percentage.
 */
export type EvidenceGrade = "PRELIMINARY" | "REVIEWABLE" | "STRONGER_SUPPORT"

export const EVIDENCE_GRADE_LABELS: Record<EvidenceGrade, string> = {
  PRELIMINARY: "Preliminary",
  REVIEWABLE: "Reviewable",
  STRONGER_SUPPORT: "Stronger support",
}

/** Corroboration semantics (migration 0012): S1 ascending + S1 descending
 * agreeing is WITHIN_SENSOR_MULTI_STREAM_SUPPORTED, never
 * CROSS_SENSOR_SUPPORTED -- they are two streams of one sensor family
 * (Sentinel-1), not two instruments. Only optical + radar (or radar +
 * lidar) corroboration is cross-sensor/cross-modality.
 */
export type CorroborationState =
  | "SINGLE_STREAM"
  | "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED"
  | "CROSS_SENSOR_SUPPORTED"
  | "CROSS_MODALITY_SUPPORTED"
  | "SENSOR_DISAGREEMENT"
  | "INSUFFICIENT_COMMON_SUPPORT"
  | "INSUFFICIENT_EVIDENCE"

export const CORROBORATION_STATE_LABELS: Record<CorroborationState, string> = {
  SINGLE_STREAM: "Single sensor stream",
  WITHIN_SENSOR_MULTI_STREAM_SUPPORTED: "Multiple streams, one sensor",
  CROSS_SENSOR_SUPPORTED: "Cross-sensor support",
  CROSS_MODALITY_SUPPORTED: "Cross-modality support (optical + radar)",
  SENSOR_DISAGREEMENT: "Sensors disagree on timing",
  INSUFFICIENT_COMMON_SUPPORT: "Insufficient common support",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
}

export type ChangeCandidate = {
  id: string
  sensor_stream: string
  features: string[]
  baseline_window: { start: string; end: string }
  candidate_window: { start: string; end: string }
  algorithm: string
  algorithm_version: string
  config_version: string
  statistic: number
  persistence: number | null
  common_support_fraction: number | null
  interpretation_class: "OBSERVATION_CHANGE"
  evidence_grade: EvidenceGrade | null
  evidence_quality: { grade: EvidenceGrade; reasons: string[] } | null
  confounders: Record<string, unknown> | null
  spatial_evidence: { region_count: number; evidence_cell_count: number; cell_count_total: number } | null
}

export type ChangeCorroboration = {
  id: string
  state: CorroborationState
  reference_window: { start: string; end: string }
  distinct_stream_count: number | null
  distinct_sensor_family_count: number | null
  distinct_modality_count: number | null
  max_temporal_offset_days: number | null
  member_change_candidate_ids: string[]
}

export type ChangeEvidence = {
  aoi_version_id: string
  candidates: ChangeCandidate[]
  corroborations: ChangeCorroboration[]
}

export async function fetchChangeEvidence(aoiVersionId: string): Promise<ChangeEvidence> {
  return canonicalFetch<ChangeEvidence>(
    `/api/canonical/eo/change-evidence?aoi_version_id=${aoiVersionId}`
  )
}

export type ForestPolygonProperties = {
  entity_id: string
  geometry_observation_id: string
  /** Null when this polygon has not been promoted to an EO-processable
   * AOI version yet -- present, real EO coverage can only exist when
   * this is non-null. */
  aoi_version_id: string | null
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
  const status = await ensureCanonicalSession()
  if (!status.admin_enabled) {
    throw new CanonicalApiUnavailableError(
      "This backend has not enabled the canonical admin capability (set CANONICAL_API_TOKEN)."
    )
  }
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
  if (response.status === 401 || response.status === 403) {
    bootstrapPromise = null // session may have expired; next call re-bootstraps
    throw new CanonicalApiUnavailableError(
      "The local canonical session is unavailable. Reload the page to retry."
    )
  }
  if (!response.ok) {
    throw new Error(`Forest polygon request failed (${response.status})`)
  }
  return response.json() as Promise<ForestPolygonCollection>
}
