"use client"

import { ArrowRight, MapPinned } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"

export function DiscoverySection() {
  return (
    <section id="discover" className={`relative overflow-hidden bg-muted/25 ${landingSectionPadding}`}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>Discover the sector</Badge>
          <h2 className={landingHeadingClass}>The East African forestry desk</h2>
          <p className={landingLeadClass}>
            Find the people, places and practical tools that move forestry from seed to finished timber.
          </p>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <ScrollReveal className="h-full" delay={80}>
            <a href="/shop/sector-map#market-concessions" className="group block h-full">
              <BentoTilt className="h-full">
                <article className="relative min-h-[360px] h-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <img src="/maps.jpg" alt="East African forestry sector map" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/52 to-black/15" />
                  <div className="relative flex h-full min-h-[360px] flex-col justify-between p-7 text-white sm:p-9">
                    <span className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/20 backdrop-blur"><MapPinned className="size-5" /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-200">Search by map</p>
                      <h3 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sector actor map</h3>
                      <p className="mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-base">See forestry actors, assets and market activity in their geographic context.</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Open the market map <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                    </div>
                  </div>
                </article>
              </BentoTilt>
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
