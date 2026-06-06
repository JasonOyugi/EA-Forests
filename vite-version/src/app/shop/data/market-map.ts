import { adminLevelOneRegions } from "./generated-admin-boundaries"
import type { LatLngTuple } from "./generated-boundaries"

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
  seedlingPriceUsd?: number
  g1RoundwoodPriceUgxPerTonne?: number
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

export interface SpeciesCommercialArea {
  species: string
  hectares: number
  color: string
}

export interface RegionalCommercialAnalytics {
  regionId: string
  country: MarketCountry
  totalCommercialHa: number
  species: SpeciesCommercialArea[]
}

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

function pointInBoundary(
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

function pointInRegion(
  latitude: number,
  longitude: number,
  region: MarketRegion
) {
  const boundaries = region.boundaries?.length ? region.boundaries : [region.boundary]

  return boundaries.some((boundary) => pointInBoundary(latitude, longitude, boundary))
}

function distanceToRegionCenter(
  latitude: number,
  longitude: number,
  region: MarketRegion
) {
  const [regionLatitude, regionLongitude] = region.center
  return (latitude - regionLatitude) ** 2 + (longitude - regionLongitude) ** 2
}

function getCountryRegion(
  country: MarketCountry,
  latitude: number,
  longitude: number
) {
  const countryRegions = marketRegions.filter((region) => region.country === country)
  const containingRegion = countryRegions.find((region) =>
    pointInRegion(latitude, longitude, region)
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

function parseG1RoundwoodPrice(details: MarketActorDetail[]) {
  const row = details.find((detail) => detail.label.toLowerCase().includes("g1"))
  const match = row?.value.match(/UGX\s*([\d.]+)\s*k\/t/i)
  if (!match) return undefined

  return Number(match[1]) * 1000
}

function getDefaultSeedlingPriceUsd(name: string, country: MarketCountry) {
  const countryBasePrice: Record<MarketCountry, number> = {
    Uganda: 0.18,
    Kenya: 0.21,
    Tanzania: 0.19,
  }
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return Number((countryBasePrice[country] + (hash % 8) * 0.01).toFixed(2))
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
    seedlingPriceUsd?: number
    g1RoundwoodPriceUgxPerTonne?: number
  } = {}
): MarketActor {
  const country = options.country ?? "Uganda"
  const details = options.details ?? []
  const region = options.region ?? getCountryRegion(country, latitude, longitude) ?? country
  const seedlingPriceUsd =
    options.seedlingPriceUsd ??
    (layer === "nursery" ? getDefaultSeedlingPriceUsd(name, country) : undefined)
  const g1RoundwoodPriceUgxPerTonne =
    options.g1RoundwoodPriceUgxPerTonne ??
    (layer === "processor" ? parseG1RoundwoodPrice(details) : undefined)

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
    ...(options.sizeHa ? { sizeHa: options.sizeHa } : {}),
    ...(seedlingPriceUsd ? { seedlingPriceUsd } : {}),
    ...(g1RoundwoodPriceUgxPerTonne ? { g1RoundwoodPriceUgxPerTonne } : {}),
  }
}

const speciesColors = {
  eucalyptus: "#16a34a",
  pine: "#2563eb",
  cypress: "#0891b2",
  teak: "#b45309",
  melia: "#f59e0b",
  indigenous: "#65a30d",
  mixed: "#64748b",
}

function speciesSplit(
  totalCommercialHa: number,
  split: { species: string; share: number; color: string }[]
) {
  return split.map((item, index) => {
    const isLast = index === split.length - 1
    const allocated = split
      .slice(0, index)
      .reduce((sum, previous) => sum + Math.round(totalCommercialHa * previous.share), 0)

    return {
      species: item.species,
      hectares: isLast
        ? Math.max(0, Math.round(totalCommercialHa - allocated))
        : Math.round(totalCommercialHa * item.share),
      color: item.color,
    }
  })
}

function commercialRecord(
  regionId: string,
  country: MarketCountry,
  totalCommercialHa: number,
  split: { species: string; share: number; color: string }[]
): RegionalCommercialAnalytics {
  return {
    regionId,
    country,
    totalCommercialHa,
    species: speciesSplit(totalCommercialHa, split),
  }
}

const countrySpeciesProfiles: Record<
  MarketCountry,
  { species: string; share: number; color: string }[]
> = {
  Uganda: [
    { species: "Eucalyptus", share: 0.55, color: speciesColors.eucalyptus },
    { species: "Pine", share: 0.31, color: speciesColors.pine },
    { species: "Mixed hardwoods", share: 0.14, color: speciesColors.mixed },
  ],
  Kenya: [
    { species: "Eucalyptus", share: 0.42, color: speciesColors.eucalyptus },
    { species: "Cypress", share: 0.28, color: speciesColors.cypress },
    { species: "Pine", share: 0.2, color: speciesColors.pine },
    { species: "Melia", share: 0.1, color: speciesColors.melia },
  ],
  Tanzania: [
    { species: "Pine", share: 0.36, color: speciesColors.pine },
    { species: "Eucalyptus", share: 0.34, color: speciesColors.eucalyptus },
    { species: "Teak", share: 0.17, color: speciesColors.teak },
    { species: "Mixed hardwoods", share: 0.13, color: speciesColors.mixed },
  ],
}

const countryCommercialAreaBaseHa: Record<MarketCountry, number> = {
  Uganda: 4200,
  Kenya: 5600,
  Tanzania: 7400,
}

function getRegionalCommercialAreaHa(region: MarketRegion) {
  const hash = [...`${region.country}-${region.name}`].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  )
  const countryBase = countryCommercialAreaBaseHa[region.country]
  const boundaryScale = Math.min(region.boundary.length / 220, 2.2)
  const regionScale = 0.45 + (hash % 115) / 100

  return Math.round(countryBase * regionScale * (0.75 + boundaryScale * 0.18))
}

