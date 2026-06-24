import centralForestReserveDatabaseJson from "./market-databases/central-forest-reserves.json"
import largeCommercialForestDatabaseJson from "./market-databases/large-commercial-forests.json"
import nurseryDatabaseJson from "./market-databases/nurseries.json"
import processorDatabaseJson from "./market-databases/processors.json"

export type DataValue = string | number
export type RoundwoodGrade = "g1" | "g2" | "g3"
export type PriceMode =
  | ""
  | "per_tonne"
  | "per_m3"
  | "per_piece"
  | "per_seedling"
  | "per_tray"
  | "UGX"
  | "ugx"
  | "mixed"
  | "standing_tree"
  | "unknown"

export interface RoundwoodGradeSpec {
  dbh_min: DataValue
  h_min: DataValue
}

export interface ProcessorSpeciesSpec {
  grades: Record<RoundwoodGrade, RoundwoodGradeSpec>
  price_mode: PriceMode
  prices: Record<RoundwoodGrade | "reject", DataValue>
}

export interface ProcessorRecord {
  lon: DataValue
  lat: DataValue
  buyer_specs: {
    euc: ProcessorSpeciesSpec
    pine: ProcessorSpeciesSpec
  }
  Products: DataValue
  "Roundwood input capacity": DataValue
  "Target markets": DataValue
  Certification: DataValue
  Comments: DataValue
}

export interface NurserySpeciesSpec {
  material_types: string[]
  species_or_clones: string[]
  price_mode: PriceMode
  prices: Record<string, DataValue>
  capacity: DataValue
  availability: DataValue
  source_traceability: DataValue
}

export interface NurseryRecord {
  lon: DataValue
  lat: DataValue
  supply_specs: {
    euc: NurserySpeciesSpec
    pine: NurserySpeciesSpec
    indigenous: NurserySpeciesSpec
  }
  "Total capacity": DataValue
  Products: DataValue
  "Target customers": DataValue
  Transport: DataValue
  Certification: DataValue
  Contact: DataValue
  Comments: DataValue
}

export interface CommercialForestSpeciesSpec {
  area_ha: DataValue
  standing_volume_m3: DataValue
  age_classes: Record<string, DataValue>
  rotation_age: DataValue
  price_mode: PriceMode
  prices: Record<string, DataValue>
  marketable_products: string[]
  harvest_status: DataValue
  supply_reliability: DataValue
}

export interface CommercialForestOtherSpec {
  area_ha: DataValue
  species: string[]
  standing_volume_m3: DataValue
  marketable_products: string[]
  notes: DataValue
}

export interface LargeCommercialForestRecord {
  lon: DataValue
  lat: DataValue
  forest_specs: {
    euc: CommercialForestSpeciesSpec
    pine: CommercialForestSpeciesSpec
    other: CommercialForestOtherSpec
  }
  "Plantation size (ha)": DataValue
  Products: DataValue
  "Target markets": DataValue
  "Vertical integration": DataValue
  "Processing assets": DataValue
  "Outgrower or third-party sourcing": DataValue
  Certification: DataValue
  "Commercial sale status": DataValue
  Contact: DataValue
  Comments: DataValue
}

