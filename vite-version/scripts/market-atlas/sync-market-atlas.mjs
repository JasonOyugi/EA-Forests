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

  const sourceHash = hashFiles([actorsWorkbookPath, providersWorkbookPath])

  const masterActors = normalizeActorMaster(actorSheets)
  const { actors, reconciliation, reviewCandidates } = reconcileProviders(masterActors, providerSheets)

  const validated = []
  const validationErrors = []
  for (const actor of actors) {
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

  const report = {
    generatedAt: output.generatedAt,
    sourceHash,
    masterActorCount: masterActors.length,
    publishedActorCount: validated.length,
    providerOnlyCount: validated.filter((a) => a.id.startsWith("provider:")).length,
    mergedProviderCount: reconciliation.filter((r) => r.status === "merged").length,
    actorsWithRegionAssignment: withRegion,
    actorsWithPreciseCoordinates: withCoords,
    validationErrors,
    reconciliation,
    reviewCandidates,
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(`Market Atlas sync: ${validated.length} actors published (${masterActors.length} master + ${report.providerOnlyCount} provider-only, ${report.mergedProviderCount} merged).`)
  console.log(`  Region-assigned: ${withRegion}/${validated.length}. Precise coordinates: ${withCoords}/${validated.length}.`)
  console.log(`  ${reviewCandidates.length} provider match(es) flagged for manual review in data/market-atlas/sync-report.json.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
