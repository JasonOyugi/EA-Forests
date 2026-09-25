import { resolveRegionId } from "./region-groups.mjs"

const SERVICE_CATEGORY_TO_MODE = {
  SEEDLING_NURSERY: "seedlings",
  CLONAL_NURSERY: "seedlings",
  NURSERY_ESTABLISHMENT: "seedlings",
  NURSERY_BIOTECH: "seedlings",
  TISSUE_CULTURE: "seedlings",
  PLANTING_MATERIAL_SUPPLY: "seedlings",
  TREE_SEED: "seeds",
  PROVENANCE_TRACKING: "seeds",
  HARVESTING_LOGGING: "harvest_haulage",
  HAULAGE_LOGISTICS: "harvest_haulage",
  DELIVERY_LOGISTICS: "harvest_haulage",
  HARVEST_PLANNING: "harvest_haulage",
  HARVEST_LABOUR: "harvest_haulage",
  SKIDDING_EXTRACTION: "harvest_haulage",
  TIMBER_PROCESSING: "wood",
  TIMBER_SALES: "wood",
  TIMBER_SUPPLY: "wood",
  POLE_SUPPLY: "wood",
  LOG_SUPPLY: "wood",
}
// Everything else recognised in `Services.service_category` (PLANTATION_ESTABLISHMENT,
// PLANTATION_MANAGEMENT, ADVISORY_TRAINING, THINNING, PRUNING, WEEDING, FOREST_VALUATION,
// FOREST_INVENTORY, FOREST_MANAGEMENT_PLANS, SITE_ASSESSMENT, SITE_SPECIES_MATCHING,
// LAND_PREPARATION, PLANTING_SUPPORT, LANDSCAPING, LANDSCAPE_REHABILITATION, SILVICULTURE,
// FOREST_ROADS, FIRE_MANAGEMENT, OPERATIONS_MANAGEMENT, RESTORATION_PLANTING, ...) is a general
// silviculture/plantation-management service.
const DEFAULT_SERVICE_MODE = "silviculture"

