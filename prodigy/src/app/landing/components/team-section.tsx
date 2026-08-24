"use client"

import { useRef } from "react"
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { assetUrl } from "@/lib/utils"
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
    summary: "Dialysis, disinfectant, ICU, and wound-care sourcing for hospitals and care facilities.",
    image: assetUrl("/products/cvc-kit.png"),
    icon: PackageCheck,
  },
  {
    name: "Nutrition & Wellness",
    role: "Product guidance",
    summary: "Practical guidance for supplements, nutritional shakes, and everyday wellness goals.",
    image: assetUrl("/nutritionist1.jpg"),
    icon: HeartPulse,
  },
  {
    name: "Personal Care",
    role: "Skin care support",
    summary: "Help choosing topical care, moisturisers, cleansers, and targeted skin-support products.",
    image: assetUrl("/skin3.jpg"),
    icon: Sparkles,
  },
  {
    name: "Care Coordination",
    role: "Customer support",
    summary: "Routes product questions and order enquiries to the right Prodigy specialist.",
    image: assetUrl("/healthws.jpg"),
    icon: Stethoscope,
  },
  {
    name: "Distribution & Regulatory",
    role: "Quality assurance",
    summary: "Supports compliant sourcing, quality-controlled warehousing, and reliable distribution.",
    image: assetUrl("/products/dialysafe-a.png"),
    icon: ShieldCheck,
  },
] as const

export function TeamSection() {
  const carouselRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: -1 | 1) => {
    const carousel = carouselRef.current
    if (!carousel) return

    carousel.scrollBy({
      left: direction * Math.max(carousel.clientWidth * 0.76, 280),
      behavior: "smooth",
    })
  }

  return (
    <section
      id="team"
      className={`section-map-shell relative scroll-mt-20 overflow-hidden bg-muted/35 ${landingSectionPadding}`}
    >
      <div aria-hidden="true" className="section-map-bg absolute inset-0" />
      <div aria-hidden="true" className="section-map-tint absolute inset-0" />

      <div className={`${landingContainer} relative z-10`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <ScrollReveal className={landingSectionIntro} distance={22}>
            <Badge variant="outline" className={landingBadgeClass}>Team</Badge>
            <h2 className={landingHeadingClass}>One team across every care pathway</h2>
            <p className={landingLeadClass}>
              Product guidance, facility supply support, and care coordination from a connected Prodigy team.
            </p>
          </ScrollReveal>

          <div className="flex gap-2" aria-label="Team carousel controls">
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => scroll(-1)} aria-label="Previous team profiles">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => scroll(1)} aria-label="Next team profiles">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Prodigy team profiles"
          tabIndex={0}
        >
          {teamMembers.map((member) => {
            const Icon = member.icon

            return (
              <article
                key={member.name}
                className="group relative min-h-80 shrink-0 basis-[84%] snap-start overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:basis-[48%] lg:basis-[32%] xl:basis-[24%]"
              >
                <img src={member.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/56 to-black/8" />
                <div className="relative flex min-h-80 flex-col justify-between p-5 text-white">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/18 text-emerald-300 backdrop-blur">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">{member.role}</Badge>
                    <h3 className="text-xl font-semibold">{member.name}</h3>
                    <p className="text-sm leading-6 text-white/78">{member.summary}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
