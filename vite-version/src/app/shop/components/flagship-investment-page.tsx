"use client"

import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Handshake, LineChart, MapPinned, ShieldCheck, Sparkles, Sprout, Tractor, Trees } from "lucide-react"

import { formatCurrency } from "@/app/shop/lib/format"
import type { ShopItem } from "@/app/shop/types"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

interface FlagshipInvestmentPageProps {
  item: ShopItem
  onBack: () => void
}

type FlagshipConfig = {
  eyebrow: string
  headline: string
  summary: string
  moodClassName: string
  premiumLabel: string
  premiumSummary: string
  monthlyPrice: number
  yearlyPrice: number
  verificationPoints: string[]
}

const flagshipConfigs: Record<string, FlagshipConfig> = {
  "core-forests": {
    eyebrow: "Core strategy",
    headline: "The dependable path into commercial forestry.",
    summary:
      "Built for investors who want disciplined land selection, sensible species choice, and a managed planting program that feels steady, legible, and professionally underwritten.",
    moodClassName: "flagship-page-core",
    premiumLabel: "Managed core mandate",
    premiumSummary:
      "We structure the land, species, nursery, contractor, and operating workflow for you, then run the program with conservative assumptions and regular reporting.",
    monthlyPrice: 420,
    yearlyPrice: 4680,
    verificationPoints: [
      "Land diligence and site-fit screening before capital is committed",
      "Verified nurseries and contractor matching coordinated on your behalf",
      "Practical reporting, milestone tracking, and conservative execution pacing",
    ],
  },
  "high-performance-forests": {
    eyebrow: "High-performance strategy",
    headline: "A sharper forestry engine for return-focused capital.",
    summary:
      "Designed around elite genetics, site-genotype matching, and a more ambitious operating model for investors who want better growth curves and richer field intelligence.",
    moodClassName: "flagship-page-high-performance",
    premiumLabel: "Managed performance mandate",
    premiumSummary:
      "We take over the deployment stack with premium genetics, deeper monitoring, tighter contractor control, and a reporting rhythm built for sophisticated investors.",
    monthlyPrice: 680,
    yearlyPrice: 7560,
    verificationPoints: [
      "Enhanced species-site matching with genetics and performance considerations",
      "Tighter nursery and field-operations screening for premium deployment quality",
      "Structured monitoring and verification to keep execution aligned with the thesis",
    ],
  },
  "dryland-frontier-forests": {
    eyebrow: "Frontier strategy",
    headline: "A more experimental forestry play for harder sites and bigger upside.",
    summary:
      "This route is for climate-aware capital comfortable with more complexity: tougher sites, resilient systems, stronger analytics, and higher execution sensitivity.",
    moodClassName: "flagship-page-dryland",
    premiumLabel: "Managed frontier mandate",
    premiumSummary:
      "We lead the full frontier program for you, from site triage and resilient species choice through field execution, adaptive management, and verification.",
    monthlyPrice: 720,
    yearlyPrice: 8040,
    verificationPoints: [
      "Dryland site screening and resilience-first operating assumptions",
      "Verified supply, contractor, and management layers chosen for tougher conditions",
      "Adaptive oversight with climate-aware execution and reporting checkpoints",
    ],
  },
}

const diySteps = [
  {
    title: "Find a nursery",
    description: "Shortlist nurseries with the right planting material, reliability, and fulfillment profile for your project.",
    icon: Sprout,
    href: "/shop/seedlings",
    cta: "Browse nurseries",
  },
  {
    title: "Find a contractor",
    description: "Match your project with vetted field operators for establishment, maintenance, and site execution.",
    icon: Tractor,
    href: "/shop/forests-land#products-section",
    cta: "Find contractors",
  },
  {
    title: "Make a deal",
    description: "Move into structured commercial discussions with enough context to negotiate from a position of strength.",
    icon: Handshake,
    href: "#contact",
    cta: "Open a mandate",
  },
] as const

