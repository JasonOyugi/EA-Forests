export type SiteModelSource =
  | "terraclimate"
  | "chirps"
  | "nasa_power"
  | "era5_land_ee"

export type SiteModelDataType = "dynamic" | "static"

export type DynamicMetricGroup =
  | "temperature"
  | "water"
  | "demand_stress"
  | "radiation_wind"

export type StaticMetricGroup = "topography" | "soil"

export type SummaryLevel = "full" | "monthly" | "annual"

export type AgreementFamily =
  | "precipitation"
  | "mean_temperature"
  | "minimum_temperature"
  | "maximum_temperature"
  | "potential_evapotranspiration"
  | "actual_evapotranspiration"
  | "water_deficit"
  | "vpd"
  | "radiation"
  | "wind"
  | "soil_water"

export interface ModelSite {
  id: string
  name: string
  country: string
  region: string
  description: string
  lat: number
  lon: number
  polygon: [number, number][]
}

export interface SiteClassificationForm {
  startYear: number
  endYear: number
  sources: SiteModelSource[]
  dataTypes: SiteModelDataType[]
  dynamicMetricGroups: DynamicMetricGroup[]
  staticMetricGroups: StaticMetricGroup[]
  summaryLevels: SummaryLevel[]
  agreementFamilies: AgreementFamily[]
}

export interface SiteClassificationRun extends SiteClassificationForm {
  site: ModelSite
}

function createFootprint(
  lat: number,
  lon: number,
  latScale: number,
  lonScale: number
): [number, number][] {
  return [
    [lat + latScale * 1.2, lon - lonScale * 1.1],
    [lat + latScale * 0.6, lon + lonScale * 0.9],
    [lat - latScale * 0.4, lon + lonScale * 1.2],
    [lat - latScale * 1.1, lon + lonScale * 0.3],
    [lat - latScale * 0.8, lon - lonScale * 0.8],
    [lat + latScale * 0.2, lon - lonScale * 1.3],
  ]
}

export const modelSites: ModelSite[] = [
  {
    id: "amuru-atiti",
    name: "Amuru-Atiti",
    country: "Uganda",
    region: "Northern",
    description:
      "Broad production footprint suitable for testing multi-source climate extraction against a large estate.",
    lat: 2.78,
    lon: 31.47,
    polygon: createFootprint(2.78, 31.47, 0.16, 0.24),
  },
  {
    id: "sarora",
    name: "Sarora",
    country: "Kenya",
    region: "Rift Valley",
    description:
      "Compact site where coordinate-driven model outputs are easy to compare across sources and years.",
    lat: 0.42,
    lon: 35.02,
    polygon: createFootprint(0.42, 35.02, 0.12, 0.2),
  },
  {
    id: "nyakipam-mtambula",
    name: "Nyakipam-Mtambula",
    country: "Tanzania",
    region: "Iringa",
    description:
      "Mature southern highlands block with stronger elevation and water-stress signals in the template outputs.",
    lat: -8.73,
    lon: 35.04,
    polygon: createFootprint(-8.73, 35.04, 0.2, 0.27),
  },
  {
    id: "kakosi-c",
    name: "Kakosi C",
    country: "Uganda",
    region: "Eastern",
    description:
      "Growth-stage Uganda site useful for comparing topography and soil summaries alongside climate tables.",
    lat: 1.08,
    lon: 33.64,
    polygon: createFootprint(1.08, 33.64, 0.14, 0.18),
  },
]

export const sourceOptions: SiteModelSource[] = [
  "terraclimate",
  "chirps",
  "nasa_power",
  "era5_land_ee",
]

export const dataTypeOptions: SiteModelDataType[] = ["dynamic", "static"]

export const dynamicMetricGroupOptions: DynamicMetricGroup[] = [
  "temperature",
  "water",
  "demand_stress",
  "radiation_wind",
]

export const staticMetricGroupOptions: StaticMetricGroup[] = [
  "topography",
  "soil",
]

export const summaryLevelOptions: SummaryLevel[] = [
  "full",
  "monthly",
  "annual",
]

export const agreementFamilyOptions: AgreementFamily[] = [
  "precipitation",
  "mean_temperature",
  "minimum_temperature",
  "maximum_temperature",
  "potential_evapotranspiration",
  "actual_evapotranspiration",
  "water_deficit",
  "vpd",
  "radiation",
  "wind",
  "soil_water",
]

export type AgreementFamilyCategory =
  | "temperature"
  | "water"
  | "soil"
  | "radiation"
  | "wind"

export const agreementFamilyCategoryOptions: AgreementFamilyCategory[] = [
  "temperature",
  "water",
  "soil",
  "radiation",
  "wind",
]

export const agreementFamilyCategoryMap: Record<
  AgreementFamilyCategory,
  AgreementFamily[]
> = {
  temperature: ["mean_temperature", "minimum_temperature", "maximum_temperature"],
  water: [
    "precipitation",
    "potential_evapotranspiration",
    "actual_evapotranspiration",
    "water_deficit",
    "vpd",
  ],
  soil: ["soil_water"],
  radiation: ["radiation"],
  wind: ["wind"],
}

