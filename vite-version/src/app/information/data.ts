export interface HubStat {
  label: string
  value: string
  context: string
}

export type ResearchCardKind = "news" | "official" | "data" | "analysis" | "timeline"
export type ResearchCardSize = "feature" | "wide" | "standard" | "tall"

export interface ResearchTimelineEntry {
  date: string
  title: string
  impact: string
  href: string
  publisher: string
}

export interface ResearchCard {
  id: string
  title: string
  summary: string
  subtopics: string[]
  publisher: string
  publishedAt: string
  geography: string
  href: string
  kind: ResearchCardKind
  size?: ResearchCardSize
  image?: string
  signal?: string
  timeline?: ResearchTimelineEntry[]
}

export interface InformationHubTopic {
  slug: string
  label: string
  eyebrow: string
  accent: string
  heroImage: string
  dek: string
  updatedAt: string
  subtopics: string[]
  stats: HubStat[]
  cards: ResearchCard[]
}

export const informationHubTopics: Record<string, InformationHubTopic> = {
  "policy-regulation": {
    slug: "policy-regulation",
    label: "Policy & Regulation",
    eyebrow: "Rules, shocks and operating conditions",
    accent: "#e96e65",
    heroImage: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA28mi8n.img?w=2048&h=1365&m=4&q=81",
    dek: "Track the international shocks, regional rule changes and trade controls that alter forestry costs, permits and market access across East Africa.",
    updatedAt: "30 Aug 2026",
    subtopics: ["International", "Regional", "Trade watch"],
    stats: [
      { label: "War-risk operating environment", value: "6 months", context: "The Iran war began on 28 February 2026 and continues to disrupt Gulf shipping." },
      { label: "Kenya fuel support", value: "KSh28.19B", context: "Government support and tax relief committed across the April-May and May-June pricing cycles." },
    ],
    cards: [
      {
        id: "iran-war-forestry-timeline",
        title: "The Iran war: the operating-cost chain reaching East African forests",
        summary: "A six-month operational timeline connecting conflict, maritime chokepoints, fuel policy and regional forestry margins.",
        subtopics: ["International", "Trade watch"],
        publisher: "Multi-source live timeline",
        publishedAt: "Updated 30 Aug 2026",
        geography: "Iran / Gulf / East Africa",
        href: "https://www.iea.org/data-and-statistics/data-tools/middle-east-maritime-chokepoints-shipping-monitor",
        kind: "timeline",
        size: "feature",
        image: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA28mi8n.img?w=2048&h=1365&m=4&q=81",
        signal: "Live impact chain",
        timeline: [
          { date: "28 Feb", title: "War begins; Hormuz becomes the critical constraint", impact: "US-Israeli strikes on Iran trigger retaliation and a historic disruption to Gulf oil flows. Diesel-intensive harvesting, skidding, milling and haulage become immediately exposed to imported-energy risk.", href: "https://www.iea.org/data-and-statistics/data-tools/middle-east-maritime-chokepoints-shipping-monitor", publisher: "IEA" },
          { date: "9-25 Mar", title: "Fuel scarcity reaches East Africa", impact: "Regional buyers hold only weeks of stock while tanker arrivals tighten. Uganda and inland markets face the sharpest delivered-fuel risk because every litre also depends on the Mombasa or Dar es Salaam corridor.", href: "https://www.theeastafrican.co.ke/tea/news/east-africa/region-s-fuel-pumps-dry-up-amid-iran-conflict-5405734", publisher: "The EastAfrican" },
          { date: "8 Apr", title: "A ceasefire offers only temporary relief", impact: "A two-week ceasefire includes reopening Hormuz, but repeated violations keep freight, insurance and purchasing decisions volatile rather than restoring normal planning conditions.", href: "https://apnews.com/article/421ee64fdc9a5c26460df8119c7d1b3f", publisher: "Associated Press" },
          { date: "Apr-Jun", title: "Kenya cushions pump prices", impact: "Government commits KSh28.19 billion through stabilisation and tax relief. The support slows immediate pass-through, but operators still face uncertainty over the landed cost embedded in future fuel reviews.", href: "https://www.president.go.ke/president-ruto-calls-for-patience-as-government-addresses-global-fuel-crisis/", publisher: "President of Kenya" },
          { date: "17 Jun", title: "A memorandum is signed, then frays", impact: "The June agreement does not restore durable passage. Forestry businesses remain unable to assume that fuel, imported machinery, resin, fertilizer or spare-parts lead times have normalised.", href: "https://apnews.com/article/1685cdc4e6ef330406e0ebe242b21e70", publisher: "Associated Press" },
          { date: "20 Jul", title: "Red Sea alternative comes under pressure", impact: "Houthi threats against Saudi-linked shipping raise risk on the route being used to bypass Hormuz. Uganda increases oversight of its Kenya fuel corridor as delays, insurance and freight costs rise.", href: "https://www.theeastafrican.co.ke/tea/business-tech/uganda-tightens-its-grip-on-kenya-fuel-corridor-5536864", publisher: "The EastAfrican" },
          { date: "6-26 Aug", title: "Kenya's supply map is rewritten", impact: "Saudi Arabia overtakes the UAE as a fuel supplier by routing through Yanbu; disrupted trade also cuts UAE exports to Kenya. The policy response is now changing counterparties, routes and working-capital exposure.", href: "https://www.businessdailyafrica.com/bd/corporate/industry/iran-war-aid-saudi-beat-uae-in-kenya-fuel-supplies-5549276", publisher: "Business Daily" },
          { date: "30 Aug", title: "Six months on: plan for persistent disruption", impact: "Hormuz remains constrained and diplomacy has not produced a stable settlement. Forest operators should continue stress-testing diesel, shipping, imported-input and export-route assumptions rather than treating the shock as closed.", href: "https://apnews.com/article/1685cdc4e6ef330406e0ebe242b21e70", publisher: "Associated Press" },
        ],
      },
      { id: "kenya-forest-regulator", title: "Kenya creates its first dedicated forestry regulator", summary: "The amended forest law introduces a Directorate of Forest Regulation, sharper institutional mandates and tougher penalties for forest offences.", subtopics: ["Regional"], publisher: "State Department for Forestry", publishedAt: "29 May 2026", geography: "Kenya", href: "https://forestry.go.ke/he-president-william-ruto-phd-cgh-assents-forest-conservation-and-management-amendment-act-2025", kind: "official", size: "wide", signal: "New law" },
      { id: "kenya-rules-pipeline", title: "Nine forestry rule sets remain under review", summary: "Export and import, concessions, charcoal, benefit sharing, grading, private forests and other operating rules are still moving through development.", subtopics: ["Regional", "Trade watch"], publisher: "State Department for Forestry", publishedAt: "Current register", geography: "Kenya", href: "https://forestry.go.ke/acts-regulations", kind: "official", signal: "Regulatory pipeline" },
      { id: "east-africa-fuel-corridor", title: "Uganda tightens oversight of the Kenya fuel corridor", summary: "Red Sea insecurity is pushing Uganda to protect petroleum deliveries through Mombasa as freight, insurance and delay risk rise.", subtopics: ["Regional", "Trade watch"], publisher: "The EastAfrican", publishedAt: "Jul 2026", geography: "Uganda / Kenya", href: "https://www.theeastafrican.co.ke/tea/business-tech/uganda-tightens-its-grip-on-kenya-fuel-corridor-5536864", kind: "news", signal: "Logistics risk" },
      { id: "fertiliser-supply-shock", title: "Hormuz disruption cuts fertiliser supply to Kenya and Tanzania", summary: "The same shipping and war-risk premiums affecting fuel are constraining fertilizer and sulphur flows used by regional agriculture and tree nurseries.", subtopics: ["International", "Trade watch"], publisher: "The EastAfrican", publishedAt: "Mar 2026", geography: "Kenya / Tanzania", href: "https://www.theeastafrican.co.ke/tea/business-tech/iran-war-cuts-fertiliser-supplies-to-kenya-tanzania-5387948", kind: "analysis", signal: "Input costs" },
      { id: "kenya-dryland-policy", title: "Kenya turns dryland restoration into a commercial forestry policy", summary: "New Prosopis and commercial forestry strategies connect invasive-species control, climate-smart plantations, timber, bioenergy and private investment.", subtopics: ["Regional"], publisher: "State Department for Forestry", publishedAt: "1 Feb 2026", geography: "Kenya", href: "https://forestry.go.ke/kenya-launches-landmark-strategies-transform-asals-and-boost-climate-resilience", kind: "official", signal: "Strategy" },
    ],
  },
  "finance-markets": {
    slug: "finance-markets",
    label: "Finance & Markets",
    eyebrow: "Prices, credits and demand signals",
    accent: "#c5cf86",
    heroImage: "https://advocacy4oromia.org/wp-content/uploads/2014/06/landscape-around-dube-bute-in-the-oromia-region.jpg",
    dek: "Follow carbon rules and issuance, timber price signals, regional demand and the macro forces moving forest-product margins.",
    updatedAt: "30 Aug 2026",
    subtopics: ["Carbon markets", "Timber prices", "Trade & demand", "Macro signals"],
    stats: [
      { label: "Oromia reductions issued", value: "14.9M tCO2e", context: "Verified under the ISFL Standard for Ethiopia's first monitoring period." },
      { label: "Available for transaction", value: "12.4M tCO2e", context: "Units available for carbon-market transactions after programme deductions." },
    ],
    cards: [
      { id: "oromia-isfl-issuance", title: "Ethiopia becomes the first country issued reductions under the ISFL Standard", summary: "Oromia records 14.9 million verified emission reductions, with 12.4 million available for market transactions.", subtopics: ["Carbon markets", "Macro signals"], publisher: "BioCarbon Fund ISFL", publishedAt: "16 Jul 2026", geography: "Ethiopia", href: "https://www.biocarbonfund-isfl.org/result-stories/ethiopia-becomes-first-country-have-verified-emission-reductions-issued-under-isfl", kind: "data", size: "feature", image: "https://advocacy4oromia.org/wp-content/uploads/2014/06/landscape-around-dube-bute-in-the-oromia-region.jpg", signal: "12.4M tradable units" },
      { id: "kenya-carbon-rulebook", title: "Kenya caps overseas carbon sales; forestry waits for stronger baselines", summary: "The new Article 6 rule book sets a 10 million tCO2e budget through 2030 while excluding forests and land use from the initial priority list.", subtopics: ["Carbon markets", "Macro signals"], publisher: "Associated Press", publishedAt: "4 Aug 2026", geography: "Kenya", href: "https://apnews.com/article/cc9833a1431cfb77086d1b2c06c4a20d", kind: "news", size: "wide", signal: "10M tCO2e cap" },
      { id: "ethiopia-carbon-directive", title: "Ethiopia amends its forest-carbon trading directive", summary: "Directive No. 1141/2026 updates the legal framework for forest-carbon ownership and transactions.", subtopics: ["Carbon markets"], publisher: "Ethiopia Ministry of Justice", publishedAt: "29 May 2026", geography: "Ethiopia", href: "https://justice.gov.et/en/directives/forest-carbon-trading-amendment-directive/", kind: "official", signal: "Rule change" },
      { id: "kenya-carbon-registry", title: "Kenya's national carbon registry is now live", summary: "The registry is designed to track projects, verify outcomes, manage ITMOs and prevent double counting.", subtopics: ["Carbon markets"], publisher: "State Department for Forestry", publishedAt: "17 Feb 2026", geography: "Kenya", href: "https://forestry.go.ke/kenya-launches-national-carbon-registry-boost-climate-transparency", kind: "official", signal: "Market infrastructure" },
      { id: "uganda-timber-prices", title: "A current field guide to Uganda's tree, seedling and timber prices", summary: "Indicative August ranges distinguish seedlings, standing timber, poles and delivered wood while exposing the effect of fuel, distance and measurement.", subtopics: ["Timber prices", "Trade & demand"], publisher: "Euca Eco Consults", publishedAt: "12 Aug 2026", geography: "Uganda", href: "https://eucaecoconsults.com/blog/tree-prices-uganda.html", kind: "analysis", size: "wide", signal: "Market guide" },
      { id: "tropical-timber-benchmark", title: "August tropical timber benchmark: stable prices, uneven production", summary: "The latest market report tracks log and sawnwood demand, species pricing, production constraints and Middle East buying signals.", subtopics: ["Timber prices", "Trade & demand"], publisher: "ITTO Market Information Service / Global Wood", publishedAt: "1-15 Aug 2026", geography: "International benchmark", href: "https://www.globalwood.org/market/timber_prices_2026/aaw20260801.htm", kind: "data", signal: "Price watch" },
      { id: "article-six-pipeline", title: "Eastern Africa's Article 6 pipeline reaches 18 bilateral agreements", summary: "The live regional dashboard tracks agreements, transferred units and approved Paris Agreement crediting activities.", subtopics: ["Carbon markets", "Macro signals"], publisher: "UNEP Copenhagen Climate Centre", publishedAt: "Updated 31 Jul 2026", geography: "Eastern Africa", href: "https://www.article6pipeline.unepccc.org/global-data/regions/un-classification/africa/eastern-africa", kind: "data", signal: "18 agreements" },
    ],
  },
  investments: {
    slug: "investments",
    label: "Investments",
    eyebrow: "Capital, assets and transaction risk",
    accent: "#a980c0",
    heroImage: "https://files.nettsteder.regjeringen.no/wpuploads01/sites/543/2023/09/Yangambi-Research-Station-1500x1000-1.jpg",
    dek: "Track disclosed forestry deals, fund structures, project pipelines and the policy conditions shaping deployable capital.",
    updatedAt: "30 Aug 2026",
    subtopics: ["Deals & funds", "Project pipeline", "Risk & returns", "Land & concessions"],
    stats: [
      { label: "New Forests Company investment", value: "$25M", context: "Equity-like capital for East African plantations and downstream processing." },
      { label: "EU-backed guarantee cover", value: "60%", context: "Risk cover supporting the Impact Fund Denmark investment." },
    ],
    cards: [
      { id: "nfc-investment", title: "$25 million committed to East African plantations and local processing", summary: "Impact Fund Denmark is backing New Forests Company operations in Uganda and Tanzania, including plantation expansion and new processing plants.", subtopics: ["Deals & funds", "Project pipeline"], publisher: "Impact Fund Denmark", publishedAt: "19 May 2026", geography: "Uganda / Tanzania", href: "https://impactfund.dk/news/impact-fund-denmark-invests-in-sustainable-forest-management-in-east-africa/", kind: "news", size: "feature", image: "https://files.nettsteder.regjeringen.no/wpuploads01/sites/543/2023/09/Yangambi-Research-Station-1500x1000-1.jpg", signal: "$25M deal" },
      { id: "nfc-guarantee", title: "EU risk-sharing covers 60% of the forestry investment", summary: "A $15 million EFSD+ guarantee supports plantation expansion, plywood and sawmilling capacity, carbon revenues and asset consolidation.", subtopics: ["Deals & funds", "Risk & returns"], publisher: "EDFI Management Company", publishedAt: "19 May 2026", geography: "East Africa", href: "https://edfimc.eu/carbon-sinks-guarantee-under-efsd-supports-impact-fund-denmarks-investment-in-the-new-forests-company/", kind: "official", size: "wide", signal: "$15M guarantee" },
      { id: "nfc-expansion-pipeline", title: "The operating plan targets 100,000 hectares", summary: "The disclosed growth plan expands from roughly 30,000 hectares while adding locally manufactured wood products and acquiring regional forestry assets.", subtopics: ["Project pipeline", "Land & concessions"], publisher: "Impact Fund Denmark", publishedAt: "19 May 2026", geography: "Uganda / Tanzania", href: "https://impactfund.dk/news/impact-fund-denmark-invests-in-sustainable-forest-management-in-east-africa/", kind: "analysis", signal: "100,000 ha target" },
      { id: "cafi-sme-facility", title: "CAFI approves a $22.65 million private-sector forest facility", summary: "The CFC-implemented facility finances SMEs building deforestation-free value chains and offers a nearby blended-finance model for East African fund design.", subtopics: ["Deals & funds", "Project pipeline"], publisher: "Central African Forest Initiative", publishedAt: "Mar 2026", geography: "Congo Basin", href: "https://cafi.org/app/uploads/2026/03/EB.2026.20-Decision-Private-Sector-CFC-Project-Approval.pdf", kind: "official", signal: "$22.65M facility" },
      { id: "kenya-commercial-strategy", title: "Kenya sets a 750,000-hectare commercial-forest ambition", summary: "The 2025-2035 strategy links plantation area, better germplasm, processing recovery, concessions and private investment into one implementation framework.", subtopics: ["Project pipeline", "Land & concessions"], publisher: "State Department for Forestry", publishedAt: "Published 2026", geography: "Kenya", href: "https://forestry.go.ke/sites/default/files/2026-03/NATIONAL%20COMMERCIAL%20FORESTRY%20STRATEGY%202025-2035.pdf", kind: "official", size: "wide", signal: "750,000 ha" },
      { id: "forestry-concession-rules", title: "Concession, valuation and private-forest rules remain investability gates", summary: "Kenya's live regulatory register shows the operating rules that investors should monitor before underwriting land access, harvest rights and exit values.", subtopics: ["Risk & returns", "Land & concessions"], publisher: "State Department for Forestry", publishedAt: "Current register", geography: "Kenya", href: "https://forestry.go.ke/acts-regulations", kind: "analysis", signal: "Due diligence" },
    ],
  },
  genetics: {
    slug: "genetics",
    label: "Genetics",
    eyebrow: "Seed quality, breeding and nursery systems",
    accent: "#6ce3a9",
    heroImage: "https://www.forestsnews.org/wp-content/uploads/2026/08/KT_251107_ICRAF_QTS_86352-1024x1536.jpg",
    dek: "Follow the rules, trials, seed sources and nursery systems that determine survival, growth, wood quality and resilience long before harvest.",
    updatedAt: "30 Aug 2026",
    subtopics: ["Seed systems", "Breeding & trials", "Regulation & quality", "Nurseries"],
    stats: [
      { label: "Tree Genebank accessions", value: "26,028", context: "Seed and live-field accessions conserved by CIFOR-ICRAF across its collections." },
      { label: "Kenya restoration target", value: "15B trees", context: "The 2032 target amplifying demand for traceable, fit-for-site planting material." },
    ],
    cards: [
      { id: "kenya-seed-regulation", title: "Kenya moves forest reproductive material into a traceable regulatory system", summary: "Draft rules cover production, testing, certification, distribution, marketing and quality assurance, with an explicit push against uncertified seed.", subtopics: ["Seed systems", "Regulation & quality"], publisher: "State Department for Forestry", publishedAt: "6 Jul 2026", geography: "Kenya", href: "https://forestry.go.ke/kenya-moves-secure-forest-future-through-meetings-between-state-department-and-technical-working", kind: "official", size: "feature", image: "https://www.forestsnews.org/wp-content/uploads/2026/08/KT_251107_ICRAF_QTS_86352-1024x1536.jpg", signal: "Rules in development" },
      { id: "kenya-rwanda-seed-policy", title: "Kenya and Rwanda move from diagnosis to implementation", summary: "Kenya's national workshop advances draft forest-tree-seed regulations while Rwanda prepares practical guidelines for its forthcoming reproductive-material strategy.", subtopics: ["Seed systems", "Regulation & quality"], publisher: "Landscape Alliance Forests News", publishedAt: "Aug 2026", geography: "Kenya / Rwanda", href: "https://www.forestsnews.org/162337/strengthening-policy-tree-seed-systems-africa", kind: "news", size: "wide", signal: "Regional reform" },
      { id: "tree-genebank", title: "The region's genetic insurance is searchable", summary: "CIFOR-ICRAF reports 7,020 seed-bank accessions and 19,008 live-field accessions covering agroforestry species across dozens of field sites.", subtopics: ["Seed systems", "Breeding & trials"], publisher: "CIFOR-ICRAF Tree Genebank", publishedAt: "Live database", geography: "Nairobi / global network", href: "https://treegenebank.cifor-icraf.org/", kind: "data", signal: "26,028 accessions" },
      { id: "rwanda-coffee-genetics", title: "Rwanda study proposes a clonal seed orchard for wild Coffea eugenioides", summary: "A 2026 population study maps diversity in Nyungwe and Cyamudongo and proposes grafted conservation material to protect the full genotype of selected trees.", subtopics: ["Breeding & trials"], publisher: "International Journal of Environment and Climate Change", publishedAt: "Jul 2026", geography: "Rwanda", href: "https://www.journalijecc.com/index.php/IJECC/article/view/5561", kind: "data", size: "wide", signal: "Seed-source strategy" },
      { id: "quality-tree-seed-project", title: "Quality Tree Seed for Africa enters its final implementation window", summary: "The programme links genetic quality, nursery capacity and restoration practice across Kenya's Great Rift Valley and Rwanda's Lake Kivu and Rusizi Basin.", subtopics: ["Seed systems", "Nurseries"], publisher: "Landscape Alliance", publishedAt: "Programme to Oct 2026", geography: "Kenya / Rwanda", href: "https://www.landscapealliance.org/quality-tree-seed-for-africa/", kind: "official", signal: "Implementation watch" },
      { id: "commercial-breeding-plan", title: "Kenya's commercial strategy puts priority-species breeding on the delivery plan", summary: "The strategy assigns agencies and private actors to breeding programmes, improved seed sources, producer training and seed-processing capacity.", subtopics: ["Breeding & trials", "Nurseries", "Regulation & quality"], publisher: "State Department for Forestry", publishedAt: "Published 2026", geography: "Kenya", href: "https://forestry.go.ke/sites/default/files/2026-03/NATIONAL%20COMMERCIAL%20FORESTRY%20STRATEGY%202025-2035.pdf", kind: "analysis", signal: "Delivery plan" },
    ],
  },
  technology: {
    slug: "technology",
    label: "Technology",
    eyebrow: "Tools moving from trials into operations",
    accent: "#8d92d1",
    heroImage: "https://eros.usgs.gov/doi-remote-sensing-activities/sites/default/files/public/USGS/Wu_lidar.png",
    dek: "Track the geospatial, processing, harvesting, logistics and silvicultural tools changing what forestry teams can measure and produce.",
    updatedAt: "30 Aug 2026",
    subtopics: ["Geospatial", "Processing", "Harvest & haulage", "Silviculture"],
    stats: [
      { label: "Uganda districts surveyed", value: "12", context: "Districts where airborne LiDAR has been deployed over planted forests." },
      { label: "Miti360 study area", value: "770 ha", context: "Kenyan reforestation area represented in the open monitoring dataset." },
    ],
    cards: [
      { id: "uganda-lidar-inventory", title: "Uganda flies LiDAR over plantations to unlock wood-processing investment", summary: "Airborne scanning across 12 districts is measuring mature planted-forest volumes so investors can size mills against a defensible wood-resource envelope.", subtopics: ["Geospatial", "Processing", "Harvest & haulage"], publisher: "FAO Uganda", publishedAt: "16 Jun 2026", geography: "Uganda", href: "https://www.fao.org/uganda/news/detail/more-data--more-wood-industry-investments/en", kind: "news", size: "feature", image: "https://eros.usgs.gov/doi-remote-sensing-activities/sites/default/files/public/USGS/Wu_lidar.png", signal: "Investment-grade inventory" },
      { id: "open-foris-uganda", title: "Uganda's national monitoring system moves from paper to cloud", summary: "Open Foris and SEPAL now support mobile collection, satellite analysis, land-cover mapping, restoration planning and enforcement workflows.", subtopics: ["Geospatial", "Silviculture"], publisher: "FAO e-Agriculture", publishedAt: "23 Jan 2026", geography: "Uganda", href: "https://www.fao.org/e-agriculture/news/community-forests-digital-innovation-how-open-foris-transforming-forest-monitoring", kind: "official", size: "wide", signal: "Operational platform" },
      { id: "tree-crop-mapping-guidance", title: "New geospatial guidance separates tree crops from natural forest", summary: "FAO's 2026 method addresses a high-stakes mapping problem for coffee and other agroforestry systems that can look like natural forest from space.", subtopics: ["Geospatial", "Silviculture"], publisher: "FAO Forestry", publishedAt: "3 Jun 2026", geography: "Global / East Africa use case", href: "https://www.fao.org/forestry/newsroom/news-detail/fao-issues-forest-monitoring-good-practices-for-tree-crop-commodities-and-smallholders/en", kind: "official", signal: "New method" },
      { id: "miti360-dataset", title: "Miti360 opens a Kenyan benchmark for AI-assisted restoration monitoring", summary: "The dataset follows tree crowns across a 770-hectare Kieni Forest restoration area and reports substantial gains after fine-tuning a detection model.", subtopics: ["Geospatial", "Silviculture"], publisher: "arXiv", publishedAt: "28 Jun 2026", geography: "Kieni Forest, Kenya", href: "https://arxiv.org/abs/2606.29447", kind: "data", size: "wide", signal: "Open dataset" },
      { id: "tanzania-processing-study", title: "Tanzania's Lake Zone mills are leaving value in residues", summary: "A 2026 study finds an industry still dominated by primary sawmilling and identifies engineered wood products as a route to use residue and widen margins.", subtopics: ["Processing"], publisher: "East African Journal of Science, Technology and Innovation", publishedAt: "2026", geography: "Lake Zone, Tanzania", href: "https://www.researchgate.net/publication/399850131_Predicament_for_the_sustainability_of_wood-based_industries_in_the_Lake_Zone_Tanzania", kind: "analysis", signal: "Residue opportunity" },
      { id: "safari-ya-mbao", title: "A new project maps the journey of East African timber", summary: "Safari ya Mbao is examining processing and logistics hubs that can connect regional forest supply with bio-based construction demand.", subtopics: ["Processing", "Harvest & haulage"], publisher: "Bauhaus Earth", publishedAt: "2026-present", geography: "East Africa", href: "https://www.bauhauserde.org/projects/safari-ya-mbao", kind: "news", signal: "Supply-chain mapping" },
      { id: "sepal-toolkit", title: "The open monitoring stack now reaches restoration, fire and time-series analysis", summary: "SEPAL combines free satellite access with planning, fire monitoring and GPU time-series modules that smaller forestry teams can use without owning the infrastructure.", subtopics: ["Geospatial", "Silviculture"], publisher: "FAO SEPAL", publishedAt: "Updated Jun 2026", geography: "Open global platform", href: "https://www.fao.org/in-action/sepal/overview/", kind: "data", signal: "Open tools" },
    ],
  },
}

export function getInformationHubTopic(slug?: string) {
  if (!slug) return undefined
  return informationHubTopics[slug]
}

export const informationHubOrder = ["policy-regulation", "finance-markets", "investments", "genetics", "technology"] as const
