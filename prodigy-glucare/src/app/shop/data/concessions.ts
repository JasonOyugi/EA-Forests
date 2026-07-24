import type { MarketCountry } from "./market-map"

export interface MarketConcession {
  id: string
  name: string
  country: MarketCountry
  latitude: number
  longitude: number
  ha: number
  leaseTerm: string
  bidWindow: string
  currentBid: string
  conditions: string[]
}

export const marketConcessions: MarketConcession[] = [
  {
    id: "ug-west-nile-ppp",
    name: "West Nile PPP Concession",
    country: "Uganda",
    latitude: 2.778,
    longitude: 31.467,
    ha: 12400,
    leaseTerm: "35 years",
    bidWindow: "Jul 15-Aug 30, 2026",
    currentBid: "USD 2.8M",
    conditions: [
      "Local employment plan",
      "Annual silviculture audit",
      "Riparian buffer protection",
    ],
  },
  {
    id: "ug-bunyoro-ppp",
    name: "Bunyoro Mixed-Terrain PPP",
    country: "Uganda",
    latitude: 1.495,
    longitude: 31.355,
    ha: 8900,
    leaseTerm: "30 years",
    bidWindow: "Aug 1-Sep 18, 2026",
    currentBid: "USD 2.1M",
    conditions: [
      "Community benefit agreement",
      "Carbon baseline submitted",
      "No conversion of protected wetlands",
    ],
  },
  {
    id: "ug-busoga-ppp",
    name: "Busoga Growth Corridor PPP",
    country: "Uganda",
    latitude: 0.533,
    longitude: 33.211,
    ha: 6300,
    leaseTerm: "25 years",
    bidWindow: "Sep 5-Oct 12, 2026",
    currentBid: "USD 1.7M",
    conditions: [
      "Processing offtake plan",
      "District access-road maintenance",
      "Quarterly planting progress reports",
    ],
  },
  {
    id: "ke-laikipia-ppp",
    name: "Laikipia Upland PPP",
    country: "Kenya",
    latitude: 0.3602,
    longitude: 36.7822,
    ha: 7800,
    leaseTerm: "33 years",
    bidWindow: "Jul 20-Sep 2, 2026",
    currentBid: "USD 2.4M",
    conditions: [
      "Water-use plan approved",
      "Wildlife corridor retained",
      "County revenue share",
    ],
  },
  {
    id: "ke-kericho-ppp",
    name: "Kericho Growth Belt PPP",
    country: "Kenya",
    latitude: -0.367,
    longitude: 35.2831,
    ha: 5900,
    leaseTerm: "28 years",
    bidWindow: "Aug 12-Sep 28, 2026",
    currentBid: "USD 1.9M",
    conditions: [
      "Rainfall resilience plan",
      "Smallholder outgrower allocation",
      "Independent yield monitoring",
    ],
  },
  {
    id: "ke-kitui-dryland-ppp",
    name: "Kitui Dryland PPP",
    country: "Kenya",
    latitude: -1.367,
    longitude: 38.01,
    ha: 11200,
    leaseTerm: "32 years",
    bidWindow: "Sep 1-Oct 20, 2026",
    currentBid: "USD 2.6M",
    conditions: [
      "Dryland species trial block",
      "Grazing transition agreement",
      "Water harvesting infrastructure",
    ],
  },
  {
    id: "tz-iringa-ppp",
    name: "Iringa Highland PPP",
    country: "Tanzania",
    latitude: -7.7689,
    longitude: 35.6996,
    ha: 14200,
    leaseTerm: "40 years",
    bidWindow: "Jul 10-Aug 25, 2026",
    currentBid: "USD 3.3M",
    conditions: [
      "Village land-use approvals",
      "Sawmill linkage plan",
      "Firebreak maintenance schedule",
    ],
  },
  {
    id: "tz-morogoro-ppp",
    name: "Morogoro Expansion PPP",
    country: "Tanzania",
    latitude: -6.8235,
    longitude: 37.6613,
    ha: 9600,
    leaseTerm: "35 years",
    bidWindow: "Aug 8-Sep 22, 2026",
    currentBid: "USD 2.7M",
    conditions: [
      "Transport corridor upgrade",
      "Employment quota by ward",
      "Annual ESG disclosure",
    ],
  },
  {
    id: "tz-tabora-ppp",
    name: "Tabora Timber Belt PPP",
    country: "Tanzania",
    latitude: -5.0162,
    longitude: 32.8266,
    ha: 11800,
    leaseTerm: "38 years",
    bidWindow: "Sep 15-Nov 1, 2026",
    currentBid: "USD 3.0M",
    conditions: [
      "Rail logistics assessment",
      "Miombo conservation set-aside",
      "Nursery capacity proof",
    ],
  },
]
