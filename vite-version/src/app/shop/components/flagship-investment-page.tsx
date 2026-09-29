"use client"

import { useEffect, useId, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import useEmblaCarousel from "embla-carousel-react"
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Handshake,
  Phone,
  Sprout,
  Tractor,
  Trees,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import type { ShopItem } from "@/app/shop/types"
import { SAMPLE_DASHBOARD_PATH } from "@/app/asset-intelligence-sample/paths"
import { AutoPlayVideo } from "@/components/auto-play-video"
import { WhatsAppIcon } from "@/components/brand-icons"
import { FocusedNav } from "@/components/layouts/focused-nav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { cn } from "@/lib/utils"
import { useEmblaWheelNavigation } from "@/app/landing/components/use-embla-wheel-navigation"

import "./flagship-investment-page.css"

interface FlagshipInvestmentPageProps {
  item: ShopItem
  onBack: () => void
}

/* ------------------------------------------------------------------ */
/* Footnotes                                                           */
/* ------------------------------------------------------------------ */

type FootnoteId = "remote-management" | "productivity"

const footnotes: { id: FootnoteId; text: string }[] = [
  {
    id: "remote-management",
    text: "Remote management excludes physical, on-the-ground forest operations such as silviculture and harvesting.",
  },
  {
    id: "productivity",
    text: "Typical ranges only. Actual figures depend heavily on site and variety, and are averaged over ideal rotation lengths.",
  },
]

const footnoteNumber = (id: FootnoteId) => footnotes.findIndex((note) => note.id === id) + 1

/** The first reference to each note is the one its back-link returns to. */
const footnoteBackRef: Record<FootnoteId, string> = {
  "remote-management": "offer",
  productivity: "hero",
}

function FootnoteRef({ id, refKey }: { id: FootnoteId; refKey: string }) {
  const n = footnoteNumber(id)

  return (
    <sup className="ip-fn-ref">
      <a id={`fnref-${id}-${refKey}`} href={`#fn-${id}`} aria-label={`Note ${n}`}>
        {n}
      </a>
    </sup>
  )
}

/* ------------------------------------------------------------------ */
/* Pathway configuration                                               */
/* ------------------------------------------------------------------ */

type OfferMetric = {
  label: string
  approx?: boolean
  amount: string
  unit: string
  footnote?: FootnoteId
}

type ManagedStage = {
  title: string
  bullets: string[]
}

type ProductivityMetric = {
  label: string
  value: string
}

type FlagshipTestimonial = {
  name: string
  role: string
  image: string
  quote: string
}

type FlagshipConfig = {
  /** Selects the pathway colour scheme (see flagship-investment-page.css). */
  pathway: "basic" | "improved" | "drylands"
  eyebrow: string
  headline: string
  summary: string
  heroImagePosition: string
  mapImage: string
  investorType: string
  averageIrrRange: string
  averageEbitdaMargin: string
  premiumLabel: string
  premiumSummary: string
  offerMetrics: [OfferMetric, OfferMetric]
  verificationPoints: string[]
  managedTitle: string
  managedSummary: string
  managedStages: ManagedStage[]
  forestProductivity: ProductivityMetric[]
  financialProductivity: ProductivityMetric[]
  testimonials: FlagshipTestimonial[]
}

const establishment = (amount: string): OfferMetric => ({
  label: "Establishment",
  approx: true,
  amount,
  unit: "/ ha",
})

const remoteManagement = (amount: string): OfferMetric => ({
  label: "Remote management",
  amount,
  unit: "/ ha / yr",
  footnote: "remote-management",
})

const coreForestTestimonials: FlagshipTestimonial[] = [
  {
    name: "Lydia Okello",
    role: "Family Office Principal, Uganda",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-1",
    quote: "Core Forests gave us the discipline we needed: clear land checks, practical establishment budgets, and a conservative yield case we could defend.",
  },
  {
    name: "Peter Mwangi",
    role: "Commercial Landowner, Kenya",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-1",
    quote: "The value was in the sequencing. We could see what happened before planting, during establishment, and through the first maintenance cycle.",
  },
  {
    name: "Hannah Reed",
    role: "Forestry Analyst, UK",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-2",
    quote: "It reads like a forestry product built for investment committees, with enough biological caution to make the return assumptions credible.",
  },
  {
    name: "Samuel Nyerere",
    role: "Operations Advisor, Tanzania",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-2",
    quote: "The strongest part is the operating cadence. Contractors, seedling quality, and survival monitoring are not treated as afterthoughts.",
  },
  {
    name: "Miriam Kato",
    role: "Portfolio Manager, Uganda",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-3",
    quote: "For first exposure to commercial forestry, this is the right level of ambition. It is measured, investable, and refreshingly concrete.",
  },
]

const highPerformanceTestimonials: FlagshipTestimonial[] = [
  {
    name: "Dr. Victor Mensah",
    role: "Forest Genetics Specialist, Ghana",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-3",
    quote: "The genetics-led approach is exactly where higher forestry returns begin. Site matching and nursery discipline make the upside more credible.",
  },
  {
    name: "Asha Njau",
    role: "Impact Investment Lead, Tanzania",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-4",
    quote: "This flagship turns technical forestry into a product investors can actually review. The growth thesis is clear without hiding execution risk.",
  },
  {
    name: "Elena Fischer",
    role: "Timber Fund Analyst, Germany",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-5",
    quote: "The premium case is persuasive because it connects genetics, field oversight, and market intelligence instead of treating them separately.",
  },
  {
    name: "Brian Otieno",
    role: "Plantation Operations Director, Kenya",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-4",
    quote: "High performance forestry only works when the field teams are precise. This structure puts that precision into the product design.",
  },
  {
    name: "Nuru Hamisi",
    role: "Private Markets Advisor, Tanzania",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-6",
    quote: "For capital looking beyond standard rotations, the monitoring and genotype story makes the opportunity feel sharper and more accountable.",
  },
]

const drylandFrontierTestimonials: FlagshipTestimonial[] = [
  {
    name: "Fatima Abdalla",
    role: "Restoration Finance Partner, Kenya",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-7",
    quote: "Dryland forestry needs humility and technical care. This flagship frames the opportunity with the climate risk and the upside in view.",
  },
  {
    name: "Joseph Kariuki",
    role: "Dryland Landowner, Kenya",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-5",
    quote: "The plan finally makes marginal land feel investable. It starts with survival, water stress, and species fit before talking about returns.",
  },
  {
    name: "Clara Bennett",
    role: "Nature Based Assets Researcher, UK",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-8",
    quote: "The frontier thesis is exciting because it is not generic restoration. It is a commercial pathway built around harsher site realities.",
  },
  {
    name: "Elias Mtei",
    role: "Agroforestry Specialist, Tanzania",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=male-6",
    quote: "Pairing resilient hardwood systems with adaptive management is the right instinct. The monitoring layer gives the model real credibility.",
  },
  {
    name: "Norah Wambui",
    role: "Climate Investor, Kenya",
    image: "https://notion-avatars.netlify.app/api/avatar?preset=female-9",
    quote: "This is the kind of dryland thesis we want to see: brave, but grounded in operations, climate checks, and practical downside controls.",
  },
]

const flagshipConfigs: Record<string, FlagshipConfig> = {
  // Basic
  "core-forests": {
    pathway: "basic",
    eyebrow: "Core Forests",
    headline: "The sure bet into commercial forestry.",
    summary:
      "New to forestry? Looking for biological assets with low-risk returns? Then this flagship is for you - put your money in a model proven over decades, with a safe, conservative and predictable approach",
    heroImagePosition: "center 62%",
    mapImage: "/maps/ke-topo.webp",
    investorType: "Conservative/new forestry investors",
    averageIrrRange: "12% - 16%",
    averageEbitdaMargin: "34% - 48%",
    premiumLabel: "A stress-free, profitable forestry investment",
    premiumSummary:
      "Invest, sit back and enjoy the ride. We structure everything: the land, genetics, nursery, contractors, and operating workflow for you, then run the program with conservative assumptions, regular reporting, and predictable outcomes.",
    offerMetrics: [establishment("USD 1,400"), remoteManagement("USD 3–5")],
    verificationPoints: [
      "Land diligence and site-fit screening before capital is committed",
      "Verified quality seedlings, nurseries and contractors coordinated on your behalf",
      "Practical reporting, milestone tracking, and conservative execution pacing",
    ],
    managedTitle: "We'll take over from here.",
    managedSummary:
      "Forestry can be tricky business, and initial missteps (be it wrong site preparation or seedling choice) can be expensive in years to come. We save you the headache by managing the entire operation with a focus on quality control and constant monitoring to let you focus on the investment.",
    managedStages: [
      {
        title: "We establish the assets",
        bullets: ["Site preparation", "Seedling purchase and procurement", "Planting and quality control"],
      },
      {
        title: "We manage the assets",
        bullets: ["1 year seedling survival buffer", "Weeding, pruning, and maintenance", "Fire breaks and quality assurance"],
      },
      {
        title: "We monitor and analyse your assets",
        bullets: ["Geospatial monitoring", "Ground truthing", "Market discovery"],
      },
    ],
    forestProductivity: [
      { label: "Rotation length", value: "10 - 14 years" },
      { label: "Volume/ha at rotation", value: "180 - 260 m³/ha" },
      { label: "Survival rate", value: "82% - 92%" },
      { label: "Some risks", value: "Low to moderate" },
    ],
    financialProductivity: [
      { label: "IRR", value: "12% - 16%" },
      { label: "EBITDA margin", value: "34% - 48%" },
      { label: "Risk adjusted NPV", value: "$1,500 - $4,000 / ha" },
      { label: "FCF", value: "$4,500 - $9,500 / ha" },
      { label: "Some risks", value: "Moderate" },
    ],
    testimonials: coreForestTestimonials,
  },
  // Improved
  "high-performance-forests": {
    pathway: "improved",
    eyebrow: "High-performance strategy",
    headline: "New and improved genetics for return-focused capital.",
    summary:
      "Plant the most globally elite genetics on your land, based on the most extensive and intensive regional tree improvement trial data.",
    heroImagePosition: "center 45%",
    mapImage: "/maps/ug-topo.webp",
    investorType: "Optimisation-focused investors",
    averageIrrRange: "17% - 24%",
    averageEbitdaMargin: "42% - 58%",
    premiumLabel: "Ready for premium, optimised forestry assets?",
    premiumSummary:
      "We leverage our deep connections to build the asset premium genetics, deeper monitoring, tighter contractor control, and advanced asset modelling built for sophisticated investors.",
    offerMetrics: [establishment("USD 1,900"), remoteManagement("USD 5")],
    verificationPoints: [
      "Enhanced species-site matching with genetics and performance considerations",
      "Tighter nursery and field-operations screening for premium deployment quality",
      "Structured monitoring, verification and evaluation based on live field data to keep execution aligned with the elite models",
    ],
    managedTitle: "Let us supercharge your forestry portfolio.",
    managedSummary:
      "This route is for capital that wants a more technical forestry asset for maximum returns. We coordinate genetics, field execution, monitoring, and market intelligence so the portfolio can pursue stronger growth curves with tighter control.",
    managedStages: [
      {
        title: "We deploy elite genetics",
        bullets: [
          "Advanced regional site-genotype matching",
          "Clonal and hybrid seedling procurement",
          "Asset modelling based on all regional trials",
        ],
      },
      {
        title: "We optimise field performance",
        bullets: [
          "Survival tracking and replanting buffers",
          "Pruning, weed control, and maintenance",
          "Continuous asset quality monitoring and contractor oversight",
        ],
      },
      {
        title: "We monitor growth and market fit",
        bullets: ["Geospatial performance monitoring", "Ground sampling and yield analysis", "Offtake and market discovery"],
      },
    ],
    forestProductivity: [
      { label: "Rotation length", value: "8 - 12 years" },
      { label: "Volume/ha at rotation", value: "240 - 360 m³/ha" },
      { label: "Survival rate", value: "80% - 90%" },
      { label: "Some risks", value: "Moderate" },
    ],
    financialProductivity: [
      { label: "IRR", value: "17% - 24%" },
      { label: "EBITDA margin", value: "42% - 58%" },
      { label: "Risk adjusted NPV", value: "$3,500 - $8,500 / ha" },
      { label: "FCF", value: "$7,500 - $16,000 / ha" },
      { label: "Some risks", value: "Moderate to high" },
    ],
    testimonials: highPerformanceTestimonials,
  },
  // Drylands
  "dryland-frontier-forests": {
    pathway: "drylands",
    eyebrow: "Frontier strategy",
    headline: "Pioneer innovation: Grow premium hardwoods in the drylands.",
    summary:
      "For the first time in history and globally, we can profitably grow commercial hardwoods in the drylands. This flagship is for investors who want to pioneer this frontier. Based on extensive R&D done in the Kenyan drylands, we develop the (potentially) most profitable forestry asset globally",
    heroImagePosition: "center 55%",
    mapImage: "/maps/tz-topo.webp",
    investorType: "Impact/innovative finance",
    averageIrrRange: "10% - 18%",
    averageEbitdaMargin: "26% - 44%",
    premiumLabel: "The most innovative and profitable forestry asset",
    premiumSummary:
      "We enable investors to participate in advanced forestry asset development - produce mahogany like hardwoods while participating in the fight against climate change.",
    offerMetrics: [establishment("USD 1,900"), remoteManagement("USD 5")],
    verificationPoints: [
      "The best dryland varieties for a wide range of markets",
      "Verified supply, contractor, and management based on extensive R&D and live field trials in the Kenyan drylands",
      "Adaptive oversight with climate-aware execution and reporting checkpoints",
    ],
    managedTitle: "Let us profitably restore the drylands together.",
    managedSummary:
      "You provide the investment. We coordinate the improved genetics sourcing, the agroforestry design, adaptive field execution, and climate-aware monitoring so you can grow the most coveted hardwoods and gum arabic in the world.",
    managedStages: [
      {
        title: "We structure resilient entry assets",
        bullets: ["Water-aware site screening", "Species shortlists for harsher conditions", "Planting layout and buffer design"],
      },
      {
        title: "We manage for survival first",
        bullets: ["Establishment survival buffers", "Weeding, fire breaks, and maintenance", "Adaptive field decisions as conditions shift"],
      },
      {
        title: "We monitor resilience and upside",
        bullets: [
          "Remote sensing and geospatial monitoring",
          "Ground truthing and stress analysis",
          "Market and climate scenario discovery",
        ],
      },
    ],
    forestProductivity: [
      { label: "Rotation length", value: "11 - 16 years" },
      { label: "Volume/ha at rotation", value: "120 - 220 m³/ha" },
      { label: "Survival rate", value: "68% - 84%" },
      { label: "Some risks", value: "Moderate to high" },
    ],
    financialProductivity: [
      { label: "IRR", value: "10% - 18%" },
      { label: "EBITDA margin", value: "26% - 44%" },
      { label: "Risk adjusted NPV", value: "$800 - $4,500 / ha" },
      { label: "FCF", value: "$3,000 - $10,000 / ha" },
      { label: "Some risks", value: "High" },
    ],
    testimonials: drylandFrontierTestimonials,
  },
}

/** Establish → manage → monitor is the same flow on every pathway, so the stage icons are shared. */
const stageIcons: { icon: LucideIcon; hoverIcon: LucideIcon }[] = [
  { icon: Sprout, hoverIcon: Trees },
  { icon: Handshake, hoverIcon: Tractor },
  { icon: TrendingUp, hoverIcon: Coins },
]

/** Same channels as the landing-page footer. */
const investmentTeamContacts = {
  call: "tel:+254700000000",
  text: "https://wa.me/254700000000",
}

/** Shared across all three pathways: how an asset becomes commercially legible. */
const valuationSteps = [
  {
    destination: "Markets",
    title: "Find the right partners",
    description: "We connect your forest to the buyers, operators and market opportunities that matter.",
    cta: "See the markets",
    href: "/landing#sector-map",
    // Feature 1, first 10 s: building → log truck → sawmill → log yard.
    video: "/investment/markets.mp4",
    poster: "/investment/markets.webp",
  },
  {
    destination: "Models",
    title: "Analyse it rigorously",
    description: "Transparent models turn biological, operational and market evidence into analysis you can act on.",
    cta: "Explore the models",
    href: "/models",
    // Feature 3, first 10 s: animated model tree.
    video: "/investment/models.mp4",
    poster: "/investment/models.webp",
  },
  {
    destination: "Asset Intelligence · sample",
    title: "See your asset live",
    description: "A living view of your forest, its performance and the decisions around it.",
    cta: "Open the sample dashboard",
    href: SAMPLE_DASHBOARD_PATH,
    // Feature 1, last 10 s: canopy, harvest and young stands.
    video: "/investment/asset-intelligence.mp4",
    poster: "/investment/asset-intelligence.webp",
  },
] as const

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}

