import { adminLevelOneRegions } from "./generated-admin-boundaries"
import type { LatLngTuple } from "./generated-boundaries"
import {
  centralForestReserveDatabase,
  getCentralForestReserveAreaHa,
  largeCommercialForestDatabase,
  nurseryDatabase,
  processorDatabase,
  type CentralForestReserveRecord,
  type DataValue,
  type LargeCommercialForestRecord,
  type NurseryRecord,
  type ProcessorRecord,
  type ProcessorSpeciesSpec,
} from "./market-databases"

export type MarketCountry = "Uganda" | "Kenya" | "Tanzania"
export type MarketCountryFilter = MarketCountry | "All"

export type MarketActorLayer =
  | "processor"
  | "nursery"
  | "commercialForest"
  | "trialSite"
  | "forestReserve"

export interface MarketActorDetail {
  label: string
  value: string
}

export interface MarketActor {
  id: string
  name: string
  layer: MarketActorLayer
  role: string
  summary: string
  country: MarketCountry
  region: string
  latitude: number
  longitude: number
  details: MarketActorDetail[]
  source: string
  sizeHa?: number
  seedlingPriceUgxPerSeedling?: number
  g1RoundwoodPriceUgxPerTonne?: number
  commercialSpeciesAreas?: {
    species: string
    hectares: number
    color: string
  }[]
}

export interface MarketRegion {
  id: string
  country: MarketCountry
  name: string
  color: string
  center: LatLngTuple
  boundary: LatLngTuple[]
  boundaries?: LatLngTuple[][]
  source?: string
}

export type UgandaRegion = MarketRegion

export interface MarketTileLayer {
  name: string
  url: string
  attribution: string
  darkUrl?: string
  darkAttribution?: string
}

