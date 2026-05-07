"use client"

import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Handshake, LineChart, MapPinned, ShieldCheck, Sparkles, Sprout, Tractor, Trees } from "lucide-react"

import { formatCurrency } from "@/app/shop/lib/format"
import type { ShopItem } from "@/app/shop/types"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

export function FlagshipInvestmentPage({ item, onBack }: FlagshipInvestmentPageProps) {
  const config = flagshipConfigs[item.slug]
  const strategyHighlights = item.highlights?.slice(0, 6) ?? []
  const detailItems = item.detailSections?.flatMap((section) => section.items) ?? []
  const heroImage = item.imageGallery?.[1]?.url ?? item.imageGallery?.[0]?.url ?? item.image
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
    <div className={`flagship-investment-page ${config.moodClassName} space-y-10 rounded-[2.5rem] pb-12`}>
      <Button variant="ghost" onClick={onBack} className="mt-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to investments
      </Button>

      <section className="flagship-hero-shell relative overflow-hidden rounded-[2rem] border border-white/10">
        <div className="flagship-hero-orb absolute -left-16 top-8 h-40 w-40 rounded-full bg-white/8 blur-3xl" />
        <div className="flagship-hero-orb flagship-hero-orb-delayed absolute right-10 top-16 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
        <div className="flagship-hero-orb absolute bottom-6 right-[18%] h-20 w-20 rounded-full bg-white/7 blur-2xl" />
        <div className="absolute inset-0 bg-cover bg-center w-full scale-[1.02]" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="flagship-hero-overlay absolute inset-0" />
        <div className="flagship-hero-grid relative z-10 grid gap-10 px-6 py-8 md:px-10 md:py-12 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="flagship-draw-badge rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]">
                {config.eyebrow}
              </Badge>
              <Badge variant="outline" className="flagship-draw-badge rounded-full border-white/20 bg-white/8 px-3 py-1 text-white/85">
                {item.name}
              </Badge>
            </div>

            <div className="max-w-4xl space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-6xl">
                {config.headline}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/78 md:text-lg">
                {config.summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {heroMetrics.map((metric) => {
                const Icon = metric.icon

                return (
                  <div key={metric.label} className="flagship-frost-card flagship-interactive-card rounded-[1.5rem] p-4">
                    <div className="flagship-card-icon mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/55">{metric.label}</div>
                    <div className="mt-2 text-sm font-medium leading-6 text-white/90">{metric.value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flagship-hero-aside rounded-[1.75rem] p-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Managed path</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{config.premiumLabel}</h2>
                <p className="mt-3 text-sm leading-6 text-white/72">{config.premiumSummary}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="flagship-price-card flagship-interactive-card border-white/10 bg-white/6">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/55">From</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(config.monthlyPrice, item.currency)}</div>
                    <div className="mt-1 text-sm text-white/72">per month</div>
                  </CardContent>
                </Card>
                <Card className="flagship-price-card flagship-interactive-card border-white/10 bg-white/6">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/55">Or</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(config.yearlyPrice, item.currency)}</div>
                    <div className="mt-1 text-sm text-white/72">per year</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                {config.verificationPoints.map((point) => (
                  <div key={point} className="flex gap-3 rounded-2xl border border-white/10 bg-black/12 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    <p className="text-sm text-white/76">{point}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full">
                  <a href="#managed-path">
                    View managed path
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/6 text-white hover:bg-white/10 hover:text-white">
                  <a href="#diy-path">Build it yourself</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
            The flow
          </Badge>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight">A cleaner route from land to planted hectares.</h2>
          <p className="max-w-xl text-muted-foreground">
            We kept the structure simple: understand the land first, match the right species second, then choose whether you want a managed mandate or a self-directed path.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BentoTilt className="h-full">
            <Card className="flagship-story-card flagship-interactive-card h-full">
              <CardContent className="p-5">
                <div className="flagship-card-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Trees className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">What makes this different</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </BentoTilt>
          <BentoTilt className="h-full">
            <Card className="flagship-story-card flagship-interactive-card h-full">
              <CardContent className="p-5">
                <div className="flagship-card-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">What gets verified</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Land, counterparties, site logic, and execution structure all get pressure-tested before the program advances.
                </p>
              </CardContent>
            </Card>
          </BentoTilt>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <BentoTilt className="h-full">
        <Card className="flagship-step-card flagship-interactive-card h-full">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flagship-step-number">01</span>
              <div>
                <h3 className="text-2xl font-semibold">Land</h3>
                <p className="text-sm text-muted-foreground">Start with what you have or the type of site you want.</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Tell us about the land you already control, or use the verified pipeline to find land that fits the strategy before you spend on the wrong next step.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full">
                <a href="#contact">Describe your land</a>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href="/shop/forests-land/land-listings">Find verified land</a>
              </Button>
            </div>
          </CardContent>
        </Card>
        </BentoTilt>

        <BentoTilt className="h-full">
        <Card className="flagship-step-card flagship-interactive-card h-full">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flagship-step-number">02</span>
              <div>
                <h3 className="text-2xl font-semibold">Find the right commercial species</h3>
                <p className="text-sm text-muted-foreground">Match biology to site before capital starts moving.</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Species-site matching is where a lot of the upside or pain gets locked in. Use the matching flow to narrow the right species and planting system for your land.
            </p>
            <div className="mt-5">
              <Button asChild className="rounded-full">
                <a href="/shop/seedlings">Species-site-matching tool</a>
              </Button>
            </div>
          </CardContent>
        </Card>
        </BentoTilt>
      </section>

      <section id="managed-path" className="flagship-managed-shell rounded-[2rem] px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">Managed path</Badge>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight">Let us take over from here.</h2>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              This is the premium route for people who want exposure to the opportunity without having to stitch together every land, species, nursery, and field-operations decision themselves.
            </p>
            <div className="grid gap-3">
              {config.verificationPoints.map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl border border-border/70 bg-background/65 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BentoTilt className="h-full md:col-span-2">
            <Card className="flagship-managed-card flagship-interactive-card md:col-span-2">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-primary">Premium structure</div>
                    <h3 className="mt-2 text-2xl font-semibold">{config.premiumLabel}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{config.premiumSummary}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-primary px-5 py-4 text-primary-foreground">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary-foreground/75">Monthly</div>
                      <div className="mt-2 text-3xl font-semibold">{formatCurrency(config.monthlyPrice, item.currency)}</div>
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-background px-5 py-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Yearly</div>
                      <div className="mt-2 text-3xl font-semibold">{formatCurrency(config.yearlyPrice, item.currency)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </BentoTilt>

            <BentoTilt className="h-full">
            <Card className="flagship-managed-card flagship-interactive-card">
              <CardContent className="p-5">
                <div className="flagship-card-icon mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPinned className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Verified land logic</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Site context, access, and execution fit are screened before the planting thesis hardens.
                </p>
              </CardContent>
            </Card>
            </BentoTilt>

            <BentoTilt className="h-full">
            <Card className="flagship-managed-card flagship-interactive-card">
              <CardContent className="p-5">
                <div className="flagship-card-icon mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Verified counterparties</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Nurseries, contractors, and operating layers are selected for fit, not just availability.
                </p>
              </CardContent>
            </Card>
            </BentoTilt>
          </div>
        </div>
      </section>

      <section id="diy-path" className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
            Self-directed path
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight">Prefer to build it yourself?</h2>
          <p className="text-muted-foreground">
            You can still use the platform to progress step by step: source planting material, find field execution capacity, and move into a structured commercial arrangement.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {diySteps.map((step, index) => {
            const Icon = step.icon

            return (
              <BentoTilt key={step.title} className="h-full">
                <Card className="flagship-diy-card flagship-interactive-card h-full">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flagship-step-number">{`0${index + 3}`}</span>
                      <div className="flagship-card-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    <Button asChild variant="outline" className="mt-6 rounded-full">
                      <a href={step.href}>
                        {step.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </BentoTilt>
            )
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <BentoTilt className="h-full">
          <Card className="flagship-story-card flagship-interactive-card h-full">
            <CardContent className="p-6">
              <div className="flagship-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold">What investors should pay attention to</h2>
              <div className="mt-5 grid gap-3">
                {strategyHighlights.map((highlight) => (
                  <div key={highlight} className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">{highlight}</p>
                  </div>
                ))}
                {detailItems.slice(0, 3).map((entry) => (
                  <div key={entry} className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">{entry}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </BentoTilt>

        <BentoTilt className="h-full">
          <Card className="flagship-story-card flagship-interactive-card h-full">
            <CardContent className="p-6">
              <div className="flagship-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Handshake className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold">Ready to shape the mandate?</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                If you already know your land position or your investment budget, we can help you narrow the right route quickly.
              </p>
              <div className="mt-6 grid gap-3">
                <Button asChild className="rounded-full">
                  <a href="#contact">Talk to the investment team</a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href="/shop/forests-land/land-listings">Review land listings</a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href="/shop/seedlings">Browse planting material</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </BentoTilt>
      </section>
    </div>
  )
}