export const regionalCommercialAnalytics: RegionalCommercialAnalytics[] = marketRegions.map(
  (region) =>
    commercialRecord(
      region.id,
      region.country,
      getRegionalCommercialAreaHa(region),
      countrySpeciesProfiles[region.country]
    )
)
const defaultProcessorDetails: MarketActorDetail[] = [
  { label: "Eucalyptus G1", value: "30 cm DBH, 2.7 m log, UGX 125k/t" },
  { label: "Eucalyptus G2", value: "20 cm DBH, 2.7 m log, UGX 115k/t" },
  { label: "Pine G1", value: "25 cm DBH, 2.7 m log, UGX 135k/t" },
  { label: "Price mode", value: "Per tonne" },
]

const premiumProcessorDetails: MarketActorDetail[] = [
  { label: "Eucalyptus G1", value: "30 cm DBH, 2.7 m log, UGX 145k/t" },
  { label: "Eucalyptus G2", value: "20 cm DBH, 2.7 m log, UGX 135k/t" },
  { label: "Pine G1", value: "30 cm DBH, 2.7 m log, UGX 175k/t" },
  { label: "Price mode", value: "Per tonne" },
]

const largeLogProcessorDetails: MarketActorDetail[] = [
  { label: "Eucalyptus G1", value: "40 cm DBH, 2.7 m log, UGX 125k/t" },
  { label: "Eucalyptus G2", value: "30 cm DBH, 2.7 m log, UGX 120k/t" },
  { label: "Pine G1", value: "40 cm DBH, 2.7 m log, UGX 175k/t" },
  { label: "Price mode", value: "Per tonne" },
]

const cfidProcessorDetails: MarketActorDetail[] = [
  { label: "Pine G1", value: "14 cm DBH, 2.6 m log, UGX 170k/t" },
  { label: "Pine G2", value: "9 cm DBH, 2.6 m log" },
  { label: "Eucalyptus", value: "Large log thresholds recorded; prices pending" },
  { label: "Price mode", value: "Per tonne" },
]