export const defaultSiteClassificationForm: SiteClassificationForm = {
  startYear: 2015,
  endYear: 2024,
  sources: [...sourceOptions],
  dataTypes: [...dataTypeOptions],
  dynamicMetricGroups: [...dynamicMetricGroupOptions],
  staticMetricGroups: [...staticMetricGroupOptions],
  summaryLevels: ["monthly", "annual"],
  agreementFamilies: [
    "precipitation",
    "mean_temperature",
    "water_deficit",
    "vpd",
    "soil_water",
  ],
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const sourceOffsets: Record<
  SiteModelSource,
  {
    temperature: number
    precipitation: number
    pet: number
    soil: number
    radiation: number
    wind: number
  }
> = {
  terraclimate: {
    temperature: 0,
    precipitation: 14,
    pet: 8,
    soil: 1.8,
    radiation: 0,
    wind: 0.2,
  },
  chirps: {
    temperature: -0.2,
    precipitation: 6,
    pet: 4,
    soil: 1.2,
    radiation: -0.15,
    wind: 0.1,
  },
  nasa_power: {
    temperature: 0.35,
    precipitation: -8,
    pet: 12,
    soil: -0.8,
    radiation: 0.25,
    wind: 0.35,
  },
  era5_land_ee: {
    temperature: 0.15,
    precipitation: 2,
    pet: 10,
    soil: 0.6,
    radiation: 0.1,
    wind: 0.25,
  },
}

function round(value: number, digits = 2) {
  const power = 10 ** digits
  return Math.round(value * power) / power
}

function buildMonthlyRows(run: SiteClassificationRun) {
  const rows: Array<Record<string, string | number>> = []

  for (const source of run.sources) {
    const offset = sourceOffsets[source]

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const month = monthIndex + 1
      const seasonalShift =
        Math.sin(((monthIndex / 12) * Math.PI * 2) + run.site.lon * 0.035) * 2.8
      const wetShift =
        Math.cos(((monthIndex / 12) * Math.PI * 2) - run.site.lat * 0.08) * 58
      const aridityShift =
        Math.sin(((monthIndex / 12) * Math.PI * 2) - run.site.lon * 0.015) * 22
      const meanTemp = 25.8 - Math.abs(run.site.lat) * 0.55 + seasonalShift + offset.temperature
      const precipitation = 122 + wetShift + offset.precipitation - Math.abs(run.site.lat) * 2.4
      const pet = 118 + Math.abs(run.site.lat) * 2.1 - wetShift * 0.12 + offset.pet
      const aet = precipitation * 0.74
      const deficit = Math.max(pet - aet, 8)
      const vpd = 0.74 + Math.abs(run.site.lat) * 0.03 + aridityShift * 0.01 + offset.wind * 0.08
      const radiation = 5.3 + Math.abs(run.site.lat) * 0.02 + offset.radiation
      const wind = 2.2 + Math.abs(run.site.lon - 33) * 0.08 + offset.wind
      const soilWater = 33 + wetShift * 0.05 + offset.soil

      const row: Record<string, string | number> = {
        source,
        month,
        month_name: monthNames[monthIndex],
      }

      if (run.dynamicMetricGroups.includes("temperature")) {
        row.mean_temperature_c = round(meanTemp)
        row.minimum_temperature_c = round(meanTemp - 5.2)
        row.maximum_temperature_c = round(meanTemp + 6.1)
      }

      if (run.dynamicMetricGroups.includes("water")) {
        row.precipitation_mm = round(precipitation)
        row.actual_evapotranspiration_mm = round(aet)
        row.soil_water_pct = round(soilWater)
      }

      if (run.dynamicMetricGroups.includes("demand_stress")) {
        row.potential_evapotranspiration_mm = round(pet)
        row.water_deficit_mm = round(deficit)
        row.vpd_kpa = round(vpd)
      }

      if (run.dynamicMetricGroups.includes("radiation_wind")) {
        row.radiation_kwh_m2_day = round(radiation)
        row.wind_ms = round(wind)
      }

      rows.push(row)
    }
  }

  return rows
}

