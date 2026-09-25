import { resolveRegionId } from "./region-groups.mjs"

const MODE_FLAGS = [
  ["seed_supplier", "seeds"],
  ["seedling_nursery", "seedlings"],
  ["silviculture_contractor", "silviculture"],
  ["hh_contractor", "harvest_haulage"],
  ["processor", "wood"],
]

function isYes(value) {
  return typeof value === "string" && /^y(es)?$/i.test(value.trim())
}

function clean(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function toNumber(value) {
  if (value == null || value === "") return null
  const num = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(num) ? num : null
}

function groupByActorId(rows, key = "actor_id") {
  const map = new Map()
  for (const row of rows) {
    const id = clean(row[key])
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(row)
  }
  return map
}

/** Builds the canonical actor list from the Forestry Actor Master workbook alone. */
export function normalizeActorMaster(sheets) {
  const masterRows = sheets.Master_Actors ?? []
  const locationsByActor = groupByActorId(sheets.Locations ?? [])
  const seedsByActor = groupByActorId(sheets.Seeds ?? [])
  const seedlingsByActor = groupByActorId(sheets.Seedlings ?? [])
  const contractorsByActor = groupByActorId(sheets.Contractors ?? [])
  const processorsByActor = groupByActorId(sheets.Processors ?? [])
  const sourcesById = new Map((sheets.Sources ?? []).map((row) => [clean(row.source_id), row]))

  const actors = masterRows.map((row) => normalizeMasterRow(row, {
    locationsByActor,
    seedsByActor,
    seedlingsByActor,
    contractorsByActor,
    processorsByActor,
    sourcesById,
  }))

  return actors
}

function normalizeMasterRow(row, lookups) {
  const actorId = clean(row.actor_id)
  const country = clean(row.country)
  const modes = MODE_FLAGS.filter(([flag]) => isYes(row[flag])).map(([, mode]) => mode)
  const { regionId, regionName } = resolveRegionId(country, row.region_state, row.district_county)

  const locations = (lookups.locationsByActor.get(actorId) ?? []).map((loc) => normalizeLocation(loc, country))
  // Every actor gets at least its Master_Actors-level location, even without a Locations row.
  if (locations.length === 0) {
    locations.push(normalizeLocation({
      country,
      region_state: row.region_state,
      district_county: row.district_county,
      town_site: row.town_site,
    }, country))
  }

  const offerings = [
    ...(lookups.seedsByActor.get(actorId) ?? []).map((r) => ({ kind: "seeds", fields: pickOffering(r) })),
    ...(lookups.seedlingsByActor.get(actorId) ?? []).map((r) => ({ kind: "seedlings", fields: pickOffering(r) })),
    ...(lookups.contractorsByActor.get(actorId) ?? []).map((r) => ({ kind: "contractor", fields: pickOffering(r) })),
    ...(lookups.processorsByActor.get(actorId) ?? []).map((r) => ({ kind: "processor", fields: pickOffering(r) })),
  ]

  const bestSourceId = clean(row.best_source_id)
  const sourceIds = new Set([
    bestSourceId,
    ...offerings.map((o) => clean(o.fields.source_id)).filter(Boolean),
  ].filter(Boolean))
  const sources = [...sourceIds].map((id) => normalizeSource(id, lookups.sourcesById.get(id)))

  return {
    id: actorId,
    name: clean(row.actor_name),
    aliases: clean(row.aliases),
    country,
    countryCode: clean(row.country_code),
    regionId,
    regionName,
    regionState: clean(row.region_state),
    districtCounty: clean(row.district_county),
    townSite: clean(row.town_site),
    actorType: clean(row.actor_type),
    primaryRole: clean(row.primary_role),
    modes,
    roles: (clean(row.roles) ?? "").split(";").map((s) => s.trim()).filter(Boolean),
    species: clean(row.species_genetics),
    seedlingCapacityPerYear: clean(row.nursery_capacity_per_year),
    seedlingCertification: clean(row.nursery_status_or_certification),
    silvicultureServices: clean(row.silvi_services),
    harvestHaulageServices: clean(row.hh_services),
    processorProducts: clean(row.processor_products),
    rawMaterialSpecies: clean(row.raw_material_species),
    logSpecs: clean(row.log_specs),
    annualCapacityM3: toNumber(row.annual_capacity_m3),
    annualRequirementM3: toNumber(row.annual_requirement_m3),
    currentSupplyM3: toNumber(row.current_supply_m3),
    utilisationPct: toNumber(row.utilisation_pct),
    sourcingRadiusKm: toNumber(row.sourcing_radius_km),
    certifications: clean(row.certifications),
    website: clean(row.website),
    email: clean(row.email),
    phone: clean(row.phone),
    contactPerson: clean(row.contact_person),
    currentness: clean(row.currentness),
    evidenceClass: clean(row.evidence_class),
    catalogStatus: clean(row.catalog_status),
    sourceCount: toNumber(row.source_count) ?? sources.length,
    bestSourceId,
    lastVerifiedDate: clean(row.last_verified_date),
    summary: clean(row.summary),
    notes: clean(row.notes),
    locations,
    offerings,
    sources,
    providerIds: [],
    images: { imageUrl: null, logoUrl: null, imageSourceUrl: null, imageAlt: null, imageStatus: "placeholder" },
    issues: [],
  }
}

function pickOffering(row) {
  const { actor_id, actor_name, ...rest } = row
  return rest
}

function normalizeLocation(row, fallbackCountry) {
  const country = clean(row.country) ?? fallbackCountry
  const latitude = toNumber(row.latitude)
  const longitude = toNumber(row.longitude)
  return {
    country,
    region: clean(row.region_state),
    district: clean(row.district_county),
    town: clean(row.town_site),
    address: clean(row.address),
    // Never invent a point: only kept when the sheet actually supplied both coordinates.
    latitude: latitude != null && longitude != null ? latitude : null,
    longitude: latitude != null && longitude != null ? longitude : null,
    sourceId: clean(row.source_id),
    currentness: clean(row.currentness),
  }
}

function normalizeSource(id, row) {
  if (!row) return { id, title: id, url: null, sourceType: null, date: null, evidenceClass: null }
  return {
    id,
    title: clean(row.title) ?? id,
    url: clean(row.url_or_path),
    sourceType: clean(row.source_type),
    publisher: clean(row.publisher),
    date: clean(row.source_date) ?? clean(row.accessed_date),
    evidenceClass: clean(row.evidence_class),
  }
}
