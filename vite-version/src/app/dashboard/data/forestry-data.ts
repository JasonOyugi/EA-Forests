export type TreeVariety =
  | "eucalyptus"
  | "pine"
  | "cypress"
  | "teak"
  | "corymbia"

export type Activity = "silviculture" | "planting" | "none"
export type Country = "Uganda" | "Kenya" | "Tanzania"
export type MarketType =
  | "biomass"
  | "pulp"
  | "pole"
  | "sawn-timber"
  | "veneer"

export type SiteMetricKey =
  | "portfolioPerformance"
  | "expectedVolume"
  | "expectedPrice"

export type PortfolioMetricKey =
  | "expectedPrice"
  | "expectedVolume"
  | "portfolioValue"
  | "landManaged"
  | "cash"
  | "capitalDeployed"

export type StandDistributionBin = {
  id: string
  treesPerHa: number
  dbhCm: number
  heightM: number
}

export type MarketPriceBand = {
  market: MarketType
  minDbhCm: number
  maxDbhCm: number
  minHeightM: number
  maxHeightM?: number
  pricePerTonneUsd: number
}

export type ForestrySubBlockPeriod = {
  year: number
  managedAreaHa: number
  financedAreaHa: number
  plantedTreesPerHa: number
  standDistribution: StandDistributionBin[]
  marketPriceBands: MarketPriceBand[]
  activity: Activity
  contractor: string
}

export type ForestrySubBlockRecord = {
  id: string
  subBlock: string
  variety: TreeVariety
  currentAge: number
  currentManagedAreaHa: number
  currentFinancedAreaHa: number
  periods: ForestrySubBlockPeriod[]
}

export type ForestrySiteRecord = {
  id: string
  block: string
  summaryTitle: string
  summaryDescription: string
  location: string
  country: Country
  mapCenter: [number, number]
  subBlocks: ForestrySubBlockRecord[]
}

export type AssetSubBlock = {
  id: string
  subBlock: string
  variety: TreeVariety
  size: number
  plantedSize: number
  age: number
  activity: Activity
  contractor: string
}

export type AssetGroup = {
  id: string
  block: string
  summaryTitle: string
  summaryDescription: string
  location: string
  country: Country
  mapCenter: [number, number]
  subBlocks: AssetSubBlock[]
}

export type SubBlock = AssetSubBlock

export type DerivedAreaMetrics = {
  totalTrees: number
  estimatedVolume: number
  estimatedTonnage: number
  estimatedValuation: number
  investmentPlaced: number
  averageHeight: number
  averageDbh: number
  survivalRate: number
  expectedPricePerTonne: number
  expectedPricePerM3: number
}

export type SpeciesAllocationDatum = {
  category: TreeVariety
  value: number
  amount: number
  fill: string
}

export type GroupMetricSeriesRow = {
  year: string
} & Record<TreeVariety, number>

export type PortfolioYearPoint = {
  year: number
} & Record<PortfolioMetricKey, number>

export type PortfolioPoint = {
  date: string
  label: string
  isProjected: boolean
  futureValue: number | null
  pastValue: number | null
} & Record<PortfolioMetricKey, number>

type VarietyProfile = {
  label: string
  color: string
  woodDensityTPerM3: number
  formFactor: number
  taperCoefficient: number
  baselineTreesPerHa: number
  baselineSurvival: number
  heightGrowthRate: number
  dbhGrowthRate: number
  investmentPerHa: number
}

type StandDistributionSeed = {
  share: number
  dbhCm: number
  heightM: number
}

type MarketPriceBandSeed = Omit<MarketPriceBand, "pricePerTonneUsd"> & {
  basePricePerTonneUsd: number
}

type SubBlockSeed = {
  id: string
  subBlock: string
  variety: TreeVariety
  currentManagedAreaHa: number
  currentFinancedAreaHa: number
  currentAge: number
  managedAreaDeltaPerYear: number
  financedAreaDeltaPerYear: number
  plantedTreesPerHa: number
  defaultContractor: string
  activityByYear: Partial<Record<number, Activity>>
  contractorByYear?: Partial<Record<number, string>>
  standDistribution2026: StandDistributionSeed[]
}