// Step-by-step investment opportunity data structure
const investmentSteps = [
  {
    stepNumber: "01",
    title: "Describe Your Land",
    description: "Tell us about the land you already control, or use the verified pipeline to find land that fits the strategy before you spend on the wrong next step.",
    longDescription: "Whether you have existing land or need to source it, this step focuses on understanding site characteristics, location, and market potential. Our verification process ensures the land fits your investment thesis before capital deployment.",
    cta1: { label: "Describe your land", href: "#contact" },
    cta2: { label: "Find verified land", href: "/shop/forests-land/land-listings" },
    imagePosition: "left",
    image: "https://images.unsplash.com/photo-1575400659217-ce7a2f45b526?w=800&h=600&fit=crop",
    icon: MapPinned,
    tags: ["Site Assessment", "Land Verification", "Market Analysis"]
  },
  {
    stepNumber: "02",
    title: "Match Species to Site",
    description: "Species-site matching is where a lot of the upside or pain gets locked in. Use the matching flow to narrow the right species and planting system for your land.",
    longDescription: "This critical step determines your investment returns. We match elite genetics and site conditions to optimize growth curves. Our species-site matching tool provides field intelligence and performance projections for your specific location.",
    cta1: { label: "Species-site matching tool", href: "/shop/seedlings" },
    cta2: null,
    imagePosition: "right",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    icon: Sprout,
    tags: ["Genetic Selection", "Site Matching", "Performance Optimization"]
  }
]

