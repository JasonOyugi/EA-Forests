import fs from "node:fs"
import path from "node:path"

export function enrichUgandaKmlLocations(actors, root) {
  const sourcePath = "data/market-atlas/uganda-kml-locations.json"
  const evidence = JSON.parse(fs.readFileSync(path.join(root, sourcePath), "utf8"))
  const imported = []
  for (const row of evidence.locations) {
    const actor = actors.find((candidate) => candidate.id === row.actorId)
    if (!actor || actor.name !== row.actorName || actor.country !== "Uganda" || !actor.modes.includes("wood")) {
      throw new Error(`KML actor identity mismatch: ${row.actorId} (${row.actorName})`)
    }
    if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || row.latitude < -1.5 || row.latitude > 4.3 || row.longitude < 29.5 || row.longitude > 35.1) {
      throw new Error(`Invalid Uganda KML point: ${row.placemark}`)
    }
    const sourceId = `uganda-kml:${row.layer}:${row.placemark}`
    if (actor.locations.some((location) => location.sourceId === sourceId)) continue
    actor.locations.push({
      locationType: row.locationType, country: "Uganda", region: null, district: null,
      town: null, address: row.placemark.trim(), latitude: row.latitude, longitude: row.longitude,
      coordinatePrecision: "User-supplied KML site marker; approximate position, gate accuracy unverified",
      coordinateConfidence: "low", sourceId, sourceUrl: null, currentness: null,
      notes: `${evidence.sourceFile}; layer: ${row.layer}; placemark: ${row.placemark}. ${row.matchBasis} Received ${evidence.receivedDate}; original observation date unknown. Not independently surveyed or verified.`,
      groupKey: `Uganda|${row.latitude}|${row.longitude}|approx`,
    })
    if (!actor.sources.some((source) => source.id === sourceId)) {
      actor.sources.push({ id: sourceId, title: `${evidence.sourceFile}: ${row.placemark.trim()}`, url: null,
        sourceType: evidence.sourceType, publisher: "User-supplied map", date: evidence.receivedDate, evidenceClass: "C" })
    }
    imported.push({ actorId: actor.id, name: actor.name, placemark: row.placemark, layer: row.layer, sourceId, locationType: row.locationType })
  }
  return { sourceFile: evidence.sourceFile, sourceSha256: evidence.sourceSha256, sourcePath, imported, review: evidence.review }
}