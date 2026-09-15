import type {
  AvailabilityEvidence,
  EvidenceRef,
  LocationEvidence,
  PriceObservation,
  ShopItem,
  SourceRecord,
} from "../../types"
import { ugandaNfaSeedlingItems } from "./uganda"

export type CommerceSourceFact =
  | SourceRecord
  | EvidenceRef
  | PriceObservation
  | LocationEvidence
  | AvailabilityEvidence

export const commerceSourceData: Array<CommerceSourceFact | ShopItem> = [
  ...ugandaNfaSeedlingItems,
]

export function isShopItem(record: unknown): record is ShopItem {
  if (!record || typeof record !== "object") return false

  const candidate = record as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.shop === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string"
  )
}

export function getProductionShopItems(): ShopItem[] {
  return commerceSourceData.filter(isShopItem)
}