const nurseryDetails: MarketActorDetail[] = [
  { label: "Database", value: "Nursery database" },
  { label: "Fields tracked", value: "Capacity, species, price, transport, grower type" },
]

const commercialForestDetails: MarketActorDetail[] = [
  { label: "Database", value: "Large commercial forest database" },
  { label: "Fields tracked", value: "Plantation size, species area, farm-gate price, certification" },
]

const trialSiteDetails: MarketActorDetail[] = [
  { label: "Database", value: "Trial site database" },
  { label: "Fields tracked", value: "Water balance, temperature, radiation, topography, soils" },
]

const forestReserveDetails: MarketActorDetail[] = [
  { label: "Database", value: "Uganda forest reserve KML" },
  { label: "Layer", value: "Reserve centroid context from KML footprints" },
]

export const marketActors: MarketActor[] = [
  actor("processor", "Shanglong Industry Company", 1.0989088, 31.6226227, {
    role: "Roundwood processor",
    summary: "Processor with eucalyptus and pine per-tonne buyer specifications.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "Golden Homes factory", -0.138642, 31.894878, {
    role: "Roundwood processor",
    summary: "Processor with eucalyptus and pine grade thresholds in the buyer database.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "(Timber Paper) Sino-Uganda Mbale Industrial Park", 1.0758414, 34.1382243, {
    role: "Industrial processor",
    summary: "Eastern Uganda industrial processor with recorded eucalyptus and pine specifications.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "Evergreen wood", 0.258846, 32.4077845, {
    role: "Roundwood processor",
    summary: "Processor with stronger recorded per-tonne price bands for eucalyptus and pine.",
    details: premiumProcessorDetails,
  }),
  actor("processor", "Brother wood", 0.2253216, 32.8081847, {
    role: "Roundwood processor",
    summary: "Central corridor processor with standard eucalyptus and pine buyer specifications.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "Honghai PLY", 0.3714341, 32.8245749, {
    role: "Plywood processor",
    summary: "Processor node in the central-eastern processing cluster.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "Zhong Ding Construction Materials", 0.4393071, 32.36385, {
    role: "Construction materials processor",
    summary: "Central Uganda processor linked to construction-material demand.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "Zhong Bang Wood", -0.0235833, 32.0203333, {
    role: "Large-log processor",
    summary: "Processor with larger DBH thresholds for both eucalyptus and pine grades.",
    details: largeLogProcessorDetails,
  }),
  actor("processor", "Acacia Wood factory", 0.658842, 31.36237, {
    role: "Roundwood processor",
    summary: "Western-central processor with standard eucalyptus and pine buyer specifications.",
    details: defaultProcessorDetails,
  }),
  actor("processor", "CFID factory", 0.7449337, 32.2329796, {
    role: "Pine-linked processor",
    summary: "Processor with recorded pine thresholds and pending eucalyptus price entries.",
    details: cfidProcessorDetails,
  }),
  actor("processor", "Guo Hau factory", -0.582692, 30.444508, {
    role: "Roundwood processor",
    summary: "Western Uganda processor with eucalyptus and pine per-tonne buyer specifications.",
    details: defaultProcessorDetails,
  }),

  actor("nursery", "UTGA Nursery", 0.3875571825107385, 32.23868953940504, { details: nurseryDetails }),
  actor("nursery", "Bukuwa Clonal Nursery (1)", 0.5791678498035084, 34.04860188805877, { details: nurseryDetails }),
  actor("nursery", "Bukuwa Clonal Nursery (2)", 1.06083237622832, 34.18023102486789, { details: nurseryDetails }),
  actor("nursery", "Bukuwa Clonal Nursery (3)", 0.2057307, 32.3025383, { details: nurseryDetails }),
  actor("nursery", "Trinity Forestry Services Nursery", 0.659157, 32.5272454, { details: nurseryDetails }),
  actor("nursery", "Gabriel Contractors and Nurseries", 1.392919527636578, 31.39102236012505, { details: nurseryDetails }),
  actor("nursery", "Blessed Tree Nursery", 0.8275050864107747, 33.67652703999418, { details: nurseryDetails }),
  actor("nursery", "Erimana Nurseries", 1.574557262987188, 33.4946357787078, { details: nurseryDetails }),
  actor("nursery", "Uganda Tree Resources Ltd Nursery (1)", 0.4528368, 32.6136146, { details: nurseryDetails }),
  actor("nursery", "Uganda Tree Resources Ltd Nursery (2)", 0.4708029, 32.6040161, { details: nurseryDetails }),
  actor("nursery", "Amazon Tree Nurseries Ltd", 0.5968018, 32.473121, { details: nurseryDetails }),
  actor("nursery", "WND Forestry Services Nursery", 1.533020603606059, 31.209751701561, { details: nurseryDetails }),
  actor("nursery", "Nile Fibre Board Nursery (1)", 1.223710039401875, 31.5438066067241, { details: nurseryDetails }),
  actor("nursery", "Tree Growers Nursery", 0.9352719, 31.7639218, { details: nurseryDetails }),
  actor("nursery", "Enviro Green Trust Nursery", 0.5778497, 33.0171632, { details: nurseryDetails }),
  actor("nursery", "BFC Nursery", 0.3853952455317733, 33.38681057225901, { details: nurseryDetails }),
  actor("nursery", "Nile Fibreboards Nursery (2)", 1.169297601435727, 32.4260868607688, { details: nurseryDetails }),
  actor("nursery", "Tooro Botanical Gardens", 0.6668498, 30.2854466, { details: nurseryDetails }),
  actor("nursery", "Rwenzori Clonal Nursery", 0.5887642691541177, 30.29740511054747, { details: nurseryDetails }),
  actor("nursery", "Kasese Nurseries", 0.2828481782093561, 30.11445689120555, { details: nurseryDetails }),
  actor("nursery", "Kisaana Forestry Nursery", 0.416078828209424, 32.19763409994905, { details: nurseryDetails }),
  actor("nursery", "Gayaza Nurseries", 0.4931047171000906, 32.72096302780965, { details: nurseryDetails }),
  actor("nursery", "Blue Gum Nurseries", 0.3587135222820027, 32.76203387120568, { details: nurseryDetails }),
  actor("nursery", "Buhima Farmers Union", 1.340182855496199, 31.22286428465411, { details: nurseryDetails }),
  actor("nursery", "Gatsby Tree Club Nursery", 0.5816765812326437, 31.38400028182261, { details: nurseryDetails }),

  actor("nursery", "Nakuru Highlands Nursery", -0.3031, 36.08, {
    country: "Kenya",
    role: "Nursery partner",
    summary: "Large-format nursery with hybrid eucalyptus and pine handling for commercial buyers.",
    details: nurseryDetails,
    seedlingPriceUsd: 0.24,
    source: "Seedlings product retailer map",
  }),
  actor("nursery", "Rift Valley Clonal Nursery", 0.5143, 35.2698, {
    country: "Kenya",
    role: "Nursery partner",
    summary: "Kenya nursery focused on batch preparation for institutional planting orders.",
    details: nurseryDetails,
    seedlingPriceUsd: 0.26,
    source: "Seedlings product retailer map",
  }),
  actor("nursery", "Athi Plains Nursery Hub", -1.3197, 36.9275, {
    country: "Kenya",
    role: "Nursery partner",
    summary: "Nairobi-area nursery hub for order consolidation and contractor-linked pickup.",
    details: nurseryDetails,
    seedlingPriceUsd: 0.23,
    source: "Seedlings product retailer map",
  }),

  actor("commercialForest", "Busoga Forestry Company (BFC)", 0.4297514, 33.3960445, { details: commercialForestDetails }),
  actor("commercialForest", "NFC Namwasa Plantation", 0.6358656915575317, 31.69638970935844, { details: commercialForestDetails }),
  actor("commercialForest", "NFC Luwunga Plantation", 0.8616262072477974, 31.68744915034311, { details: commercialForestDetails }),
  actor("commercialForest", "Nile Fibreboards Kikonda Plantation", 1.2081239, 31.5593048, { details: commercialForestDetails }),
  actor("commercialForest", "Ambiance Tree Farm Gomba", 0.2410015, 32.1325096, { details: commercialForestDetails }),
  actor("commercialForest", "Kijani Forestry", 2.7735511, 32.3071117, { details: commercialForestDetails }),
  actor("commercialForest", "Nile Fibreboards", 1.1519925, 32.3916016, { details: commercialForestDetails }),
  actor("commercialForest", "Critical Mass Group (U) Ltd - Sugar Plantation", 1.563344511791691, 31.46586187358334, { details: commercialForestDetails }),
  actor("commercialForest", "Woodland Investments", 0.8076415484424228, 30.20741467274687, { details: commercialForestDetails }),
  actor("commercialForest", "Core Woods Ltd", 1.517565182423477, 31.19950827753198, { details: commercialForestDetails }),
  actor("commercialForest", "Nile Plywoods (U) Ltd", 0.6197506976921691, 33.10864489087399, { details: commercialForestDetails }),
  actor("commercialForest", "NFC Achwa Plantation", 3.358177663990421, 32.32323990537162, { details: commercialForestDetails }),
  actor("commercialForest", "Modern Laminates", 0.427939, 33.1709342, { details: commercialForestDetails }),

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

  actor("forestReserve", "Zulia", 3.9185, 33.94456, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 93635 }),
  actor("forestReserve", "Budongo", 1.80286, 31.5571, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 82421.5 }),
  actor("forestReserve", "Moroto", 2.53096, 34.7673, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 48758 }),
  actor("forestReserve", "Nyangea - Napore", 3.54428, 33.66537, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 42760.4 }),
  actor("forestReserve", "Kadam", 1.80923, 34.7112, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 41188.9 }),
  actor("forestReserve", "Bugoma", 1.17206, 30.92035, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 40262.4 }),
  actor("forestReserve", "Kasyoha - Kitomi", -0.28781, 30.2353, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 38721.1 }),
  actor("forestReserve", "Mabira", 0.47031, 32.97273, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 31243 }),
  actor("forestReserve", "Kagombe", 0.81027, 30.78314, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 30271.8 }),
  actor("forestReserve", "North Maramagambo", -0.38409, 29.97089, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 29662.1 }),
  actor("forestReserve", "Agoro - Agu", 3.75757, 32.90908, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 26640.4 }),
  actor("forestReserve", "Napak", 2.08751, 34.32099, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 22139.7 }),
  actor("forestReserve", "Nangolibwel", 2.56851, 33.86178, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 19961.7 }),
  actor("forestReserve", "Atiya", 3.68347, 31.84786, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 18982.7 }),
  actor("forestReserve", "Lopeichubei", 3.81978, 33.9518, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 16849.4 }),
  actor("forestReserve", "South Busoga", 0.23381, 33.55897, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 16241.8 }),
  actor("forestReserve", "Buyaga Dam", -0.3156, 31.27014, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 15978.2 }),
  actor("forestReserve", "South Maramagambo", -0.54866, 29.87768, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 14879.8 }),
  actor("forestReserve", "Kalinzu", -0.39623, 30.0507, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 14160.5 }),
  actor("forestReserve", "Kikonda", 1.23164, 31.51927, { details: forestReserveDetails, source: "Ugandabmap.kml", sizeHa: 13769.1 }),
]

export const stakeholderLayers: MarketActorLayer[] = [
  "processor",
  "nursery",
  "commercialForest",
]
