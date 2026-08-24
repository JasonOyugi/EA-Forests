export type SectorMetric = {
  label: string
  value: string
  context: string
  website: string
  websiteLabel: string
}

/** Illustrative sector snapshot, formerly published on the retired Sector Hub. */
export const sectorMetrics: SectorMetric[] = [
  { label: "Commercial forestry area", value: "420k ha", context: "Regional planted-forest estimate", website: "https://fra-data.fao.org/WO/fra2020/home/", websiteLabel: "Explore FAO data" },
  { label: "Seedling demand", value: "68M / yr", context: "Estimated planting-material need", website: "https://www.cifor-icraf.org/tree-genetic-resources/", websiteLabel: "Explore CIFOR-ICRAF" },
  { label: "Timber demand outlook", value: "7.4%", context: "Indicative demand-growth scenario", website: "https://www.itto.int/market_information_service/", websiteLabel: "Explore ITTO markets" },
  { label: "Investment activity", value: "$24M", context: "Visible project pipeline under review", website: "https://www.gatsbyafrica.org.uk/", websiteLabel: "Explore sector investment" },
  { label: "Carbon project activity", value: "18 projects", context: "Forestry-linked initiatives tracked", website: "https://registry.verra.org/", websiteLabel: "Explore Verra registry" },
  { label: "Nursery capacity", value: "46M", context: "Potential annual seedling capacity", website: "https://www.cifor-icraf.org/tree-genetic-resources/", websiteLabel: "Explore tree-seed systems" },
]

export type SectorPlayer = {
  name: string
  organisation: string
  role: string
  note: string
  image: string
  website: string
}

/**
 * Neutral, descriptive institutional spotlights. Inclusion does not imply
 * ranking or endorsement. Formerly published on the retired Sector Hub.
 */
export const sectorPlayers: SectorPlayer[] = [
  { name: "KEFRI", organisation: "Kenya Forestry Research Institute", role: "Research", note: "Works on forestry research, technology development and knowledge relevant to Kenya's forest sector.", image: "/KEFRI.png", website: "https://www.kefri.org/home.html" },
  { name: "UTGA", organisation: "Uganda Timber Growers Association", role: "Growers", note: "Represents and supports commercial timber growers within Uganda's forestry ecosystem.", image: "/UTGA.png", website: "https://www.utga.ug/" },
  { name: "Gatsby Africa", organisation: "Forestry sector development", role: "Development", note: "Works on inclusive and competitive sector development initiatives in East Africa.", image: "/Gatsby-Africa.png", website: "https://www.gatsbyafrica.org.uk/" },
  { name: "FAO", organisation: "Food and Agriculture Organization", role: "Investment", note: "Works on investment mobilisation and transaction support across African markets.", image: "/FAO.png", website: "https://www.fao.org/" },
  { name: "TFS", organisation: "Tanzania Forest Services", role: "Public agency", note: "Regulates and develops Tanzania's forest sector, relevant to emerging investment structures.", image: "/TFS_TZ.png", website: "https://www.tfs.go.tz/" },
  { name: "Hoffman", organisation: "Hoffman Forestry Company", role: "Operations", note: "A Uganda-based forestry and timber company working across forest management, timber products and consulting.", image: "/Hoffman.png", website: "https://hoffmanforestry.com/" },
]
