import images from "./planting-images.json"
import type { ShopItemImage } from "../types"

const galleries = images as Record<string, ShopItemImage[]>

export function plantingGallery(name: string): ShopItemImage[] {
  const exact = Object.keys(galleries).find((species) => species.toLowerCase() === name.toLowerCase())
  if (exact && galleries[exact].length) return galleries[exact]
  const genus = name.split(" ")[0].toLowerCase()
  const reference = Object.keys(galleries).find((species) => species.toLowerCase().startsWith(genus + " ") && galleries[species].length)
  if (!reference) return []
  // A reference image must never masquerade as a photographed named clone/source.
  return galleries[reference].map((image) => ({ ...image, specificity: "genus-level",
    title: `${image.depicts} — genus-level reference; not a verified photograph of ${name}` }))
}
