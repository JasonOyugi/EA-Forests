"use client"

import { ArrowRight, HeartPulse, PackageCheck, Sparkles, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { assetUrl, getAppUrl } from "@/lib/utils"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"

const teamMembers = [
  {
    name: "Hospital Supply Desk",
    role: "Procurement support",
    summary: "Coordinates dialysis, disinfectant, ICU, and wound-care supply requests for facility teams.",
    image: assetUrl("/KNH.webp"),
    icon: PackageCheck,
  },
  {
    name: "Nutrition Support",
    role: "Product guidance",
    summary: "Helps shoppers choose supplements and nutritional products around daily wellness goals.",
    image: assetUrl("/nutritionist1.jpg"),
    icon: HeartPulse,
  },
  {
    name: "Skin Care Support",
    role: "Personal care specialist",
    summary: "Guides topical care, moisturizer, serum, and skin support routines from the personal care shop.",
    image: assetUrl("/skin3.jpg"),
    icon: Sparkles,
  },
  {
    name: "Consultation Desk",
    role: "Care coordination",
    summary: "Routes consultations, sourcing questions, and order support to the right Prodigy team member.",
    image: assetUrl("/healthws.jpg"),
    icon: Stethoscope,
  },
]

export function TeamSection() {
  return (
    <section id="team" className={`section-map-shell relative overflow-hidden bg-muted/35 ${landingSectionPadding}`}>
      <div aria-hidden="true" className="section-map-bg absolute inset-0" />
      <div aria-hidden="true" className="section-map-tint absolute inset-0" />

      <div className={`${landingContainer} relative z-10`}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            Team
          </Badge>
          <h2 className={landingHeadingClass}>Care teams for each Prodigy pathway</h2>
          <p className={landingLeadClass}>
            Product guidance, facility supply support, and care coordination from one connected Prodigy team.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {teamMembers.map((member) => {
            const Icon = member.icon

            return (
              <ScrollReveal key={member.name} distance={18}>
                <BentoTilt maxTilt={5}>
                  <article className="group relative min-h-72 overflow-hidden rounded-lg border border-border/60 bg-background/45 text-white shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <img
                      src={member.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/42 to-black/10" />
                    <div className="relative flex min-h-72 flex-col justify-between p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/16 text-white backdrop-blur">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-2">
                        <Badge className="bg-white/16 text-white hover:bg-white/20">{member.role}</Badge>
                        <h3 className="text-xl font-semibold">{member.name}</h3>
                        <p className="text-sm leading-6 text-white/82">{member.summary}</p>
                      </div>
                    </div>
                  </article>
                </BentoTilt>
              </ScrollReveal>
            )
          })}
        </div>

        <ScrollReveal className="mt-10 flex justify-center" delay={120}>
          <Button size="lg" asChild>
            <a href={getAppUrl("/shop/wellness-products")} className="group relative overflow-hidden">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
              <span className="relative z-10 inline-flex items-center">
                Start with personal care
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </a>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  )
}
