import processors from "@/app/shop/data/market-databases/processors.json"
import type { EvidenceValue, GradeTonnes, Provenance, SupplyDataset, SupplyLot } from "./types"

// Fixed demonstration world. These locations and quantities are not forest observations.
export const previewProvenance: Provenance = {
  epistemicClass: "SYNTHETIC", world: { id: "supply-workspace-preview-v1", kind: "experiment" },
  asOf: "2026-09-07", knownAt: "2026-09-07", source: "Supply workspace demonstration fixture v1",
  freshness: "unknown", verification: "unverified", completeness: "partial", evidenceIds: [],
}
function value<T>(input: T | null, missingReason?: string): EvidenceValue<T> {
  return { value: input, missingReason, provenance: previewProvenance }
}

type LotSeed = [string, string, [number, number], string, GradeTonnes, SupplyLot["stage"], SupplyLot["feasibility"], number | null]
const seeds: LotSeed[] = [
  ["UG-042", "Kikandwa cluster", [1.19, 31.77], "2026-10-18", { G1: 1900, G2: 900, G3: 400, unclassified: 250 }, "modelled", "assumed-feasible", 94000],
  ["UG-018", "Kiboga north", [1.03, 31.45], "2026-11-14", { G1: 1150, G2: 650, G3: 300, unclassified: 100 }, "engaged", "assumed-feasible", 89000],
  ["UG-063", "Hoima corridor", [1.37, 31.40], "2026-12-08", { G1: 1450, G2: 1000, G3: 450, unclassified: 350 }, "identified", "unknown", null],
  ["UG-027", "Kyankwanzi east", [1.28, 31.88], "2027-01-20", { G1: 2000, G2: 1050, G3: 450, unclassified: 150 }, "verified", "assumed-feasible", 99000],
  ["UG-031", "Kiboga south", [0.91, 31.60], "2027-03-04", { G1: 650, G2: 450, G3: 200, unclassified: 0 }, "contracted", "assumed-feasible", 91000],
  ["UG-056", "Kafu approach", [1.48, 31.70], "2027-04-16", { G1: 2200, G2: 1450, G3: 550, unclassified: 400 }, "modelled", "assumed-feasible", 103000],
  ["UG-011", "Bukomero cluster", [0.76, 31.91], "2027-07-22", { G1: 1850, G2: 950, G3: 500, unclassified: 300 }, "identified", "unknown", null],
  ["UG-084", "Masindi approach", [1.65, 31.69], "2027-05-12", { G1: 2800, G2: 1600, G3: 700, unclassified: 450 }, "modelled", "assumed-feasible", 113000],
  ["UG-072", "Luwero west", [0.98, 32.24], "2027-08-19", { G1: 2100, G2: 1250, G3: 650, unclassified: 600 }, "identified", "unknown", null],
  ["UG-095", "Mubende approach", [0.58, 31.39], "2027-11-10", { G1: 2400, G2: 1700, G3: 800, unclassified: 550 }, "modelled", "assumed-feasible", 116000],
  ["UG-103", "Kyenjojo east", [0.70, 30.99], "2028-03-18", { G1: 2800, G2: 1800, G3: 900, unclassified: 800 }, "identified", "unknown", null],
  ["UG-006", "Mill access block", [1.07, 31.68], "2026-09-07", { G1: 200, G2: 100, G3: 50, unclassified: 0 }, "delivered", "assumed-feasible", 87000],
  ["UG-009", "Kiboga intake block", [1.02, 31.70], "2026-10-25", { G1: 450, G2: 250, G3: 100, unclassified: 0 }, "scheduled", "assumed-feasible", 88000],
]

const sourceProcessor = processors["Shanglong Industry Company"]
export const supplyPreview: SupplyDataset = {
  provenance: previewProvenance,
  planningStart: "2026-10-01", coverageEnd: "2028-09-30",
  processor: {
    id: "preview-shanglong", name: "Shanglong", location: "Central Uganda · example processor",
    position: [sourceProcessor.lat, sourceProcessor.lon],
    sourcingRadiusKm: value(50),
    specification: {
      id: "preview-standard-euc-v1", label: "Eucalyptus · legacy grading scenario", basis: "legacy-tree-dbh", species: ["Eucalyptus"],
      grades: [
        { grade: "G1", minDiameterCm: sourceProcessor.buyer_specs.euc.grades.g1.dbh_min, minLengthM: 2.7, origin: "Synthetic processor JSON" },
        { grade: "G2", minDiameterCm: 20, minLengthM: 2.7, origin: "Explicit scenario assumption from STANDARD_EUC_SPEC; absent in processor record" },
        { grade: "G3", minDiameterCm: 15, minLengthM: 2.7, origin: "Explicit scenario assumption from STANDARD_EUC_SPEC; absent in processor record" },
      ],
    },
    utilisation: {
      quarter: "Q2 2026", percent: value(57), history: [{ quarter: "Q4 2025", percent: 49 }, { quarter: "Q1 2026", percent: 53 }, { quarter: "Q2 2026", percent: 57 }],
      effectiveCapacityTonnesPerQuarter: value(6000), installedCapacityTonnesPerQuarter: value<number>(null, "No installed capacity record connected"),
    },
    requirements: Array.from({ length: 8 }, (_, index) => ({
      quarter: `${2026 + Math.floor((index + 3) / 4)}-Q${((index + 3) % 4) + 1}`,
      tonnes: value({ G1: 3000, G2: 1500, G3: 900, unclassified: 0 }),
    })),
  },
  lots: seeds.map(([id, name, position, date, gradeTonnes, stage, feasibility, cost], index): SupplyLot => ({
    id, name, sourceIdentity: `Demonstration cluster ${id}`, standId: null, position, geometryMethod: "preview-point", species: "Eucalyptus",
    areaHa: value(12 + index * 3), management: "Illustrative final-harvest tranche; management records missing",
    availability: { start: date, end: date.slice(0, 8) + "28", planningDate: date },
    gradeTonnes: value(gradeTonnes), specificationId: "preview-standard-euc-v1",
    standingVolumeM3: value<number>(null, "No stand inventory connected"),
    recoverableTonnes: value(Object.values(gradeTonnes).reduce((a, b) => a + b, 0)),
    stage, feasibility, commercialAvailability: feasibility === "unknown" ? "unknown" : "assumed",
    deliveredCostUgxPerT: value(cost, cost === null ? "Harvest, access and haulage quotes required" : undefined),
    evidence: [
      { kind: "field", label: "Field inventory", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No measured DBH, height, stocking or density linked. Even the preview ‘verified’ stage has no field evidence." },
      { kind: "management", label: "Harvest window", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "Dates and tonnages are demonstration assumptions; landholder availability is unconfirmed." },
      { kind: "eo-observation", label: "EO observations", acquiredAt: null, status: "missing", provenance: previewProvenance, detail: "No reviewed stand boundary or Sentinel observation attached. A basemap is geographic context, not EO evidence." },
    ],
    nextAction: {
      kind: stage === "scheduled" ? "schedule" : stage === "engaged" ? "engage" : "verify",
      label: stage === "scheduled" ? "Review delivery plan" : stage === "engaged" ? "Prepare procurement review" : "Prepare verification",
      reason: "Confirm owner availability, sample tree dimensions and stocking, and inspect extraction access before procurement.", decisionValue: null,
    },
  })),
}
