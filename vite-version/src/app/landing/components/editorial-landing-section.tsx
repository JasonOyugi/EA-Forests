"use client"

import { ArrowRight, CalendarDays, Clock3, ExternalLink, MapPin, MapPinned, Play } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { MouseEvent } from "react"

import { ScrollReveal } from "@/components/ui/scroll-reveal"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import seedlingsInventory from "@/app/shop/data/seedlings.json"
import { normalizeSeedlingInventory } from "@/app/shop/data/nursery-data"
import type { ShopItem } from "@/app/shop/types"
import { editorialActionLabels, editorialSubsections } from "./editorial-actions"
import type { EditorialCategory } from "./editorial-actions"
import { landingContainer, landingDisplayHeadingClass } from "./landing-shared"
import { sectorMetrics, sectorPlayers } from "./sector-data"
import type { SectorMetric, SectorPlayer } from "./sector-data"

const normalizedSeedlingsInventory = normalizeSeedlingInventory(seedlingsInventory as ShopItem[])
const featuredSeedlings = normalizedSeedlingsInventory
  .filter((item) => item.tags.includes("featured"))
  .slice(0, 3)
const marketSeedlings = normalizedSeedlingsInventory.slice(0, 10)

type EditorialFocus = "metrics" | "players" | "products" | null