export const marketTileLayers: MarketTileLayer[] = [
  {
    name: "OSM Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    name: "OSM Humanitarian",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles courtesy of Humanitarian OpenStreetMap Team',
  },
  {
    name: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    name: "OpenTopo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
]

export const marketActorLayerMeta: Record<
  MarketActorLayer,
  { label: string; color: string; shortLabel: string }
> = {
  processor: {
    label: "Processors",
    color: "#dc2626",
    shortLabel: "PROC",
  },
  nursery: {
    label: "Nurseries",
    color: "#059669",
    shortLabel: "NURS",
  },
  commercialForest: {
    label: "Large commercial forests",
    color: "#16a34a",
    shortLabel: "LCF",
  },
  trialSite: {
    label: "Trial sites",
    color: "#2563eb",
    shortLabel: "TRIAL",
  },
  forestReserve: {
    label: "Uganda CFRs",
    color: "#15803d",
    shortLabel: "CFR",
  },
}

const groupedRegionColors = [
  "#0f766e",
  "#2563eb",
  "#b45309",
  "#16a34a",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
]

const kenyaRegionGroups = [
  { name: "Nairobi", members: ["Nairobi"] },
  { name: "Central", members: ["Kiambu", "Kirinyaga", "Murang'a", "Nyandarua", "Nyeri"] },
  { name: "Coast", members: ["Kilifi", "Kwale", "Lamu", "Mombasa", "Taita Taveta", "Tana River"] },
  { name: "Eastern", members: ["Embu", "Isiolo", "Kitui", "Machakos", "Makueni", "Marsabit", "Meru", "Tharaka"] },
  { name: "North Eastern", members: ["Garissa", "Mandera", "Wajir"] },
  {
    name: "Rift Valley",
    members: [
      "Baringo",
      "Bomet",
      "Elgeyo-Marakwet",
      "Kajiado",
      "Kericho",
      "Laikipia",
      "Nakuru",
      "Nandi",
      "Narok",
      "Samburu",
      "Trans Nzoia",
      "Turkana",
      "Uasin Gishu",
      "West Pokot",
    ],
  },
  { name: "Nyanza", members: ["Homa Bay", "Kisii", "Kisumu", "Migori", "Nyamira", "Siaya"] },
  { name: "Western", members: ["Bungoma", "Busia", "Kakamega", "Vihiga"] },
] satisfies { name: string; members: string[] }[]

const tanzaniaRegionGroups = [
  { name: "Lake", members: ["Geita", "Kagera", "Mara", "Mwanza", "Shinyanga", "Simiyu"] },
  { name: "Northern", members: ["Arusha", "Kilimanjaro", "Manyara", "Tanga"] },
  {
    name: "Coastal & Zanzibar",
    members: [
      "Dar es Salaam",
      "Lindi",
      "Morogoro",
      "Mtwara",
      "North Pemba",
      "Pwani",
      "South Pemba",
      "Zanzibar North",
      "Zanzibar South & Central",
      "Zanzibar Urban/West",
    ],
  },
  { name: "Central", members: ["Dodoma", "Singida"] },
  { name: "Western", members: ["Katavi", "Kigoma", "Rukwa", "Tabora"] },
  { name: "Southern Highlands", members: ["Iringa", "Mbeya", "Njombe"] },
  { name: "Southern", members: ["Ruvuma"] },
] satisfies { name: string; members: string[] }[]

function slugifyRegion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function getGroupedRegionCenter(regions: MarketRegion[]): LatLngTuple {
  if (regions.length === 0) return [0, 0]

  const [latitude, longitude] = regions.reduce(
    (sum, region) => [sum[0] + region.center[0], sum[1] + region.center[1]] as LatLngTuple,
    [0, 0]
  )

  return [
    Number((latitude / regions.length).toFixed(5)),
    Number((longitude / regions.length).toFixed(5)),
  ]
}

function createGroupedRegions(
  country: MarketCountry,
  groups: { name: string; members: string[] }[]
): MarketRegion[] {
  const countryRegions = adminLevelOneRegions.filter((region) => region.country === country)

  return groups.map((group, index) => {
    const members = countryRegions.filter((region) => group.members.includes(region.name))
    const boundaries = members.flatMap((region) =>
      region.boundaries?.length ? region.boundaries : [region.boundary]
    )

    return {
      id: `${slugifyRegion(country)}-${slugifyRegion(group.name)}`,
      country,
      name: group.name,
      color: groupedRegionColors[index % groupedRegionColors.length],
      center: getGroupedRegionCenter(members),
      boundary: boundaries[0] ?? [],
      boundaries,
      source: `geoBoundaries ADM1 grouped: ${group.members.join(", ")}`,
    }
  })
}

export const marketRegions: MarketRegion[] = [
  ...adminLevelOneRegions.filter((region) => region.country === "Uganda"),
  ...createGroupedRegions("Kenya", kenyaRegionGroups),
  ...createGroupedRegions("Tanzania", tanzaniaRegionGroups),
]

export const marketCountryFilters: MarketCountryFilter[] = [
  "Uganda",
  "Kenya",
  "Tanzania",
  "All",
]

export const stakeholderAnalyticsLayers: MarketActorLayer[] = [
  "processor",
  "nursery",
  "commercialForest",
  "trialSite",
]

export function getRegionBoundaries(region: MarketRegion) {
  return region.boundaries?.length ? region.boundaries : [region.boundary]
}

export function pointInBoundary(
  latitude: number,
  longitude: number,
  boundary: LatLngTuple[]
) {
  let inside = false

  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [latI, lngI] = boundary[i]
    const [latJ, lngJ] = boundary[j]
    const intersects =
      latI > latitude !== latJ > latitude &&
      longitude <
        ((lngJ - lngI) * (latitude - latI)) / (latJ - latI || 1) + lngI

    if (intersects) inside = !inside
  }

  return inside
}

export function pointInMarketRegion(
  latitude: number,
  longitude: number,
  region: MarketRegion
) {
  return getRegionBoundaries(region).some((boundary) =>
    pointInBoundary(latitude, longitude, boundary)
  )
}

function distanceToRegionCenter(
  latitude: number,
  longitude: number,
  region: MarketRegion
) {
  const [regionLatitude, regionLongitude] = region.center
  return (latitude - regionLatitude) ** 2 + (longitude - regionLongitude) ** 2
}

export function getCountryRegion(
  country: MarketCountry,
  latitude: number,
  longitude: number
) {
  const countryRegions = marketRegions.filter((region) => region.country === country)
  const containingRegion = countryRegions.find((region) =>
    pointInMarketRegion(latitude, longitude, region)
  )

  return (
    containingRegion ??
    [...countryRegions].sort(
      (a, b) =>
        distanceToRegionCenter(latitude, longitude, a) -
        distanceToRegionCenter(latitude, longitude, b)
    )[0]
  )?.name
}