function buildAnnualRows(run: SiteClassificationRun) {
  const rows: Array<Record<string, string | number>> = []
  const yearCount = Math.max(run.endYear - run.startYear + 1, 1)

  for (const source of run.sources) {
    const offset = sourceOffsets[source]

    for (let year = run.startYear; year <= run.endYear; year += 1) {
      const trend = year - run.startYear
      const meanTemp =
        24.3 - Math.abs(run.site.lat) * 0.52 + offset.temperature + trend * 0.04
      const precipitation =
        1320 - Math.abs(run.site.lat) * 18 + offset.precipitation * 6 - trend * 2.5
      const pet = 1410 + Math.abs(run.site.lon - 33) * 18 + offset.pet * 7 + trend * 3.2
      const aet = precipitation * 0.69
      const deficit = pet - aet
      const radiation = 5.6 + offset.radiation + trend * 0.01
      const wind = 2.4 + offset.wind + Math.abs(run.site.lat) * 0.04

      const row: Record<string, string | number> = {
        source,
        year,
        observation_years: yearCount,
      }

      if (run.dynamicMetricGroups.includes("temperature")) {
        row.mean_temperature_c = round(meanTemp)
        row.minimum_temperature_c = round(meanTemp - 5.5)
        row.maximum_temperature_c = round(meanTemp + 6.2)
      }

      if (run.dynamicMetricGroups.includes("water")) {
        row.precipitation_mm = round(precipitation)
        row.actual_evapotranspiration_mm = round(aet)
        row.soil_water_pct = round(34 + offset.soil - trend * 0.08)
      }

      if (run.dynamicMetricGroups.includes("demand_stress")) {
        row.potential_evapotranspiration_mm = round(pet)
        row.water_deficit_mm = round(deficit)
        row.vpd_kpa = round(0.82 + offset.wind * 0.1 + trend * 0.01)
      }

      if (run.dynamicMetricGroups.includes("radiation_wind")) {
        row.radiation_kwh_m2_day = round(radiation)
        row.wind_ms = round(wind)
      }

      rows.push(row)
    }
  }

  return rows
}

function buildStaticRows(run: SiteClassificationRun) {
  const rows: Array<Record<string, string | number>> = []
  const baseElevation = 850 + Math.abs(run.site.lat) * 95 + Math.abs(run.site.lon - 33) * 54
  const baseSlope = 5.5 + Math.abs(run.site.lat) * 0.7
  const baseAspect = ((run.site.lon + 180) * 3.4) % 360

  if (run.staticMetricGroups.includes("topography")) {
    rows.push({
      metric_group: "topography",
      elevation_m: round(baseElevation),
      slope_pct: round(baseSlope),
      aspect_deg: round(baseAspect),
    })
  }

  if (run.staticMetricGroups.includes("soil")) {
    rows.push({
      metric_group: "soil",
      soil_ph: round(5.4 + Math.abs(run.site.lat) * 0.05),
      organic_carbon_pct: round(2.3 + Math.abs(run.site.lat) * 0.08),
      sand_pct: round(42 + Math.abs(run.site.lon - 33) * 1.6),
      silt_pct: round(31 - Math.abs(run.site.lat) * 0.8),
      clay_pct: round(27 + Math.abs(run.site.lat) * 0.6),
      cec_cmolkg: round(13.8 + Math.abs(run.site.lat) * 0.4),
      bulk_density_gcm3: round(1.18 + Math.abs(run.site.lon - 33) * 0.02),
      nitrogen_pct: round(0.18 + Math.abs(run.site.lat) * 0.004),
      water_content_pct: round(29 + Math.abs(run.site.lat) * 0.5),
    })
  }

  return rows
}

const familyLabels: Record<AgreementFamily, string> = {
  precipitation: "Precipitation",
  mean_temperature: "Mean temperature",
  minimum_temperature: "Minimum temperature",
  maximum_temperature: "Maximum temperature",
  potential_evapotranspiration: "Potential evapotranspiration",
  actual_evapotranspiration: "Actual evapotranspiration",
  water_deficit: "Water deficit",
  vpd: "VPD",
  radiation: "Radiation",
  wind: "Wind",
  soil_water: "Soil water",
}

function buildAgreementRows(run: SiteClassificationRun) {
  return run.agreementFamilies.map((family, index) => {
    const consistencyBase =
      89 - index * 1.3 - Math.abs(run.site.lat) * 0.35 + run.sources.length * 1.1
    const spreadBase =
      6.8 + index * 0.55 + Math.abs(run.site.lon - 33) * 0.4 - run.sources.length * 0.25

    return {
      family: familyLabels[family],
      source_count: run.sources.length,
      agreement_pct: round(Math.max(72, Math.min(97, consistencyBase))),
      mean_spread: round(Math.max(1.2, spreadBase)),
      consensus: consistencyBase >= 88 ? "High" : consistencyBase >= 80 ? "Moderate" : "Watch",
    }
  })
}

export interface SiteClassificationOutputs {
  monthlyRows: Array<Record<string, string | number>>
  annualRows: Array<Record<string, string | number>>
  staticRows: Array<Record<string, string | number>>
  agreementRows: Array<Record<string, string | number>>
}

export function generateSiteClassificationOutputs(
  run: SiteClassificationRun
): SiteClassificationOutputs {
  return {
    monthlyRows:
      run.dataTypes.includes("dynamic") && run.summaryLevels.includes("monthly")
        ? buildMonthlyRows(run)
        : [],
    annualRows:
      run.dataTypes.includes("dynamic") && run.summaryLevels.includes("annual")
        ? buildAnnualRows(run)
        : [],
    staticRows:
      run.dataTypes.includes("static") ? buildStaticRows(run) : [],
    agreementRows:
      run.dataTypes.includes("dynamic") && run.summaryLevels.length > 0
        ? buildAgreementRows(run)
        : [],
  }
}
