import fs from "node:fs"
import path from "node:path"
import { enrichUgandaKmlLocations } from "./uganda-kml-locations.mjs"

const clean = (value) => value == null || String(value).trim() === "" ? null : String(value).trim()
const nameKey = (value) => (value ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\b(limited|ltd|company|co)\b/g, " ").replace(/\s+/g, " ").trim()
const phoneKey = (value) => (value ?? "").replace(/\D/g, "").slice(-9)
const domain = (value) => {
  if (!value) return null
  try { return new URL(/^https?:/i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "") } catch { return null }
}
const validPoint = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
const isDemo = (text) => /\b(dummy|demo|demonstration|test record|functional test)\b/i.test(text ?? "")
const adminKey = (value) => nameKey(value).replace(/\b(county|region|district|municipality)\b/g, "").replace(/\s+/g, " ").trim()
const localityKey = (value) => nameKey((value ?? "").split(/[;(\/]/)[0].replace(/\b(area|plants?|factory|yard)\b.*$/i, ""))

function legacyRecords(root) {
  const base = path.join(root, "src/app/shop/data/market-databases")
  const processors = JSON.parse(fs.readFileSync(path.join(base, "processors.json"), "utf8"))
  const nurseries = JSON.parse(fs.readFileSync(path.join(base, "nurseries.json"), "utf8"))
  const forests = JSON.parse(fs.readFileSync(path.join(base, "large-commercial-forests.json"), "utf8"))
  const records = []
  for (const [name, row] of Object.entries(processors)) {
    if (!row["Source ID"] || !row["Country source"] || isDemo(row.Comments) || isDemo(row["Source ID"])) continue
    const original = clean(row["Original coordinate"])?.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/)
    // Legacy lat/lon may be a deliberate visual offset. Restore the recorded source point.
    if (row["Display offset km"] && !original) continue
    const lat = original ? Number(original[1]) : Number(row.lat)
    const lon = original ? Number(original[2]) : Number(row.lon)
    if (!validPoint(lat, lon)) continue
    records.push({
      kind: "processor", name, country: row["Country source"], phone: row.Phone,
      lat, lon, sourceId: row["Source ID"], sourceUrl: clean(row.Source),
      additionalSourceUrl: clean(row["Additional source URL"]),
      precision: clean(row["Coordinate precision"]), confidence: clean(row["Coordinate confidence"]),
      region: clean(row["Region / county"]), district: clean(row["District / sub-county"]),
      address: clean(row["Published locality / address"]), currentness: clean(row["Data vintage"]),
      notes: clean(row["Coordinate audit"]), offsetRestored: !!original,
    })
  }
  for (const row of nurseries.nurseries ?? []) {
    if (!row.source?.sourceId || !row.country || isDemo(row.comments) || isDemo(row.source.coordinateConfidence) || !validPoint(row.lat, row.lon)) continue
    records.push({
      kind: "nursery", name: row.name, country: row.country, phone: row.contact?.phone,
      lat: row.lat, lon: row.lon, sourceId: row.source.sourceId, sourceUrl: clean(row.source.url),
      precision: clean(row.source.coordinatePrecision), confidence: clean(row.source.coordinateConfidence),
      region: clean(row.region), district: null, address: clean(row.address),
      currentness: clean(row.source.dataVintage), notes: clean(row.comments),
    })
  }
  // This legacy forest file currently has no per-record source/provenance fields. Its
  // demonstration/test records cannot safely be promoted into canonical locations.
  return { records, skippedForestCount: Object.keys(forests).length }
}

