"use client"

import { useState, type CSSProperties } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Coins,
  Handshake,
  LineChart,
  MapPinned,
  PhoneCall,
  Play,
  Sprout,
  Tractor,
  TrendingUp,
  Trees,
  Video,
  type LucideIcon,
} from "lucide-react"

import { getFlagshipPricing } from "@/app/shop/lib/flagship-pricing"
import type { ShopItem } from "@/app/shop/types"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { cn } from "@/lib/utils"

interface FlagshipInvestmentPageProps {
  item: ShopItem
  onBack: () => void
}

type FlagshipStep = {
  stepNumber: string
  title: string
  description: string
  longDescription: string
  cta1: { label: string; href: string }
  cta2?: { label: string; href: string }
  image: string
  icon: LucideIcon
}

type ManagedStage = {
  stepNumber: string
  subtitle: string
  title: string
  bullets: string[]
  image: string
  icon: LucideIcon
  hoverIcon: LucideIcon
}

type ProductivityMetric = {
  label: string
  value: string
  note: string
}

type ProductivityCard = {
  label: string
  theme: "light" | "dark"
  disclaimer: string
  metrics: ProductivityMetric[]
}

type ResourceLink = {
  label: string
  href: string
  icon: LucideIcon
}

type FlagshipConfig = {
  eyebrow: string
  headline: string
  summary: string
  moodClassName: string
  heroOverlayClass: string
  stepOverlayClass: string
  managedOverlayClass: string
  premiumLabel: string
  premiumSummary: string
  monthlyPrice: number
  yearlyPrice: number
  averageIrrRange: string
  averageEbitdaMargin: string
  verificationPoints: string[]
  managedTitle: string
  managedSummary: string
  progressAccent: string
  progressAccentSoft: string
  stepCards: FlagshipStep[]
  managedStages: ManagedStage[]
  productivityCards: ProductivityCard[]
  resourceLinks: ResourceLink[]
}

const resourceLinks: ResourceLink[] = [
  { label: "Analysis", href: "#", icon: BarChart3 },
  { label: "Further reading", href: "#", icon: BookOpen },
  { label: "Blog + videos", href: "#", icon: Video },
]

const productivityDisclaimer =
  "Given as the typical ranges, but actual figure is highly variety/site dependent."

function createLocateSiteStep(image: string): FlagshipStep {
  const description =
    "Whether you own or need to source land, first use this step to pin-point and briefly describe the land you want to plant on to find which varieties are suitable for that site."

  return {
    stepNumber: "01",
    title: "Locate the site",
    description,
    longDescription: description,
    cta1: { label: "Site-species matching tool", href: "/shop/seedlings" },
    cta2: { label: "Find verified land", href: "/shop/forests-land/land-listings" },
    image,
    icon: MapPinned,
  }
}

function createProductivityCards(
  forestMetrics: ProductivityMetric[],
  financialMetrics: ProductivityMetric[]
): ProductivityCard[] {
  return [
    {
      label: "Forest productivity*",
      theme: "light",
      disclaimer: productivityDisclaimer,
      metrics: forestMetrics,
    },
    {
      label: "Financial productivity at rotation*",
      theme: "dark",
      disclaimer: productivityDisclaimer,
      metrics: financialMetrics,
    },
  ]
}

const diySteps = [
  {
    stepNumber: "03",
    title: "Find a nursery",
    description: "Shortlist nurseries with the right planting material, reliability, and fulfillment profile for your project.",
    icon: Sprout,
    href: "/shop/seedlings",
    cta: "Browse nurseries",
  },
  {
    stepNumber: "04",
    title: "Find a contractor",
    description: "Match your project with vetted field operators for establishment, maintenance, and site execution.",
    icon: Tractor,
    href: "/shop/forests-land#products-section",
    cta: "Find contractors",
  },
  {
    stepNumber: "05",
    title: "Resources",
    description: "Use the research stack before you commit capital: analysis, further reading, and blog or video updates.",
    icon: BookOpen,
    href: "#",
    cta: "Open resources",
    links: resourceLinks,
  },
] as const