export interface CentralForestReserveRecord {
  lon: DataValue
  lat: DataValue
  authority?: DataValue
  concession_status?: DataValue
  verification?: DataValue
  area_km2?: DataValue
  plantable_area_ha?: DataValue
  reserve_profile: {
    reserve_status: {
      management_authority: DataValue
      legal_status: "Central Forest Reserve"
      ppp_availability: DataValue
      overall_concession_status: DataValue
      land_tenure_risk: DataValue
      verification?: DataValue
    }
    area_specs: {
      gross_area_ha: DataValue
      plantable_area_ha: DataValue
      allocated_area_ha: DataValue
      unallocated_area_ha: DataValue
      degraded_area_ha: DataValue
      natural_forest_area_ha: DataValue
      encroached_area_ha: DataValue
    }
    biophysical_specs: {
      rainfall_mm: DataValue
      altitude_m: DataValue
      soil_type: DataValue
      slope_class: DataValue
      climate_suitability: {
        euc: DataValue
        pine: DataValue
        bamboo: DataValue
        indigenous_hardwoods: DataValue
      }
    }
    forest_condition: {
      current_land_cover: DataValue
      existing_plantation_species: string[]
      restoration_requirement: DataValue
      biodiversity_sensitivity: DataValue
    }
    opportunity_specs: {
      recommended_land_use: string[]
      recommended_species: string[]
      potential_products: string[]
      market_access: DataValue
      road_access: DataValue
      investment_priority: DataValue
    }
    risk_specs: {
      encroachment_risk: DataValue
      community_conflict_risk: DataValue
      fire_risk: DataValue
      esg_risk: DataValue
      overall_risk_rating: DataValue
    }
    analytics: {
      commercial_score: DataValue
      restoration_score: DataValue
      ppp_score: DataValue
      risk_score: DataValue
      overall_priority_score: DataValue
      classification: DataValue
    }
  }
  allocations: Record<string, unknown>
  "Data source": DataValue
  "Last updated": DataValue
  "Geometry type"?: DataValue
  "Source field mapping"?: Record<string, DataValue>
  "Source fields"?: Record<string, DataValue>
  Comments: DataValue
}

export const processorDatabase = processorDatabaseJson as Record<string, ProcessorRecord>
export const nurseryDatabase = nurseryDatabaseJson as Record<string, NurseryRecord>
export const largeCommercialForestDatabase =
  largeCommercialForestDatabaseJson as Record<string, LargeCommercialForestRecord>
export const centralForestReserveDatabase =
  centralForestReserveDatabaseJson as Record<string, CentralForestReserveRecord>

export const marketDatabaseSources = {
  processors: "src/app/shop/data/market-databases/processors.json",
  nurseries: "src/app/shop/data/market-databases/nurseries.json",
  largeCommercialForests:
    "src/app/shop/data/market-databases/large-commercial-forests.json",
  centralForestReserves:
    "src/app/shop/data/market-databases/central-forest-reserves.json",
}

export function parseDatabaseNumber(value: DataValue | undefined) {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function getCentralForestReserveAreaHa(
  record: CentralForestReserveRecord | undefined
) {
  if (!record) return null

  return (
    parseDatabaseNumber(record.reserve_profile.area_specs.gross_area_ha) ??
    parseDatabaseNumber(record.reserve_profile.area_specs.plantable_area_ha) ??
    parseDatabaseNumber(record.plantable_area_ha) ??
    ((parseDatabaseNumber(record.area_km2) ?? 0) * 100 || null)
  )
}

function normalizeCentralForestReserveName(value: string) {
  return value.toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim()
}

function getSourceReserveName(record: CentralForestReserveRecord) {
  const sourceName = record["Source fields"]?.["COL566320D71207626E"]
  return typeof sourceName === "string" ? sourceName : ""
}

function distanceToRecord(
  record: CentralForestReserveRecord,
  latitude: number,
  longitude: number
) {
  return (
    (Number(record.lat) - latitude) ** 2 +
    (Number(record.lon) - longitude) ** 2
  )
}

export function getCentralForestReserveRecord(
  name: string,
  latitude?: number,
  longitude?: number
) {
  const normalizedName = normalizeCentralForestReserveName(name)
  const candidates = Object.entries(centralForestReserveDatabase)
    .filter(([recordName, record]) => {
      return (
        normalizeCentralForestReserveName(recordName) === normalizedName ||
        normalizeCentralForestReserveName(getSourceReserveName(record)) ===
          normalizedName
      )
    })
    .map(([, record]) => record)

  if (candidates.length === 0) return centralForestReserveDatabase[name]
  if (latitude == null || longitude == null || candidates.length === 1) {
    return candidates[0]
  }

  return [...candidates].sort(
    (a, b) =>
      distanceToRecord(a, latitude, longitude) -
      distanceToRecord(b, latitude, longitude)
  )[0]
}

export const centralForestReserveDatabaseStats = {
  count: Object.keys(centralForestReserveDatabase).length,
  recordedAreaHa: Object.values(centralForestReserveDatabase).reduce(
    (sum, record) => sum + (getCentralForestReserveAreaHa(record) ?? 0),
    0
  ),
}