function locationFrom(record, actor) {
  const approximate = /centroid|fallback|proxy|vicinity|locality|approximate|district|town/i.test(record.precision ?? "")
  const confidence = /high/i.test(record.confidence ?? "") ? "high" : /medium/i.test(record.confidence ?? "") ? "medium" : "low"
  const town = record.address?.split(/[,;]/)[0]?.replace(/^(Factory|Address\/locality):\s*/i, "").trim() || actor.townSite || null
  return {
    locationType: record.kind === "nursery" ? "nursery" : "factory",
    country: record.country, region: record.region ?? actor.regionState,
    district: record.district ?? actor.districtCounty, town, address: record.address,
    latitude: record.lat, longitude: record.lon,
    coordinatePrecision: record.precision ?? "Unspecified source point; site accuracy unverified",
    coordinateConfidence: confidence,
    sourceId: record.sourceId, sourceUrl: record.sourceUrl,
    currentness: record.currentness,
    notes: [record.notes, record.offsetRestored ? "Original source coordinate restored; legacy marker had a display offset." : null].filter(Boolean).join(" ") || null,
    // Exact source coordinates, not jittered display coordinates. Shared centroids stay shared.
    groupKey: `${record.country}|${record.lat}|${record.lon}|${approximate ? "approx" : "point"}`,
  }
}

