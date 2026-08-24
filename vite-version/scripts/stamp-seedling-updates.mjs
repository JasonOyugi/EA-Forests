import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const inventoryPath = resolve(scriptDirectory, "../src/app/shop/data/seedlings.json")
const updatedAt = process.argv[2] ?? new Date().toISOString().slice(0, 10)

if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
  throw new Error("Expected an update date in YYYY-MM-DD format")
}

const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"))
const stampedInventory = inventory.map((item) => ({
  ...item,
  updatedAt: item.updatedAt ?? updatedAt,
}))

writeFileSync(inventoryPath, `${JSON.stringify(stampedInventory, null, 2)}\n`, "utf8")
console.log(`Stamped ${stampedInventory.length} seedling products with individual update dates.`)