type SiteSeed = Omit<ForestrySiteRecord, "subBlocks"> & {
  subBlocks: SubBlockSeed[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function seededUnit(seed: string, step: number) {
  let hash = 0
  const value = `${seed}-${step}`

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(Math.sin(hash) * 10_000) % 1
}

function normalizeWeights(weights: number[]) {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return total === 0 ? weights.map(() => 0) : weights.map((weight) => weight / total)
}

function allocateRoundedCounts(total: number, weights: number[]) {
  const normalized = normalizeWeights(weights)
  const raw = normalized.map((weight) => total * weight)
  const base = raw.map((value) => Math.floor(value))
  let remainder = total - base.reduce((sum, value) => sum + value, 0)

  const rankedFractions = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((left, right) => right.fraction - left.fraction)

  for (const entry of rankedFractions) {
    if (remainder <= 0) break
    base[entry.index] += 1
    remainder -= 1
  }

  return base
}

export const dashboardCurrentYear = 2026
export const portfolioSeriesReferenceDate = new Date("2026-04-23T00:00:00")
const forestryYears = [2024, 2025, 2026, 2027, 2028, 2029] as const

export const speciesProfile: Record<TreeVariety, VarietyProfile> = {
  eucalyptus: {
    label: "Eucalyptus",
    color: "#1f7a45",
    woodDensityTPerM3: 0.63,
    formFactor: 0.47,
    taperCoefficient: 0.055,
    baselineTreesPerHa: 1111,
    baselineSurvival: 0.92,
    heightGrowthRate: 3.7,
    dbhGrowthRate: 2.5,
    investmentPerHa: 1880,
  },
  pine: {
    label: "Pine",
    color: "#2563eb",
    woodDensityTPerM3: 0.52,
    formFactor: 0.49,
    taperCoefficient: 0.048,
    baselineTreesPerHa: 950,
    baselineSurvival: 0.9,
    heightGrowthRate: 2.9,
    dbhGrowthRate: 2.05,
    investmentPerHa: 1720,
  },
  cypress: {
    label: "Cypress",
    color: "#0f766e",
    woodDensityTPerM3: 0.56,
    formFactor: 0.48,
    taperCoefficient: 0.05,
    baselineTreesPerHa: 975,
    baselineSurvival: 0.91,
    heightGrowthRate: 3.15,
    dbhGrowthRate: 2.2,
    investmentPerHa: 1790,
  },
  teak: {
    label: "Teak",
    color: "#c2410c",
    woodDensityTPerM3: 0.67,
    formFactor: 0.45,
    taperCoefficient: 0.06,
    baselineTreesPerHa: 816,
    baselineSurvival: 0.88,
    heightGrowthRate: 2.35,
    dbhGrowthRate: 1.95,
    investmentPerHa: 2140,
  },
  corymbia: {
    label: "Corymbia",
    color: "#b45309",
    woodDensityTPerM3: 0.61,
    formFactor: 0.46,
    taperCoefficient: 0.053,
    baselineTreesPerHa: 1020,
    baselineSurvival: 0.91,
    heightGrowthRate: 3.45,
    dbhGrowthRate: 2.35,
    investmentPerHa: 1950,
  },
}

const marketBandSeeds: Record<TreeVariety, MarketPriceBandSeed[]> = {
  eucalyptus: [
    { market: "biomass", minDbhCm: 8, maxDbhCm: 18, minHeightM: 6, basePricePerTonneUsd: 34 },
    { market: "pulp", minDbhCm: 12, maxDbhCm: 26, minHeightM: 10, basePricePerTonneUsd: 49 },
    { market: "pole", minDbhCm: 14, maxDbhCm: 24, minHeightM: 14, basePricePerTonneUsd: 61 },
    { market: "veneer", minDbhCm: 18, maxDbhCm: 28, minHeightM: 8, maxHeightM: 12, basePricePerTonneUsd: 73 },
    { market: "sawn-timber", minDbhCm: 24, maxDbhCm: 45, minHeightM: 10, basePricePerTonneUsd: 81 },
  ],
  pine: [
    { market: "biomass", minDbhCm: 8, maxDbhCm: 18, minHeightM: 6, basePricePerTonneUsd: 31 },
    { market: "pulp", minDbhCm: 12, maxDbhCm: 24, minHeightM: 9, basePricePerTonneUsd: 46 },
    { market: "pole", minDbhCm: 14, maxDbhCm: 22, minHeightM: 13, basePricePerTonneUsd: 58 },
    { market: "veneer", minDbhCm: 18, maxDbhCm: 27, minHeightM: 8, maxHeightM: 11, basePricePerTonneUsd: 70 },
    { market: "sawn-timber", minDbhCm: 24, maxDbhCm: 42, minHeightM: 10, basePricePerTonneUsd: 84 },
  ],
  cypress: [
    { market: "biomass", minDbhCm: 8, maxDbhCm: 18, minHeightM: 6, basePricePerTonneUsd: 33 },
    { market: "pulp", minDbhCm: 12, maxDbhCm: 25, minHeightM: 9, basePricePerTonneUsd: 47 },
    { market: "pole", minDbhCm: 14, maxDbhCm: 23, minHeightM: 13, basePricePerTonneUsd: 60 },
    { market: "veneer", minDbhCm: 18, maxDbhCm: 28, minHeightM: 8, maxHeightM: 12, basePricePerTonneUsd: 74 },
    { market: "sawn-timber", minDbhCm: 24, maxDbhCm: 43, minHeightM: 10, basePricePerTonneUsd: 82 },
  ],
  teak: [
    { market: "biomass", minDbhCm: 8, maxDbhCm: 16, minHeightM: 6, basePricePerTonneUsd: 39 },
    { market: "pulp", minDbhCm: 12, maxDbhCm: 22, minHeightM: 9, basePricePerTonneUsd: 58 },
    { market: "pole", minDbhCm: 14, maxDbhCm: 24, minHeightM: 13, basePricePerTonneUsd: 71 },
    { market: "veneer", minDbhCm: 18, maxDbhCm: 30, minHeightM: 8, maxHeightM: 11, basePricePerTonneUsd: 95 },
    { market: "sawn-timber", minDbhCm: 26, maxDbhCm: 48, minHeightM: 10, basePricePerTonneUsd: 106 },
  ],
  corymbia: [
    { market: "biomass", minDbhCm: 8, maxDbhCm: 18, minHeightM: 6, basePricePerTonneUsd: 35 },
    { market: "pulp", minDbhCm: 12, maxDbhCm: 25, minHeightM: 9, basePricePerTonneUsd: 50 },
    { market: "pole", minDbhCm: 14, maxDbhCm: 24, minHeightM: 13, basePricePerTonneUsd: 63 },
    { market: "veneer", minDbhCm: 18, maxDbhCm: 28, minHeightM: 8, maxHeightM: 12, basePricePerTonneUsd: 76 },
    { market: "sawn-timber", minDbhCm: 24, maxDbhCm: 44, minHeightM: 10, basePricePerTonneUsd: 86 },
  ],
}

const portfolioFinancePeriods: Record<number, { cashUsd: number; capitalDeployedUsd: number }> = {
  2024: { cashUsd: 548_000, capitalDeployedUsd: 1_025_000 },
  2025: { cashUsd: 596_000, capitalDeployedUsd: 1_152_000 },
  2026: { cashUsd: 638_000, capitalDeployedUsd: 1_292_000 },
  2027: { cashUsd: 694_000, capitalDeployedUsd: 1_438_000 },
  2028: { cashUsd: 733_000, capitalDeployedUsd: 1_571_000 },
  2029: { cashUsd: 781_000, capitalDeployedUsd: 1_708_000 },
}

const siteSeeds: SiteSeed[] = [
  {
    id: "group-1",
    block: "Amuru-Atiti",
    summaryTitle: "Amuru-Atiti production grid",
    summaryDescription:
      "A broad mixed-species Uganda estate where eucalyptus, corymbia, and pine run in production bands designed for quick stand-by-stand health review.",
    location: "Albert-Nile, Northern",
    country: "Uganda",
    mapCenter: [2.78, 31.47],
    subBlocks: [
      {
        id: "sub-1a",
        subBlock: "A1a",
        variety: "eucalyptus",
        currentManagedAreaHa: 32,
        currentFinancedAreaHa: 29,
        currentAge: 6,
        managedAreaDeltaPerYear: 0.8,
        financedAreaDeltaPerYear: 0.7,
        plantedTreesPerHa: 1111,
        defaultContractor: "GreenCanopy Ltd",
        activityByYear: {
          2024: "planting",
          2025: "silviculture",
          2026: "silviculture",
          2027: "none",
          2028: "none",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.22, dbhCm: 12, heightM: 13.4 },
          { share: 0.34, dbhCm: 16, heightM: 17.6 },
          { share: 0.28, dbhCm: 20, heightM: 21.5 },
          { share: 0.16, dbhCm: 24, heightM: 24.1 },
        ],
      },
      {
        id: "sub-1b",
        subBlock: "A1b",
        variety: "corymbia",
        currentManagedAreaHa: 28,
        currentFinancedAreaHa: 26,
        currentAge: 4,
        managedAreaDeltaPerYear: 0.4,
        financedAreaDeltaPerYear: 0.8,
        plantedTreesPerHa: 1020,
        defaultContractor: "-",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "none",
          2027: "silviculture",
          2028: "none",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.25, dbhCm: 10, heightM: 10.5 },
          { share: 0.36, dbhCm: 13, heightM: 13.9 },
          { share: 0.24, dbhCm: 16, heightM: 17.6 },
          { share: 0.15, dbhCm: 19, heightM: 20.4 },
        ],
      },
      {
        id: "sub-1c",
        subBlock: "A1c",
        variety: "pine",
        currentManagedAreaHa: 24,
        currentFinancedAreaHa: 24,
        currentAge: 3,
        managedAreaDeltaPerYear: 0.5,
        financedAreaDeltaPerYear: 0.8,
        plantedTreesPerHa: 950,
        defaultContractor: "Timberline Services",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "planting",
          2027: "silviculture",
          2028: "silviculture",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.29, dbhCm: 9, heightM: 8.8 },
          { share: 0.34, dbhCm: 11.5, heightM: 11.2 },
          { share: 0.23, dbhCm: 14.5, heightM: 14.4 },
          { share: 0.14, dbhCm: 17.5, heightM: 17.6 },
        ],
      },
    ],
  },
  {
    id: "group-2",
    block: "Sarora",
    summaryTitle: "Sarora remote grid",
    summaryDescription:
      "A compact Kenya footprint with pine and teak laid out in clean hectare lanes, making it ideal for fast condition scanning before drilling into sub-compartment detail.",
    location: "Nandi, Rift Valley",
    country: "Kenya",
    mapCenter: [0.42, 35.02],
    subBlocks: [
      {
        id: "sub-2a",
        subBlock: "C2a",
        variety: "pine",
        currentManagedAreaHa: 30,
        currentFinancedAreaHa: 30,
        currentAge: 3,
        managedAreaDeltaPerYear: 0.4,
        financedAreaDeltaPerYear: 0.6,
        plantedTreesPerHa: 950,
        defaultContractor: "Timberline Services",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "planting",
          2027: "silviculture",
          2028: "silviculture",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.28, dbhCm: 9.5, heightM: 9.1 },
          { share: 0.33, dbhCm: 12, heightM: 11.9 },
          { share: 0.24, dbhCm: 14.5, heightM: 14.7 },
          { share: 0.15, dbhCm: 17.5, heightM: 17.9 },
        ],
      },
      {
        id: "sub-2b",
        subBlock: "C2b",
        variety: "teak",
        currentManagedAreaHa: 26,
        currentFinancedAreaHa: 26,
        currentAge: 3,
        managedAreaDeltaPerYear: 0.3,
        financedAreaDeltaPerYear: 0.5,
        plantedTreesPerHa: 816,
        defaultContractor: "Timberline Services",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "planting",
          2027: "silviculture",
          2028: "silviculture",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.31, dbhCm: 8.5, heightM: 7.9 },
          { share: 0.33, dbhCm: 10.5, heightM: 9.8 },
          { share: 0.22, dbhCm: 13.5, heightM: 12.7 },
          { share: 0.14, dbhCm: 16, heightM: 15.1 },
        ],
      },
    ],
  },
  {
    id: "group-3",
    block: "Nyakipam-Mtambula",
    summaryTitle: "Nyakipam-Mtambula canopy grid",
    summaryDescription:
      "A larger, more mature Tanzania site anchored by cypress and eucalyptus, where hectare-level patterns help surface the strongest and weakest production pockets quickly.",
    location: "Mufindi, Iringa",
    country: "Tanzania",
    mapCenter: [-8.73, 35.04],
    subBlocks: [
      {
        id: "sub-3a",
        subBlock: "D7a",
        variety: "cypress",
        currentManagedAreaHa: 60,
        currentFinancedAreaHa: 50,
        currentAge: 11,
        managedAreaDeltaPerYear: 0.2,
        financedAreaDeltaPerYear: 0.1,
        plantedTreesPerHa: 975,
        defaultContractor: "-",
        activityByYear: {
          2024: "silviculture",
          2025: "none",
          2026: "none",
          2027: "none",
          2028: "none",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.16, dbhCm: 18, heightM: 18.4 },
          { share: 0.29, dbhCm: 23, heightM: 22.8 },
          { share: 0.31, dbhCm: 28, heightM: 27.1 },
          { share: 0.24, dbhCm: 33, heightM: 30.5 },
        ],
      },
      {
        id: "sub-3b",
        subBlock: "D7b",
        variety: "eucalyptus",
        currentManagedAreaHa: 52,
        currentFinancedAreaHa: 44,
        currentAge: 9,
        managedAreaDeltaPerYear: 0.2,
        financedAreaDeltaPerYear: 0.2,
        plantedTreesPerHa: 1111,
        defaultContractor: "GreenCanopy Ltd",
        activityByYear: {
          2024: "silviculture",
          2025: "silviculture",
          2026: "silviculture",
          2027: "none",
          2028: "none",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.18, dbhCm: 16, heightM: 18.1 },
          { share: 0.31, dbhCm: 21, heightM: 22.7 },
          { share: 0.29, dbhCm: 26, heightM: 27.4 },
          { share: 0.22, dbhCm: 31, heightM: 31.2 },
        ],
      },
    ],
  },
  {
    id: "group-4",
    block: "Kakosi C",
    summaryTitle: "Kakosi C field grid",
    summaryDescription:
      "A growth-stage Uganda site blending teak and eucalyptus, with active silviculture work that benefits from comparing hectare summaries against opened block detail.",
    location: "Kaliro, Eastern",
    country: "Uganda",
    mapCenter: [1.08, 33.64],
    subBlocks: [
      {
        id: "sub-4a",
        subBlock: "B4a",
        variety: "teak",
        currentManagedAreaHa: 38,
        currentFinancedAreaHa: 34,
        currentAge: 4,
        managedAreaDeltaPerYear: 0.6,
        financedAreaDeltaPerYear: 0.9,
        plantedTreesPerHa: 816,
        defaultContractor: "SylvaOps",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "silviculture",
          2027: "silviculture",
          2028: "none",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.29, dbhCm: 10, heightM: 9.8 },
          { share: 0.33, dbhCm: 13, heightM: 12.6 },
          { share: 0.23, dbhCm: 16.5, heightM: 16.1 },
          { share: 0.15, dbhCm: 20, heightM: 19.3 },
        ],
      },
      {
        id: "sub-4b",
        subBlock: "B4b",
        variety: "eucalyptus",
        currentManagedAreaHa: 30,
        currentFinancedAreaHa: 27,
        currentAge: 3,
        managedAreaDeltaPerYear: 0.7,
        financedAreaDeltaPerYear: 0.9,
        plantedTreesPerHa: 1111,
        defaultContractor: "Timberline Services",
        activityByYear: {
          2024: "planting",
          2025: "planting",
          2026: "planting",
          2027: "silviculture",
          2028: "silviculture",
          2029: "none",
        },
        standDistribution2026: [
          { share: 0.27, dbhCm: 9.5, heightM: 9.7 },
          { share: 0.34, dbhCm: 12.5, heightM: 13.1 },
          { share: 0.24, dbhCm: 16, heightM: 16.8 },
          { share: 0.15, dbhCm: 19.5, heightM: 20.4 },
        ],
      },
    ],
  },
]

