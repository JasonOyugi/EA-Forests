import {
  estimateSubBlockAreaMetrics,
  speciesProfile,
  type AssetGroup,
  type SubBlock,
  type TreeVariety,
} from "../data/forestry-data"
import { clamp } from "./dashboard-shared"

export const compartmentScaleOptions = [
  { label: "1 ha", detail: "100 x 100 m", hectaresPerCell: 1 },
  { label: "4 ha", detail: "200 x 200 m", hectaresPerCell: 4 },
  { label: "25 ha", detail: "500 x 500 m", hectaresPerCell: 25 },
] as const

export type CompartmentScaleOption = (typeof compartmentScaleOptions)[number]

export type CompartmentStatus =
  | "thriving"
  | "steady"
  | "stable"
  | "caution"
  | "critical"
  | "dead"

export type BlockMetrics = {
  totalTrees: number
  estimatedVolume: number
  averageHeight: number
  averageDbh: number
  survivalRate: number
}

export type SubCompartmentSample = {
  id: string
  status: CompartmentStatus
  metrics: BlockMetrics
}

export type CompartmentCell = {
  id: string
  subBlockId: string
  subBlock: string
  variety: TreeVariety
  color: string
  representedArea: number
  age: number
  plantedSize: number
  sequence: number
  metrics: BlockMetrics
  subCompartments: SubCompartmentSample[]
}

export type GridCell =
  | { kind: "compartment"; compartment: CompartmentCell }
  | { kind: "empty"; id: string; variety: TreeVariety }

export const compartmentStatusMeta: Record<
  CompartmentStatus,
  {
    label: string
    description: string
    background: string
    border: string
    accent: string
    multiplier: number
  }
> = {
  thriving: {
    label: "High performing",
    description: "Strong growth, clean canopy, and healthy stocking.",
    background: "#064e3b",
    border: "#34d399",
    accent: "rgb(16 185 129)",
    multiplier: 1.08,
  },
  steady: {
    label: "On track",
    description: "Healthy block performance with normal growth response.",
    background: "#047857",
    border: "#6ee7b7",
    accent: "rgb(5 150 105)",
    multiplier: 1,
  },
  stable: {
    label: "Below peak",
    description: "Live compartment, but trailing the strongest blocks.",
    background: "#34d399",
    border: "#a7f3d0",
    accent: "rgb(52 211 153)",
    multiplier: 0.9,
  },
  caution: {
    label: "Caution",
    description: "Localized stress is visible and should be monitored closely.",
    background: "#facc15",
    border: "#fde68a",
    accent: "rgb(250 204 21)",
    multiplier: 0.72,
  },
  critical: {
    label: "In danger",
    description: "Growth, health, or survival is materially below plan.",
    background: "#ef4444",
    border: "#fda4af",
    accent: "rgb(239 68 68)",
    multiplier: 0.45,
  },
  dead: {
    label: "Dead",
    description: "Compartment survival is effectively below economic viability.",
    background: "#020617",
    border: "#475569",
    accent: "rgb(15 23 42)",
    multiplier: 0.18,
  },
}

function seededUnit(seed: string, index: number) {
  let hash = 0
  const value = `${seed}-${index}`

  for (let position = 0; position < value.length; position += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(position)
    hash |= 0
  }

  return Math.abs(Math.sin(hash) * 10_000) % 1
}

