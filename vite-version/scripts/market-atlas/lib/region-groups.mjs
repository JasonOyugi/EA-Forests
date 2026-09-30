// Region-to-map assignment for the Market Atlas ingestion pipeline.
//
// The `kenyaRegionGroups` / `tanzaniaRegionGroups` literals below MUST stay in sync with
// `src/app/shop/data/region-groups.ts` — they describe the same county/region -> macro-region
// dissolve that `market-map.ts` already renders as polygons (grouped ADM1 boundaries), and the
// `regionId` this script assigns to each actor must use the exact same id scheme
// (`${slugifyRegion(country)}-${slugifyRegion(groupName)}`) so the Market Atlas map can match
// actors to the polygons `marketRegions` already exports.

export function slugifyRegion(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export const kenyaRegionGroups = [
  { name: "Nairobi", members: ["Nairobi"] },
  { name: "Central", members: ["Kiambu", "Kirinyaga", "Murang'a", "Nyandarua", "Nyeri"] },
  { name: "Coast", members: ["Kilifi", "Kwale", "Lamu", "Mombasa", "Taita Taveta", "Tana River"] },
  { name: "Eastern", members: ["Embu", "Isiolo", "Kitui", "Machakos", "Makueni", "Marsabit", "Meru", "Tharaka"] },
  { name: "North Eastern", members: ["Garissa", "Mandera", "Wajir"] },
  {
    name: "Rift Valley",
    members: [
      "Baringo", "Bomet", "Elgeyo-Marakwet", "Kajiado", "Kericho", "Laikipia", "Nakuru", "Nandi",
      "Narok", "Samburu", "Trans Nzoia", "Turkana", "Uasin Gishu", "West Pokot",
    ],
  },
  { name: "Nyanza", members: ["Homa Bay", "Kisii", "Kisumu", "Migori", "Nyamira", "Siaya"] },
  { name: "Western", members: ["Bungoma", "Busia", "Kakamega", "Vihiga"] },
]

export const tanzaniaRegionGroups = [
  { name: "Lake", members: ["Geita", "Kagera", "Mara", "Mwanza", "Shinyanga", "Simiyu"] },
  { name: "Northern", members: ["Arusha", "Kilimanjaro", "Manyara", "Tanga"] },
  {
    name: "Coastal & Zanzibar",
    members: [
      "Dar es Salaam", "Lindi", "Morogoro", "Mtwara", "North Pemba", "Pwani", "South Pemba",
      "Zanzibar North", "Zanzibar South & Central", "Zanzibar Urban/West",
    ],
  },
  { name: "Central", members: ["Dodoma", "Singida"] },
  { name: "Western", members: ["Katavi", "Kigoma", "Rukwa", "Tabora"] },
  { name: "Southern Highlands", members: ["Iringa", "Mbeya", "Njombe"] },
  { name: "Southern", members: ["Ruvuma"] },
]

// The actor master spells a handful of Kenya counties differently from the canonical ADM1
// boundary names (`generated-admin-boundaries.ts`) / `region-groups.ts` members. Confirmed by
// direct inspection of both sources — these are the only two mismatches.
const kenyaCountyFixes = {
  "Trans-Nzoia": "Trans Nzoia",
  "Tharaka-Nithi": "Tharaka",
}

function canonicalKenyaCounty(raw) {
  return kenyaCountyFixes[raw] ?? raw
}

function findGroup(groups, countyOrRegionName) {
  return groups.find((group) => group.members.includes(countyOrRegionName))
}

// Uganda's actor data records finer named sub-regions (Albertine, West Nile, Karamoja, South
// Western, ...) than the boundary geometry we have, which is the real geoBoundaries UGA/ADM1
// set of only 4 macro-regions (Northern, Eastern, Central, Western Region — confirmed by direct
// inspection of `generated-admin-boundaries.ts`). This is a standard, well-known grouping used
// by Uganda's own national statistics (UBOS/NPA four-region classification), not an invented
// boundary: Karamoja and West Nile sit within Northern Region, Albertine and South Western sit
// within Western Region.
const ugandaSubregionToAdm1 = {
  "Central": "Central Region",
  "Eastern": "Eastern Region",
  "Northern": "Northern Region",
  "West Nile": "Northern Region",
  "Karamoja": "Northern Region",
  "Western": "Western Region",
  "South Western": "Western Region",
  "Albertine": "Western Region",
}

// Tanzania's actor master has zero populated `region_state` values — every row only has messy
// free-text `district_county`. This is a best-effort, conservative lookup for the entries that
// are unambiguously a single known district/town; anything not listed here is left genuinely
// unassigned rather than guessed (per the "don't fabricate region assignment" requirement).
const tanzaniaDistrictToRegion = {
  "Geita": "Geita",
  "Mafinga": "Iringa",
  "Mufindi": "Iringa",
  "Mufindi / Iringa": "Iringa",
  "Kilolo": "Iringa",
  "Njombe": "Njombe",
  "Kilombero Valley": "Morogoro",
  // Forestry districts/towns, each unambiguously inside one region.
  "Sao Hill": "Iringa", "Iringa": "Iringa", "Makambako": "Njombe", "Wanging'ombe": "Njombe", "Ludewa": "Njombe",
  "Mbeya": "Mbeya", "Rungwe": "Mbeya", "Tukuyu": "Mbeya", "Kilombero": "Morogoro", "Ifakara": "Morogoro",
  "Morogoro": "Morogoro", "Dar es Salaam": "Dar es Salaam", "Arusha": "Arusha", "Moshi": "Kilimanjaro",
  "Tanga": "Tanga", "Muheza": "Tanga", "Korogwe": "Tanga", "Lushoto": "Tanga", "Songea": "Ruvuma",
  "Mbinga": "Ruvuma", "Mwanza": "Mwanza", "Kigoma": "Kigoma", "Dodoma": "Dodoma", "Tabora": "Tabora",
}

// Kenyan towns that sit unambiguously in one county (the actor sheets often give a town, not a county).
const kenyaTownToCounty = {
  "Eldoret": "Uasin Gishu", "Kitale": "Trans Nzoia", "Nanyuki": "Laikipia", "Nyahururu": "Laikipia",
  "Thika": "Kiambu", "Limuru": "Kiambu", "Molo": "Nakuru", "Gilgil": "Nakuru", "Elburgon": "Nakuru",
  "Naivasha": "Nakuru", "Njoro": "Nakuru", "Londiani": "Kericho", "Lessos": "Nandi", "Kapsabet": "Nandi",
  "Timau": "Meru", "Karatina": "Nyeri", "Maragua": "Murang'a", "Kiganjo": "Nyeri", "Athi River": "Machakos",
  "Mlolongo": "Machakos", "Ruiru": "Kiambu", "Kikuyu": "Kiambu", "Bomet": "Bomet", "Kisii": "Kisii",
}

// Uganda districts (and a few well-known towns) by UBOS statistical region, the same four-region
// split the map's ADM1 geometry uses.
const ugandaDistrictToAdm1 = Object.fromEntries([
  ["Central Region", ["Kampala", "Wakiso", "Mukono", "Mpigi", "Mityana", "Mubende", "Kassanda", "Masaka", "Luwero", "Luweero",
    "Nakaseke", "Kayunga", "Buikwe", "Kalangala", "Kalungu", "Lwengo", "Rakai", "Sembabule", "Ssembabule", "Gomba", "Butambala",
    "Kiboga", "Kyankwanzi", "Nakasongola", "Buvuma", "Lyantonde", "Kyotera", "Bukomansimbi", "Entebbe", "Namanve", "Lugazi",
    "Bombo", "Kyenda", "Kalwana", "Nalugazi"]],
  ["Eastern Region", ["Jinja", "Iganga", "Mbale", "Tororo", "Soroti", "Busia", "Kamuli", "Mayuge", "Bugiri", "Namayingo", "Luuka",
    "Buyende", "Kaliro", "Pallisa", "Kumi", "Serere", "Kapchorwa", "Sironko", "Masese", "Bukaleba", "Kakira"]],
  ["Northern Region", ["Gulu", "Lira", "Kitgum", "Arua", "Adjumani", "Apac", "Kole", "Oyam", "Pader", "Nebbi", "Moyo", "Yumbe",
    "Koboko", "Amuru", "Nwoya", "Zombo", "Kotido", "Moroto", "Agago", "Dokolo", "Alebtong"]],
  ["Western Region", ["Mbarara", "Kabale", "Hoima", "Masindi", "Kasese", "Fort Portal", "Kabarole", "Kyenjojo", "Kanungu",
    "Bushenyi", "Ibanda", "Isingiro", "Kiruhura", "Ntungamo", "Rukungiri", "Kibaale", "Kagadi", "Kakumiro", "Kyegegwa",
    "Kamwenge", "Bundibugyo", "Buliisa", "Kiryandongo", "Kigumba", "Sheema", "Mitooma", "Rubirizi", "Buhweju", "Kisoro",
    "Rubanda", "Kikonda"]],
].flatMap(([region, places]) => places.map((place) => [place.toLowerCase(), region])))

/** Whole-word matches of known place names inside messy free text ("Chepsir, Kericho", "Namanve, Mukono"). */
function placesIn(text) {
  return (text ?? "")
    .split(/[;,/()]|\s-\s|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function matchKenyaCounty(text) {
  for (const part of placesIn(text)) {
    const county = canonicalKenyaCounty(part.replace(/\s+County$/i, ""))
    if (findGroup(kenyaRegionGroups, county)) return county
    for (const [town, townCounty] of Object.entries(kenyaTownToCounty)) {
      if (new RegExp(`\\b${town}\\b`, "i").test(part)) return townCounty
    }
  }
  return null
}

function matchUgandaRegion(text) {
  for (const part of placesIn(text)) {
    const words = part.replace(/\s+(District|City|Municipality|Town)$/i, "")
    const hit = ugandaDistrictToAdm1[words.toLowerCase()]
    if (hit) return hit
    for (const [place, region] of Object.entries(ugandaDistrictToAdm1)) {
      if (new RegExp(`\\b${place}\\b`, "i").test(part)) return region
    }
  }
  return null
}

function matchTanzaniaRegion(text) {
  const exact = tanzaniaDistrictToRegion[(text ?? "").trim()]
  if (exact) return exact
  for (const part of placesIn(text)) {
    if (tanzaniaDistrictToRegion[part]) return tanzaniaDistrictToRegion[part]
    if (tanzaniaRegionGroups.some((group) => group.members.includes(part))) return part
  }
  return null
}

/**
 * Resolves an actor's map `regionId` (matching `marketRegions` ids from `market-map.ts`) from
 * whatever region/district text the source sheet provides. Returns `regionId: null` when the
 * actor cannot be honestly placed in a region — callers must keep such actors in the country's
 * table view without a region assignment, never invent one.
 */
export function resolveRegionId(country, rawRegionState, rawDistrictCounty) {
  if (country === "Kenya") {
    // Some rows list multiple counties (e.g. "Kiambu; Machakos") — the first match buckets the actor;
    // the full original text is preserved separately in the actor's `fields.region_state`.
    const county = matchKenyaCounty(rawRegionState) ?? matchKenyaCounty(rawDistrictCounty)
    const group = county ? findGroup(kenyaRegionGroups, county) : null
    if (!group) return { regionId: null, regionName: null }
    return { regionId: `kenya-${slugifyRegion(group.name)}`, regionName: group.name }
  }

  if (country === "Uganda") {
    const raw = (rawRegionState ?? "").split(";")[0].trim()
    const adm1Name = ugandaSubregionToAdm1[raw] ?? matchUgandaRegion(rawRegionState) ?? matchUgandaRegion(rawDistrictCounty)
    if (!adm1Name) return { regionId: null, regionName: null }
    return { regionId: `uganda-${slugifyRegion(adm1Name)}`, regionName: adm1Name }
  }

  if (country === "Tanzania") {
    const regionName = matchTanzaniaRegion(rawDistrictCounty) ?? matchTanzaniaRegion(rawRegionState)
    if (!regionName) return { regionId: null, regionName: null }
    const group = findGroup(tanzaniaRegionGroups, regionName)
    if (!group) return { regionId: null, regionName: null }
    return { regionId: `tanzania-${slugifyRegion(group.name)}`, regionName: group.name }
  }

  return { regionId: null, regionName: null }
}