function buildMarketPriceBands(variety: TreeVariety, year: number) {
  const priceFactor = 1 + (year - dashboardCurrentYear) * 0.041
  return marketBandSeeds[variety].map((band) => ({
    market: band.market,
    minDbhCm: band.minDbhCm,
    maxDbhCm: band.maxDbhCm,
    minHeightM: band.minHeightM,
    maxHeightM: band.maxHeightM,
    pricePerTonneUsd: round(band.basePricePerTonneUsd * priceFactor, 2),
  }))
}

function buildStandDistribution(seed: SubBlockSeed, year: number) {
  const ageDelta = year - dashboardCurrentYear
  const age = Math.max(1, seed.currentAge + ageDelta)
  const profile = speciesProfile[seed.variety]
  const survivalRate = clamp(
    profile.baselineSurvival - Math.max(age - 7, 0) * 0.011 + Math.min(ageDelta, 0) * 0.004,
    0.58,
    0.97
  )
  const totalTreesPerHa = Math.round(seed.plantedTreesPerHa * survivalRate)
  const weights = seed.standDistribution2026.map((bin, index) => {
    const variance = 0.93 + seededUnit(seed.id, year * 10 + index) * 0.16
    return bin.share * variance
  })
  const allocatedTrees = allocateRoundedCounts(totalTreesPerHa, weights)

  return seed.standDistribution2026.map((bin, index) => {
    const dbhBias = 0.92 + seededUnit(`${seed.id}-dbh`, year * 11 + index) * 0.18
    const heightBias = 0.91 + seededUnit(`${seed.id}-height`, year * 13 + index) * 0.18
    const dbhCm = round(
      Math.max(6, bin.dbhCm + ageDelta * profile.dbhGrowthRate * dbhBias),
      1
    )
    const heightM = round(
      Math.max(6, bin.heightM + ageDelta * profile.heightGrowthRate * heightBias),
      1
    )

    return {
      id: `${seed.id}-${year}-bin-${index + 1}`,
      treesPerHa: allocatedTrees[index],
      dbhCm,
      heightM,
    }
  })
}