const flagshipConfigs: Record<string, FlagshipConfig> = {
  "core-forests": {
    eyebrow: "Core Forests",
    headline: "The sure bet into commercial forestry.",
    summary:
      "New to forestry? Looking for biological assets with low-risk returns? Then this flagship is for you - put your money in a model proven over decades, with a safe, conservative and predictable approach",
    moodClassName: "flagship-page-core",
    heroOverlayClass: "bg-[linear-gradient(135deg,rgba(5,150,105,0.2),rgba(3,10,18,0.68)),linear-gradient(180deg,rgba(4,11,20,0.12),rgba(4,11,20,0.78))]",
    stepOverlayClass: "bg-[linear-gradient(135deg,rgba(4,10,18,0.82),rgba(6,14,24,0.72)),radial-gradient(circle_at_top_right,rgba(16,185,129,0.28),transparent_42%)]",
    managedOverlayClass: "bg-[linear-gradient(135deg,rgba(4,10,18,0.8),rgba(6,14,24,0.66)),radial-gradient(circle_at_top_right,rgba(16,185,129,0.26),transparent_40%)]",
    premiumLabel: "A stress-free, profitable forestry investment",
    premiumSummary:
      "Invest, sit back and enjoy the ride. We structure everything: the land, genetics, nursery, contractors, and operating workflow for you, then run the program with conservative assumptions, regular reporting, and predictable outcomes.",
    monthlyPrice: 200,
    yearlyPrice: 2180,
    averageIrrRange: "12% - 16%",
    averageEbitdaMargin: "34% - 48%",
    verificationPoints: [
      "Land diligence and site-fit screening before capital is committed",
      "Verified quality seedlings, nurseries and contractors coordinated on your behalf",
      "Practical reporting, milestone tracking, and conservative execution pacing",
    ],
    managedTitle: "We'll take over from here.",
    managedSummary:
      "Forestry can be tricky business, and initial missteps (be it wrong site preparation or seedling coice) can be expensive in years to come. We save you the headache by managing the entire operation with a focus on quality control and constant monitoring to let you focus on the investment.",
    progressAccent: "#34d399",
    progressAccentSoft: "rgba(52,211,153,0.26)",
    stepCards: [createLocateSiteStep("/ke.jpg")],
    managedStages: [
      {
        stepNumber: "01",
        subtitle: "From $2,000 / ha",
        title: "We establish the assets",
        bullets: [
          "Site preparation",
          "Seedling purchase and procurement",
          "Planting and quality control",
        ],
        image: "/forest.webp",
        icon: Sprout,
        hoverIcon: Trees,
      },
      {
        stepNumber: "02",
        subtitle: "From $1,000 / ha",
        title: "We manage the assets",
        bullets: [
          "1 year seedling survival buffer",
          "Weeding, pruning, and maintenance",
          "Fire breaks and quality assurance",
        ],
        image: "/eucalyptus.jpg",
        icon: Handshake,
        hoverIcon: Tractor,
      },
      {
        stepNumber: "03",
        subtitle: "Package exclusive",
        title: "We monitor and analyse your assets",
        bullets: [
          "Geospatial monitoring",
          "Ground truthing",
          "Market discovery",
        ],
        image: "/dashboard-light.png",
        icon: TrendingUp,
        hoverIcon: Coins,
      },
    ],
    productivityCards: createProductivityCards(
      [
        { label: "Rotation length", value: "10 - 14 years", note: "Typical commercial windows for conservative eucalyptus and pine portfolios." },
        { label: "Volume/ha at rotation", value: "180 - 260 m3/ha", note: "Depends on genetics, spacing, rainfall, and field execution quality." },
        { label: "Survival rate", value: "82% - 92%", note: "Indicative year-one establishment survival with standard maintenance buffers." },
        { label: "Some risks", value: "Low to moderate", note: "Fire, browsing pressure, contractor slippage, and harvest timing remain material." },
      ],
      [
        { label: "IRR", value: "12% - 16%", note: "Average range for conservative, managed commercial forestry projects." },
        { label: "EBITDA margin", value: "34% - 48%", note: "Indicative at full rotation before financing structure and corporate overhead." },
        { label: "Risk adjusted NPV", value: "$1,500 - $4,000 / ha", note: "Highly sensitive to mortality, discount rates, and realized stumpage prices." },
        { label: "FCF", value: "$4,500 - $9,500 / ha", note: "Typical harvest-window free cash flow under a conservative market case." },
        { label: "Some risks", value: "Moderate", note: "Price volatility, slower growth, and execution drift can compress realized cash flow." },
      ]
    ),
    resourceLinks,
  },
  "high-performance-forests": {
    eyebrow: "High-performance strategy",
    headline: "New and improved genetics for return-focused capital.",
    summary:
      "Plant the most globally elite genetics on your land, based on the most extensive and intensive regional tree improvement trial data.",
    moodClassName: "flagship-page-high-performance",
    heroOverlayClass: "bg-[linear-gradient(135deg,rgba(14,116,144,0.24),rgba(3,10,18,0.7)),linear-gradient(180deg,rgba(4,11,20,0.12),rgba(4,11,20,0.8))]",
    stepOverlayClass: "bg-[linear-gradient(135deg,rgba(5,12,24,0.84),rgba(7,16,28,0.74)),radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_42%)]",
    managedOverlayClass: "bg-[linear-gradient(135deg,rgba(5,12,24,0.8),rgba(7,16,28,0.68)),radial-gradient(circle_at_top_right,rgba(56,189,248,0.26),transparent_40%)]",
    premiumLabel: "Ready for premium, optimised forestry assets?",
    premiumSummary:
      "We leverage our deep connections to build the asset premium genetics, deeper monitoring, tighter contractor control, and advanced asset modelling built for sophisticated investors.",
    monthlyPrice: 500,
    yearlyPrice: 5650,
    averageIrrRange: "17% - 24%",
    averageEbitdaMargin: "42% - 58%",
    verificationPoints: [
      "Enhanced species-site matching with genetics and performance considerations",
      "Tighter nursery and field-operations screening for premium deployment quality",
      "Structured monitoring, verification and evaluation based on live field datato keep execution aligned with the elite models",
    ],
    managedTitle: "Let us supercharge your forestry portfolio.",
    managedSummary:
      "This route is for capital that wants a more technical forestry asset for maximum returns. We coordinate genetics, field execution, monitoring, and market intelligence so the portfolio can pursue stronger growth curves with tighter control.",
    progressAccent: "#38bdf8",
    progressAccentSoft: "rgba(56,189,248,0.26)",
    stepCards: [createLocateSiteStep("/about.webp")],
    managedStages: [
      {
        stepNumber: "01",
        subtitle: "Premium establishment",
        title: "We deploy elite genetics",
        bullets: [
          "Advanced regional site-genotype matching",
          "Clonal and hybrid seedling procurement",
          "Asset modelling based on all regional trials",
        ],
        image: "/about.webp",
        icon: Sprout,
        hoverIcon: Trees,
      },
      {
        stepNumber: "02",
        subtitle: "Intensive management",
        title: "We optimise field performance",
        bullets: [
          "Survival tracking and replanting buffers",
          "Pruning, weed control, and maintenance",
          "Continuous asset quality monitoring and contractor oversight",
        ],
        image: "/forest.webp",
        icon: Handshake,
        hoverIcon: Tractor,
      },
      {
        stepNumber: "03",
        subtitle: "Advanced analytics",
        title: "We monitor growth and market fit",
        bullets: [
          "Geospatial performance monitoring",
          "Ground sampling and yield analysis",
          "Offtake and market discovery",
        ],
        image: "/dashboard.png",
        icon: TrendingUp,
        hoverIcon: Coins,
      },
    ],
    productivityCards: createProductivityCards(
      [
        { label: "Rotation length", value: "8 - 12 years", note: "Shorter cycles are possible when elite genetics and tighter management hold." },
        { label: "Volume/ha at rotation", value: "240 - 360 m3/ha", note: "Requires stronger genotype-site matching and more disciplined silviculture." },
        { label: "Survival rate", value: "80% - 90%", note: "Higher-performance systems remain sensitive to site prep and early maintenance quality." },
        { label: "Some risks", value: "Moderate", note: "Genetics-site mismatch, execution intensity, and market timing can widen outcomes." },
      ],
      [
        { label: "IRR", value: "17% - 24%", note: "Average range for return-focused, technically managed forestry deployment." },
        { label: "EBITDA margin", value: "42% - 58%", note: "Indicative at full rotation when premium growth and yield assumptions hold." },
        { label: "Risk adjusted NPV", value: "$3,500 - $8,500 / ha", note: "Can move materially with mortality, capex control, and realized price mix." },
        { label: "FCF", value: "$7,500 - $16,000 / ha", note: "Typical harvest-window free cash flow under a stronger productivity case." },
        { label: "Some risks", value: "Moderate to high", note: "Higher upside comes with tighter execution, genetics, and price realization risk." },
      ]
    ),
    resourceLinks,
  },
  "dryland-frontier-forests": {
    eyebrow: "Frontier strategy",
    headline: "Pioneer innovation: Grow premium hardwoods in the drylands.",
    summary:
      "For the first time in history and globally, we can profitably grow commercial hardwoods in the drylands. This flagship is for investors who want to pioneer this frontier. Based on extensive R&D done in the Kenyan drylands, we develop the (potentially) most profitable forestry asset globally",
    moodClassName: "flagship-page-dryland",
    heroOverlayClass: "bg-[linear-gradient(135deg,rgba(217,119,6,0.24),rgba(3,10,18,0.72)),linear-gradient(180deg,rgba(4,11,20,0.14),rgba(4,11,20,0.82))]",
    stepOverlayClass: "bg-[linear-gradient(135deg,rgba(24,12,4,0.84),rgba(30,16,6,0.76)),radial-gradient(circle_at_top_right,rgba(245,158,11,0.3),transparent_42%)]",
    managedOverlayClass: "bg-[linear-gradient(135deg,rgba(24,12,4,0.82),rgba(30,16,6,0.7)),radial-gradient(circle_at_top_right,rgba(245,158,11,0.28),transparent_40%)]",
    premiumLabel: "The most innovative and profitable forestry asset",
    premiumSummary:
      "We enable investors to participate in advanced forestry asset development - produce mahogany like hardwoods while participating in the fight against climate change.",
    monthlyPrice: 720,
    yearlyPrice: 8040,
    averageIrrRange: "10% - 18%",
    averageEbitdaMargin: "26% - 44%",
    verificationPoints: [
      "The best dryland varieties for a wide range of markets",
      "Verified supply, contractor, and management based on extensive R&D and live field trials in the Kenyan drylands",
      "Adaptive oversight with climate-aware execution and reporting checkpoints",
    ],
    managedTitle: "Let us change the drylands profitably.",
    managedSummary:
      "You provide the investment. We coordinate the improved genetics sourcing, the agroforestry design, adaptive field execution, and climate-aware monitoring so you can grow the most coveted hardwoods and gum arabic in the world.",
    progressAccent: "#f59e0b",
    progressAccentSoft: "rgba(245,158,11,0.24)",
    stepCards: [createLocateSiteStep("/drylands.webp")],
    managedStages: [
      {
        stepNumber: "01",
        subtitle: "Frontier site triage",
        title: "We structure resilient entry assets",
        bullets: [
          "Water-aware site screening",
          "Species shortlists for harsher conditions",
          "Planting layout and buffer design",
        ],
        image: "/drylands.webp",
        icon: Sprout,
        hoverIcon: Trees,
      },
      {
        stepNumber: "02",
        subtitle: "Adaptive management",
        title: "We manage for survival first",
        bullets: [
          "Establishment survival buffers",
          "Weeding, fire breaks, and maintenance",
          "Adaptive field decisions as conditions shift",
        ],
        image: "/tz.jpg",
        icon: Handshake,
        hoverIcon: Tractor,
      },
      {
        stepNumber: "03",
        subtitle: "Climate intelligence",
        title: "We monitor resilience and upside",
        bullets: [
          "Remote sensing and geospatial monitoring",
          "Ground truthing and stress analysis",
          "Market and climate scenario discovery",
        ],
        image: "/dashboard-dark.png",
        icon: TrendingUp,
        hoverIcon: Coins,
      },
    ],
    productivityCards: createProductivityCards(
      [
        { label: "Rotation length", value: "11 - 16 years", note: "Longer cycles reflect harsher water balance and frontier-site constraints." },
        { label: "Volume/ha at rotation", value: "120 - 220 m3/ha", note: "Wide ranges are common where moisture, soils, and access vary sharply." },
        { label: "Survival rate", value: "68% - 84%", note: "Survival is especially sensitive to water stress and early adaptive maintenance." },
        { label: "Some risks", value: "Moderate to high", note: "Climate variability, fire exposure, and access constraints can shift outcomes quickly." },
      ],
      [
        { label: "IRR", value: "10% - 18%", note: "Average range for harder-site forestry with resilience-led operating assumptions." },
        { label: "EBITDA margin", value: "26% - 44%", note: "Indicative at full rotation once survival, logistics, and market channels stabilize." },
        { label: "Risk adjusted NPV", value: "$800 - $4,500 / ha", note: "Moves with discount rate, climate risk, harvest timing, and market realization." },
        { label: "FCF", value: "$3,000 - $10,000 / ha", note: "Typical harvest-window free cash flow where resilience assumptions hold." },
        { label: "Some risks", value: "High", note: "Climate stress, slower scale-up, and more variable logistics can hit terminal value." },
      ]
    ),
    resourceLinks,
  },
}