function formatProductUpdatedAt(value?: string) {
  if (!value) return "Not recorded"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

type Story = {
  title: string
  category: EditorialCategory
  image: string
  href: string
  updatedAt: string
  video?: string
  /** Sub-tag used for in-grid filtering (Information topics, Models groups). */
  topic?: string
  /** Optional ribbon shown over the card, e.g. "Coming soon" or "Live hub". */
  badge?: string
}

type EditorialVideo = {
  title: string
  previewSrc: string
  href: string
  uploadedAt: string
}

type EditorialEvent = {
  title: string
  date: string
  location: string
  organizer: string
  description: string
  href: string
}

const stories: Story[] = [
  { title: "Here's how forests make money in East Africa", category: "Models", image: "https://cdn.agriland.ie/uploads/2020/09/Image-source-Veon-2.jpg", href: "/articles/how-forests-make-money-east-africa", updatedAt: "12 Aug 2026" },
  { title: "Ready to sell your wood?", category: "Markets", image: "https://saforestryonline.co.za/wp-content/uploads/2025/07/The-John-Deere-2144G-tracked-swing-harvester-is-ideal-for-fast-growing-high-yield-plantations-scaled.jpg", href: "/shop/wood-markets-map", updatedAt: "11 Aug 2026" },
  { title: "The best planting material for East Africa", category: "Markets", image: "https://dryrocktreesnursery.com/cdn/shop/files/lodgepoletray.jpg?v=1759249757&width=1946", href: "/shop/seedlings", updatedAt: "10 Aug 2026" },
  { title: "The ultimate site-species analysis tool", category: "Models", image: "/tz.jpg", href: "/models/site-species-analysis", updatedAt: "9 Aug 2026", topic: "Genetic" },
  { title: "Start a forestry investment guaranteed to generate returns", category: "Investments", image: "/eucalyptus.jpg", href: "/shop/forests-land/core-forests", updatedAt: "8 Aug 2026" },
  { title: "Everything you need to know about clonal nursery business ", category: "Models", image: "https://eucalyptusclones.in/images/clonal-gallery-1.png", href: "/models/clonal-eucalyptus-nursery", updatedAt: "7 Aug 2026", topic: "Genetic" },
  { title: "Build a high-performance forest asset today", category: "Investments", image: "/about.webp", href: "/shop/forests-land/high-performance-forests", updatedAt: "6 Aug 2026" },
  { title: "Find a contractor", category: "Markets", image: "https://cdn.britannica.com/77/213177-138-0C119CB6/Overview-silviculture-lumber-industry.jpg", href: "/shop/forests-land", updatedAt: "5 Aug 2026" },
  { title: "The top nurseries in the world are looking for partnerships in East Africa. Is it you?", category: "Information", image: "https://www.totalenergygroup.com/wp-content/uploads/2018/08/greenhouse_interior.jpg", href: "/articles/nursery-partnerships-east-africa", updatedAt: "4 Aug 2026" },
  { title: "Model the forest before committing capital", category: "Models", image: "/apps.png", video: "/hero-3.mp4", href: "/models/model-2", updatedAt: "3 Aug 2026", topic: "Commercial" },
  { title: "It is time to restore the drylands profitably", category: "Investments", image: "/drylands.webp", href: "/shop/forests-land/drylands", updatedAt: "2 Aug 2026" },
  { title: "Join the people building the sector", category: "Information", image: "/contact-2.webp", href: "#contact", updatedAt: "1 Aug 2026" },

  // Models — Commercial group
  { title: "Map the roundwood value chain before you commit", category: "Models", image: "https://cdn.britannica.com/77/213177-138-0C119CB6/Overview-silviculture-lumber-industry.jpg", href: "/models/model-3", updatedAt: "14 Aug 2026", topic: "Commercial" },

  // Models — Genetic group (in development)
  { title: "Pine seed orchard model", category: "Models", image: "/tz.jpg", href: "/models/pine-seed-orchard", updatedAt: "14 Aug 2026", topic: "Genetic", badge: "Coming soon" },
  { title: "EA genetics power rankings", category: "Models", image: "https://eucalyptusclones.in/images/clonal-gallery-1.png", href: "/models/ea-genetics-power-rankings", updatedAt: "14 Aug 2026", topic: "Genetic", badge: "Coming soon" },

  // Models — Economic group (in development)
  { title: "East Africa forestry macro-economic model", category: "Models", image: "/eucalyptus.jpg", href: "/models/macro-economic-outlook", updatedAt: "14 Aug 2026", topic: "Economic", badge: "Coming soon" },

  // Information — duplicated weekly-newsletter stories, tagged by chapter
  { title: "How the US-Iran war is reshaping East African forestry", category: "Information", image: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA28mi8n.img?w=2048&h=1365&m=4&q=81", href: "/information/policy-regulation", updatedAt: "18 Aug 2026", topic: "Policy & Regulation" },
  { title: "The carbon markets are set to inject +$300m into Ethiopia's economy", category: "Information", image: "https://advocacy4oromia.org/wp-content/uploads/2014/06/landscape-around-dube-bute-in-the-oromia-region.jpg", href: "/information/finance-markets", updatedAt: "17 Aug 2026", topic: "Finance & Markets" },
  { title: "CAFI approves a new $22.65m private-sector finance facility", category: "Information", image: "https://files.nettsteder.regjeringen.no/wpuploads01/sites/543/2023/09/Yangambi-Research-Station-1500x1000-1.jpg", href: "/information/investments", updatedAt: "16 Aug 2026", topic: "Investments" },
  { title: "Genetic quality is moving into the regulatory system", category: "Information", image: "https://www.forestsnews.org/wp-content/uploads/2026/08/KT_251107_ICRAF_QTS_86352-1024x1536.jpg", href: "/information/genetics", updatedAt: "15 Aug 2026", topic: "Genetics" },
  { title: "The latest in geospatial intelligence for forestry", category: "Information", image: "https://eros.usgs.gov/doi-remote-sensing-activities/sites/default/files/public/USGS/Wu_lidar.png", href: "/information/technology", updatedAt: "14 Aug 2026", topic: "Technology" },

  // Information — live hub banners, one per topic
  { title: "Policy & Regulation live hub", category: "Information", image: "/maps.jpg", href: "/information/policy-regulation", updatedAt: "Updated continuously", topic: "Policy & Regulation", badge: "Live hub" },
  { title: "Finance & Markets live hub", category: "Information", image: "/greenbuilding.webp", href: "/information/finance-markets", updatedAt: "Updated continuously", topic: "Finance & Markets", badge: "Live hub" },
  { title: "Investments live hub", category: "Information", image: "/drylands.webp", href: "/information/investments", updatedAt: "Updated continuously", topic: "Investments", badge: "Live hub" },
  { title: "Genetics live hub", category: "Information", image: "/eucalyptus.jpg", href: "/information/genetics", updatedAt: "Updated continuously", topic: "Genetics", badge: "Live hub" },
  { title: "Technology live hub", category: "Information", image: "/about.webp", href: "/information/technology", updatedAt: "Updated continuously", topic: "Technology", badge: "Live hub" },
]

const editorialVideos: EditorialVideo[] = [
  { title: "How to earn money from eucalyptus plantations.", previewSrc: "/profit.mp4", href: "https://www.youtube.com/watch?v=pZ7zwi2LU5o", uploadedAt: "16 Jul 2024" },
  { title: "This Gene-Edited Tree Captures More CO2.", previewSrc: "/genetics.mp4", href: "https://www.youtube.com/watch?v=6OknnFuDQE8&t=104s", uploadedAt: "30 Jun 2022" },
  { title: "Portable Sawmill Demo | Wood-Mizer LT70 Super Hydraulic ", previewSrc: "/mill.mp4", href: "https://www.youtube.com/watch?v=GdHRBmweOTY", uploadedAt: "24 Sep 2025" },
  { title: "FAO: Forests and economies - forests mean business", previewSrc: "/vc.mp4", href: "https://www.youtube.com/watch?v=yEVeFWKyLqI", uploadedAt: "19 Feb 2026" },
]

const editorialEvents: EditorialEvent[] = [
  { title: "Global Legal & Sustainable Timber Forum 2026", date: "22-23 Sep 2026", location: "Macao SAR, China", organizer: "ITTO + IPIM", description: "A global timber-industry forum focused on resilient legal supply chains, trade, innovation, and market transformation.", href: "https://www.itto.int/events/2026/09/23/global_legal_sustainable_timber_forum_2026/" },
  { title: "International Hardwood Conference 2026", date: "5-6 Nov 2026", location: "Antwerp, Belgium", organizer: "European hardwood sector", description: "A concentrated view of international hardwood supply, demand, processing, regulation, and trade conditions.", href: "https://www.itto.int/events/2026/11/06/international_hardwood_conference_2026/" },
  { title: "62nd International Tropical Timber Council", date: "9-12 Nov 2026", location: "Yokohama, Japan", organizer: "ITTO", description: "The principal global policy meeting for the tropical timber economy, sustainable production, markets, and trade cooperation.", href: "https://www.itto.int/events/2026/11/14/62nd_session_of_the_international_tropical_timber_council_and_sessions_of_the_associated_committees/" },
  { title: "Dubai WoodShow 2027", date: "6-8 Apr 2027", location: "Dubai, UAE", organizer: "WoodShow Global", description: "The MENA region's B2B marketplace for timber, panels, engineered wood, machinery, buyers, distributors, and exporters.", href: "https://www.woodshowglobal.com/dubai" },
]

const editorialCategories: EditorialCategory[] = ["Information", "Markets", "Models", "Investments", "Videos", "Events"]
const initialVisibleStoryCount = 8

function StoryTile({ story, size }: { story: Story; size?: string }) {
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const lightRef = useRef<HTMLDivElement | null>(null)

  const handlePointerMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5
    const rotateX = relativeY * -10
    const rotateY = relativeX * 12
    const translateX = relativeX * 22
    const translateY = relativeY * 18

    if (mediaRef.current) {
      mediaRef.current.style.transitionDuration = "120ms"
      mediaRef.current.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${translateX}px, ${translateY}px, 34px) scale(1.12)`
    }
  }

  const resetPointerEffect = () => {
    if (mediaRef.current) {
      mediaRef.current.style.transitionDuration = "700ms"
      mediaRef.current.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0) scale(1.02)"
    }

    if (lightRef.current) lightRef.current.style.opacity = "0"
  }

  return (
    <a
      href={story.href}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointerEffect}
      className={`landing-story-card group relative block overflow-hidden bg-zinc-900 [perspective:1100px] transition-[width,height,transform] duration-500 ${size ?? ""}`}
    >
      {story.video ? (
        <video ref={(node) => { mediaRef.current = node }} src={story.video} poster={story.image} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" />
      ) : (
        <img ref={(node) => { mediaRef.current = node }} src={story.image} alt="" className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" loading="lazy" decoding="async" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10 transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />
      <div ref={lightRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300" />
      <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/75 backdrop-blur-sm sm:left-7 sm:top-7">
        <Clock3 className="size-3" /> Last updated: {story.updatedAt}
      </span>
      {story.badge ? (
        <span className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-emerald-100 backdrop-blur-sm sm:right-7 sm:top-7">
          {story.badge}
        </span>
      ) : null}
      <div className="landing-card-content absolute inset-x-0 bottom-0 z-10 translate-y-2 p-5 text-white transition-transform duration-500 group-hover:translate-y-0 sm:p-7 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">{story.category}{story.topic ? ` · ${story.topic}` : ""}</p>
        <h3 className="landing-story-title mt-3 font-semibold">{story.title}</h3>
        <span className="landing-card-action mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] transition-all duration-500">{editorialActionLabels[story.category]} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  )
}

function VideoTile({ video, size = "" }: { video: EditorialVideo; size?: string }) {
  return (
    <a href={video.href} target="_blank" rel="noopener noreferrer" className={`landing-story-card group relative block min-h-[320px] overflow-hidden bg-zinc-900 text-white ${size}`}>
      <video src={video.previewSrc} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
      <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
        <Clock3 className="size-3" /> Last updated: {video.uploadedAt}
      </span>
      <span className="absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
        <span className="grid size-14 place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-1 size-6 fill-white" />
        </span>
      </span>
      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">Video</p>
        <h3 className="landing-product-title mt-3 font-semibold">{video.title}</h3>
        <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] transition-colors group-hover:text-emerald-300">Watch now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  )
}

function EventTile({ event, size = "" }: { event: EditorialEvent; size?: string }) {
  return (
    <article className={`emerald-border-hover group flex min-h-[300px] flex-col justify-between border border-emerald-800/60 bg-emerald-950/55 p-6 text-emerald-50 sm:p-7 ${size}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-300"><CalendarDays className="size-4" /> {event.date}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-100/65"><MapPin className="size-3.5" /> {event.location}</span>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-emerald-300/80">{event.organizer}</p>
        <h3 className="text-2xl font-semibold text-white">{event.title}</h3>
        <p className="mt-3 text-sm leading-6 text-emerald-100/70">{event.description}</p>
        <a href={event.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-emerald-200 transition-colors hover:text-emerald-400">View event <ExternalLink className="size-3.5" /></a>
      </div>
    </article>
  )
}

function MetricTile({
  metric,
  size,
  onFocus,
}: {
  metric: SectorMetric
  size: string
  onFocus?: () => void
}) {
  return (
    <article
      className={`editorial-metric-tile emerald-border-hover group relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-zinc-950 to-emerald-950 p-6 text-white transition-all duration-500 sm:p-7 ${size}`}
      onDoubleClick={onFocus}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-12 -top-12 size-32 animate-pulse rounded-full bg-emerald-300/18 blur-[1px] [animation-duration:2.8s]" />
        <span className="absolute right-8 top-6 size-16 animate-pulse rounded-full bg-emerald-500/22 [animation-delay:350ms] [animation-duration:2.2s]" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 overflow-hidden opacity-40">
          <img
            src="/favicon-dark.png"
            alt=""
            className="h-full w-full object-cover object-left-top"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <p className="relative z-10 text-xs font-semibold uppercase tracking-[.2em] text-emerald-300">Sector in Numbers</p>
      <div className="relative z-10">
        <p className="landing-metric-value font-semibold tracking-[-.03em]">{metric.value}</p>
        <p className="mt-3 text-sm font-medium text-white/85">{metric.label}</p>
        <p className="mt-1 text-xs text-white/50">{metric.context}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <a
            href={metric.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.12em] text-emerald-200/75 transition-colors hover:text-white focus-visible:text-white"
            aria-label={`${metric.websiteLabel} for ${metric.label}`}
          >
            Explore <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </article>
  )
}

function PlayerTile({
  player,
  size,
  onFocus,
}: {
  player: SectorPlayer
  size: string
  onFocus?: () => void
}) {
  return (
    <article
      className={`landing-player-card group relative flex flex-col justify-between overflow-hidden border border-emerald-700/40 bg-zinc-950 p-6 text-white transition-all duration-500 hover:border-emerald-400 sm:p-7 ${size}`}
      onDoubleClick={onFocus}
    >
      <img
        src={player.image}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full scale-110 object-contain p-8 opacity-[.09] transition-all duration-700 group-hover:scale-100 group-hover:opacity-[.16]"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950/55 via-zinc-950/85 to-zinc-950" />
      <div className="relative flex items-center justify-between gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white p-2">
          <img src={player.image} alt="" className="size-full object-contain" loading="lazy" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300">{player.role}</span>
      </div>
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300/80">Key Players</p>
        <h3 className="landing-player-title mt-2 font-semibold">{player.name}</h3>
        <p className="mt-1 text-sm text-white/70">{player.organisation}</p>
        <p className="mt-2 text-xs text-white/50">{player.note}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <a
            href={player.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-emerald-200/80 transition-colors hover:text-white focus-visible:text-white"
            aria-label={`Visit ${player.name} website`}
          >
            Website <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}

function ProductTile({
  item,
  size,
  onFocus,
  compact = false,
}: {
  item: ShopItem
  size: string
  onFocus?: () => void
  compact?: boolean
}) {
  return (
    <article
      className={`landing-product-card group relative block overflow-hidden bg-zinc-900 transition-all duration-500 ${size}`}
      onDoubleClick={onFocus}
    >
      <img src={item.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10 transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />
      <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/75 backdrop-blur-sm">
        <Clock3 className="size-3" /> Last updated: {formatProductUpdatedAt(item.updatedAt)}
      </span>
      <div className="landing-card-content absolute inset-x-0 bottom-0 z-10 translate-y-2 p-5 text-white transition-transform duration-500 group-hover:translate-y-0 sm:p-7 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">Planting | {item.species}</p>
        <h3 className={`landing-product-title mt-3 font-semibold ${compact ? "landing-product-title--compact" : ""}`}>{item.name}</h3>
        <p className="mt-2 text-sm font-medium text-white/80">
          {item.priceAvailable === false ? "Price on request" : `Starting from $${item.price.toFixed(2)} ${item.unitLabel}`}
        </p>
        <a href={`/shop/seedlings/${item.slug}`} className="landing-card-action mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] transition-all duration-500">Shop now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></a>
      </div>
    </article>
  )
}

function MetricPair({ metrics, size, onFocus }: { metrics: SectorMetric[]; size: string; onFocus: () => void }) {
  return (
    <div className={`landing-metric-pair grid grid-rows-2 gap-2 ${size}`}>
      {metrics.map((metric) => (
        <MetricTile key={metric.label} metric={metric} size="min-h-0" onFocus={onFocus} />
      ))}
    </div>
  )
}

export function SectorSearchSection() {
  return (
    <section id="discover" className="bg-[#07110c] py-16 text-emerald-50 sm:py-20 lg:py-24">
      <div className={landingContainer}>
        <ScrollReveal className="grid items-stretch" delay={80}>
          <a href="/shop/sector-map#market-concessions" className="emerald-border-hover group relative min-h-[26rem] overflow-hidden bg-zinc-900 p-5 text-white sm:min-h-[32rem] lg:min-h-[38rem]">
            <img src="/maps.jpg" alt="East African forestry sector map" className="absolute inset-0 size-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-zinc-950/72 to-black/25" />
            <div className="relative flex min-h-[23.5rem] flex-col justify-between sm:min-h-[28.5rem] lg:min-h-[34.5rem]">
              <div className="flex items-center justify-between gap-6 text-xs font-semibold uppercase tracking-[.22em] text-white/70">
                <span>Explore the ecosystem</span>
                <MapPinned className="size-7 text-emerald-200 sm:size-8" />
              </div>
              <div className="">
                <h2 className={`${landingDisplayHeadingClass} text-white`}>The map of the sector</h2>
                <div className="mt-7 grid gap-5 border-t border-white/35 pt-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
                  <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">Explore the people, assets and market activity behind the region&apos;s forestry value chain.</p>
                  <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[.15em] lg:justify-self-end">Open map <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" /></span>
                </div>
              </div>
            </div>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

export function EditorialBriefSection() {
  const [visibleCount, setVisibleCount] = useState(initialVisibleStoryCount)
  const [activeCategory, setActiveCategory] = useState<EditorialCategory | "All">("All")
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState<EditorialFocus>(null)
  const [bannerVisible, setBannerVisible] = useState(true)
  const filteredStories = activeCategory === "All" || activeCategory === "Videos" || activeCategory === "Events"
    ? stories
    : stories.filter((story) => story.category === activeCategory && (!activeTopic || story.topic === activeTopic))
  const visibleStories = filteredStories.slice(0, visibleCount)

  useEffect(() => {
    const handleEditorialFilter = (event: Event) => {
      const detail = (event as CustomEvent<EditorialCategory | { category: EditorialCategory; topic?: string }>).detail
      const category = typeof detail === "string" ? detail : detail.category
      const topic = typeof detail === "string" ? null : detail.topic ?? null
      if (!editorialCategories.includes(category)) return
      setActiveCategory(category)
      setActiveTopic(topic)
      setVisibleCount(initialVisibleStoryCount)
      setFocusMode(null)
    }

    window.addEventListener("editorial:filter", handleEditorialFilter)
    return () => window.removeEventListener("editorial:filter", handleEditorialFilter)
  }, [])

  const selectCategory = (category: EditorialCategory | "All") => {
    setActiveCategory(category)
    setActiveTopic(null)
    setVisibleCount(initialVisibleStoryCount)
    setFocusMode(null)
  }

  const selectTopic = (category: EditorialCategory, topic: string) => {
    setActiveCategory(category)
    setActiveTopic(topic)
    setVisibleCount(initialVisibleStoryCount)
    setFocusMode(null)
  }

  const toggleFocus = (nextMode: Exclude<EditorialFocus, null>) => {
    setFocusMode((currentMode) => currentMode === nextMode ? null : nextMode)
  }

  return (
    <section id="brief" className="bg-[#07110c] pb-20 text-emerald-50 sm:pb-24 lg:pb-28">
      <div className={landingContainer}>

        <ScrollReveal className="mb-8 flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-10 md:flex-wrap md:overflow-visible md:pb-0" delay={40}>
          <button
            type="button"
            onClick={() => selectCategory("All")}
            aria-pressed={activeCategory === "All"}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-[.12em] transition-colors ${activeCategory === "All" ? "border-emerald-400 bg-emerald-500 text-emerald-950" : "border-emerald-900 bg-emerald-950/70 text-emerald-100 hover:border-emerald-400 hover:text-emerald-300"}`}
          >
            All
          </button>
          {editorialCategories.map((category) => (
            <CategoryPill
              key={category}
              category={category}
              isActive={activeCategory === category}
              onSelect={() => selectCategory(category)}
              onSelectTopic={(topic) => selectTopic(category, topic)}
            />
          ))}
        </ScrollReveal>

        <div className="editorial-grid-transition" key={`${activeCategory}-${focusMode ?? "mixed"}`}>
          {focusMode ? (
            <div className="editorial-focus-surface rounded-[2rem] border border-emerald-400/20 p-3 sm:p-5 lg:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1 text-emerald-50">
                <p className="text-xs font-semibold uppercase tracking-[.2em]">
                  {focusMode === "metrics" ? "Sector in numbers" : focusMode === "players" ? "Sector actors" : "Markets / Seed & seedling shop"}
                </p>
                <p className="text-xs text-emerald-100/60">Double-click any card to return to the editorial mosaic</p>
              </div>
              <div className={`grid gap-2 ${focusMode === "products" ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {focusMode === "metrics" ? sectorMetrics.map((metric) => (
                  <MetricTile key={metric.label} metric={metric} size="min-h-[280px]" onFocus={() => toggleFocus("metrics")} />
                )) : null}
                {focusMode === "players" ? sectorPlayers.map((player) => (
                  <PlayerTile key={player.name} player={player} size="min-h-[320px]" onFocus={() => toggleFocus("players")} />
                )) : null}
                {focusMode === "products" ? marketSeedlings.map((item) => (
                  <ProductTile key={item.id} item={item} size="min-h-[360px]" compact onFocus={() => toggleFocus("products")} />
                )) : null}
              </div>
            </div>
          ) : (
            <div key={activeCategory} className="editorial-mosaic-grid grid grid-cols-1 gap-2 xl:grid-cols-12 xl:[grid-auto-flow:dense]">
            {activeCategory === "All" ? (
              <>
                <StoryTile story={visibleStories[0]} size="xl:col-span-9 xl:row-span-[48]" />
                <MetricPair metrics={sectorMetrics.slice(0, 2)} size="xl:col-span-3 xl:row-span-[48]" onFocus={() => toggleFocus("metrics")} />

                <ProductTile item={featuredSeedlings[0]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />
                <StoryTile story={visibleStories[1]} size="xl:col-span-8 xl:row-span-[36]" />

                <MetricPair metrics={sectorMetrics.slice(2, 4)} size="xl:col-span-3 xl:row-span-[36]" onFocus={() => toggleFocus("metrics")} />
                <StoryTile story={visibleStories[2]} size="xl:col-span-9 xl:row-span-[36]" />
                <StoryTile story={visibleStories[3]} size="xl:col-span-4 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[0]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <VideoTile video={editorialVideos[0]} size="xl:col-span-4 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[1]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <EventTile event={editorialEvents[0]} size="xl:col-span-3 xl:row-span-[36]" />

                {bannerVisible ? (
                  <div className="min-h-[240px] xl:col-span-12 xl:row-span-[21]">
                    <SeedlingsBanner className="h-full min-h-[240px] rounded-none" onVisibilityChange={setBannerVisible} />
                  </div>
                ) : null}

                <ProductTile item={featuredSeedlings[1]} size="xl:col-span-6 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />
                <PlayerTile player={sectorPlayers[2]} size="xl:col-span-3 xl:row-span-[36]" onFocus={() => toggleFocus("players")} />
                <StoryTile story={visibleStories[4]} size="xl:col-span-12 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[3]} size="xl:col-span-3 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />

                <StoryTile story={visibleStories[5]} size="xl:col-span-9 xl:row-span-[30]" />
                <ProductTile item={featuredSeedlings[2]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />

                <EventTile event={editorialEvents[1]} size="xl:col-span-4 xl:row-span-[36]" />
                <VideoTile video={editorialVideos[1]} size="xl:col-span-8 xl:row-span-[30]" />

                <MetricPair metrics={sectorMetrics.slice(4, 6)} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("metrics")} />
                <StoryTile story={visibleStories[6]} size="xl:col-span-8 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[4]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <StoryTile story={visibleStories[7]} size="xl:col-span-4 xl:row-span-[30]" />
                <PlayerTile player={sectorPlayers[5]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <EventTile event={editorialEvents[3]} size="xl:col-span-3 xl:row-span-[30]" />
                <VideoTile video={editorialVideos[2]} size="xl:col-span-6 xl:row-span-[30]" />
                <EventTile event={editorialEvents[2]} size="xl:col-span-3 xl:row-span-[30]" />
                <VideoTile video={editorialVideos[3]} size="xl:col-span-8 xl:row-span-[30]" />
              </>
            ) : activeCategory === "Videos" ? (
              editorialVideos.map((video) => <VideoTile key={video.href} video={video} size="xl:col-span-6 xl:row-span-[36]" />)
            ) : activeCategory === "Events" ? (
              editorialEvents.map((event) => <EventTile key={event.title} event={event} size="xl:col-span-6 xl:row-span-[31]" />)
            ) : (
              visibleStories.map((story) => <StoryTile key={story.title} story={story} size="xl:col-span-12 xl:row-span-[37]" />)
            )}
          </div>
          )}
        </div>

        {activeCategory !== "Videos" && activeCategory !== "Events" && visibleCount < filteredStories.length ? (
          <ScrollReveal className="mt-10 border-t border-emerald-900 pt-6 text-center" delay={140}>
            <button type="button" onClick={() => setVisibleCount(filteredStories.length)} className="group inline-flex items-center gap-3 text-sm text-primary uppercase tracking-[.16em]">Load more <ArrowRight className="size-4 rotate-90 transition-transform group-hover:translate-y-1" /></button>
          </ScrollReveal>
        ) : null}

      </div>

    </section>
  )
}

function CategoryPill({
  category,
  isActive,
  onSelect,
  onSelectTopic,
}: {
  category: EditorialCategory
  isActive: boolean
  onSelect: () => void
  onSelectTopic: (topic: string) => void
}) {
  const subsections = editorialSubsections[category]

  return (
    <span
      className={`inline-grid shrink-0 grid-cols-[auto_0fr] items-center overflow-hidden rounded-full border [transition:grid-template-columns_450ms_cubic-bezier(0.22,1,0.36,1),border-color_300ms_ease,color_300ms_ease] hover:grid-cols-[auto_1fr] focus-within:grid-cols-[auto_1fr] ${
        isActive
          ? "border-emerald-400 bg-emerald-500 text-emerald-950"
          : "border-emerald-900 bg-emerald-950/70 text-emerald-100 hover:border-emerald-400 hover:text-emerald-300"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className="whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[.12em] transition-colors duration-300"
      >
        {category}
      </button>
      <span className="min-w-0 overflow-hidden">
        <span className="flex max-w-[16rem] items-center gap-1.5 overflow-x-auto py-1 pr-2 pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-[22rem]">
          {subsections.map((sub) =>
            sub.topic ? (
              <button
                key={sub.label}
                type="button"
                onClick={() => onSelectTopic(sub.topic as string)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[.1em] transition-colors duration-300 ${
                  isActive
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800 hover:text-white"
                }`}
              >
                {sub.label}
              </button>
            ) : (
            <a
              key={sub.label}
              href={sub.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[.1em] transition-colors duration-300 ${
                isActive
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800 hover:text-white"
              }`}
            >
              {sub.label}
            </a>
            )
          )}
        </span>
      </span>
    </span>
  )
}