function buildSubBlockPeriods(seed: SubBlockSeed): ForestrySubBlockPeriod[] {
  return forestryYears.map((year) => {
    const ageDelta = year - dashboardCurrentYear
    const managedAreaHa = round(
      Math.max(0.5, seed.currentManagedAreaHa + ageDelta * seed.managedAreaDeltaPerYear)
    )
    const financedAreaHa = round(
      clamp(
        seed.currentFinancedAreaHa + ageDelta * seed.financedAreaDeltaPerYear,
        0.5,
        managedAreaHa
      )
    )

    return {
      year,
      managedAreaHa,
      financedAreaHa,
      plantedTreesPerHa: seed.plantedTreesPerHa,
      standDistribution: buildStandDistribution(seed, year),
      marketPriceBands: buildMarketPriceBands(seed.variety, year),
      activity: seed.activityByYear[year] ?? "none",
      contractor: seed.contractorByYear?.[year] ?? seed.defaultContractor,
    }
  })
}

function buildSiteRecord(seed: SiteSeed): ForestrySiteRecord {
  return {
    id: seed.id,
    block: seed.block,
    summaryTitle: seed.summaryTitle,
    summaryDescription: seed.summaryDescription,
    location: seed.location,
    country: seed.country,
    mapCenter: seed.mapCenter,
    subBlocks: seed.subBlocks.map((subBlock) => ({
      id: subBlock.id,
      subBlock: subBlock.subBlock,
      variety: subBlock.variety,
      currentAge: subBlock.currentAge,
      currentManagedAreaHa: subBlock.currentManagedAreaHa,
      currentFinancedAreaHa: subBlock.currentFinancedAreaHa,
      periods: buildSubBlockPeriods(subBlock),
    })),
  }
}