function clean(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function normalizeName(name) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[.,()]/g, " ")
    .replace(/\b(ltd|limited|company|co|group|forestry|forest|farms?|enterprises?|holdings?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function websiteDomain(url) {
  if (!url) return null
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function phoneDigits(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, "")
  return digits.length >= 7 ? digits.slice(-7) : null
}

/** `provider` is a raw Providers-sheet row; `actor` is an already-normalized master actor. */
function corroborates(provider, actor) {
  const providerDomain = websiteDomain(provider.website)
  const actorDomain = websiteDomain(actor.website)
  if (providerDomain && actorDomain) return providerDomain === actorDomain

  const providerPhone = phoneDigits(provider.phone_primary)
  const actorPhone = phoneDigits(actor.phone)
  if (providerPhone && actorPhone) return providerPhone === actorPhone

  return false
}

function groupByProviderId(rows) {
  const map = new Map()
  for (const row of rows) {
    const id = clean(row.provider_id)
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(row)
  }
  return map
}

function providerModes(services) {
  const modes = new Set()
  for (const service of services) {
    const category = clean(service.service_category)
    modes.add(category ? (SERVICE_CATEGORY_TO_MODE[category] ?? DEFAULT_SERVICE_MODE) : DEFAULT_SERVICE_MODE)
  }
  return [...modes]
}

function providerOffering(kind, row) {
  const { provider_id, ...rest } = row
  return { kind, fields: rest }
}

/**
 * Merges the Providers workbook into the actor list produced by `normalizeActorMaster`.
 *
 * Matching rule: a provider only merges into a master actor when the normalized name AND
 * country match exactly *and* there is corroborating contact evidence (same website domain or
 * phone). Exact name/country matches without corroboration, and any ambiguous (multiple
 * candidate) matches, are left as separate provider-only actors and recorded in the returned
 * `reviewCandidates` list — never silently joined on name similarity alone.
 */
export function reconcileProviders(actors, sheets) {
  const providers = sheets.Providers ?? []
  const servicesByProvider = groupByProviderId(sheets.Services ?? [])
  const nurseryOffersByProvider = groupByProviderId(sheets.Nursery_Offers ?? [])
  const seedSourcesByProvider = groupByProviderId(sheets.Seed_Sources ?? [])
  const certsByProvider = groupByProviderId(sheets.Certifications ?? [])
  const locationsByProvider = groupByProviderId(sheets.Locations ?? [])
  const sourcesById = new Map((sheets.Sources ?? []).map((row) => [clean(row.source_id), row]))

  const actorsByNormName = new Map()
  for (const actor of actors) {
    const key = `${normalizeName(actor.name)}|${actor.country}`
    if (!actorsByNormName.has(key)) actorsByNormName.set(key, [])
    actorsByNormName.get(key).push(actor)
  }

  const reviewCandidates = []
  const reconciliation = []
  const providerOnlyActors = []

  for (const provider of providers) {
    const providerId = clean(provider.provider_id)
    const country = clean(provider.country)
    const key = `${normalizeName(provider.provider_name)}|${country}`
    const candidates = actorsByNormName.get(key) ?? []

    const services = servicesByProvider.get(providerId) ?? []
    const nurseryOffers = nurseryOffersByProvider.get(providerId) ?? []
    const seedSources = seedSourcesByProvider.get(providerId) ?? []
    const certs = certsByProvider.get(providerId) ?? []
    const providerLocations = locationsByProvider.get(providerId) ?? []

    const offerings = [
      ...services.map((r) => providerOffering("service", r)),
      ...nurseryOffers.map((r) => providerOffering("nursery_offer", r)),
      ...seedSources.map((r) => providerOffering("seed_source", r)),
      ...certs.map((r) => providerOffering("certification", r)),
    ]

    if (candidates.length === 1 && corroborates(provider, candidates[0])) {
      const actor = candidates[0]
      actor.providerIds.push(providerId)
      actor.offerings.push(...offerings)
      for (const mode of providerModes(services)) {
        if (!actor.modes.includes(mode)) actor.modes.push(mode)
      }
      reconciliation.push({ providerId, actorId: actor.id, status: "merged" })
      continue
    }

    if (candidates.length > 0) {
      reviewCandidates.push({
        providerId,
        name: provider.provider_name,
        country,
        status: "review",
        candidateActorIds: candidates.map((c) => c.id),
        reason: candidates.length > 1
          ? "Multiple actors share this normalized name/country; ambiguous, no merge performed."
          : "Exact name/country without corroborating contact (website/phone); no merge performed.",
      })
    }

    reconciliation.push({ providerId, actorId: `provider:${providerId}`, status: "provider-only" })
    providerOnlyActors.push(buildProviderOnlyActor(provider, {
      offerings,
      providerLocations,
      sourcesById,
    }))
  }

  return {
    actors: [...actors, ...providerOnlyActors],
    reconciliation,
    reviewCandidates,
  }
}

function buildProviderOnlyActor(provider, { offerings, providerLocations, sourcesById }) {
  const country = clean(provider.country)
  const services = offerings.filter((o) => o.kind === "service").map((o) => o.fields)
  const modes = providerModes(services)
  const primaryLocation = providerLocations[0]
  const { regionId, regionName } = resolveRegionId(
    country,
    primaryLocation?.region1,
    primaryLocation?.town_site
  )

  const bestSourceId = clean(provider.best_source_id)
  const sourceIds = new Set([bestSourceId, ...offerings.map((o) => clean(o.fields.source_id))].filter(Boolean))
  const sources = [...sourceIds].map((id) => {
    const row = sourcesById.get(id)
    return row
      ? {
        id,
        title: clean(row.source_title) ?? id,
        url: clean(row.source_url),
        sourceType: clean(row.source_type),
        publisher: clean(row.publisher),
        date: clean(row.source_date) ?? clean(row.retrieved_date),
        evidenceClass: null,
      }
      : { id, title: id, url: null, sourceType: null, date: null, evidenceClass: null }
  })

  const locations = providerLocations.length
    ? providerLocations.map((loc) => ({
      country: clean(loc.country) ?? country,
      region: clean(loc.region1),
      district: clean(loc.region2) ?? clean(loc.town_site),
      town: clean(loc.town_site),
      address: clean(loc.address),
      latitude: null,
      longitude: null,
      sourceId: clean(loc.source_id),
      currentness: clean(loc.currentness),
    }))
    : [{
      country,
      region: regionName,
      district: null,
      town: null,
      address: null,
      latitude: null,
      longitude: null,
      sourceId: null,
      currentness: clean(provider.currentness),
    }]

  return {
    id: `provider:${clean(provider.provider_id)}`,
    name: clean(provider.provider_name),
    aliases: clean(provider.provider_name_raw_aliases),
    country,
    countryCode: null,
    regionId,
    regionName,
    regionState: primaryLocation ? clean(primaryLocation.region1) : null,
    districtCounty: primaryLocation ? clean(primaryLocation.region2) : null,
    townSite: primaryLocation ? clean(primaryLocation.town_site) : null,
    actorType: clean(provider.provider_type),
    primaryRole: clean(provider.provider_type),
    modes,
    roles: services.map((s) => clean(s.service_category)).filter(Boolean),
    species: null,
    seedlingCapacityPerYear: null,
    seedlingCertification: null,
    silvicultureServices: services.filter((s) => (SERVICE_CATEGORY_TO_MODE[s.service_category] ?? DEFAULT_SERVICE_MODE) === "silviculture").map((s) => s.service_detail).filter(Boolean).join("; ") || null,
    harvestHaulageServices: services.filter((s) => SERVICE_CATEGORY_TO_MODE[s.service_category] === "harvest_haulage").map((s) => s.service_detail).filter(Boolean).join("; ") || null,
    processorProducts: null,
    rawMaterialSpecies: null,
    logSpecs: null,
    annualCapacityM3: null,
    annualRequirementM3: null,
    currentSupplyM3: null,
    utilisationPct: null,
    sourcingRadiusKm: null,
    certifications: offerings.filter((o) => o.kind === "certification").map((o) => o.fields.scheme).filter(Boolean).join("; ") || null,
    website: clean(provider.website),
    email: clean(provider.email),
    phone: clean(provider.phone_primary),
    contactPerson: primaryLocation ? clean(primaryLocation.contact_person) : null,
    currentness: clean(provider.currentness),
    evidenceClass: clean(provider.evidence_class),
    catalogStatus: clean(provider.catalog_status),
    sourceCount: sources.length,
    bestSourceId,
    lastVerifiedDate: null,
    summary: clean(provider.summary),
    notes: clean(provider.quality_notes),
    locations,
    offerings,
    sources,
    providerIds: [clean(provider.provider_id)],
    images: { imageUrl: null, logoUrl: null, imageSourceUrl: null, imageAlt: null, imageStatus: "placeholder" },
    issues: [],
  }
}