function roundMetric(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function getScaleOption(totalPlantedArea: number) {
  if (totalPlantedArea < 100) return compartmentScaleOptions[0]
  if (totalPlantedArea < 400) return compartmentScaleOptions[1]
  return compartmentScaleOptions[2]
}

export function getGridColumns(hectaresPerCell: number) {
  if (hectaresPerCell === 1) return 10
  if (hectaresPerCell === 4) return 12
  return 14
}

export function estimateBlockMetrics(subBlock: SubBlock, representedArea: number): BlockMetrics {
  const metrics = estimateSubBlockAreaMetrics(subBlock, representedArea)

  return {
    totalTrees: metrics.totalTrees,
    estimatedVolume: metrics.estimatedVolume,
    averageHeight: roundMetric(metrics.averageHeight),
    averageDbh: roundMetric(metrics.averageDbh),
    survivalRate: clamp(metrics.survivalRate, 0, 1),
  }
}

function getCompartmentStatus(
  compartmentSeed: string,
  index: number,
  baseMetrics: BlockMetrics,
  age: number
): CompartmentStatus {
  const signal = seededUnit(compartmentSeed, index)
  const performanceScore =
    clamp(0.45 + age * 0.03 + baseMetrics.survivalRate * 0.42, 0.38, 0.92) +
    (signal - 0.5) * 0.34

  if (signal < 0.035) return "dead"
  if (signal < 0.08 || performanceScore < 0.48) return "critical"
  if (signal < 0.16 || performanceScore < 0.6) return "caution"
  if (performanceScore > 0.88) return "thriving"
  if (performanceScore > 0.74) return "steady"
  return "stable"
}

function createSubCompartments(
  subBlock: SubBlock,
  representedArea: number,
  sequence: number
) {
  const compartmentSeed = `${subBlock.id}-${sequence}`
  const blockVariance = seededUnit(compartmentSeed, 99)
  const metricBias = 0.92 + blockVariance * 0.16
  const baseMetrics = estimateBlockMetrics(subBlock, representedArea)
  const adjustedBaseMetrics = {
    totalTrees: Math.max(0, Math.round(baseMetrics.totalTrees * metricBias)),
    estimatedVolume: Math.max(0, Math.round(baseMetrics.estimatedVolume * metricBias)),
    averageHeight: roundMetric(baseMetrics.averageHeight * clamp(metricBias + 0.03, 0.9, 1.12)),
    averageDbh: roundMetric(baseMetrics.averageDbh * clamp(metricBias + 0.04, 0.9, 1.12)),
    survivalRate: clamp(baseMetrics.survivalRate * clamp(metricBias + 0.02, 0.9, 1.06), 0.5, 0.98),
  } satisfies BlockMetrics
  const perCellArea = representedArea / 16

  return Array.from({ length: 16 }, (_, index) => {
    const status = getCompartmentStatus(
      compartmentSeed,
      index,
      adjustedBaseMetrics,
      subBlock.age
    )
    const statusMeta = compartmentStatusMeta[status]
    const scaledMetrics = estimateBlockMetrics(subBlock, perCellArea)
    const cellVariance = 0.9 + seededUnit(compartmentSeed, index + 200) * 0.22

    return {
      id: `${compartmentSeed}-sub-${index + 1}`,
      status,
      metrics: {
        totalTrees: Math.max(
          0,
          Math.round(scaledMetrics.totalTrees * statusMeta.multiplier * cellVariance)
        ),
        estimatedVolume: Math.max(
          0,
          Math.round(scaledMetrics.estimatedVolume * statusMeta.multiplier * cellVariance)
        ),
        averageHeight: roundMetric(
          scaledMetrics.averageHeight *
            clamp((statusMeta.multiplier + 0.06) * cellVariance, 0.3, 1.12)
        ),
        averageDbh: roundMetric(
          scaledMetrics.averageDbh *
            clamp((statusMeta.multiplier + 0.08) * cellVariance, 0.28, 1.14)
        ),
        survivalRate: clamp(
          scaledMetrics.survivalRate *
            clamp((statusMeta.multiplier + 0.12) * cellVariance, 0.24, 1.08),
          0.08,
          0.98
        ),
      },
    }
  })
}

export function buildCompartmentCell(
  subBlock: SubBlock,
  representedArea: number,
  sequence: number
): CompartmentCell {
  const subCompartments = createSubCompartments(subBlock, representedArea, sequence)
  const aggregateMetrics = subCompartments.reduce(
    (accumulator, sample) => ({
      totalTrees: accumulator.totalTrees + sample.metrics.totalTrees,
      estimatedVolume: accumulator.estimatedVolume + sample.metrics.estimatedVolume,
      averageHeight: accumulator.averageHeight + sample.metrics.averageHeight / subCompartments.length,
      averageDbh: accumulator.averageDbh + sample.metrics.averageDbh / subCompartments.length,
      survivalRate:
        accumulator.survivalRate + sample.metrics.survivalRate / subCompartments.length,
    }),
    {
      totalTrees: 0,
      estimatedVolume: 0,
      averageHeight: 0,
      averageDbh: 0,
      survivalRate: 0,
    }
  )

  return {
    id: `${subBlock.id}-${sequence}`,
    subBlockId: subBlock.id,
    subBlock: subBlock.subBlock,
    variety: subBlock.variety,
    color: speciesProfile[subBlock.variety].color,
    representedArea,
    age: subBlock.age,
    plantedSize: subBlock.plantedSize,
    sequence,
    metrics: {
      totalTrees: aggregateMetrics.totalTrees,
      estimatedVolume: aggregateMetrics.estimatedVolume,
      averageHeight: roundMetric(aggregateMetrics.averageHeight),
      averageDbh: roundMetric(aggregateMetrics.averageDbh),
      survivalRate: clamp(aggregateMetrics.survivalRate, 0.08, 0.98),
    },
    subCompartments,
  }
}

export function buildSiteGrid(
  group: AssetGroup,
  hectaresPerCell: number,
  gridColumns: number
) {
  const groupedCompartments = Array.from(
    group.subBlocks.reduce((groups, subBlock) => {
      const existing = groups.get(subBlock.variety) ?? []
      const cellCount = Math.max(1, Math.round(subBlock.plantedSize / hectaresPerCell))
      const compartments = Array.from({ length: cellCount }, (_, index) =>
        buildCompartmentCell(subBlock, hectaresPerCell, index + 1)
      )

      groups.set(subBlock.variety, [...existing, ...compartments])
      return groups
    }, new Map<TreeVariety, CompartmentCell[]>())
  ).map(([variety, compartments]) => ({ variety, compartments }))

  const compartments = groupedCompartments.flatMap((groupEntry) => groupEntry.compartments)
  const siteGridCells = groupedCompartments.flatMap((groupEntry, groupIndex) => {
    const filledCells = groupEntry.compartments.map(
      (compartment): GridCell => ({
        kind: "compartment",
        compartment,
      })
    )
    const remainder = filledCells.length % gridColumns
    const emptyCount = remainder === 0 ? 0 : gridColumns - remainder
    const spacerCells = Array.from({ length: emptyCount }, (_, spacerIndex): GridCell => ({
      kind: "empty",
      id: `${groupEntry.variety}-row-spacer-${groupIndex + 1}-${spacerIndex + 1}`,
      variety: groupEntry.variety,
    }))

    return [...filledCells, ...spacerCells]
  })

  return { groupedCompartments, compartments, siteGridCells }
}

export function summarizeCompartmentStatuses(compartment: CompartmentCell) {
  return compartment.subCompartments.reduce(
    (summary, sample) => {
      summary[sample.status] += 1
      return summary
    },
    {
      thriving: 0,
      steady: 0,
      stable: 0,
      caution: 0,
      critical: 0,
      dead: 0,
    } satisfies Record<CompartmentStatus, number>
  )
}

export function getCompartmentTone(compartment: CompartmentCell) {
  const summary = summarizeCompartmentStatuses(compartment)
  const dominantState = (
    Object.entries(summary) as Array<[CompartmentStatus, number]>
  ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "steady"

  return compartmentStatusMeta[dominantState]
}
