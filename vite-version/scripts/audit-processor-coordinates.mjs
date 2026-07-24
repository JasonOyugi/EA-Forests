import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const databasePath = path.join(
  projectRoot,
  "src",
  "app",
  "shop",
  "data",
  "market-databases",
  "processors.json"
)

const records = JSON.parse(fs.readFileSync(databasePath, "utf8"))

const countryBounds = {
  Uganda: { minLat: -1.6, maxLat: 4.3, minLon: 29.4, maxLon: 35.2 },
  Kenya: { minLat: -4.8, maxLat: 5.2, minLon: 33.8, maxLon: 42.1 },
  Tanzania: { minLat: -12, maxLat: 0.2, minLon: 29, maxLon: 41.5 },
}

function coordinateKey(record) {
  return `${Number(record.lat).toFixed(6)},${Number(record.lon).toFixed(6)}`
}

function isWithinCountry(record) {
  const bounds = countryBounds[record["Country source"]]
  if (!bounds) return true

  const latitude = Number(record.lat)
  const longitude = Number(record.lon)
  return (
    latitude >= bounds.minLat &&
    latitude <= bounds.maxLat &&
    longitude >= bounds.minLon &&
    longitude <= bounds.maxLon
  )
}

function offsetCoordinate(latitude, longitude, radiusKm, angleRadians) {
  const latitudeOffset = (radiusKm / 111.32) * Math.sin(angleRadians)
  const longitudeScale = Math.max(
    0.2,
    Math.cos((latitude * Math.PI) / 180)
  )
  const longitudeOffset =
    (radiusKm / (111.32 * longitudeScale)) * Math.cos(angleRadians)

  return {
    latitude: latitude + latitudeOffset,
    longitude: longitude + longitudeOffset,
  }
}

const groups = Object.entries(records).reduce((result, [name, record]) => {
  const key = coordinateKey(record)
  const group = result.get(key) ?? []
  group.push([name, record])
  result.set(key, group)
  return result
}, new Map())

let shiftedCount = 0
let retainedCount = 0
let invalidCount = 0

for (const [name, record] of Object.entries(records)) {
  if (!Number.isFinite(Number(record.lat)) || !Number.isFinite(Number(record.lon))) {
    record["Coordinate audit"] = "Invalid numeric coordinate; requires correction."
    record["Coordinate confidence"] = "Low"
    invalidCount += 1
    continue
  }

  if (record["Original coordinate"] && record["Display offset km"]) {
    record["Coordinate audit"] =
      `Source locality retained; marker offset ${Number(record["Display offset km"]).toFixed(2)} km ` +
      "to separate coincident approximate records. Exact plant gate remains unverified."
    shiftedCount += 1
    continue
  }

  if (!isWithinCountry(record)) {
    record["Coordinate audit"] =
      "Coordinate falls outside the stated country's broad bounds; requires source review."
    record["Coordinate confidence"] = "Low"
    invalidCount += 1
    continue
  }

  const group = groups.get(coordinateKey(record)) ?? []
  const confidence = String(record["Coordinate confidence"] ?? "").toLowerCase()
  const canOffset = group.length > 1 && confidence !== "high"

  if (!canOffset) {
    record["Coordinate audit"] =
      confidence === "high"
        ? "Published address or plot vicinity retained; coordinate is not necessarily a surveyed gate."
        : group.length > 1
          ? "Published high-confidence vicinity retained; overlapping records remain cluster-spiderfied on the map."
          : "Coordinate retained after country and stated-locality consistency review; exact gate not independently verified."
    if (!record["Coordinate confidence"]) record["Coordinate confidence"] = "Low"
    retainedCount += 1
    continue
  }

  const eligible = group
    .filter(([, item]) =>
      String(item["Coordinate confidence"] ?? "").toLowerCase() !== "high"
    )
    .sort(([left], [right]) => left.localeCompare(right))
  const index = eligible.findIndex(([itemName]) => itemName === name)
  const radiusKm = Math.min(4.5, 0.8 + (index % 6) * 0.55 + Math.floor(index / 6) * 0.65)
  const angleRadians = index * 2.399963229728653
  const originalLatitude = Number(record.lat)
  const originalLongitude = Number(record.lon)
  const shifted = offsetCoordinate(
    originalLatitude,
    originalLongitude,
    radiusKm,
    angleRadians
  )

  record["Original coordinate"] =
    `${originalLatitude.toFixed(6)}, ${originalLongitude.toFixed(6)}`
  record["Display offset km"] = Number(radiusKm.toFixed(2))
  record.lat = Number(shifted.latitude.toFixed(6))
  record.lon = Number(shifted.longitude.toFixed(6))
  record["Coordinate precision"] =
    `${record["Coordinate precision"] || "Locality centroid"}; ` +
    "approximate display offset from a shared locality centroid, not a surveyed gate"
  record["Coordinate audit"] =
    `Source locality retained; marker offset ${radiusKm.toFixed(2)} km ` +
    "to separate coincident approximate records. Exact plant gate remains unverified."
  record["Coordinate map URL"] =
    `https://www.openstreetmap.org/?mlat=${record.lat.toFixed(6)}` +
    `&mlon=${record.lon.toFixed(6)}#map=15/${record.lat.toFixed(6)}/${record.lon.toFixed(6)}`
  shiftedCount += 1
}

fs.writeFileSync(databasePath, `${JSON.stringify(records, null, 2)}\n`)

console.log(
  JSON.stringify(
    {
      total: Object.keys(records).length,
      shifted: shiftedCount,
      retained: retainedCount,
      invalid: invalidCount,
    },
    null,
    2
  )
)
