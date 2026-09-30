// Wood Markets vocabulary: what a processor makes from roundwood, and what it therefore buys.
//
// End products are the only five outputs the atlas recognises. Inputs are derived, never entered:
// every processor takes logs; MDF/fibreboard and wood-fuel makers also take wood chips; pole
// treaters also take (untreated) poles.

export const END_PRODUCTS = ["sawn timber", "wood fuel", "veneer/plywood", "mdf/fibreboards", "poles"]
export const INPUTS = ["logs", "wood chips", "poles"]

/** Parses the workbook's `processor_end_products` cell ("sawn timber; poles"), keeping only known values. */
export function parseEndProducts(value) {
  if (value == null) return []
  const wanted = String(value)
    .split(/[;,]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return END_PRODUCTS.filter((product) => wanted.includes(product))
}

export function unknownEndProducts(value) {
  if (value == null) return []
  return String(value)
    .split(/[;,]/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !END_PRODUCTS.includes(part))
}

export function inputsForEndProducts(endProducts) {
  if (!endProducts.length) return []
  const inputs = new Set(["logs"])
  if (endProducts.includes("mdf/fibreboards") || endProducts.includes("wood fuel")) inputs.add("wood chips")
  if (endProducts.includes("poles")) inputs.add("poles")
  return INPUTS.filter((input) => inputs.has(input))
}
