import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { enrichUgandaKmlLocations } from "./uganda-kml-locations.mjs"

const root = fileURLToPath(new URL("../../../", import.meta.url))
const evidence = JSON.parse(fs.readFileSync(path.join(root, "data/market-atlas/uganda-kml-locations.json"), "utf8"))
const makeActors = () => [...new Map(evidence.locations.map((row) => [row.actorId, {
  id: row.actorId, name: row.actorName, country: "Uganda", modes: ["wood"], locations: [], sources: [],
}])).values()]

test("imports 19 sourced points across 15 identities without inventing precision or status", () => {
  const actors = makeActors()
  const report = enrichUgandaKmlLocations(actors, root)
  assert.equal(actors.length, 15)
  assert.equal(report.imported.length, 19)
  assert.equal(report.review.length, 7)
  for (const actor of actors) {
    for (const location of actor.locations) {
      assert.equal(location.coordinateConfidence, "low")
      assert.equal(location.currentness, null)
      assert.equal(location.sourceUrl, null)
      assert.match(location.coordinatePrecision, /gate accuracy unverified/)
      assert.ok(actor.sources.some((source) => source.id === location.sourceId && source.evidenceClass === "C"))
    }
  }
  const shanglong = actors.find((actor) => actor.id === "EAFA0377").locations[0]
  assert.equal(shanglong.latitude, 1.0989088)
  assert.equal(shanglong.longitude, 31.6226227)
  const cfid = actors.find((actor) => actor.id === "EAFA0372").locations
  assert.equal(cfid.length, 1)
  assert.equal(cfid[0].longitude, 32.2329796)
  const plantations = actors.find((actor) => actor.id === "EAFA0313").locations
  assert.equal(plantations.length, 3)
  assert.ok(plantations.every((location) => location.locationType === "plantation"))
  assert.match(plantations.find((location) => location.address.includes("Achwa")).notes, /not planted/)
  assert.equal(actors.find((actor) => actor.id === "EAFA0378").locations.length, 2)
  assert.equal(actors.find((actor) => actor.id === "EAFA0376").locations[0].locationType, "factory")
})

test("preserves existing evidence and is idempotent", () => {
  const actors = makeActors()
  const existing = { sourceId: "existing-site", latitude: 0.3, longitude: 32.5 }
  actors[0].locations.push(existing)
  actors[0].sources.push({ id: "existing-site" })
  enrichUgandaKmlLocations(actors, root)
  const firstResult = structuredClone(actors)
  const report = enrichUgandaKmlLocations(actors, root)
  assert.deepEqual(actors, firstResult)
  assert.equal(report.imported.length, 0)
  assert.deepEqual(actors[0].locations[0], existing)
})

test("rejects missing actors or mismatched name, country, and market role", () => {
  assert.throws(() => enrichUgandaKmlLocations([], root), /identity mismatch/)
  for (const [field, value] of [["name", "Different actor"], ["country", "Kenya"], ["modes", ["seed"]]]) {
    const actors = makeActors()
    actors[0][field] = value
    assert.throws(() => enrichUgandaKmlLocations(actors, root), /identity mismatch/)
  }
})