export const forestryFundamentalDatabase = {
  currentYear: dashboardCurrentYear,
  referenceDate: portfolioSeriesReferenceDate,
  years: [...forestryYears],
  sites: siteSeeds.map(buildSiteRecord),
  financePeriods: portfolioFinancePeriods,
}

function getSiteRecord(groupId: string) {
  return forestryFundamentalDatabase.sites.find((site) => site.id === groupId)
}

function getSubBlockRecord(groupId: string, subBlockId: string) {
  return getSiteRecord(groupId)?.subBlocks.find((subBlock) => subBlock.id === subBlockId)
}

function findSubBlockRecord(subBlockId: string) {
  for (const site of forestryFundamentalDatabase.sites) {
    const record = site.subBlocks.find((subBlock) => subBlock.id === subBlockId)
    if (record) return record
  }

  return undefined
}

function getPeriodRecord(
  periods: ForestrySubBlockPeriod[],
  year = dashboardCurrentYear
) {
  return periods.find((period) => period.year === year) ?? periods[periods.length - 1]
}

function estimateStemVolumeM3(
  variety: TreeVariety,
  dbhCm: number,
  heightM: number
) {
  const profile = speciesProfile[variety]
  const radiusM = dbhCm / 200
  const basalAreaM2 = Math.PI * radiusM * radiusM
  const slenderness = clamp(heightM / Math.max(dbhCm / 100, 0.06), 30, 140)
  const normalizedTaper = clamp((slenderness - 65) / 75, -0.35, 0.45)
  const formFactor = clamp(
    profile.formFactor - profile.taperCoefficient * normalizedTaper,
    0.34,
    0.62
  )

  return basalAreaM2 * heightM * formFactor
}