export function FlagshipInvestmentPage({ item, onBack }: FlagshipInvestmentPageProps) {
  const config = flagshipConfigs[item.slug]
  const strategyHighlights = item.highlights?.slice(0, 6) ?? []
  const detailItems = item.detailSections?.flatMap((section) => section.items) ?? []
  const heroImage = item.imageGallery?.[0]?.url ?? item.imageGallery?.[1]?.url ?? item.image
  const heroMetrics = [
    {
      label: "Starting point",
      value: item.minimumPriceLabel ?? formatCurrency(item.price, item.currency),
      icon: LineChart,
    },
    {
      label: "Investment mode",
      value: item.featuredLabel ?? "Verified strategy",
      icon: ShieldCheck,
    },
    {
      label: "Best suited for",
      value: item.subtitle ?? "Structured forestry investors",
      icon: Sparkles,
    },
  ]

  return (
    <div className={`flagship-investment-page ${config.moodClassName} space-y-0 rounded-[2.5rem] pb-12 text-primary sm:pb-12 md:pb-16`}>
      {/* Header with Back Button */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-primary/80 backdrop-blur px-4 py-3 sm:px-6 md:px-8">
        <Button variant="ghost" onClick={onBack} className="text-primary-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to investments
        </Button>
      </div>

      {/* Hero Section */}
      <section className="flagship-hero-section relative space-y-6 px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16">
        <ScrollReveal distance={24}>
          <div className="max-w-4xl space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge className="flagship-badge flagship-badge-hero flagship-draw-badge rounded-full px-2 py-1 text-xs uppercase tracking-[0.18em] sm:px-3 sm:tracking-[0.24em]">
                {config.eyebrow}
              </Badge>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-primary sm:text-3xl md:text-5xl lg:text-6xl">
                {config.headline}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-primary sm:text-base sm:leading-8 md:text-lg">
                {config.summary}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Hero Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 max-w-4xl">
          {heroMetrics.map((metric, index) => {
            const Icon = metric.icon

            return (
              <ScrollReveal key={metric.label} delay={100 + index * 80}>
                <BentoTilt className="h-full" maxTilt={2}>
                  <div className="flagship-metric-card flagship-interactive-card rounded-[1rem] border border-primary/15 bg-primary/5 p-4 backdrop-blur sm:rounded-[1.5rem]">
                    <div className="flagship-card-icon mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-[0.15em] text-primary/60 sm:text-xs sm:tracking-[0.2em]">{metric.label}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-primary sm:text-base">{metric.value}</div>
                  </div>
                </BentoTilt>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      {/* Premium Mandate Card */}
      <section className="flagship-premium-section px-4 py-6 sm:px-6 md:px-8">
        <ScrollReveal delay={150} distance={24}>
          <BentoTilt className="h-full" maxTilt={3}>
            <div className="max-w-4xl rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/8 to-primary/4 backdrop-blur overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-primary/60">Managed path</p>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-primary-foreground">{config.premiumLabel}</h2>
                    <p className="text-sm sm:text-base leading-6 text-primary/80">{config.premiumSummary}</p>
                  
                  <div className="pt-4 space-y-3">
                    {config.verificationPoints.map((point) => (
                      <div key={point} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/70" />
                        <p className="text-sm leading-6 text-primary-foreground/80">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-primary/15 bg-primary/8 p-4 backdrop-blur">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary/60">From</div>
                      <div className="mt-2 text-2xl sm:text-3xl font-semibold text-primary-foreground">{formatCurrency(config.monthlyPrice, item.currency)}</div>
                      <div className="mt-1 text-xs sm:text-sm text-primary/70">per month</div>
                    </div>
                    <div className="rounded-xl border border-primary/15 bg-primary/8 p-4 backdrop-blur">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary/60">Or</div>
                      <div className="mt-2 text-2xl sm:text-3xl font-semibold text-primary-foreground">{formatCurrency(config.yearlyPrice, item.currency)}</div>
                      <div className="mt-1 text-xs sm:text-sm text-primary/70">per year</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button asChild className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/92 w-full sm:w-auto">
                      <a href="#managed-path">
                        View managed path
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                      <a href="#diy-path">Build it yourself</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </BentoTilt>
        </ScrollReveal>
      </section>

      {/* Hero Image Card */}
      <section className="px-4 py-8 sm:px-6 md:px-8">
        <ScrollReveal delay={130} distance={24}>
          <BentoTilt className="h-full" maxTilt={5}>
            <div className="rounded-[2.5rem] overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur h-96 sm:h-[28rem] md:h-96 lg:h-[400px] relative group">
              <img
                src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=900&fit=crop"
                alt="Forest investment"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent opacity-50 group-hover:opacity-60 transition-opacity duration-300" />
              <div className="absolute inset-0 rounded-[2.5rem] border border-primary/10 group-hover:border-primary/25 transition-colors duration-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                <p className="text-sm sm:text-base font-medium text-primary-foreground/90">Premium forestry investment opportunities tailored to your strategy</p>
              </div>
            </div>
          </BentoTilt>
        </ScrollReveal>
      </section>

      {/* Investment Steps - Mini Sections with Alternating Layout */}
      <section className="investment-steps-section space-y-0">
        {investmentSteps.map((step, stepIndex) => {
          const StepIcon = step.icon
          const isReverse = step.imagePosition === "right"
          const delay = 180 + stepIndex * 80

          return (
            <div
              key={step.stepNumber}
              className={`investment-step-row relative border-t border-white/5 px-4 py-12 sm:px-6 md:px-8 md:py-16 ${stepIndex === investmentSteps.length - 1 ? "border-b" : ""}`}
            >
              <div className={`grid gap-8 lg:gap-12 max-w-7xl mx-auto items-center ${isReverse ? "lg:grid-cols-[1fr_1fr]" : "lg:grid-cols-[1fr_1fr]"}`}>
                {/* Text Content */}
                <ScrollReveal
                  className={`order-2 ${isReverse ? "lg:order-2" : "lg:order-1"}`}
                  delay={delay}
                  distance={24}
                >
                  <div className="space-y-5">
                    {/* Step Number */}
                    <div className="flex items-center gap-3">
                      <div className="flagship-step-number text-sm font-bold">{step.stepNumber}</div>
                      <div className="flex-1">
                        <div className="h-0.5 w-8 bg-gradient-to-r from-primary-foreground to-transparent" />
                      </div>
                    </div>

                    {/* Step Title */}
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-primary-foreground">
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p className="text-sm sm:text-base leading-7 text-primary-foreground/80">
                      {step.longDescription}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {step.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="rounded-full border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground/80 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                      <Button
                        asChild
                        className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/92 w-full sm:w-auto"
                      >
                        <a href={step.cta1.href}>{step.cta1.label}</a>
                      </Button>
                      {step.cta2 && (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"
                        >
                          <a href={step.cta2.href}>{step.cta2.label}</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </ScrollReveal>

                {/* Image/Icon Content */}
                <ScrollReveal
                  className={`order-1 relative ${isReverse ? "lg:order-1" : "lg:order-2"}`}
                  delay={delay + 40}
                  distance={24}
                >
                  <BentoTilt className="h-full" maxTilt={6}>
                    <div className="h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/12 to-primary/6 backdrop-blur flex items-center justify-center relative group">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                      <div className="relative z-10 flex flex-col items-center justify-center space-y-4 text-center px-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/20 backdrop-blur flex items-center justify-center">
                          <StepIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                        </div>
                        <p className="text-xs uppercase tracking-widest text-primary-foreground font-bold">
                          Step {step.stepNumber}
                        </p>
                      </div>
                      <div className="absolute inset-0 rounded-2xl border border-primary/15 group-hover:border-primary/30 transition-colors duration-300 pointer-events-none" />
                    </div>
                  </BentoTilt>
                </ScrollReveal>
              </div>
            </div>
          )
        })}
      </section>

      <section id="managed-path" className="managed-path-section px-4 py-12 sm:px-6 md:px-8 md:py-16 border-t border-primary/10">
        <div className="max-w-7xl mx-auto space-y-12">
          <ScrollReveal distance={24}>
            <div className="space-y-4 max-w-3xl">
              <Badge className="flagship-badge flagship-badge-managed rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Premium service
              </Badge>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-primary-foreground">Let us take over.</h2>
              <p className="text-base sm:text-lg leading-8 text-primary/85">
                This is the premium route for investors who want exposure to the opportunity without assembling every land, species, nursery, and field-operations decision themselves. We handle the complexity so you harvest the returns.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-primary-foreground">What we manage for you</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: MapPinned, title: "Verified land logic", description: "Site context, access, and execution fit are screened before the planting thesis hardens. We ensure premium site selection." },
                { icon: Building2, title: "Verified counterparties", description: "Nurseries, contractors, and operating layers are selected for fit, not just availability. Only the best execution partners." },
                { icon: Trees, title: "Execution oversight", description: "Adaptive management, monitoring, and reporting ensure your deployment stays on mission. Real-time delivery assurance." },
              ].map((item, index) => {
                const Icon = item.icon

                return (
                  <ScrollReveal key={item.title} delay={90 + index * 70}>
                    <BentoTilt className="h-full" maxTilt={4}>
                      <div className="relative group rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur p-6 space-y-4 hover:border-primary/40 hover:from-primary/15 hover:to-primary/8 transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-foreground/0 via-transparent to-primary-foreground/0 group-hover:from-primary-foreground/5 group-hover:to-primary-foreground/0 transition-opacity duration-300 pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
                            <Icon className="h-7 w-7 text-primary-foreground" />
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-primary-foreground">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-primary">{item.description}</p>
                        </div>
                      </div>
                    </BentoTilt>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>

          <div className="pt-6">
            <ScrollReveal delay={300}>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative bg-primary rounded-2xl border border-primary/30 p-8 sm:p-10">
                  <div className="grid gap-6 md:grid-cols-3 text-center">
                    <div className="space-y-2">
                      <p className="text-sm uppercase tracking-wider text-primary-foreground font-semibold">Timeline</p>
                      <p className="text-2xl font-bold text-primary-foreground">12-24 mo</p>
                      <p className="text-xs text-primary-foreground/70">Field to harvest</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm uppercase tracking-wider text-primary-foreground font-semibold">Returns</p>
                      <p className="text-2xl font-bold text-primary-foreground">18-35%+</p>
                      <p className="text-xs text-primary-foreground/70">Annualized</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm uppercase tracking-wider text-primary-foreground font-semibold">Risk</p>
                      <p className="text-2xl font-bold text-primary-foreground">Managed</p>
                      <p className="text-xs text-primary-foreground/70">Professional oversight</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section id="diy-path" className="diy-path-section px-4 py-12 sm:px-6 md:px-8 md:py-16 border-t border-primary/10">
        <div className="max-w-7xl mx-auto space-y-8">
          <ScrollReveal distance={24}>
            <div className="space-y-3">
              <Badge variant="outline" className="flagship-badge flagship-badge-diy rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Alternative path
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-primary-foreground">Or build it yourself</h2>
              <p className="max-w-2xl text-base sm:text-lg leading-7 text-primary/85">
                You can still use the platform to progress step by step: source planting material, find field execution capacity, and move into a structured commercial arrangement.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-3">
            {diySteps.map((step, index) => {
              const Icon = step.icon

              return (
                <ScrollReveal key={step.title} className="h-full" delay={80 + index * 70}>
                  <BentoTilt className="h-full" maxTilt={3}>
                    <div className="rounded-xl border border-primary/15 bg-primary/8 backdrop-blur p-6 space-y-5 hover:border-primary/25 hover:bg-primary/10 transition-all duration-300 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flagship-step-number text-sm">0{index + 3}</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-primary-foreground">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-primary">{step.description}</p>
                      </div>
                      <Button asChild variant="outline" className="rounded-full border-primary/25 bg-transparent text-primary-foreground hover:bg-primary/15 hover:border-primary/35 w-full transition-all">
                        <a href={step.href}>
                          {step.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </BentoTilt>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Highlights & CTA Section */}
      <section className="highlights-cta-section px-4 py-12 sm:px-6 md:px-8 md:py-16 border-t border-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            <ScrollReveal distance={24}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-primary-foreground">What investors should pay attention to</h2>
                  <p className="text-sm sm:text-base leading-6 text-primary/85">
                    Key considerations and metrics that define successful forestry investments.
                  </p>
                </div>

                <div className="space-y-3">
                  {strategyHighlights.slice(0, 3).map((highlight) => (
                    <div key={highlight} className="flex gap-3 rounded-lg border border-primary/15 bg-primary/8 p-4 hover:border-primary/25 hover:bg-primary/10 transition-all">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary-foreground/70 shrink-0" />
                      <p className="text-sm leading-6 text-primary">{highlight}</p>
                    </div>
                  ))}
                  {detailItems.slice(0, 2).map((entry) => (
                    <div key={entry} className="flex gap-3 rounded-lg border border-primary/15 bg-primary/8 p-4 hover:border-primary/25 hover:bg-primary/10 transition-all">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary-foreground/70 shrink-0" />
                      <p className="text-sm leading-6 text-primary">{entry}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100} distance={24}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-primary-foreground">Ready to shape the mandate?</h2>
                  <p className="text-sm sm:text-base leading-6 text-primary/85">
                    If you already know your land position or your investment budget, we can help you narrow the right route quickly.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button asChild className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/92 w-full">
                    <a href="#contact" className="justify-center">
                      Talk to the investment team
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-primary/30 bg-transparent text-primary-foreground hover:bg-primary/15 hover:border-primary/35 w-full transition-all">
                    <a href="/shop/forests-land/land-listings" className="justify-center">
                      Review land listings
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-primary/30 bg-transparent text-primary-foreground hover:bg-primary/15 hover:border-primary/35 w-full transition-all">
                    <a href="/shop/seedlings" className="justify-center">
                      Browse planting material
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