function ProductivityTable({
  title,
  metrics,
  refKey,
  tone,
}: {
  title: string
  metrics: ProductivityMetric[]
  refKey: string
  tone: "light" | "dark"
}) {
  return (
    <div className="space-y-3">
      <h3 className={cn("ip-signal-pill", tone === "light" ? "ip-signal-pill--light" : "ip-signal-pill--dark")}>
        {title}
        <FootnoteRef id="productivity" refKey={refKey} />
      </h3>
      <div className="chart-card-running-boundary rounded-[1.85rem] p-[1.5px]" style={{ ["--chart-accent" as string]: "var(--ip-accent-400)" }}>
        <div className="ip-productivity p-6 sm:p-7">
          <dl className={cn("grid gap-4 sm:grid-cols-2", metrics.length > 4 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
            {metrics.map((metric) => (
              <div key={metric.label} className="py-1">
                <dt className="ip-productivity-label text-[0.68rem] uppercase tracking-[0.2em]">{metric.label}</dt>
                <dd className="mt-1 text-lg font-semibold">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

/** One primary action; the two ways to reach the team unfold beneath it. */
function InvestNowDisclosure() {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  return (
    <div
      className="w-full sm:w-[22rem]"
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false)
      }}
    >
      <Button
        type="button"
        size="lg"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((value) => !value)}
        className="group relative h-14 w-full cursor-pointer justify-between overflow-hidden rounded-[1.25rem] px-5 text-base"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full ip-shimmer transition-transform duration-900 group-hover:translate-x-[220%]" />
        <span className="relative z-10 inline-flex items-center gap-3">
          <Banknote aria-hidden="true" className="h-5 w-5" />
          Invest now
        </span>
        <ChevronDown aria-hidden="true" className={cn("relative z-10 h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
      </Button>

      <div
        id={panelId}
        className={cn("grid transition-[grid-template-rows,opacity] duration-300", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
        inert={!isOpen}
      >
        <div className="-mx-3 overflow-hidden px-3 pb-3">
          <div className="grid gap-2 pt-2">
            <a href={investmentTeamContacts.call} className="ip-contact-option">
              <span>Call the investment team</span>
              <Phone aria-hidden="true" className="h-5 w-5" />
            </a>
            <a href={investmentTeamContacts.text} target="_blank" rel="noopener noreferrer" className="ip-contact-option">
              <span>
                Text the investment team
                <span className="sr-only"> on WhatsApp (opens in a new tab)</span>
              </span>
              <WhatsAppIcon aria-hidden="true" className="h-5 w-5 text-[#25D366]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function FlagshipTestimonials({ testimonials }: { testimonials: FlagshipTestimonial[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: false,
    loop: true,
    skipSnaps: false,
  })
  const handleWheel = useEmblaWheelNavigation(emblaApi)

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)

    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi])

  if (!testimonials.length) return null

  return (
    <section id="flagship-testimonials" className="ip-surface ip-rule" aria-labelledby="testimonials-title">
      <div className="ip-container py-16 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="ip-badge badge-emerald-run">Testimonials</Badge>
            <h2 id="testimonials-title" className="ip-section-title mt-4">
              What the experts say
            </h2>
            <p className="ip-lead mt-4">
              Practical notes from investors, operators, and forestry specialists reviewing this flagship pathway.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous testimonial"
              onClick={() => emblaApi?.scrollPrev()}
              className="theme-primary-border-hover size-11 rounded-full border-primary/25 bg-transparent text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next testimonial"
              onClick={() => emblaApi?.scrollNext()}
              className="theme-primary-border-hover size-11 rounded-full border-primary/25 bg-transparent text-primary hover:bg-primary/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div ref={emblaRef} className="mt-10 overflow-hidden" onWheel={handleWheel}>
          <div className="-ml-4 flex py-2 sm:-ml-5">
            {testimonials.map((testimonial, index) => (
              <div key={`${testimonial.name}-${index}`} className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_62%] sm:pl-5 lg:flex-[0_0_36%]">
                <BentoTilt className="h-full" maxTilt={3}>
                  <Card className="flagship-premium-hover-card h-full shadow-none">
                    <CardContent className="flex h-full flex-col">
                      <div className="flex items-start gap-4">
                        <Avatar className="size-12 shrink-0 bg-muted">
                          <AvatarImage alt="" src={testimonial.image} loading="lazy" width="120" height="120" />
                          <AvatarFallback>{getInitials(testimonial.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground">{testimonial.name}</h3>
                          <span className="block text-sm tracking-wide text-muted-foreground">{testimonial.role}</span>
                        </div>
                      </div>
                      <blockquote className="mt-5 flex-1">
                        <p className="text-sm leading-7 text-muted-foreground">{testimonial.quote}</p>
                      </blockquote>
                    </CardContent>
                  </Card>
                </BentoTilt>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1">
          {testimonials.map((testimonial, index) => (
            <button
              key={`${testimonial.name}-dot`}
              type="button"
              aria-label={`Show testimonial ${index + 1}`}
              aria-current={selectedIndex === index ? "true" : undefined}
              onClick={() => emblaApi?.scrollTo(index)}
              className="ip-dot flex h-6 min-w-6 items-center justify-center px-1"
            >
              <span
                className={cn(
                  "block h-2.5 rounded-full transition-all duration-300",
                  selectedIndex === index ? "w-8 bg-primary" : "w-2.5 bg-primary/25 hover:bg-primary/45"
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function FlagshipInvestmentPage({ item }: FlagshipInvestmentPageProps) {
  const config = flagshipConfigs[item.slug]
  const heroImage =
    item.imageGallery?.[0]?.url ??
    item.image ??
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=900&fit=crop"

  const heroMetrics = [
    { label: "Suited for", value: config.investorType, icon: Banknote },
    { label: "Average IRR range", value: config.averageIrrRange, icon: TrendingUp },
    { label: "Average EBITDA margin", value: config.averageEbitdaMargin, icon: Coins, footnote: "productivity" as const },
  ]

  return (
    <div className="investment-page" data-pathway={config.pathway} style={{ "--investment-map-image": `url(${config.mapImage})` } as CSSProperties}>
      <FocusedNav />

      <main>
        {/* Hero — page surface over the map; the image takes the right half, down to the metric cards */}
        <section className="ip-surface ip-hero" aria-labelledby="investment-title">
          <div className="ip-container grid gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-16">
            <div className="flex flex-col">
              <ScrollReveal distance={16}>
                <Badge className="ip-badge ip-badge--solid badge-emerald-run">{config.eyebrow}</Badge>
                <h1 id="investment-title" className="ip-hero-title mt-5">
                  {config.headline}
                </h1>
                <p className="ip-lead mt-6 max-w-2xl">{config.summary}</p>
              </ScrollReveal>

              <ul className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-auto lg:pt-12">
                {heroMetrics.map((metric, index) => {
                  const Icon = metric.icon

                  return (
                    <li key={metric.label}>
                      <ScrollReveal className="h-full" delay={100 + index * 80}>
                        <BentoTilt className="h-full" maxTilt={2}>
                          <div className="flagship-premium-hover-card grid h-full grid-cols-[auto_1fr] items-center gap-x-4 p-3 sm:flex sm:flex-col sm:items-center sm:p-4 sm:text-center">
                            <div className="flagship-card-icon row-span-2 flex h-10 w-10 items-center justify-center bg-primary/15 text-primary sm:mb-3 sm:h-12 sm:w-12">
                              <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
                              {metric.label}
                              {metric.footnote ? <FootnoteRef id={metric.footnote} refKey="hero" /> : null}
                            </p>
                            <p className="ip-glow text-sm font-semibold leading-6 text-primary sm:mt-2">{metric.value}</p>
                          </div>
                        </BentoTilt>
                      </ScrollReveal>
                    </li>
                  )
                })}
              </ul>
            </div>

            <figure className="ip-hero-figure">
              <img
                src={heroImage}
                alt={`${item.name}: plantation stand`}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: config.heroImagePosition }}
                fetchPriority="high"
              />
            </figure>
          </div>
        </section>

        {/* Our offer — page surface over the map */}
        <section id="offer" className="ip-surface" aria-labelledby="offer-title">
          <div className="ip-container grid gap-10 py-16 lg:grid-cols-12 lg:gap-12 lg:py-24">
            <ScrollReveal className="lg:col-span-5" distance={16}>
              <Badge variant="outline" className="ip-badge badge-emerald-run">Our offer</Badge>
              <h2 id="offer-title" className="ip-section-title mt-4">
                {config.premiumLabel}
              </h2>
              <p className="ip-lead mt-5">{config.premiumSummary}</p>
            </ScrollReveal>

            <div className="space-y-6 lg:col-span-7">
              <ul className="grid gap-3 sm:grid-cols-2">
                {config.offerMetrics.map((metric) => (
                  <li key={metric.label}>
                  <BentoTilt className="h-full">
                    <div className="flagship-premium-hover-card flex h-full flex-col-reverse justify-end gap-2 p-5 sm:p-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                      <p className="ip-price">
                        {metric.approx ? (
                          <span className="ip-price-approx" aria-label="approximately">~</span>
                        ) : null}
                        <span className="ip-price-amount">{metric.amount}</span>{" "}
                        <span className="ip-price-unit">
                          {metric.unit}
                          {metric.footnote ? <FootnoteRef id={metric.footnote} refKey="offer" /> : null}
                        </span>
                      </p>
                    </div>
                  </BentoTilt>
                  </li>
                ))}
              </ul>

              <div>
                <h3 className="sr-only">What’s included</h3>
                <ul className="grid gap-3">
                  {config.verificationPoints.map((point) => (
                    <li key={point} className="flagship-premium-hover-card flex items-center gap-3 rounded-[1.35rem] p-2">
                      <div className="flagship-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <p className="text-sm leading-6 text-foreground">{point}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Premium investment — the page surface drops away and the map is revealed */}
        <section id="premium-investment" className="ip-map-band" aria-labelledby="premium-title">
          <div className="ip-container relative space-y-12 py-20 sm:py-24 lg:py-32">
            <ScrollReveal className="max-w-4xl space-y-4" distance={24}>
              <Badge className="ip-badge ip-badge--band flagship-premium-badge">Premium investment</Badge>
              <h2 id="premium-title" className="ip-section-title">
                {config.managedTitle}
              </h2>
              <p className="text-base leading-8 sm:text-lg">{config.managedSummary}</p>
            </ScrollReveal>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">What we manage for you</h3>
                <p className="ip-band-muted text-sm leading-6">
                  The managed path moves from setup to operations to intelligence. Each product shifts the details, but the flow stays clear.
                </p>
              </div>

              <ScrollReveal delay={120} distance={24}>
                <ol className="flagship-progression-shell group/progression flex items-stretch gap-4 overflow-x-auto pb-2">
                  {config.managedStages.map((stage, index) => {
                    const { icon: StageIcon, hoverIcon: HoverStageIcon } = stageIcons[index % stageIcons.length]

                    return (
                      <li key={stage.title} className="contents">
                        <BentoTilt className="min-w-[18.5rem] flex-1 basis-[18.5rem]" maxTilt={4}>
                          <div className="flagship-premium-hover-card ip-stage-card group/stage relative h-full p-5 sm:p-6">
                            <div className="relative z-10 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="text-xl font-semibold leading-tight">{stage.title}</h4>
                                <div className="flagship-card-icon relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/14">
                                  <StageIcon aria-hidden="true" className="absolute h-5 w-5 transition-all duration-500 [transform:rotateY(0deg)_scale(1)] group-hover/stage:[transform:rotateY(180deg)_scale(0.75)] group-hover/stage:opacity-0" />
                                  <HoverStageIcon aria-hidden="true" className="absolute h-5 w-5 scale-75 opacity-0 transition-all duration-500 [transform:rotateY(180deg)_scale(0.75)] group-hover/stage:[transform:rotateY(0deg)_scale(1)] group-hover/stage:opacity-100" />
                                </div>
                              </div>

                              <ul className="space-y-3">
                                {stage.bullets.map((bullet) => (
                                  <li key={bullet} className="flex gap-3 text-sm leading-6">
                                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </BentoTilt>

                        {index < config.managedStages.length - 1 ? (
                          <div
                            aria-hidden="true"
                            className="flagship-progress-arrow flex min-w-[3.75rem] items-center justify-center"
                            style={{ ["--progress-accent" as string]: "var(--ip-accent-400)", ["--progress-accent-soft" as string]: "color-mix(in srgb, var(--ip-accent-400) 26%, transparent)" } as CSSProperties}
                          >
                            <ArrowRight className="h-8 w-8" />
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </ScrollReveal>
            </div>

            <div className="grid gap-6 pt-2">
              <ScrollReveal delay={220} distance={24}>
                <ProductivityTable title="Forest productivity" metrics={config.forestProductivity} refKey="forest" tone="light" />
              </ScrollReveal>
              <ScrollReveal delay={310} distance={24}>
                <ProductivityTable title="Financial productivity at rotation" metrics={config.financialProductivity} refKey="financial" tone="dark" />
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* How we value your forest — the page surface covers the map again */}
        <section id="valuation" className="ip-surface" aria-labelledby="valuation-title">
          <div className="ip-container py-16 lg:py-24">
            <ScrollReveal className="max-w-3xl" distance={16}>
              <Badge variant="outline" className="ip-badge badge-emerald-run">From forest to asset</Badge>
              <h2 id="valuation-title" className="ip-section-title mt-4">
                How we value your forest
              </h2>
              <p className="ip-lead mt-5">
                A forest becomes valuable when the right people can find it, trust the numbers and follow how it performs.
              </p>
            </ScrollReveal>

            <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
              {valuationSteps.map((step, index) => (
                <li key={step.title} className="flex">
                  <ScrollReveal className="flex w-full" delay={index * 70} distance={16}>
                    <BentoTilt className="flex w-full" maxTilt={3}>
                      <Link to={step.href} className="flagship-premium-hover-card ip-value-card group relative flex min-h-[18rem] w-full flex-col justify-end overflow-hidden sm:min-h-[24rem] lg:min-h-[26rem]">
                        <AutoPlayVideo
                          src={step.video}
                          poster={step.poster}
                          loop
                          aria-hidden="true"
                          className="ip-value-image absolute inset-0 h-full w-full object-cover"
                        />
                        <span aria-hidden="true" className="ip-value-scrim absolute inset-0" />
                        <div className="relative z-10 flex flex-col p-6 sm:p-7">
                          <span className="ip-value-kicker text-[0.68rem] uppercase tracking-[0.18em]">{step.destination}</span>
                          <h3 className="ip-value-title mt-3 text-2xl font-semibold leading-tight tracking-tight">{step.title}</h3>
                          <p className="ip-value-copy mt-2 text-sm leading-6">{step.description}</p>
                          <span className="ip-value-cta mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                            {step.cta}
                            <ArrowRight aria-hidden="true" className="ip-value-arrow h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    </BentoTilt>
                  </ScrollReveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <FlagshipTestimonials testimonials={config.testimonials} />

        {/* Closing call to action */}
        <section className="ip-surface" aria-labelledby="cta-title">
          <div className="ip-container grid gap-8 py-16 lg:grid-cols-12 lg:items-start lg:py-20">
            <div className="lg:col-span-7">
              <h2 id="cta-title" className="ip-section-title">
                Ready to invest? Have more questions?
              </h2>
              <p className="ip-lead mt-4">
                Choose the fastest route from interest to action, whether you want to move capital now or talk through the mandate first.
              </p>
            </div>
            <div className="flex lg:col-span-5 lg:justify-end">
              <InvestNowDisclosure />
            </div>
          </div>
        </section>
      </main>

      {/* Lowbar on the live map: numbered notes */}
      <footer className="ip-map-footer" aria-labelledby="notes-title">
        <div className="ip-container pb-12 pt-20 sm:pb-16 sm:pt-28">
          <div className="max-w-3xl">
            <h2 id="notes-title" className="text-xs font-semibold uppercase tracking-[0.2em]">Notes</h2>
            <ol className="mt-3 space-y-2 text-xs leading-5 sm:text-sm sm:leading-6">
              {footnotes.map((note, index) => (
                <li key={note.id} id={`fn-${note.id}`} className="ip-fn flex gap-3">
                  <span className="w-4 shrink-0 font-semibold">{index + 1}</span>
                  <span>
                    {note.text}{" "}
                    <a href={`#fnref-${note.id}-${footnoteBackRef[note.id]}`} className="ip-fn-back" aria-label={`Back to reference ${index + 1}`}>
                      ↩
                    </a>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </footer>
    </div>
  )
}