function resolveMarketPrice(
  distributionBin: StandDistributionBin,
  marketPriceBands: MarketPriceBand[]
) {
  const eligible = marketPriceBands.filter((band) => {
    const withinDbh =
      distributionBin.dbhCm >= band.minDbhCm &&
      distributionBin.dbhCm <= band.maxDbhCm
    const withinHeight =
      distributionBin.heightM >= band.minHeightM &&
      (band.maxHeightM === undefined || distributionBin.heightM <= band.maxHeightM)

    return withinDbh && withinHeight
  })

  if (eligible.length > 0) {
    return eligible.sort(
      (left, right) => right.pricePerTonneUsd - left.pricePerTonneUsd
    )[0]
  }

  return marketPriceBands
    .slice()
    .sort((left, right) => left.pricePerTonneUsd - right.pricePerTonneUsd)[0]
}

function deriveMetricsFromPeriod(
  variety: TreeVariety,
  period: ForestrySubBlockPeriod,
  areaHa: number
): DerivedAreaMetrics {
  const profile = speciesProfile[variety]
  const plantedArea = Math.max(areaHa, 0)
  const totals = period.standDistribution.reduce(
    (summary, bin) => {
      const trees = bin.treesPerHa * plantedArea
      const stemVolume = estimateStemVolumeM3(variety, bin.dbhCm, bin.heightM)
      const volume = trees * stemVolume
      const tonnes = volume * profile.woodDensityTPerM3
      const market = resolveMarketPrice(bin, period.marketPriceBands)
      const valuation = tonnes * market.pricePerTonneUsd

      return {
        totalTrees: summary.totalTrees + trees,
        estimatedVolume: summary.estimatedVolume + volume,
        estimatedTonnage: summary.estimatedTonnage + tonnes,
        estimatedValuation: summary.estimatedValuation + valuation,
        averageHeightWeighted: summary.averageHeightWeighted + bin.heightM * trees,
        averageDbhWeighted: summary.averageDbhWeighted + bin.dbhCm * trees,
      }
    },
    {
      totalTrees: 0,
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
      averageHeightWeighted: 0,
      averageDbhWeighted: 0,
    }
  )

  const survivalRate =
    plantedArea > 0 && period.plantedTreesPerHa > 0
      ? totals.totalTrees / (plantedArea * period.plantedTreesPerHa)
      : 0

  return {
    totalTrees: Math.round(totals.totalTrees),
    estimatedVolume: Math.round(totals.estimatedVolume),
    estimatedTonnage: Math.round(totals.estimatedTonnage),
    estimatedValuation: Math.round(totals.estimatedValuation),
    investmentPlaced: Math.round(period.financedAreaHa * profile.investmentPerHa),
    averageHeight:
      totals.totalTrees > 0
        ? round(totals.averageHeightWeighted / totals.totalTrees, 1)
        : 0,
    averageDbh:
      totals.totalTrees > 0
        ? round(totals.averageDbhWeighted / totals.totalTrees, 1)
        : 0,
    survivalRate: round(survivalRate, 3),
    expectedPricePerTonne:
      totals.estimatedTonnage > 0
        ? round(totals.estimatedValuation / totals.estimatedTonnage, 2)
        : 0,
    expectedPricePerM3:
      totals.estimatedVolume > 0
        ? round(totals.estimatedValuation / totals.estimatedVolume, 2)
        : 0,
  }
}

function toAssetSubBlock(record: ForestrySubBlockRecord): AssetSubBlock {
  const currentPeriod = getPeriodRecord(record.periods)
  return {
    id: record.id,
    subBlock: record.subBlock,
    variety: record.variety,
    size: currentPeriod.managedAreaHa,
    plantedSize: currentPeriod.financedAreaHa,
    age: record.currentAge,
    activity: currentPeriod.activity,
    contractor: currentPeriod.contractor,
  }
}

function toAssetGroup(record: ForestrySiteRecord): AssetGroup {
  return {
    id: record.id,
    block: record.block,
    summaryTitle: record.summaryTitle,
    summaryDescription: record.summaryDescription,
    location: record.location,
    country: record.country,
    mapCenter: record.mapCenter,
    subBlocks: record.subBlocks.map(toAssetSubBlock),
  }
}

export const initialAssetGroups: AssetGroup[] =
  forestryFundamentalDatabase.sites.map(toAssetGroup)

export function formatVarietyLabel(variety: TreeVariety) {
  return speciesProfile[variety].label
}

export function groupVarieties(group: AssetGroup) {
  return [...new Set(group.subBlocks.map((subBlock) => subBlock.variety))].join(", ")
}

export function getGroupSpecies(group: AssetGroup) {
  return [...new Set(group.subBlocks.map((subBlock) => subBlock.variety))] as TreeVariety[]
}

export function groupSize(group: AssetGroup) {
  return group.subBlocks.reduce((sum, subBlock) => sum + subBlock.size, 0)
}

export function groupPlantedSize(group: AssetGroup) {
  return group.subBlocks.reduce((sum, subBlock) => sum + subBlock.plantedSize, 0)
}