export function enrichActorLocations(actors, root) {
  const ugandaKml = enrichUgandaKmlLocations(actors, root)
  const { records, skippedForestCount } = legacyRecords(root)
  const osmLocalities = JSON.parse(fs.readFileSync(path.join(root, "data/market-atlas/osm-localities.json"), "utf8"))
  const review = []
  const imported = []
  const localityDerived = []
  const osmDerived = []
  const byCountry = new Map()
  for (const actor of actors) {
    if (!byCountry.has(actor.country)) byCountry.set(actor.country, [])
    byCountry.get(actor.country).push(actor)
  }
  for (const record of records) {
    const candidates = (byCountry.get(record.country) ?? []).filter((actor) => {
      const names = [actor.name, ...(actor.aliases ?? "").split(/[;|]/)]
      return names.some((name) => nameKey(name) === nameKey(record.name))
    })
    let matches = candidates
    if (matches.length > 1) {
      const phone = phoneKey(record.phone)
      const urlDomain = domain(record.sourceUrl)
      const corroborated = matches.filter((actor) => (phone && phoneKey(actor.phone) === phone) || (urlDomain && domain(actor.website) === urlDomain))
      if (corroborated.length === 1) matches = corroborated
    }
    if (matches.length !== 1) {
      if (matches.length > 1) review.push({ sourceId: record.sourceId, name: record.name, country: record.country, candidateActorIds: matches.map((a) => a.id), reason: "Ambiguous exact/alias match" })
      continue
    }
    const actor = matches[0]
    if (record.kind === "processor" && !actor.modes.includes("wood")) continue
    if (record.kind === "nursery" && !actor.modes.includes("seedlings")) continue
    if (actor.locations.some((loc) => loc.sourceId === record.sourceId && loc.latitude != null)) continue
    actor.locations.push(locationFrom(record, actor))
    if (!actor.sources.some((source) => source.id === record.sourceId)) {
      actor.sources.push({ id: record.sourceId, title: `${record.kind === "nursery" ? "Nursery" : "Processor"} location source`, url: record.sourceUrl, sourceType: "legacy location database", publisher: null, date: record.currentness, evidenceClass: null })
    }
    imported.push({ actorId: actor.id, sourceId: record.sourceId, kind: record.kind, confidence: actor.locations.at(-1).coordinateConfidence, offsetRestored: !!record.offsetRestored })
  }

  // Reuse only explicitly described locality/town centroids. The actor workbook must itself
  // name that locality, and an administrative name must corroborate it. Conflicting source
  // coordinates for one place are left unresolved rather than choosing an arbitrary point.
  const gazetteer = new Map()
  for (const record of records) {
    if (!/centroid|district-town fallback/i.test(record.precision ?? "")) continue
    const locality = record.address?.split(/[,;]/)[0]?.trim()
    if (!locality || /\b(plot|road|street|km from|box|factory|address)\b/i.test(locality)) continue
    const admins = [record.region, record.district].filter(Boolean)
    for (const admin of admins) {
      const key = `${record.country}|${nameKey(locality)}|${nameKey(admin)}`
      if (!gazetteer.has(key)) gazetteer.set(key, [])
      gazetteer.get(key).push(record)
    }
  }
  for (const actor of actors) {
    if (actor.locations.some((location) => location.latitude != null)) continue
    const towns = [actor.townSite, ...actor.locations.map((location) => location.town), actor.districtCounty].filter(Boolean)
    const admins = [actor.regionState, actor.districtCounty, actor.regionName, ...actor.locations.flatMap((location) => [location.region, location.district])].filter(Boolean)
    const matches = [...new Set(towns.flatMap((town) => admins.flatMap((admin) => gazetteer.get(`${actor.country}|${nameKey(town)}|${nameKey(admin)}`) ?? [])))]
    const points = new Set(matches.map((record) => `${record.lat}|${record.lon}`))
    if (points.size !== 1) continue
    const record = matches[0]
    const town = record.address.split(/[,;]/)[0].trim()
    const sourceId = `locality:${record.sourceId}`
    actor.locations.push({
      locationType: "operational area", country: actor.country, region: actor.regionState,
      district: actor.districtCounty, town, address: null,
      latitude: record.lat, longitude: record.lon,
      coordinatePrecision: "Town/locality centroid inferred from the actor's published locality; not a site coordinate",
      coordinateConfidence: "low", sourceId, sourceUrl: record.sourceUrl,
      currentness: record.currentness,
      notes: `Actor locality comes from the canonical workbook. Display point reuses ${record.sourceId}'s sourced ${record.precision?.toLowerCase() ?? "locality centroid"}.`,
      groupKey: `${record.country}|${record.lat}|${record.lon}|approx`,
    })
    actor.sources.push({ id: sourceId, title: `${town} locality centroid`, url: record.sourceUrl, sourceType: "derived display point", publisher: null, date: record.currentness, evidenceClass: null })
    localityDerived.push({ actorId: actor.id, name: actor.name, country: actor.country, town, centroidSourceId: record.sourceId })
  }

  // A curated OSM locality can position a workbook actor only when its published town
  // matches. The feature center is an approximate display/destination point, never a site.
  for (const actor of actors) {
    if (actor.locations.some((location) => location.latitude != null)) continue
    const publishedTowns = [actor.townSite, ...actor.locations.map((location) => location.town)].filter(Boolean)
    const publishedAdmins = [actor.regionState, actor.districtCounty, ...actor.locations.flatMap((location) => [location.region, location.district])]
      .filter((admin) => admin && adminKey(admin) !== adminKey(actor.country))
    const matches = osmLocalities.filter((place) => {
      if (place.country !== actor.country || !publishedTowns.some((town) => localityKey(town) === nameKey(place.name))) return false
      return !publishedAdmins.length || publishedAdmins.some((admin) => adminKey(admin) === adminKey(place.admin) || adminKey(admin) === nameKey(place.name))
    })
    if (matches.length !== 1) continue
    const place = matches[0]
    const sourceId = `osm:${place.osmType}/${place.osmId}`
    const sourceUrl = `https://www.openstreetmap.org/${place.osmType}/${place.osmId}`
    const precision = `OSM ${place.placeType} feature center for published locality; not a site coordinate`
    actor.locations.push({
      locationType: "operational area", country: actor.country, region: actor.regionState ?? place.admin,
      district: actor.districtCounty, town: place.name, address: null,
      latitude: place.lat, longitude: place.lon,
      coordinatePrecision: precision, coordinateConfidence: "low", sourceId, sourceUrl,
      currentness: "2026-10-08",
      notes: `Actor locality comes from the canonical workbook. Point is the OpenStreetMap ${place.placeType} feature center for ${place.name}, ${place.admin}; actual site position is unverified.`,
      groupKey: `${actor.country}|${place.lat}|${place.lon}|approx`,
    })
    if (!actor.sources.some((source) => source.id === sourceId)) {
      actor.sources.push({ id: sourceId, title: `${place.name} OSM locality`, url: sourceUrl, sourceType: "derived display point", publisher: "OpenStreetMap", date: "2026-10-08", evidenceClass: null })
    }
    osmDerived.push({ actorId: actor.id, name: actor.name, country: actor.country, town: place.name, sourceId })
  }
  for (const actor of actors) actor.sourceCount = Math.max(actor.sourceCount ?? 0, actor.sources.length)
  return { imported, localityDerived, osmDerived, review, ugandaKml, sourceRecords: records.length, osmLocalityCount: osmLocalities.length, skippedForestCount }
}