export function FlagshipInvestmentPage({ item, onBack }: FlagshipInvestmentPageProps) {
  const config = flagshipConfigs[item.slug]
  const pricing = getFlagshipPricing(item.slug)
  const strategyHighlights = item.highlights?.slice(0, 5) ?? []
  const detailItems = item.detailSections?.flatMap((section) => section.items) ?? []
  const attentionItems = [...strategyHighlights, ...detailItems].slice(0, 5)
  const heroImage =
    item.imageGallery?.[0]?.url ??
    item.imageGallery?.[1]?.url ??
    item.image ??
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=900&fit=crop"

  const [isAttentionPinned, setIsAttentionPinned] = useState(false)
  const [isAttentionHovered, setIsAttentionHovered] = useState(false)

  const isAttentionExpanded = isAttentionPinned || isAttentionHovered
  const heroImageOverlayStyle = {
    background:
      "linear-gradient(135deg, hsl(var(--primary) / 0.34), rgba(4,10,18,0.74) 52%, rgba(4,10,18,0.9) 100%), radial-gradient(circle at top right, hsl(var(--primary) / 0.22), transparent 42%)",
  } satisfies CSSProperties
  const stepImageOverlayStyle = {
    background:
      "linear-gradient(135deg, rgba(4,10,18,0.82), rgba(6,14,24,0.72)), radial-gradient(circle at top right, hsl(var(--primary) / 0.24), transparent 42%)",
  } satisfies CSSProperties
  const managedImageOverlayStyle = {
    background:
      "linear-gradient(135deg, rgba(4,10,18,0.8), rgba(6,14,24,0.7)), radial-gradient(circle at top right, hsl(var(--primary) / 0.22), transparent 40%)",
  } satisfies CSSProperties
  const managedStageSubtitles = pricing
    ? [
        `Establishment: ${pricing.yearlyLabel}`,
        `Maintenance: ${pricing.maintenanceYearlyLabel}`,
        "Package exclusive",
      ]
    : ["", "", "Package exclusive"]

  const heroMetrics = [
    {
      label: "Starting point",
      value: pricing?.startingMonthlyLabel ?? item.minimumPriceLabel ?? "",
      icon: LineChart,
    },
    {
      label: "Average IRR range",
      value: config.averageIrrRange,
      icon: TrendingUp,
    },
    {
      label: "Average EBITDA margin*",
      value: config.averageEbitdaMargin,
      icon: Coins,
    },
  ]

  return (
    <div className={`flagship-investment-page ${config.moodClassName} space-y-0 rounded-[2.5rem] pb-12 text-primary sm:pb-12 md:pb-16`}>
      <div className="border-b border-white/10 backdrop-blur">
        <Button variant="ghost" onClick={onBack} className="text-primary hover:text-emerald-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to investments
        </Button>
      </div>

      <section className="flagship-hero-section relative space-y-0 py-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-stretch">
          <div className="space-y-6">
            <ScrollReveal distance={24}>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge className="badge-emerald-run border border-emerald-500 bg-emerald-50 text-primary">
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

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-3">
              {heroMetrics.map((metric, index) => {
                const Icon = metric.icon

                return (
                  <ScrollReveal key={metric.label} delay={100 + index * 80}>
                    <BentoTilt className="h-full" maxTilt={2}>
                      <div className="flagship-premium-hover-card flagship-metric-card flex h-full flex-col items-center rounded-[1.25rem] p-4 text-center sm:rounded-[1.5rem]">
                        <div className="flagship-card-icon mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:h-12 sm:w-12">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="text-[0.65rem] uppercase tracking-[0.15em] text-primary/60 sm:text-xs sm:tracking-[0.2em]">
                          {metric.label}
                        </div>
                        <div className="mt-2 text-sm font-semibold leading-6 text-primary sm:text-base">{metric.value}</div>
                      </div>
                    </BentoTilt>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>

          <ScrollReveal delay={150} distance={24}>
            <div className="flagship-hero-aside group flex min-h-[24rem] flex-col justify-between rounded-[2rem] p-5 sm:min-h-[30rem] sm:p-8">
              <img
                src={heroImage}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div aria-hidden="true" className="absolute inset-0" style={heroImageOverlayStyle} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="flagship-premium-section px-4 py-6 sm:px-6 md:px-8">
        <ScrollReveal delay={150} distance={24}>
          <div className="flagship-managed-shell emerald-border-hover mx-auto max-w-7xl overflow-hidden rounded-[2rem]">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:p-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary/60">Our Offer</p>
                  <h2 className="text-2xl font-semibold text-primary-foreground sm:text-3xl">{config.premiumLabel}</h2>
                  <p className="max-w-2xl text-sm leading-7 text-primary/80 sm:text-base">{config.premiumSummary}</p>
                </div>

                <div className="grid gap-3 lg:grid-rows-3">
                  {config.verificationPoints.map((point) => (
                    <div key={point} className="flagship-premium-hover-card flex items-center gap-3 rounded-[1.35rem] p-2">
                      <div className="flagship-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary-foreground">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      <p className="text-sm leading-6 text-primary-foreground/82">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-rows-2">
                  <BentoTilt className="h-full">
                    <div className="flagship-premium-hover-card flagship-price-card rounded-[1.35rem] p-4 sm:p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary/60">From</div>
                      <div className="mt-3 text-2xl font-semibold text-primary sm:text-3xl">
                        {pricing?.monthlyLabel ?? ""}
                      </div>
                      <div className="mt-1 text-xs text-primary/70 sm:text-sm">establishment fee</div>
                    </div>
                  </BentoTilt>
                  <BentoTilt className="h-full">
                    <div className="flagship-premium-hover-card flagship-price-card rounded-[1.35rem] p-4 sm:p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-primary/60">Or</div>
                      <div className="mt-3 text-2xl font-semibold text-primary sm:text-3xl">
                        {pricing?.yearlyLabel ?? ""}
                      </div>
                      <div className="mt-1 text-xs text-primary/70 sm:text-sm">
                        maintenance: {pricing?.maintenanceYearlyLabel ?? ""}
                      </div>
                    </div>
                  </BentoTilt>
                </div>

                <div className="grid gap-3 pt-2 sm:grid-rows-2">
                  <Button className="h-full w-full cursor-pointer rounded-[1.35rem] p-0 text-base" asChild>
                    <a
                      href="#managed-path"
                      className="group relative flex min-h-[112px] w-full items-center justify-center overflow-hidden rounded-[1.35rem] px-4 py-5"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />

                      <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                        View managed path
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="emerald-border-hover h-full w-full cursor-pointer rounded-[1.35rem] p-0 text-base transition-all duration-300 hover:bg-secondary/20 hover:text-slate-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                  >
                    <a
                      href="#diy-path"
                      className="flex min-h-[112px] w-full items-center justify-center rounded-[1.35rem] px-4 py-5"
                    >
                      Build it yourself
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="investment-steps-section px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {config.stepCards.map((step, stepIndex) => {
            const StepIcon = step.icon

            return (
              <ScrollReveal key={step.stepNumber} delay={180 + stepIndex * 80} distance={24}>
                <BentoTilt className="h-full" maxTilt={5}>
                  <div className="flagship-premium-hover-card emerald-border-hover group relative overflow-hidden rounded-[2rem] p-6 text-secondary sm:p-8 lg:p-10">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-88 transition-transform duration-700 group-hover:scale-105 [filter:brightness(0.46)_saturate(0.78)]"
                    />
                    <div aria-hidden="true" className="absolute inset-0" style={stepImageOverlayStyle} />

                    <div className="relative z-10 flex items-start gap-4">
                      <div className="flagship-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/18 text-primary-foreground">
                        <StepIcon className="h-7 w-7" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(260px,0.62fr)] xl:items-center">
                          <div className="space-y-5">
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs font-bold tracking-[0.3em] text-secondary/80">{step.stepNumber}</div>
                                <div className="h-px flex-1 bg-gradient-to-r from-secondary/50 to-transparent" />
                              </div>

                              <h3 className="mt-1 text-2xl font-semibold text-secondary sm:text-3xl md:text-4xl">
                                {step.title}
                              </h3>
                            </div>

                            <p className="text-sm leading-7 text-secondary/80 sm:text-base">
                              {step.longDescription}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 xl:justify-center">
                            <Button className="h-auto w-full cursor-pointer rounded-full p-0 text-sm" asChild>
                              <a
                                href={step.cta1.href}
                                className="group relative flex min-h-[46px] items-center justify-center overflow-hidden rounded-full px-4 py-3"
                              >
                                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                                  {step.cta1.label}
                                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </span>
                              </a>
                            </Button>

                            {step.cta2 ? (
                              <Button
                                variant="outline"
                                asChild
                                className="emerald-border-hover h-auto w-full cursor-pointer rounded-full p-0 text-sm text-primary transition-all duration-300 hover:bg-secondary/20 hover:text-emerald-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                              >
                                <a
                                  href={step.cta2.href}
                                  className="flex min-h-[46px] items-center justify-center rounded-full px-4 py-3"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  {step.cta2.label}
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </BentoTilt>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section
        id="managed-path"
        className="managed-path-section relative isolate w-full overflow-hidden rounded-[2rem] px-4 py-12 sm:px-6 md:px-8 md:py-16"
      >
        <div aria-hidden="true" className="managed-path-hover-border absolute inset-0 rounded-[2rem]" />
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-96 [filter:brightness(0.12)_saturate(0.26)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={managedImageOverlayStyle}
        />

        <div className="relative z-10 mx-auto max-w-7xl space-y-12 text-secondary">
          <ScrollReveal distance={24}>
            <div className="max-w-3xl space-y-4">
              <Badge className="flagship-badge flagship-premium-badge rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Premium investment
              </Badge>
              <h2 className="text-4xl font-semibold text-primary sm:text-5xl md:text-6xl">{config.managedTitle}</h2>
              <p className="text-base leading-8 text-primary/85 sm:text-lg">{config.managedSummary}</p>
            </div>
          </ScrollReveal>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-primary-foreground">What we manage for you</h3>
              <p className="text-sm leading-6 text-primary/75">
                The managed path moves from setup to operations to intelligence. Each product shifts the details, but the flow stays clear.
              </p>
            </div>

            <ScrollReveal delay={120} distance={24}>
              <div className="flagship-progression-shell group/progression flex items-stretch gap-4 overflow-x-auto pb-2">
                {config.managedStages.map((stage, index) => {
                  const StageIcon = stage.icon
                  const HoverStageIcon = stage.hoverIcon
                  const stageSubtitle = managedStageSubtitles[index] ?? stage.subtitle

                  return (
                    <div key={stage.title} className="contents">
                      <BentoTilt className="h-full min-w-[18.5rem] flex-1 basis-[18.5rem]" maxTilt={4}>
                        <div
                          className={cn(
                            "flagship-premium-hover-card group/stage relative flex h-full min-h-[18.5rem] flex-col rounded-[1.75rem] p-6",
                            index === 0 && "border-slate-900/8 bg-[linear-gradient(135deg,rgba(248,250,252,0.96)_0%,rgba(209,250,229,0.84)_52%,rgba(5,150,105,0.84)_100%)] text-white shadow-[0_18px_44px_rgba(255,255,255,0.08)]",
                            index === 1 && "border-emerald-300/35 bg-[linear-gradient(135deg,rgba(240,253,244,0.9)_0%,rgba(52,211,153,0.7)_48%,rgba(5,150,105,0.96)_100%)] text-white",
                            index === 2 && "border-emerald-300/30 bg-[linear-gradient(135deg,rgba(5,150,105,0.96),rgba(16,185,129,0.92))] text-white shadow-[0_24px_54px_rgba(5,150,105,0.28)]"
                          )}
                        >
                          <div className="relative z-10 flex h-full flex-col">
                            <div
                              className={cn(
                                "flagship-card-icon absolute right-0 top-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden",
                                "bg-white/14 text-white"
                              )}
                            >
                              <StageIcon className="absolute h-5 w-5 transition-all duration-500 [transform:rotateY(0deg)_scale(1)] group-hover/stage:[transform:rotateY(180deg)_scale(0.75)] group-hover/stage:opacity-0" />
                              <HoverStageIcon className="absolute h-5 w-5 scale-75 opacity-0 transition-all duration-500 [transform:rotateY(180deg)_scale(0.75)] group-hover/stage:[transform:rotateY(0deg)_scale(1)] group-hover/stage:opacity-100" />
                            </div>

                            <div className="w-full space-y-4">
                              <p
                                className={cn(
                                  "pr-14 text-[0.7rem] uppercase tracking-[0.24em]",
                                  "text-emerald-50/90"
                                )}
                              >
                                {stageSubtitle}
                              </p>
                              <h4 className="text-xl font-semibold text-white">{stage.title}</h4>

                              <ul className="space-y-3">
                                {stage.bullets.map((bullet) => (
                                  <li
                                    key={bullet}
                                    className="flex gap-3 text-sm leading-6 text-white/88"
                                  >
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </BentoTilt>

                      {index < config.managedStages.length - 1 ? (
                        <div
                          aria-hidden="true"
                          className="flagship-progress-arrow flex min-w-[3.75rem] items-center justify-center"
                          style={
                            {
                              ["--progress-accent" as string]: "#34d399",
                              ["--progress-accent-soft" as string]:
                                "rgba(52,211,153,0.26)",
                            } as CSSProperties
                          }
                        >
                          <ArrowRight className="h-8 w-8" />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </ScrollReveal>
          </div>

          <div className="grid gap-6 pt-2 lg:grid-rows-2">
            {config.productivityCards.map((card, index) => (
              <ScrollReveal key={card.label} delay={220 + index * 90} distance={24}>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "flagship-signal-pill badge-emerald-run inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em]",
                        card.theme === "light"
                          ? "border-slate-900/15 bg-white text-slate-950"
                          : "border-white/15 bg-slate-950 text-white"
                      )}
                    >
                      {card.label}
                    </div>
                  </div>

                  <div
                    className="chart-card-running-boundary rounded-[1.85rem] p-[1.5px]"
                    style={{ ["--chart-accent" as string]: "#34d399" }}
                  >
                    <div
                      className={cn(
                        "rounded-[calc(1.85rem-1.5px)] p-6 sm:p-7",
                        card.theme === "light"
                          ? "bg-white text-slate-950 shadow-[0_20px_48px_rgba(255,255,255,0.08)]"
                          : "bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))] text-white shadow-[0_24px_52px_rgba(5,16,24,0.36)]"
                      )}
                    >
                      <div className={cn("grid gap-4", card.metrics.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-5")}>
                        {card.metrics.map((metric) => (
                          <div key={metric.label} className="py-1">
                            <p className={cn("text-[0.68rem] uppercase tracking-[0.2em]", card.theme === "light" ? "text-slate-500" : "text-white/55")}>
                              {metric.label}
                            </p>
                            <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="diy-path" className="diy-path-section border-t border-primary/10 px-4 py-12 sm:px-6 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl space-y-8">
          <ScrollReveal distance={24}>
            <div className="space-y-3">
              <Badge variant="outline" className="flagship-badge bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Prefer to try it yourself?
              </Badge>
              <h2 className="text-3xl font-semibold text-primary-foreground sm:text-4xl md:text-5xl">Consider a few steps</h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-3">
            {diySteps.map((step, index) => {
              const Icon = step.icon

              return (
                <ScrollReveal key={step.title} className="h-full" delay={80 + index * 70}>
                  <BentoTilt className="h-full" maxTilt={3}>
                    <div className="flagship-premium-hover-card h-full rounded-[1.5rem] p-6">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold tracking-[0.3em] text-primary">{step.stepNumber}</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-primary-foreground/35 to-transparent" />
                        <div className="flagship-card-icon flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                      </div>

                      <div className="mt-5 flex-1">
                        <h3 className="text-lg font-semibold text-primary-foreground">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-primary">{step.description}</p>
                      </div>

                      {"links" in step ? (
                        <div className="mt-6 space-y-3">
                          {step.links.map((link) => {
                            const LinkIcon = link.icon

                            return (
                              <Button
                                key={link.label}
                                asChild
                                variant="outline"
                                className="emerald-border-hover w-full rounded-full border-primary/25 bg-transparent text-primary transition-all duration-300 group-hover:border-primary/35 group-hover:bg-primary/15 group-hover:text-emerald-300 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.28)]"
                              >
                                <a href={link.href} className="justify-between">
                                  <span className="inline-flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" />
                                    {link.label}
                                  </span>
                                  <ArrowRight className="h-4 w-4" />
                                </a>
                              </Button>
                            )
                          })}
                        </div>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          className="emerald-border-hover mt-6 w-full rounded-full border-primary/25 bg-transparent text-primary transition-all duration-300 hover:border-primary/35 hover:bg-primary/15 hover:text-emerald-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.28)]"
                        >
                          <a href={step.href}>
                            {step.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </BentoTilt>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="highlights-cta-section border-t border-primary/10 px-4 py-12 sm:px-6 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <ScrollReveal distance={24}>
              <Button
                type="button"
                aria-expanded={isAttentionExpanded}
                onClick={() => setIsAttentionPinned((value) => !value)}
                onMouseEnter={() => setIsAttentionHovered(true)}
                onMouseLeave={() => setIsAttentionHovered(false)}
                className="flagship-premium-hover-card group block h-full w-full rounded-[1.75rem] p-6 text-left text-primary sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold text-primary sm:text-3xl">
                      What investors should pay attention to
                    </h2>
                  </div>

                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition-transform duration-300",
                      isAttentionExpanded ? "rotate-180" : "rotate-0"
                    )}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>

                <div
                  className={cn(
                    "grid overflow-hidden transition-all duration-300",
                    isAttentionExpanded ? "mt-6 grid-rows-[1fr] opacity-100" : "mt-2 grid-rows-[0fr] opacity-80"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3 pt-1">
                      {attentionItems.map((entry) => (
                        <div key={entry} className="rounded-[1.1rem] border border-primary/10 bg-primary/5 p-4">
                          <div className="flex gap-3">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/75" />
                            <p className="text-sm leading-6 text-primary">{entry}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Button>
            </ScrollReveal>

            <ScrollReveal delay={100} distance={24}>
              <div className="flagship-premium-hover-card h-full rounded-[1.75rem] p-6 sm:p-7">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-primary-foreground sm:text-3xl">Ready to invest? Have more questions?</h2>
                  <p className="text-sm leading-6 text-primary/85 sm:text-base">
                    Choose the fastest route from interest to action, whether you want to move capital now or talk through the mandate first.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    asChild
                    className="w-full rounded-[1.25rem] p-0 text-base"
                  >
                    <a
                      href="#contact"
                      className="group relative flex min-h-[64px] items-center justify-between overflow-hidden rounded-[1.25rem] px-5 py-4"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                      <span className="relative z-10 inline-flex items-center gap-3">
                        <span className="relative flex h-5 w-5 items-center justify-center">
                          <Banknote className="h-5 w-5 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
                          <CheckCircle2 className="absolute h-5 w-5 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                        </span>
                        Invest now
                      </span>
                      <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="emerald-border-hover w-full rounded-[1.25rem] p-0 text-base text-primary-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/15 hover:text-emerald-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.28)]"
                  >
                    <a
                      href="#contact"
                      className="group flex min-h-[64px] items-center justify-between rounded-[1.25rem] px-5 py-4"
                    >
                      <span className="inline-flex items-center gap-3 text-primary">
                        <span className="relative flex h-5 w-5 items-center justify-center">
                          <PhoneCall className="h-5 w-5 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
                          <CheckCircle2 className="absolute h-5 w-5 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                        </span>
                        Talk with investment team
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="border-t border-primary/10 px-4 py-6 text-sm text-primary/70 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          * Actual numbers depend highly on site and species and are averaged over ideal rotation lengths.
        </div>
      </section>
    </div>
  )
}
