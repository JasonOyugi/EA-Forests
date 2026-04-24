"use client"

import { useNavigate } from "react-router-dom"
import { ArrowUpRight, Building2, Globe2, Trees } from "lucide-react"
import { RoundwoodTopBanner } from "@/components/commerce-ui/roundwood-top-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BentoTilt } from "@/components/ui/bento-tilt"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface RoundwoodShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

type MarketCard = {
  title: string
  subtitle: string
  image: string
  vendors: Array<{
    name: string
    focus: string
  }>
}

export function RoundwoodShop({ shop, inventory }: RoundwoodShopProps) {
  const navigate = useNavigate()
  const fallbackItem = inventory[0]

  const markets: MarketCard[] = [
    {
      title: "Carbon",
      subtitle: "Nature-based credit demand from project developers and climate buyers.",
      image: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1200&q=80",
      vendors: [
        { name: "Viridian Carbon Desk", focus: "Forward carbon offtake and project aggregation." },
        { name: "Canopy Climate Partners", focus: "Premium removals procurement for regional buyers." },
      ],
    },
    {
      title: "Roundwood",
      subtitle: "Structured channels for poles, pulpwood, and log buyers.",
      image: fallbackItem?.image ?? "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
      vendors: [
        { name: "TimberFlow Commodities", focus: "Utility poles and harvest-linked roundwood lots." },
        { name: "RidgeLine Pole Markets", focus: "Regional pole classes and processor demand." },
      ],
    },
    {
      title: "Sawn Timber",
      subtitle: "Value-added lumber channels for construction, furniture, and export supply.",
      image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=80",
      vendors: [
        { name: "East Africa Lumber Exchange", focus: "Construction-grade sawn timber programs." },
        { name: "Savanna Woodcraft Supply", focus: "Furniture and premium joinery buyers." },
      ],
    },
  ]

  const openMarket = () => {
    if (!fallbackItem) return
    navigate(`/shop/${shop.slug}/${fallbackItem.slug}`)
  }

  return (
    <div className="space-y-8">
      <RoundwoodTopBanner />

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {markets.map((market) => (
          <Card
            key={market.title}
            className="self-start border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50/70"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  {market.title === "Carbon" ? (
                    <Globe2 className="h-5 w-5" />
                  ) : market.title === "Roundwood" ? (
                    <Trees className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <CardTitle>{market.title}</CardTitle>
                  <CardDescription>{market.subtitle}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {market.vendors.map((vendor) => (
                <BentoTilt key={vendor.name} className="block">
                  <button
                    type="button"
                    onClick={openMarket}
                    className="w-full overflow-hidden rounded-2xl border border-cyan-200 bg-white/95 text-left transition hover:border-cyan-400 hover:bg-cyan-50"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={market.image}
                        alt={vendor.name}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
                            {market.title} Market
                          </div>
                          <div className="mt-1 text-lg font-semibold text-white">{vendor.name}</div>
                        </div>
                        <ArrowUpRight className="mb-1 h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm leading-6 text-slate-600">{vendor.focus}</p>
                    </div>
                  </button>
                </BentoTilt>
              ))}
              <Button className="w-full bg-cyan-700 text-white hover:bg-cyan-800" onClick={openMarket}>
                Explore {market.title.toLowerCase()} market
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
