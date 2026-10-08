// Regenerates the Market Atlas actor database from the two canonical workbooks.
//
//   vite-version/data/market-atlas/actors.xlsx     (EA Forests Forestry Actor Master, v1)
//   vite-version/data/market-atlas/providers.xlsx  (EA Forests East Africa Forestry Service Providers, v1)
//
// Editing either workbook and re-running `npm run sync:market-atlas` (or `npm run build`, which
// runs this first) regenerates the JSON the Market Atlas UI reads — no data is hand-edited in
// React. See vite-version/scripts/market-atlas/lib/ for the individual pipeline stages.
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { readWorkbookSheets } from "./lib/xlsx-reader.mjs"
import { normalizeActorMaster } from "./lib/normalize.mjs"
import { reconcileProviders } from "./lib/reconcile.mjs"
import { actorSchema } from "./lib/schema.mjs"
import { enrichActorLocations } from "./lib/enrich-locations.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const actorsWorkbookPath = path.join(root, "data/market-atlas/actors.xlsx")
const providersWorkbookPath = path.join(root, "data/market-atlas/providers.xlsx")
const outputDir = path.join(root, "src/app/shop/data/market-atlas")
const reportPath = path.join(root, "data/market-atlas/sync-report.json")

function hashFiles(paths) {
  const hash = crypto.createHash("sha256")
  for (const filePath of paths) hash.update(fs.readFileSync(filePath))
  return hash.digest("hex")
}

function combineCoverageGaps(actorSheets, providerSheets) {
  return [...(actorSheets.Coverage_Gaps ?? []), ...(providerSheets.Coverage_Gaps ?? [])]
}