export function estimateAreaMetricsForSubBlock(
  groupId: string,
  subBlockId: string,
  representedArea: number,
  year = dashboardCurrentYear
) {
  const record = getSubBlockRecord(groupId, subBlockId)

  if (!record) {
    return {
      totalTrees: 0,
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
      investmentPlaced: 0,
      averageHeight: 0,
      averageDbh: 0,
      survivalRate: 0,
      expectedPricePerTonne: 0,
      expectedPricePerM3: 0,
    } satisfies DerivedAreaMetrics
  }

  const period = getPeriodRecord(record.periods, year)
  const scaledArea = clamp(representedArea, 0, period.financedAreaHa)
  const baseMetrics = deriveMetricsFromPeriod(record.variety, period, period.financedAreaHa)

  if (period.financedAreaHa <= 0 || scaledArea === period.financedAreaHa) {
    return baseMetrics
  }

  const scale = scaledArea / period.financedAreaHa
  return {
    totalTrees: Math.round(baseMetrics.totalTrees * scale),
    estimatedVolume: Math.round(baseMetrics.estimatedVolume * scale),
    estimatedTonnage: Math.round(baseMetrics.estimatedTonnage * scale),
    estimatedValuation: Math.round(baseMetrics.estimatedValuation * scale),
    investmentPlaced: Math.round(baseMetrics.investmentPlaced * scale),
    averageHeight: baseMetrics.averageHeight,
    averageDbh: baseMetrics.averageDbh,
    survivalRate: baseMetrics.survivalRate,
    expectedPricePerTonne: baseMetrics.expectedPricePerTonne,
    expectedPricePerM3: baseMetrics.expectedPricePerM3,
  }
}

export function estimateSubBlockAreaMetrics(
  subBlock: AssetSubBlock,
  representedArea: number,
  year = dashboardCurrentYear
) {
  const record = findSubBlockRecord(subBlock.id)

  if (!record) {
    return {
      totalTrees: 0,
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
      investmentPlaced: 0,
      averageHeight: 0,
      averageDbh: 0,
      survivalRate: 0,
      expectedPricePerTonne: 0,
      expectedPricePerM3: 0,
    } satisfies DerivedAreaMetrics
  }

  const period = getPeriodRecord(record.periods, year)
  return estimateAreaMetricsForSubBlock(
    forestryFundamentalDatabase.sites.find((site) =>
      site.subBlocks.some((siteSubBlock) => siteSubBlock.id === subBlock.id)
    )?.id ?? "",
    subBlock.id,
    clamp(representedArea, 0, period.financedAreaHa),
    year
  )
}

export function getSubBlockEstimatedMetrics(
  group: AssetGroup,
  subBlock: AssetSubBlock
) {
  return estimateAreaMetricsForSubBlock(
    group.id,
    subBlock.id,
    subBlock.plantedSize,
    dashboardCurrentYear
  )
}

export function getGroupEstimatedMetrics(group: AssetGroup) {
  return group.subBlocks.reduce(
    (summary, subBlock) => {
      const metrics = getSubBlockEstimatedMetrics(group, subBlock)
      return {
        estimatedVolume: summary.estimatedVolume + metrics.estimatedVolume,
        estimatedValuation: summary.estimatedValuation + metrics.estimatedValuation,
        investmentPlaced: summary.investmentPlaced + metrics.investmentPlaced,
      }
    },
    {
      estimatedVolume: 0,
      estimatedValuation: 0,
      investmentPlaced: 0,
    }
  )
}

function buildSiteVarietyMetrics(site: ForestrySiteRecord, year: number) {
  const metrics = {
    eucalyptus: {
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
    },
    pine: {
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
    },
    cypress: {
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
    },
    teak: {
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
    },
    corymbia: {
      estimatedVolume: 0,
      estimatedTonnage: 0,
      estimatedValuation: 0,
    },
  }

  site.subBlocks.forEach((subBlock) => {
    const period = getPeriodRecord(subBlock.periods, year)
    const areaMetrics = deriveMetricsFromPeriod(
      subBlock.variety,
      period,
      period.financedAreaHa
    )
    metrics[subBlock.variety].estimatedVolume += areaMetrics.estimatedVolume
    metrics[subBlock.variety].estimatedTonnage += areaMetrics.estimatedTonnage
    metrics[subBlock.variety].estimatedValuation += areaMetrics.estimatedValuation
  })

  return metrics
}

export function buildGroupMetricSeries(
  group: AssetGroup,
  metric: SiteMetricKey,
  baseYear = dashboardCurrentYear
) {
  const site = getSiteRecord(group.id)
  const years = Array.from({ length: 6 }, (_, index) => baseYear - 2 + index)

  if (!site) {
    return years.map((year) => ({
      year: String(year),
      eucalyptus: 0,
      pine: 0,
      cypress: 0,
      teak: 0,
      corymbia: 0,
    }))
  }

  return years.map((year) => {
    const byVariety = buildSiteVarietyMetrics(site, year)
    const row: GroupMetricSeriesRow = {
      year: String(year),
      eucalyptus: 0,
      pine: 0,
      cypress: 0,
      teak: 0,
      corymbia: 0,
    }

    ;(Object.keys(byVariety) as TreeVariety[]).forEach((variety) => {
      if (metric === "expectedVolume") {
        row[variety] = byVariety[variety].estimatedVolume
        return
      }

      if (metric === "portfolioPerformance") {
        row[variety] = byVariety[variety].estimatedValuation
        return
      }

      row[variety] =
        byVariety[variety].estimatedTonnage > 0
          ? round(
              byVariety[variety].estimatedValuation /
                byVariety[variety].estimatedTonnage,
              2
            )
          : 0
    })

    return row
  })
}

