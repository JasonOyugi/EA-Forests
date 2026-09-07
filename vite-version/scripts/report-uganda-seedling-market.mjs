import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))
const observations = read("src/app/shop/data/source-data/uganda/nfa-seedling-price-observations.json")
const sources = read("src/app/shop/data/source-data/uganda/source-records.json")
const materialKey = (row) => `${row.product}|${row.variety ?? ""}|${row.materialType ?? "seedling"}`
const materials = new Map()
for (const row of observations) materials.set(materialKey(row), [...(materials.get(materialKey(row)) ?? []), row])
const cloneRows = observations.filter((row) => row.materialType === "named clone")
const report = {
  generatedAt: new Date().toISOString(),
  jurisdiction: "Uganda",
  rawSourceRecords: sources.length,
  rawPriceObservations: observations.length,
  canonicalNurseryEntities: 1,
  likelyDuplicateOrUnresolvedEntities: 0,
  nurseryDistrictCoverage: { Kampala: 1 },
  nurseriesByEvidenceVintage: { "2023-2024": 1 },
  nurseriesWithPhoneOrContact: 1,
  nurseriesWithCoordinates: 0,
  nurseriesWithPriceObservations: 1,
  nurseriesWithExplicitSpeciesInformation: 1,
  clonalOperators: 1,
  observedNamedCloneSuppliers: new Set(cloneRows.map((row) => row.variety)).size,
  inferredGuFamilySuppliers: 0,
  inferredGcFamilySuppliers: 0,
  speciesOrMaterialCount: materials.size,
  observedPriceRanges: Object.fromEntries([...materials.entries()].slice(0, 12).map(([key, rows]) => [key, { currency: "UGX", min: Math.min(...rows.map((row) => row.amount)), max: Math.max(...rows.map((row) => row.amount)), unit: "seedling", basis: "NFA official price list; pot size remains in source rows" }])),
  historicalVersusCurrentOperatingEvidence: { currentAvailabilityUnverified: 1, historicalOnly: 0 },
  inferredPlantingMaterialCapabilities: [],
  sourceStatus: sources.map((source) => ({ id: source.id, status: source.rawLocator?.includes("blocked") ? "pending_manual_retrieval" : "ingested" })),
  limitations: ["NFA PDF rows are official price observations, not proof of current stock.", "No nursery register rows were imported from blocked Scribd pages.", "No exact nursery coordinates were invented.", "No GU/GC family inference was emitted because the accessible NFA source names clones directly but does not establish operator capability beyond the NFA seller."],
}
const output = path.join(root, "docs/data-provenance/uganda-seedling-market-report.json")
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Wrote ${path.relative(root, output)}`)
