export interface ForestryResource {
  name: string
  href: string
  image: string
  description: string
}

// Centralized, single source of truth for the "Tools & Intelligence" resource cards — never
// hardcode a resource's name/link/image inline in a component. Images are remote HTTPS URLs
// (Unsplash CDN, subject-matched, verified reachable), not bundled local files, per design brief.
export const forestryResources: ForestryResource[] = [
  {
    name: "UN Comtrade",
    href: "https://comtrade.un.org/",
    image: "https://images.unsplash.com/photo-1769144256181-698b8f807066?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Bilateral trade flows, volumes, values, destinations and competitors for timber and wood products.",
  },
  {
    name: "Fordaq",
    href: "https://www.fordaq.com/",
    image: "https://images.unsplash.com/photo-1749572855201-feb5cf658479?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Timber marketplace, buyers, sellers, products, machinery and market intelligence.",
  },
  {
    name: "AlliedOffsets",
    href: "https://alliedoffsets.com/",
    image: "https://images.unsplash.com/photo-1759681770982-313332e7f42c?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Carbon project data, issuance, retirements, pricing and registry aggregation.",
  },
  {
    name: "Sylvera",
    href: "https://www.sylvera.com/",
    image: "https://images.unsplash.com/photo-1646928234724-ddfac30993e6?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Carbon project intelligence, ratings, geospatial biomass analysis and forestry-carbon screening.",
  },
  {
    name: "ResourceWise / Forest2Market",
    href: "https://www.resourcewise.com/timber-prices",
    image: "https://images.unsplash.com/photo-1567080586917-e6ab6aa0df85?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Timber pricing, fibre supply, mill demand, delivered wood costs and industrial forestry economics.",
  },
  {
    name: "ITTO Market Information Service",
    href: "https://www.itto.int/market_information_service/",
    image: "https://images.unsplash.com/photo-1543057911-f4ca18959953?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Regular timber-market reports, pricing indications and global market developments.",
  },
  {
    name: "Global Timber Index",
    href: "https://www.itto.int/gti/",
    image: "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Business-condition indicators across major timber-producing and consuming markets.",
  },
  {
    name: "Trase",
    href: "https://trase.earth/",
    image: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Commodity supply-chain mapping, sourcing exposure and deforestation-risk intelligence.",
  },
  {
    name: "Open Timber Portal",
    href: "https://opentimberportal.org/",
    image: "https://images.unsplash.com/photo-1593069567131-53a0614dde1d?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Concession, operator and compliance information for timber-producing countries.",
  },
  {
    name: "Preferred by Nature Sourcing Hub",
    href: "https://sourcinghub.preferredbynature.org/",
    image: "https://images.unsplash.com/photo-1503785640985-f62e3aeee448?w=1600&h=1200&fit=crop&auto=format&q=80",
    description: "Legality, sourcing-risk and due-diligence intelligence for timber supply chains.",
  },
]