export function getSpeciesAllocationData(year = dashboardCurrentYear) {
  const hectaresByVariety = forestryFundamentalDatabase.sites.flatMap((site) =>
    site.subBlocks.map((subBlock) => ({
      variety: subBlock.variety,
      financedAreaHa: getPeriodRecord(subBlock.periods, year).financedAreaHa,
    }))
  )

  const totals = hectaresByVariety.reduce(
    (summary, item) => {
      summary[item.variety] += item.financedAreaHa
      summary.total += item.financedAreaHa
      return summary
    },
    {
      eucalyptus: 0,
      pine: 0,
      cypress: 0,
      teak: 0,
      corymbia: 0,
      total: 0,
    }
  )

  return (Object.keys(speciesProfile) as TreeVariety[])
    .map((variety) => {
      const amount = round(totals[variety], 1)
      return {
        category: variety,
        amount,
        value: totals.total > 0 ? round((amount / totals.total) * 100, 1) : 0,
        fill: speciesProfile[variety].color,
      }
    })
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount)
}

function buildPortfolioYearPoint(year: number): PortfolioYearPoint {
  const sitePeriods = forestryFundamentalDatabase.sites.map((site) => {
    const subBlockPeriods = site.subBlocks.map((subBlock) => {
      const period = getPeriodRecord(subBlock.periods, year)
      return {
        subBlock,
        period,
        metrics: deriveMetricsFromPeriod(
          subBlock.variety,
          period,
          period.financedAreaHa
        ),
      }
    })

    return {
      managedAreaHa: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.period.managedAreaHa,
        0
      ),
      financedAreaHa: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.period.financedAreaHa,
        0
      ),
      estimatedVolume: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.metrics.estimatedVolume,
        0
      ),
      estimatedTonnage: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.metrics.estimatedTonnage,
        0
      ),
      estimatedValuation: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.metrics.estimatedValuation,
        0
      ),
      investmentPlaced: subBlockPeriods.reduce(
        (sum, entry) => sum + entry.metrics.investmentPlaced,
        0
      ),
    }
  })

  const landManaged = round(
    sitePeriods.reduce((sum, site) => sum + site.managedAreaHa, 0)
  )
  const expectedVolume = Math.round(
    sitePeriods.reduce((sum, site) => sum + site.estimatedVolume, 0)
  )
  const expectedTonnage = Math.round(
    sitePeriods.reduce((sum, site) => sum + site.estimatedTonnage, 0)
  )
  const standingValue = Math.round(
    sitePeriods.reduce((sum, site) => sum + site.estimatedValuation, 0)
  )
  const derivedCapitalDeployed = Math.round(
    sitePeriods.reduce((sum, site) => sum + site.investmentPlaced, 0)
  )
  const finance = portfolioFinancePeriods[year] ?? {
    cashUsd: 0,
    capitalDeployedUsd: derivedCapitalDeployed,
  }

  return {
    year,
    expectedPrice:
      expectedTonnage > 0 ? round(standingValue / expectedTonnage, 2) : 0,
    expectedVolume,
    portfolioValue: standingValue,
    landManaged: Math.round(landManaged),
    cash: finance.cashUsd,
    capitalDeployed: Math.max(finance.capitalDeployedUsd, derivedCapitalDeployed),
  }
}

export const portfolioYearSeries: PortfolioYearPoint[] =
  forestryFundamentalDatabase.years.map(buildPortfolioYearPoint)

function startOfTrimester(value: Date) {
  const trimesterStartMonth = Math.floor(value.getMonth() / 4) * 4
  return new Date(value.getFullYear(), trimesterStartMonth, 1)
}

function getTrimesterLabel(value: Date) {
  const trimester = Math.floor(value.getMonth() / 4) + 1
  return `T${trimester} ${value.getFullYear()}`
}

function interpolateMetric(
  start: PortfolioYearPoint,
  end: PortfolioYearPoint,
  metric: PortfolioMetricKey,
  fraction: number
) {
  return start[metric] + (end[metric] - start[metric]) * fraction
}

export function generatePortfolioSeries(
  now: Date = portfolioSeriesReferenceDate
): PortfolioPoint[] {
  const nowTrimester = startOfTrimester(now)
  const points: PortfolioPoint[] = []

  portfolioYearSeries.forEach((point, index) => {
    const nextPoint = portfolioYearSeries[index + 1] ?? point

    for (let trimesterIndex = 0; trimesterIndex < 3; trimesterIndex += 1) {
      const month = trimesterIndex * 4
      const date = new Date(point.year, month, 1)
      const fraction = trimesterIndex / 3

      points.push({
        date: date.toISOString().slice(0, 10),
        label: getTrimesterLabel(date),
        isProjected: date > nowTrimester,
        expectedPrice: round(
          interpolateMetric(point, nextPoint, "expectedPrice", fraction),
          2
        ),
        expectedVolume: Math.round(
          interpolateMetric(point, nextPoint, "expectedVolume", fraction)
        ),
        portfolioValue: Math.round(
          interpolateMetric(point, nextPoint, "portfolioValue", fraction)
        ),
        landManaged: Math.round(
          interpolateMetric(point, nextPoint, "landManaged", fraction)
        ),
        cash: Math.round(interpolateMetric(point, nextPoint, "cash", fraction)),
        capitalDeployed: Math.round(
          interpolateMetric(point, nextPoint, "capitalDeployed", fraction)
        ),
        futureValue: null,
        pastValue: null,
      })
    }
  })

  return points
}
