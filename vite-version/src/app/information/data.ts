export interface HubStat {
  label: string
  value: string
  context: string
}

export interface HubTimelineEntry {
  date: string
  title: string
  body: string
}

export interface HubSource {
  publisher: string
  label: string
  href: string
}

export interface InformationHubTopic {
  slug: string
  label: string
  eyebrow: string
  accent: string
  heroImage: string
  dek: string
  updatedAt: string
  stats: HubStat[]
  timeline: HubTimelineEntry[]
  sources: HubSource[]
  relatedArticleSlugs: string[]
}

export const informationHubTopics: Record<string, InformationHubTopic> = {
  "policy-regulation": {
    slug: "policy-regulation",
    label: "Policy & Regulation",
    eyebrow: "EA Forests Live",
    accent: "#e96e65",
    heroImage: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA28mi8n.img?w=2048&h=1365&m=4&q=81",
    dek: "From fuel prices to trade decisions, every policy shock ripples through East African forestry faster than it shows up in a harvest plan.",
    updatedAt: "18 Aug 2026",
    stats: [
      { label: "Fuel cost exposure", value: "High", context: "Haulage and processing are diesel-intensive; regional fuel shocks move delivered-log economics within weeks." },
      { label: "Trade corridors watched", value: "3", context: "Red Sea / Gulf shipping, regional fuel imports, and cross-border log and sawn-timber permits." },
      { label: "Read type", value: "Analysis", context: "Editorial desk tracking, not a verified policy filing — treat as a starting point for your own checks." },
    ],
    timeline: [
      { date: "Ongoing", title: "Shipping and fuel routes under pressure", body: "Conflict-linked disruption to Gulf and Red Sea shipping lanes has repeatedly pushed up freight and fuel costs across East Africa, the same inputs that set haulage and milling costs for roundwood." },
      { date: "Ongoing", title: "Fuel price pass-through to logging costs", body: "Harvesting, skidding, and haulage in the region run almost entirely on diesel. Sustained fuel price increases compress margins fastest for operators furthest from processing hubs." },
      { date: "Watch", title: "Trade and customs decisions", body: "Regional governments have historically adjusted log-export permits and fuel subsidies in response to external shocks. Any change to export bans or duty schedules can shift where roundwood is sold, almost overnight." },
    ],
    sources: [
      { publisher: "EA Forests Editorial Desk", label: "Sector context and editorial analysis", href: "/articles" },
    ],
    relatedArticleSlugs: ["how-forests-make-money-east-africa", "roundwood-demand-moving"],
  },
  "finance-markets": {
    slug: "finance-markets",
    label: "Finance & Markets",
    eyebrow: "World Bank CATS",
    accent: "#c5cf86",
    heroImage: "https://advocacy4oromia.org/wp-content/uploads/2014/06/landscape-around-dube-bute-in-the-oromia-region.jpg",
    dek: "Ethiopia's Oromia Forested Landscape Program has become the first ISFL jurisdictional programme to reach large-scale emission-reduction issuance — a signal for how carbon finance can fund standing forests.",
    updatedAt: "17 Aug 2026",
    stats: [
      { label: "Verified emission reductions", value: "14.99M tCO₂e", context: "Verified under the World Bank BioCarbon Fund ISFL methodology for the 2022–2024 crediting period." },
      { label: "Net issued units", value: "12.41M tCO₂e", context: "After a 2.58M buffer deduction, tradable against Oromia's forest and land-use performance." },
      { label: "Programme", value: "Ethiopia OFLP", context: "World Bank Program ID P151294 · Sector: Agriculture, Forestry and Other Land Use." },
    ],
    timeline: [
      { date: "2022–2024", title: "Crediting period runs", body: "The Oromia Forested Landscape Program's ISFL crediting period covers emission reductions from reduced deforestation and improved land-use across Ethiopia's Oromia Regional State." },
      { date: "Verification", title: "14.99M tCO₂e verified", body: "Independent verification confirmed 14,993,847 tonnes of CO₂-equivalent emission reductions, recorded on the World Bank's public Carbon Asset Tracking System (CATS)." },
      { date: "Issuance", title: "12.41M tCO₂e net issued", body: "After a 2,578,939-tonne buffer reserve, 12,414,908 tradable units were net issued — the scale of finance now flowing to a single East African jurisdictional forest programme." },
    ],
    sources: [
      { publisher: "World Bank CATS", label: "Ethiopia Oromia Forested Landscape Program — programme record", href: "https://cats.worldbank.org/ProgramDetails?programId=352&sectorId=70" },
    ],
    relatedArticleSlugs: ["dryland-forestry-investment-case", "high-performance-forest-assets"],
  },
  investments: {
    slug: "investments",
    label: "Investments",
    eyebrow: "CAFI Report",
    accent: "#a980c0",
    heroImage: "https://files.nettsteder.regjeringen.no/wpuploads01/sites/543/2023/09/Yangambi-Research-Station-1500x1000-1.jpg",
    dek: "The Central African Forest Initiative has cleared a new private-sector facility aimed squarely at SMEs building deforestation-free value chains — a template worth watching for East Africa.",
    updatedAt: "16 Aug 2026",
    stats: [
      { label: "Facility size", value: "$22.65M", context: "New private-sector finance facility approved by CAFI's governing board." },
      { label: "Implementer", value: "CFC", context: "The Common Fund for Commodities will implement financing to eligible SMEs." },
      { label: "Geography", value: "Congo Basin (DRC)", context: "First deployment targets deforestation-free value chains across the Congo Basin." },
    ],
    timeline: [
      { date: "Approval", title: "CAFI board approves the facility", body: "CAFI's Executive Board approved a $22.65m private-sector finance facility, formalised in board decision EB.2026.20, to unlock capital for SMEs operating in deforestation-free supply chains." },
      { date: "Implementation", title: "CFC begins deployment", body: "The Common Fund for Commodities (CFC) is named as the implementing partner, tasked with structuring financing instruments suited to SME-scale forestry and agriculture businesses." },
      { date: "Why it matters for East Africa", title: "A blended-finance template", body: "Blended, deforestation-linked SME facilities of this kind are a template regional funds and DFIs active in East Africa are likely to reference when structuring their own forestry-linked private-sector windows." },
    ],
    sources: [
      { publisher: "CAFI", label: "EB.2026.20 — Decision: Private Sector CFC Project Approval", href: "https://cafi.org/app/uploads/2026/03/EB.2026.20-Decision-Private-Sector-CFC-Project-Approval.pdf" },
    ],
    relatedArticleSlugs: ["dryland-forestry-investment-case", "model-before-committing-capital"],
  },
  genetics: {
    slug: "genetics",
    label: "Genetics",
    eyebrow: "Forest News · Landscape Alliance",
    accent: "#6ce3a9",
    heroImage: "https://www.forestsnews.org/wp-content/uploads/2026/08/KT_251107_ICRAF_QTS_86352-1024x1536.jpg",
    dek: "Kenya and Rwanda are both rewriting the rules for who can supply tree seed and how genetic quality is verified — a shift that will reset who can credibly sell planting material.",
    updatedAt: "15 Aug 2026",
    stats: [
      { label: "Kenya's planting target", value: "15 billion trees", context: "National commitment by 2032, driving demand for verified, high-quality planting material." },
      { label: "Working groups", value: "~15 organisations", context: "Kenya's four thematic technical working groups examining genetic quality, custodianship, regulation, and value chains." },
      { label: "Rwanda strategy window", value: "2026–2035", context: "Second edition of Rwanda's national tree reproductive material strategy, nearing publication." },
    ],
    timeline: [
      { date: "Jun 2025", title: "Kenya's first Policy Dialogue Platform", body: "Government agencies, research institutions, counties, communities, NGOs, and private-sector actors met for the first time to discuss Kenya's tree seed sector as a whole, identifying the Draft Seeds and Plant Varieties (Forest Tree Seed) Regulations as the most immediate lever for reform." },
      { date: "Oct 2025 – May 2026", title: "Four technical working groups convene", body: "Around 15 organisations across Kenya's tree seed sector worked through genetic quality, seed source custodianship, regulation, and value-chain themes, developing recommendations for the draft regulations." },
      { date: "Apr 2026", title: "Second Policy Dialogue Platform (Kenya) / national validation workshop (Rwanda)", body: "Kenya validated its Tree Seed Sector Assessment and Policy Review; Rwanda's national workshop validated findings from its own sector assessment and identified implementation priorities with the Rwanda Forestry Authority." },
      { date: "Jun 2026", title: "Kenya's national regulation workshop", body: "Government convened a national workshop on the Draft Seeds and Plant Varieties (Forest Tree Seed) Regulations, drawing on a year of technical working-group input before finalising the rules." },
    ],
    sources: [
      { publisher: "Forests News (Landscape Alliance)", label: "Strengthening policy for tree seed systems", href: "https://www.forestsnews.org/162337/strengthening-policy-tree-seed-systems-africa" },
      { publisher: "CIFOR-ICRAF", label: "Quality Tree Seed for Africa project", href: "https://www.cifor-icraf.org/quality-tree-seed-for-africa/" },
    ],
    relatedArticleSlugs: ["best-planting-material-east-africa", "nursery-partnerships-east-africa"],
  },
  technology: {
    slug: "technology",
    label: "Technology",
    eyebrow: "EA Forests Live",
    accent: "#8d92d1",
    heroImage: "https://eros.usgs.gov/doi-remote-sensing-activities/sites/default/files/public/USGS/Wu_lidar.png",
    dek: "Satellite lidar, radar, and open forest-monitoring platforms are collapsing the cost of knowing what is actually happening on the ground across East African forests.",
    updatedAt: "14 Aug 2026",
    stats: [
      { label: "Revisit frequency", value: "Days, not years", context: "Sentinel and Landsat constellations now make near-continuous optical and radar monitoring routine and free." },
      { label: "Canopy height data", value: "Spaceborne lidar", context: "GEDI-class instruments deliver forest structure and biomass proxies without a single field plot." },
      { label: "Access", value: "Public / open data", context: "Global Forest Watch and USGS EROS distribute much of this as open data for anyone to query." },
    ],
    timeline: [
      { date: "Established", title: "Landsat and Sentinel as the default record", body: "Multi-decade optical archives from Landsat and the Sentinel constellations remain the backbone for detecting deforestation and land-use change across East Africa." },
      { date: "Emerging", title: "Spaceborne lidar structure data", body: "Lidar missions built for canopy-height and biomass estimation (the same USGS EROS programme behind the imagery on this page) are turning forest structure into a queryable dataset rather than a field survey." },
      { date: "Applied", title: "Near-real-time alerts", body: "Platforms built on this imagery already generate deforestation alerts inside months of the original satellite pass, shortening the gap between disturbance and response for concession and reserve monitoring." },
    ],
    sources: [
      { publisher: "USGS EROS", label: "Remote sensing and lidar research activities", href: "https://eros.usgs.gov/doi-remote-sensing-activities" },
    ],
    relatedArticleSlugs: ["model-before-committing-capital", "how-forests-make-money-east-africa"],
  },
}

export function getInformationHubTopic(slug?: string) {
  if (!slug) return undefined
  return informationHubTopics[slug]
}

export const informationHubOrder = ["policy-regulation", "finance-markets", "investments", "genetics", "technology"] as const