function actor(
  layer: MarketActorLayer,
  name: string,
  latitude: number,
  longitude: number,
  options: {
    role?: string
    summary?: string
    country?: MarketCountry
    region?: string
    details?: MarketActorDetail[]
    source?: string
    sizeHa?: number
    seedlingPriceUgxPerSeedling?: number
    g1RoundwoodPriceUgxPerTonne?: number
    commercialSpeciesAreas?: MarketActor["commercialSpeciesAreas"]
  } = {}
): MarketActor {
  const country = options.country ?? "Uganda"
  const details = options.details ?? []
  const region = options.region ?? getCountryRegion(country, latitude, longitude) ?? country

  return {
    id: `${layer}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    name,
    layer,
    role: options.role ?? marketActorLayerMeta[layer].label,
    summary:
      options.summary ??
      "Sector actor from the upstream forestry market map database.",
    country,
    region,
    latitude,
    longitude,
    details,
    source: options.source ?? "Upstream_Models.ipynb",
    ...(options.sizeHa != null ? { sizeHa: options.sizeHa } : {}),
    ...(options.seedlingPriceUgxPerSeedling != null
      ? { seedlingPriceUgxPerSeedling: options.seedlingPriceUgxPerSeedling }
      : {}),
    ...(options.g1RoundwoodPriceUgxPerTonne != null
      ? { g1RoundwoodPriceUgxPerTonne: options.g1RoundwoodPriceUgxPerTonne }
      : {}),
    ...(options.commercialSpeciesAreas?.length
      ? { commercialSpeciesAreas: options.commercialSpeciesAreas }
      : {}),
  }
}

const trialSiteDetails: MarketActorDetail[] = [
  { label: "Database", value: "Trial site database" },
  { label: "Fields tracked", value: "Water balance, temperature, radiation, topography, soils" },
]

function hasDatabaseValue(value: DataValue | string[] | Record<string, DataValue>) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  return value !== ""
}

function formatDatabaseValue(value: DataValue | string[] | Record<string, DataValue>) {
  if (!hasDatabaseValue(value)) return "Not recorded"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${item}`)
      .join(", ")
  }
  if (typeof value === "number") return value.toLocaleString()
  return value
}

