import { informationHubOrder, informationHubTopics } from "@/app/information/data"

export type SectorMetric = {
  label: string
  value: string
  context: string
  website: string
  websiteLabel: string
  informationTopic: string
  informationSlug: string
  accent: string
}

/** Two topic-linked numbers for each of the five Information sections. */
export const sectorMetrics: SectorMetric[] = informationHubOrder.flatMap((slug) => {
  const topic = informationHubTopics[slug]
  const primarySource = topic.cards[0]

  return topic.stats.slice(0, 2).map((stat) => ({
    ...stat,
    website: primarySource?.href ?? "#brief",
    websiteLabel: primarySource?.title ?? `Open ${topic.label}`,
    informationTopic: topic.label,
    informationSlug: topic.slug,
    accent: topic.accent,
  }))
})

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
