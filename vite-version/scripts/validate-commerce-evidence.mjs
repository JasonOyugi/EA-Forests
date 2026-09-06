import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"))
const failures = []

const landItems = readJson("src/app/shop/data/forests-land.json")
const productionLandItems = landItems.filter(
  (item) => !item.tags?.some((tag) => /^(dummy|generated|test)(-|$)/i.test(tag))
)
if (productionLandItems.some((item) => JSON.stringify(item).includes("dummy-land-generated"))) {
  failures.push("dummy land record exposed in production inventory")
}

for (const relativePath of [
  "src/app/shop/data/seedlings.json",
  "src/app/shop/data/forestry-services.json",
  "src/app/shop/data/forests-land.json",
  "src/app/shop/data/roundwood.json",
]) {
  const value = readJson(relativePath)
  if (/"rating"|"reviewCount"|"reviews"/i.test(JSON.stringify(value))) {
    failures.push(`synthetic rating or review field found in ${relativePath}`)
  }
}

const sourceDataPath = path.join(root, "src/app/shop/data/source-data")
for (const fileName of fs.readdirSync(sourceDataPath)) {
  if (!fileName.endsWith(".json")) continue
  const records = readJson(path.join("src/app/shop/data/source-data", fileName))
  for (const record of records) {
    if (record.kind === "inferred" && !record.inferenceRuleId) failures.push(`${fileName}: inferred evidence lacks inferenceRuleId`)
    if (record.originalAmount != null && (!record.originalCurrency || !record.unit || !record.sourceIds?.length)) {
      failures.push(`${fileName}: source price lacks currency, unit, or source IDs`)
    }
    if ((record.latitude != null || record.longitude != null) && !record.precision) {
      failures.push(`${fileName}: coordinate lacks precision metadata`)
    }
    if (record.kind === "inferred" && /\b(gu\s*7|gc\s*550)\b/i.test(record.name ?? record.product ?? "")) {
      failures.push(`${fileName}: named clone cannot be inferred`)
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("Commerce evidence validation passed.")