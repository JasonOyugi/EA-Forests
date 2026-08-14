"use client"

import { useNavigate } from "react-router-dom"
import { ArrowUpRight, HeartPulse, Sparkles, Stethoscope } from "lucide-react"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ShopDefinition, ShopItem } from "@/app/shop/types"

interface DiabetesProgramsShopProps {
  shop: ShopDefinition
  inventory: ShopItem[]
}

const carePrograms = [
  { slug: "foundational-care", title: "Foundational Care", subtitle: "A steady, clinician-guided start for understanding your numbers and building habits that hold.", image: "/sug1.jpg", actionLabel: "From $49 per month" },
  { slug: "remission-program", title: "Remission Program", subtitle: "A focused path that brings nutrition, lifestyle, and clinical care into one deliberate plan.", image: "/mealplan.jpg", actionLabel: "From $149 per month" },
  { slug: "complete-metabolic-care", title: "Complete Metabolic Care", subtitle: "Connected support across glucose, weight, lifestyle, and remote monitoring.", image: "/diabetic1.jpg", actionLabel: "From $249 per month" },
] as const

export function DiabetesProgramsShop({ shop: _shop, inventory: _inventory }: DiabetesProgramsShopProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <section className="space-y-3 sm:space-y-4 md:space-y-5">
        <Card className="overflow-hidden border-primary/20 bg-card/50 py-0 shadow-[0_0_40px_hsl(var(--primary)/0.08)]">
          <CardContent className="space-y-4 pb-6 pt-6">
            {carePrograms.map((program, index) => (
              <BentoTilt key={program.slug} className="block" maxTilt={3}>
                <button type="button" onClick={() => navigate(`/programs/${program.slug}`)} className="group/card w-full overflow-hidden border border-primary/20 bg-background/60 text-left transition-all duration-300 hover:border-primary/55 hover:shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
                  <div className="relative h-56 overflow-hidden sm:h-64"><img src={program.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.06]" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,20,0.22),rgba(4,8,20,0.72)),linear-gradient(0deg,rgba(4,8,20,0.82),transparent_70%)]" /><div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5"><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-cyan-200">0{index + 1} / Care pathway</p><div className="mt-1 text-xl font-semibold text-white sm:text-2xl">{program.title}</div><div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/85">{program.actionLabel}</div></div><ArrowUpRight className="mb-1 h-5 w-5 shrink-0 text-white transition-transform duration-300 group-hover/card:-translate-y-1 group-hover/card:translate-x-1" /></div></div>
                  <div className="flex items-start gap-3 p-5">{index === 0 ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> : <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}<p className="text-sm leading-6 text-muted-foreground">{program.subtitle}</p></div>
                </button>
              </BentoTilt>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
