"use client"

import { Github } from "lucide-react"

import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"

const values = [
  {
    title: "Find the right planting material",
    href: "/shop/seedlings",
    image: "/forest.webp",
    description:
      "Access the right genetics, the right suppliers, and the right nurseries, backed by performance data you can interrogate and trust.",
  },
  {
    title: "Start a forestry investment",
    href: "#pricing",
    image: "/about.webp",
    description:
      "From battle-tested cashflow and geospatial analysis to site establishment, we connect projects to experienced contractors and proven systems while modelling outcomes before the first shilling goes in.",
  },
  {
    title: "Take your forestry product to market",
    href: "/shop/roundwood",
    image: "/greenbuilding.webp",
    description:
      "Hand-collected live market data from analysts on the ground committed to value chain performance optimization.",
  },
  {
    title: "Profit and start again!",
    href: "#features",
    image: "/drylands.webp",
    description:
      "Access strategies, models, and analysis used in real forestry trade applications so you can source and sell again with confidence.",
  },
] as const

export function AboutSection() {
  return (
    <section id="about" className={landingSectionPadding}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            About EA Forests
          </Badge>
          <h2 className={landingHeadingClass}>
            Who said money doesn&apos;t grow on trees!
          </h2>
          <p className={`${landingLeadClass} max-w-4xl`}>
            Serious profits are already being generated from forestry. The question is, are you a part of it?
            Whether you supply seedlings, operate planting crews, run a mill, trade assets, or are simply looking to make bank from land,
            we ensure you connect with the right people in the most informed way possible.
          </p>
        </ScrollReveal>

        <div className="mb-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => (
            <ScrollReveal key={value.title} className="h-full" delay={index * 90}>
              <a href={value.href} className="block h-full">
                <BentoTilt className="h-full">
                  <Card className="about-value-card group h-full overflow-hidden py-2 shadow-xs transition-all hover:-translate-y-1 hover:shadow-[0_6px_12px_rgba(16,185,129,0.28)]">
                    <div className="absolute inset-0">
                      <img
                        src={value.image}
                        alt=""
                        className="about-card-bg size-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="about-card-bg-overlay absolute inset-0" />
                    </div>
                    <CardContent className="relative z-10 p-8">
                      <div className="flex flex-col items-center text-center">
                        <h3 className="mt-6 text-lg font-bold text-white group-hover:underline sm:text-xl">
                          {value.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-white/80 sm:text-base">{value.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </BentoTilt>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-16 text-center" delay={120}>
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-muted-foreground">Built for real forestry investing</span>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="emerald-border-hover text-base cursor-pointer transition-all duration-300 hover:bg-tertiary/30 hover:text-emerald-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              <a href="https://github.com/JasonOyugi/EA-Forests.git" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                Star on GitHub
              </a>
            </Button>

            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a href="https://discord.com/invite/XEQhPc9a6p" className="group relative overflow-hidden">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  Join Community
                </span>
              </a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
