import type {
  AvailabilityEvidence,
  EvidenceRef,
  LocationEvidence,
  PriceObservation,
  SourceRecord,
} from "../../types"

export type CommerceSourceFact =
  | SourceRecord
  | EvidenceRef
  | PriceObservation
  | LocationEvidence
  | AvailabilityEvidence

export const commerceSourceData: CommerceSourceFact[] = []