async function main() {
  console.log("Market Atlas sync: reading workbooks...")
  const [actorSheets, providerSheets] = await Promise.all([
    readWorkbookSheets(actorsWorkbookPath),
    readWorkbookSheets(providersWorkbookPath),
  ])

  const sourceHash = hashFiles([
    actorsWorkbookPath,
    providersWorkbookPath,
    path.join(root, "src/app/shop/data/market-databases/processors.json"),
    path.join(root, "src/app/shop/data/market-databases/nurseries.json"),
    path.join(root, "src/app/shop/data/market-databases/large-commercial-forests.json"),
    path.join(root, "data/market-atlas/osm-localities.json"),
  ])

  const masterActors = normalizeActorMaster(actorSheets)
  const { actors, reconciliation, reviewCandidates } = reconcileProviders(masterActors, providerSheets)
  const locationEnrichment = enrichActorLocations(actors, root)

  // Rows kept in the workbooks for audit but never published (e.g. catalog_status
  // "exclude_placeholder" for registry test entries with dummy names/numbers).
  const excluded = actors.filter((a) => /^exclude/i.test(a.catalogStatus ?? ""))
  const publishable = actors.filter((a) => !/^exclude/i.test(a.catalogStatus ?? ""))

  const validated = []
  const validationErrors = []
  for (const actor of publishable) {
    const result = actorSchema.safeParse(actor)
    if (result.success) {
      validated.push(result.data)
    } else {
      validationErrors.push({ id: actor.id, name: actor.name, issues: result.error.issues })
    }
  }

  if (validationErrors.length) {
    console.error(`Market Atlas sync: ${validationErrors.length} actor(s) failed schema validation:`)
    for (const err of validationErrors.slice(0, 20)) {
      console.error(`  ${err.id ?? "(no id)"} ${err.name ?? ""} — ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`)
    }
    process.exitCode = 1
  }

  const coverage = combineCoverageGaps(actorSheets, providerSheets)
  const publishedIds = new Set(validated.map((actor) => actor.id))
  const publishedLocationEnrichment = {
    ...locationEnrichment,
    imported: locationEnrichment.imported.filter((row) => publishedIds.has(row.actorId)),
    localityDerived: locationEnrichment.localityDerived.filter((row) => publishedIds.has(row.actorId)),
    osmDerived: locationEnrichment.osmDerived.filter((row) => publishedIds.has(row.actorId)),
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceHash,
    actors: validated,
    coverage,
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, "actors.json"), JSON.stringify(output))

  const withRegion = validated.filter((a) => a.regionId).length
  const withCoords = validated.filter((a) => a.locations.some((l) => l.latitude != null)).length
  const exactPoints = validated.filter((a) => a.locations.some((l) => l.latitude != null && /verified (factory|site|gate) coordinate|surveyed (factory|site|gate)/i.test(l.coordinatePrecision ?? "") && !/\bnot\b|unverified|approximate/i.test(l.coordinatePrecision ?? ""))).length
  const confidenceCounts = Object.fromEntries(["high", "medium", "low"].map((level) => [level, validated.filter((a) => a.locations.some((l) => l.latitude != null && l.coordinateConfidence === level)).length]))
  const approximate = validated.filter((a) => a.locations.some((l) => l.latitude != null && /centroid|fallback|proxy|vicinity|locality|approximate|district|town/i.test(l.coordinatePrecision ?? ""))).length
  const unresolved = validated.filter((a) => !a.locations.some((l) => l.latitude != null)).map((a) => ({ id: a.id, name: a.name, country: a.country, region: a.regionName, website: a.website }))

  const report = {
    generatedAt: output.generatedAt,
    sourceHash,
    masterActorCount: masterActors.length,
    publishedActorCount: validated.length,
    providerOnlyCount: validated.filter((a) => a.id.startsWith("provider:")).length,
    excludedActors: excluded.map((a) => ({ id: a.id, name: a.name, catalogStatus: a.catalogStatus })),
    mergedProviderCount: reconciliation.filter((r) => r.status === "merged").length,
    actorsWithRegionAssignment: withRegion,
    actorsWithPreciseCoordinates: exactPoints,
    actorsWithVerifiedSiteCoordinates: exactPoints,
    actorsWithPointCoordinates: withCoords,
    actorsWithApproximatePoints: approximate,
    actorsWithMultipleLocations: validated.filter((a) => a.locations.length > 1).length,
    actorsWithMultiplePointLocations: validated.filter((a) => a.locations.filter((l) => l.latitude != null).length > 1).length,
    coordinateConfidenceCounts: confidenceCounts,
    regionalOnlyActors: unresolved.filter((a) => a.regionId).length,
    unresolvedActors: unresolved,
    enrichmentQueue: validated.filter((a) => !a.locations.some((l) => l.latitude != null) || a.locations.some((l) => l.latitude != null && l.coordinateConfidence === "low")).map((a) => ({ id: a.id, name: a.name, country: a.country, website: a.website, status: a.locations.some((l) => l.latitude != null) ? "low-confidence point" : a.regionId ? "regional only" : "unresolved", nextStep: a.website ? "Check official contact/location page and published map links" : "Check regulator/certification registry, then credible business directory" })),
    locationSourceCoverage: publishedLocationEnrichment,
    validationErrors,
    reconciliation,
    reviewCandidates,
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(path.dirname(reportPath), "location-audit.md"), `# Market Atlas location audit\n\n` +
    `Generated: ${output.generatedAt}\n\n` +
    `| Measure | Before | After |\n|---|---:|---:|\n` +
    `| Published actors | ${validated.length} | ${validated.length} |\n` +
    `| Actors with a mapped point | 0 | ${withCoords} |\n` +
    `| Verified site/gate coordinates | 0 | ${exactPoints} |\n` +
    `| Approximate/locality points | 0 | ${approximate} |\n` +
    `| Actors without a point | ${validated.length} | ${unresolved.length} |\n\n` +
    `Coordinate confidence among mapped actors: high ${confidenceCounts.high}, medium ${confidenceCounts.medium}, low ${confidenceCounts.low}. These are source confidence labels, not a claim of surveyed precision.\n\n` +
    `Direct legacy matches: ${publishedLocationEnrichment.imported.length} of ${locationEnrichment.sourceRecords} eligible source records. Additional actors placed at a sourced town/locality centroid: ${publishedLocationEnrichment.localityDerived.length}. OSM locality centers for workbook-named towns: ${publishedLocationEnrichment.osmDerived.length}, from ${locationEnrichment.osmLocalityCount} curated features. Original source coordinates were restored for ${publishedLocationEnrichment.imported.filter((row) => row.offsetRestored).length} legacy display-offset markers. The commercial-forests file has ${locationEnrichment.skippedForestCount} records without usable per-record provenance, so none were promoted.\n\n` +
    `The direct matching rule requires an exact normalized name or alias, country, and relevant market role. Duplicate candidates need unique phone/domain corroboration or remain in review. Town-derived points require a named locality in the canonical workbook, a unique source feature, and matching administrative context where available. OSM feature centers are approximate and do not establish a site, yard, or gate coordinate. No region center or unsourced coordinate is substituted for a site.\n\n` +
    `Actors with multiple location records: ${report.actorsWithMultipleLocations}; actors with multiple distinct mapped points: ${report.actorsWithMultiplePointLocations}. Location records can be overlapping evidence for one place and should not automatically be counted as distinct sites.\n\n` +
    `Unresolved/low-confidence web-enrichment queue (${report.enrichmentQueue.length} records), direct-match audit, and ${report.locationSourceCoverage.review.length} ambiguous legacy match(es) are in [sync-report.json](./sync-report.json). Check official actor contact pages first, then authoritative registries, then directories. Keep locality precision and source URLs on every future point.\n`)

  console.log(`Market Atlas sync: ${validated.length} actors published (${masterActors.length} master + ${report.providerOnlyCount} provider-only, ${report.mergedProviderCount} merged).`)
  console.log(`  Region-assigned: ${withRegion}/${validated.length}. Sourced points: ${withCoords}/${validated.length}; verified site coordinates: ${exactPoints}.`)
  console.log(`  ${reviewCandidates.length} provider match(es) flagged for manual review in data/market-atlas/sync-report.json.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
