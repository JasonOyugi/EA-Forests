"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, Building2, Globe2, LayoutPanelTop, MapPinned, Trees } from "lucide-react"

import { RoundwoodTopBanner } from "@/components/commerce-ui/roundwood-top-banner"
import { Button } from "@/components/ui/button"
import { Map, MapMarker, MapPopup, MapTileLayer } from "@/components/ui/map"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface RoundwoodShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

const mapStyleOptions = [
  {
    value: "carto",
    label: "Light atlas",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    value: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  {
    value: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
] as const

const layoutOptions = [
  { value: "map-only", label: "Map only" },
  { value: "map-notes", label: "Map + notes" },
] as const

type MarketNode = {
  id: string
  title: string
  subtitle: string
  summary: string
  latitude: number
  longitude: number
  image: string
  accent: string
  icon: "carbon" | "roundwood" | "timber"
}

function MarketPin({ accent, icon }: { accent: string; icon: MarketNode["icon"] }) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <div className="absolute inset-0 rounded-full blur-lg" style={{ backgroundColor: accent, opacity: 0.28 }} />
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/55 text-white shadow-[0_0_24px_rgba(15,23,42,0.28)]"
        style={{ backgroundColor: accent }}
      >
        {icon === "carbon" ? (
          <Globe2 className="h-5 w-5" />
        ) : icon === "roundwood" ? (
          <Trees className="h-5 w-5" />
        ) : (
          <Building2 className="h-5 w-5" />
        )}
      </div>
    </div>
  )
}

export function RoundwoodShop({ shop, inventory }: RoundwoodShopProps) {
  const navigate = useNavigate()
  const fallbackItem = inventory[0]
  const [layoutMode, setLayoutMode] = useState<(typeof layoutOptions)[number]["value"]>("map-only")
  const [selectedMapStyle, setSelectedMapStyle] = useState<(typeof mapStyleOptions)[number]["value"]>("carto")

  const marketNodes: MarketNode[] = [
    {
      id: "carbon-hub",
      title: "Carbon market demand",
      subtitle: "Climate buyers and project developers",
      summary: "Temporary placeholder for carbon offtake demand, developer pipelines, and removals buyers across the region.",
      latitude: 0.3476,
      longitude: 32.5825,
      image: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1200&q=80",
      accent: "#06b6d4",
      icon: "carbon",
    },
    {
      id: "roundwood-corridor",
      title: "Roundwood offtake corridor",
      subtitle: "Poles, logs, and processor demand",
      summary: "Temporary placeholder for poles, pulpwood, and processor-linked roundwood channels that will later expand into live market markers.",
      latitude: -1.2864,
      longitude: 36.8172,
      image: fallbackItem?.image ?? "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
      accent: "#14b8a6",
      icon: "roundwood",
    },
    {
      id: "timber-hub",
      title: "Sawn timber buyers",
      subtitle: "Construction and furniture channels",
      summary: "Temporary placeholder for sawn timber routes, joinery demand, and downstream buyer networks across East Africa.",
      latitude: -6.7924,
      longitude: 39.2083,
      image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=80",
      accent: "#0f766e",
      icon: "timber",
    },
  ]

  const [, setSelectedNodeId] = useState(marketNodes[0]?.id ?? "")
  const activeMapStyle = mapStyleOptions.find((option) => option.value === selectedMapStyle) ?? mapStyleOptions[0]

  const openMarket = () => {
    if (!fallbackItem) return
    navigate(`/shop/${shop.slug}/${fallbackItem.slug}`)
  }

  return (
    <div className="space-y-8">
      <RoundwoodTopBanner />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-cyan-700" />
            <span className="text-base font-semibold text-foreground">Markets map</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={layoutMode} onValueChange={(value) => setLayoutMode(value as (typeof layoutOptions)[number]["value"])}>
              <SelectTrigger className="w-[170px] cursor-pointer bg-background/90">
                <LayoutPanelTop className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Layout" />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMapStyle} onValueChange={(value) => setSelectedMapStyle(value as (typeof mapStyleOptions)[number]["value"])}>
              <SelectTrigger className="w-[170px] cursor-pointer bg-background/90">
                <SelectValue placeholder="Map type" />
              </SelectTrigger>
              <SelectContent>
                {mapStyleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.8rem]">
          <Map center={[-1.8, 36.4]} zoom={6} className="h-[540px] w-full lg:h-[640px]">
            <MapTileLayer url={activeMapStyle.url} attribution={activeMapStyle.attribution} />
            {marketNodes.map((node) => (
              <MapMarker
                key={node.id}
                position={[node.latitude, node.longitude]}
                icon={<MarketPin accent={node.accent} icon={node.icon} />}
                iconAnchor={[24, 24]}
                eventHandlers={{ click: () => setSelectedNodeId(node.id) }}
              >
                <MapPopup className="w-72 border-0 p-0">
                  <div className="overflow-hidden rounded-[1rem] bg-background">
                    <div className="relative h-32 overflow-hidden">
                      <img src={node.image} alt={node.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">{node.subtitle}</div>
                        <div className="mt-1 text-lg font-semibold text-white">{node.title}</div>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-sm leading-6 text-muted-foreground">{node.summary}</p>
                      <Button size="sm" className="w-full bg-cyan-700 text-white hover:bg-cyan-800" onClick={openMarket}>
                        Explore market
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </MapPopup>
              </MapMarker>
            ))}
          </Map>
        </div>
      </div>
    </div>
  )
}