function parseDatabaseNumber(value: DataValue) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const parsed = Number(value.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function formatGrade(spec: ProcessorSpeciesSpec, grade: "g1" | "g2" | "g3") {
  const gradeSpec = spec.grades[grade]
  const price = parseDatabaseNumber(spec.prices[grade])
  const parts = [
    hasDatabaseValue(gradeSpec.dbh_min) ? `${gradeSpec.dbh_min} cm DBH` : null,
    hasDatabaseValue(gradeSpec.h_min) ? `${gradeSpec.h_min} m log` : null,
    price != null && spec.price_mode === "per_tonne"
      ? `UGX ${Math.round(price).toLocaleString()}/t`
      : null,
  ].filter(Boolean)

  return parts.length ? parts.join(", ") : "Not recorded"
}

function numericValues(values: DataValue[]) {
  return values
    .map(parseDatabaseNumber)
    .filter((value): value is number => value != null)
}

function getProcessorG1RoundwoodPrice(record: ProcessorRecord) {
  const prices = numericValues([
    record.buyer_specs.euc.price_mode === "per_tonne"
      ? record.buyer_specs.euc.prices.g1
      : "",
    record.buyer_specs.pine.price_mode === "per_tonne"
      ? record.buyer_specs.pine.prices.g1
      : "",
  ])

  if (prices.length === 0) return undefined

  return prices.reduce((sum, price) => sum + price, 0) / prices.length
}

function getNurserySeedlingPrice(record: NurseryRecord) {
  const prices = Object.values(record.supply_specs).flatMap((spec) =>
    ["per_seedling", "UGX", "ugx"].includes(spec.price_mode)
      ? numericValues(Object.values(spec.prices))
      : []
  )

  if (prices.length === 0) return undefined

  return prices.reduce((sum, price) => sum + price, 0) / prices.length
}

function getCommercialForestArea(record: LargeCommercialForestRecord) {
  const explicitArea = parseDatabaseNumber(record["Plantation size (ha)"])
  if (explicitArea != null) return explicitArea

  const speciesAreas = numericValues([
    record.forest_specs.euc.area_ha,
    record.forest_specs.pine.area_ha,
    record.forest_specs.other.area_ha,
  ])

  if (speciesAreas.length === 0) return undefined

  return speciesAreas.reduce((sum, value) => sum + value, 0)
}

function getCommercialForestSpeciesAreas(record: LargeCommercialForestRecord) {
  const eucArea = parseDatabaseNumber(record.forest_specs.euc.area_ha)
  const pineArea = parseDatabaseNumber(record.forest_specs.pine.area_ha)
  const otherArea = parseDatabaseNumber(record.forest_specs.other.area_ha)
  const areas = [
    eucArea != null
      ? { species: "Eucalyptus", hectares: eucArea, color: "#16a34a" }
      : null,
    pineArea != null
      ? { species: "Pine", hectares: pineArea, color: "#2563eb" }
      : null,
    otherArea != null
      ? { species: "Other", hectares: otherArea, color: "#d97706" }
      : null,
  ]

  return areas.filter((item): item is NonNullable<typeof item> => item != null)
}

function processorDetails(record: ProcessorRecord): MarketActorDetail[] {
  return [
    { label: "Database", value: "Processor database" },
    { label: "Eucalyptus G1", value: formatGrade(record.buyer_specs.euc, "g1") },
    { label: "Pine G1", value: formatGrade(record.buyer_specs.pine, "g1") },
    { label: "Capacity", value: formatDatabaseValue(record["Roundwood input capacity"]) },
    { label: "Products", value: formatDatabaseValue(record.Products) },
    { label: "Certification", value: formatDatabaseValue(record.Certification) },
  ]
}

function nurseryDetails(record: NurseryRecord): MarketActorDetail[] {
  return [
    { label: "Database", value: "Nursery database" },
    { label: "Eucalyptus prices", value: formatDatabaseValue(record.supply_specs.euc.prices) },
    { label: "Pine prices", value: formatDatabaseValue(record.supply_specs.pine.prices) },
    { label: "Indigenous prices", value: formatDatabaseValue(record.supply_specs.indigenous.prices) },
    { label: "Species or clones", value: formatDatabaseValue([
      ...record.supply_specs.euc.species_or_clones,
      ...record.supply_specs.pine.species_or_clones,
      ...record.supply_specs.indigenous.species_or_clones,
    ]) },
    { label: "Total capacity", value: formatDatabaseValue(record["Total capacity"]) },
    { label: "Certification", value: formatDatabaseValue(record.Certification) },
  ]
}

function commercialForestDetails(
  record: LargeCommercialForestRecord
): MarketActorDetail[] {
  return [
    { label: "Database", value: "Large commercial forest database" },
    { label: "Plantation size", value: formatDatabaseValue(record["Plantation size (ha)"]) },
    { label: "Eucalyptus area", value: formatDatabaseValue(record.forest_specs.euc.area_ha) },
    { label: "Pine area", value: formatDatabaseValue(record.forest_specs.pine.area_ha) },
    { label: "Other species", value: formatDatabaseValue(record.forest_specs.other.species) },
    { label: "Products", value: formatDatabaseValue(record.Products) },
    { label: "Certification", value: formatDatabaseValue(record.Certification) },
  ]
}

function forestReserveDetails(record: CentralForestReserveRecord): MarketActorDetail[] {
  const recordedAreaHa = getCentralForestReserveAreaHa(record)

  return [
    { label: "Database", value: "Central forest reserve database" },
    { label: "Legal status", value: record.reserve_profile.reserve_status.legal_status },
    {
      label: "Recorded area",
      value: recordedAreaHa == null
        ? "Not recorded"
        : `${Math.round(recordedAreaHa).toLocaleString()} ha`,
    },
    {
      label: "Authority",
      value: formatDatabaseValue(record.reserve_profile.reserve_status.management_authority),
    },
    {
      label: "Concession status",
      value: formatDatabaseValue(
        record.reserve_profile.reserve_status.overall_concession_status
      ),
    },
    {
      label: "Verification",
      value: formatDatabaseValue(
        record.reserve_profile.reserve_status.verification ?? record.verification ?? ""
      ),
    },
    { label: "PPP availability", value: formatDatabaseValue(record.reserve_profile.reserve_status.ppp_availability) },
    { label: "Source", value: formatDatabaseValue(record["Data source"]) },
  ]
}

function getRecordComment(value: DataValue) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function summarizeProcessorRecord(name: string, record: ProcessorRecord) {
  return (
    getRecordComment(record.Comments) ??
    `${name} is a processor record from processors.json. Buyer specs, products, input capacity, target markets, certification, and comments are editable in that database; blank fields are treated as not recorded.`
  )
}

function summarizeNurseryRecord(name: string, record: NurseryRecord) {
  return (
    getRecordComment(record.Comments) ??
    `${name}`
  )
}

function summarizeCommercialForestRecord(
  name: string,
  record: LargeCommercialForestRecord
) {
  return (
    getRecordComment(record.Comments) ??
    `${name} is a large commercial forest record from large-commercial-forests.json with its own coordinate point. Species areas, standing volume, age classes, prices, marketable products, harvest status, supply reliability, sale status, and certification are editable in that database; blank fields are treated as not recorded.`
  )
}

function summarizeCentralForestReserveRecord(
  name: string,
  record: CentralForestReserveRecord
) {
  const areaHa = getCentralForestReserveAreaHa(record)
  const area = areaHa == null ? "area not recorded" : `${Math.round(areaHa).toLocaleString()} ha recorded area`
  const authority = formatDatabaseValue(
    record.reserve_profile.reserve_status.management_authority
  )
  const concession = formatDatabaseValue(
    record.reserve_profile.reserve_status.overall_concession_status
  )
  const verification = formatDatabaseValue(
    record.reserve_profile.reserve_status.verification ?? record.verification ?? ""
  )

  return (
    getRecordComment(record.Comments) ??
    `${name} CFR is a central forest reserve database record from central-forest-reserves.json with ${area}, authority ${authority}, concession status ${concession}, and verification ${verification}. PPP, allocation, biophysical, opportunity, risk, and analytics fields remain editable where blank.`
  )
}

const processorActors = Object.entries(processorDatabase).map(([name, record]) =>
  actor("processor", name, Number(record.lat), Number(record.lon), {
    role: "Roundwood processor",
    summary: summarizeProcessorRecord(name, record),
    details: processorDetails(record),
    source: "Processor database",
    g1RoundwoodPriceUgxPerTonne: getProcessorG1RoundwoodPrice(record),
  })
)

const nurseryActors = Object.entries(nurseryDatabase).map(([name, record]) =>
  actor("nursery", name, Number(record.lat), Number(record.lon), {
    role: "Nursery",
    summary: summarizeNurseryRecord(name, record),
    details: nurseryDetails(record),
    source: "Nursery database",
    seedlingPriceUgxPerSeedling: getNurserySeedlingPrice(record),
  })
)

const commercialForestActors = Object.entries(largeCommercialForestDatabase).map(
  ([name, record]) =>
    actor("commercialForest", name, Number(record.lat), Number(record.lon), {
      role: "Large commercial forest",
      summary: summarizeCommercialForestRecord(name, record),
      details: commercialForestDetails(record),
      source: "Large commercial forest database",
      sizeHa: getCommercialForestArea(record),
      commercialSpeciesAreas: getCommercialForestSpeciesAreas(record),
    })
)

const trialSiteActors = [
  actor("trialSite", "Kisolanza", -8.15151, 35.4027, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Lwangu", -9.48099, 34.986, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Tanwat", -9.24236, 34.8536, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Uchindile", -8.72494, 35.511, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "KVTC", -8.46716, 36.5719, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Makete", -9.3795, 34.4042, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "NFC", -8.09726, 36.012, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Tukuyu", -9.15924, 33.6052, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Unilever", -8.58681, 35.227, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "North Ruvu", -6.71615, 38.8792, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Mbizi (MU02)", -7.92079, 31.5991, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Wino-Ifinga", -9.71035, 35.5215, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Saohill-Nyololo", -8.49868, 35.0947, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Korogwe", -5.15, 38.45, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "Tabora", -5.0167, 32.8, { country: "Tanzania", details: trialSiteDetails }),
  actor("trialSite", "SFI (Handeni)", -5.4167, 38.0167, { country: "Tanzania", details: trialSiteDetails }),
]

const forestReserveActors = Object.entries(centralForestReserveDatabase).map(
  ([name, record]) =>
    actor("forestReserve", name, Number(record.lat), Number(record.lon), {
      role: "Central Forest Reserve",
      summary: summarizeCentralForestReserveRecord(name, record),
      details: forestReserveDetails(record),
      source: String(record["Data source"]),
      sizeHa: getCentralForestReserveAreaHa(record) ?? undefined,
    })
)

export const marketActors: MarketActor[] = [
  ...processorActors,
  ...nurseryActors,
  ...commercialForestActors,
  ...trialSiteActors,
  ...forestReserveActors,
]

export const stakeholderLayers: MarketActorLayer[] = [
  "processor",
  "nursery",
  "commercialForest",
]
