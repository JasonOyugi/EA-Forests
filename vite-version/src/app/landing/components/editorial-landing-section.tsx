"use client"

import { ArrowRight, CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import type { MouseEvent } from "react"
import { useSearchParams } from "react-router-dom"

import { ScrollReveal } from "@/components/ui/scroll-reveal"
import SeedlingsBanner from "@/components/commerce-ui/seedlings-banner"
import { AutoPlayVideo } from "@/components/auto-play-video"
import { YouTubeVideoDialog } from "@/components/youtube-video-dialog"
import { assetUrl } from "@/lib/utils"
import { editorialActionLabels, editorialSubsections } from "./editorial-actions"
import type { EditorialCategory } from "./editorial-actions"
import { InformationLiveHub } from "./information-live-hub"
import { MetricTile } from "./metric-tile"
import { landingContainer } from "./landing-shared"
import { sectorMetrics, sectorPlayers } from "./sector-data"
import type { SectorMetric, SectorPlayer } from "./sector-data"
import { forestryResources } from "../data/forestry-resources"
import { EoTile, eoCountries } from "./latest-eo-card"
import type { MarketId } from "@/app/shop/market-atlas/types"

const MarketAtlasShell = lazy(() =>
  import("@/app/shop/market-atlas/components/market-atlas-shell").then((module) => ({
    default: module.MarketAtlasShell,
  }))
)

type EditorialFocus = "metrics" | "players" | "products" | null

type Story = {
  title: string
  category: EditorialCategory
  image: string
  href: string
  updatedAt: string
  video?: string
  /** Sub-tag used for in-grid filtering. */
  topic?: string
  /** Optional status ribbon shown over the card. */
  badge?: string
  /** Market atlas to open inline (Markets stories only). */
  market?: MarketId
}

type EditorialVideo = {
  title: string
  videoId: string
  previewSrc: string
  uploadedAt: string
}

type EditorialEvent = {
  title: string
  date: string
  location: string
  tag: string
  description: string
  href: string
  image?: string
}

const stories: Story[] = [
  { title: "Here's how forests make money in East Africa", category: "Investment Models", image: "https://cdn.agriland.ie/uploads/2020/09/Image-source-Veon-2.jpg", href: "/articles/how-forests-make-money-east-africa", updatedAt: "12 Aug 2026", topic: "Industry Tools" },
  { title: "Ready to sell your wood?", category: "Markets", image: "https://saforestryonline.co.za/wp-content/uploads/2025/07/The-John-Deere-2144G-tracked-swing-harvester-is-ideal-for-fast-growing-high-yield-plantations-scaled.jpg", href: "/landing?market=wood-markets-map#sector-map", market: "wood-markets-map", updatedAt: "11 Aug 2026" },
  { title: "The best planting material for East Africa", category: "Markets", image: "https://dryrocktreesnursery.com/cdn/shop/files/lodgepoletray.jpg?v=1759249757&width=1946", href: "/landing?market=seedlings#sector-map", market: "seedlings", updatedAt: "10 Aug 2026" },
  { title: "The ultimate site-species analysis tool", category: "Investment Models", image: "/tz.jpg", href: "/models/site-species-analysis", updatedAt: "9 Aug 2026", topic: "Industry Tools" },
  { title: "Start a forestry investment guaranteed to generate returns", category: "Investment Models", image: "/eucalyptus.jpg", href: "/shop/forests-land/core-forests", updatedAt: "8 Aug 2026", topic: "Tested Investments" },
  { title: "Everything you need to know about clonal nursery business ", category: "Investment Models", image: "https://eucalyptusclones.in/images/clonal-gallery-1.png", href: "/models/clonal-eucalyptus-nursery", updatedAt: "7 Aug 2026", topic: "Industry Tools" },
  { title: "Build a high-performance forest asset today", category: "Investment Models", image: "/about.webp", href: "/shop/forests-land/high-performance-forests", updatedAt: "6 Aug 2026", topic: "Tested Investments" },
  { title: "Find a contractor", category: "Markets", image: "https://cdn.britannica.com/77/213177-138-0C119CB6/Overview-silviculture-lumber-industry.jpg", href: "/landing?market=forestry-services#sector-map", market: "forestry-services", updatedAt: "5 Aug 2026" },
  { title: "The top nurseries in the world are looking for partnerships in East Africa. Is it you?", category: "Information", image: "https://www.totalenergygroup.com/wp-content/uploads/2018/08/greenhouse_interior.jpg", href: "/articles/nursery-partnerships-east-africa", updatedAt: "4 Aug 2026" },
  { title: "Model the forest before committing capital", category: "Investment Models", image: "/apps.png", video: "/video/hero-3.mp4", href: "/models/model-2", updatedAt: "3 Aug 2026", topic: "Industry Tools" },
  { title: "It is time to restore the drylands profitably", category: "Investment Models", image: "/drylands.webp", href: "/shop/forests-land/drylands", updatedAt: "2 Aug 2026", topic: "Tested Investments" },
  { title: "Join the people building the sector", category: "Information", image: "/contact-2.webp", href: "#contact", updatedAt: "1 Aug 2026" },

  // Models — Commercial group
  { title: "Map the roundwood value chain before you commit", category: "Investment Models", image: "https://cdn.britannica.com/77/213177-138-0C119CB6/Overview-silviculture-lumber-industry.jpg", href: "/models/model-3", updatedAt: "14 Aug 2026", topic: "Industry Tools" },

  // Models — Genetic group (in development)
  { title: "Pine seed orchard model", category: "Investment Models", image: "/tz.jpg", href: "/models/pine-seed-orchard", updatedAt: "14 Aug 2026", topic: "Industry Tools", badge: "Coming soon" },
  { title: "EA genetics power rankings", category: "Investment Models", image: "https://eucalyptusclones.in/images/clonal-gallery-1.png", href: "/models/ea-genetics-power-rankings", updatedAt: "14 Aug 2026", topic: "Industry Tools", badge: "Coming soon" },

  // Models — Economic group (in development)
  { title: "East Africa forestry macro-economic model", category: "Investment Models", image: "/eucalyptus.jpg", href: "/models/macro-economic-outlook", updatedAt: "14 Aug 2026", topic: "Industry Tools", badge: "Coming soon" },

]

const editorialVideos: EditorialVideo[] = [
  { title: "How to earn money from eucalyptus plantations.", videoId: "pZ7zwi2LU5o", previewSrc: "/video/hero-profit-preview.mp4", uploadedAt: "16 Jul 2024" },
  { title: "This Gene-Edited Tree Captures More CO2.", videoId: "6OknnFuDQE8", previewSrc: "/video/hero-genetics-preview.mp4", uploadedAt: "30 Jun 2022" },
  { title: "Portable Sawmill Demo | Wood-Mizer LT70 Super Hydraulic ", videoId: "GdHRBmweOTY", previewSrc: "/video/hero-mill-preview.mp4", uploadedAt: "24 Sep 2025" },
  { title: "FAO: Forests and economies - forests mean business", videoId: "yEVeFWKyLqI", previewSrc: "/video/hero-vc-preview.mp4", uploadedAt: "19 Feb 2026" },
]

const editorialEvents: EditorialEvent[] = [
  { title: "Global Legal & Sustainable Timber Forum 2026", date: "22-23 Sep 2026", location: "Macao SAR, China", tag: "Timber Markets", description: "A global timber-industry forum focused on resilient legal supply chains, trade, innovation, and market transformation.", href: "https://www.itto.int/events/2026/09/23/global_legal_sustainable_timber_forum_2026/", image: "https://www.itto.int/files/user/202608141222_1.png" },
  { title: "World Forest Week 2026", date: "28 Sep-2 Oct 2026", location: "Rome, Italy", tag: "Forestry", description: "FAO's global forest week covering restoration, bioeconomy, forest data, finance, fire and resilient forest systems.", href: "https://www.fao.org/forestry/committee-on-forestry/world-forest-week-side-events/", image: "https://www.fao.org/media/images/forestrylibraries/cofo28/wfw_1920x800_wbanner_enaef182ca761e43ebb4a1a621a5e0247d.png?sfvrsn=7eefc15c_8" },
  { title: "10th AfriGEO Symposium", date: "5-8 Oct 2026", location: "Abuja, Nigeria", tag: "EO / Geospatial", description: "Africa-wide Earth observation gathering focused on resilience, natural resources, operational services and geospatial intelligence.", href: "https://earthobservations.org/about-us/news/10th-afrigeo-symposium-registration-now-open", image: "https://earthobservations.org/storage/news/2026/20260609_afrigeo_symposium_news_banner.jpg" },
  { title: "FETEC 2026 - Forest Engineering 4.0", date: "12-14 Oct 2026", location: "Brasov, Romania", tag: "Forestry Tech", description: "Forest engineering, AI, automation, sensing, geospatial systems, forest roads and digital operations.", href: "https://www.iufro.org/events/7th-international-symposium-of-forest-engineering-and-technologies-fetec-2026", image: "https://www.iufro.org/images/fileadmin/science/divisions/div3/30100/_coverImageTabletWebp/796604/brasov26-fetec-2026-cover-website_2026-06-01-121645_tdzv.webp" },
  { title: "Carbon Markets Africa Summit 2026", date: "13-15 Oct 2026", location: "Kigali, Rwanda", tag: "Carbon", description: "African carbon projects, capital, policy, buyers and investment-ready opportunities in one market-focused summit.", href: "https://carbonmarketsafrica.com/", image: "https://carbonmarketsafrica.com/wp-content/uploads/2026/09/Market-activation-scaled.png" },
  { title: "INTERFORST 2026", date: "15-18 Oct 2026", location: "Munich, Germany", tag: "Forestry Tech", description: "Major forestry technology fair spanning forest health, machinery, digital forestry and wood-sector innovation.", href: "https://interforst.com/en/", image: "https://d2n1n6byqxibyi.cloudfront.net/image/933560888063/image_uo7cvr10nh1kj72ob5m1i4fe7h/-Ro:middle_center,w:728,h:364,n:default-FWEBP" },
  { title: "UN-GGIM: Africa 2026", date: "19-23 Oct 2026", location: "Addis Ababa, Ethiopia", tag: "Geospatial", description: "Continental meeting on geospatial information infrastructure, standards, governance and data-driven development.", href: "https://www.uneca.org/eca-events/un-ggim-africa-2026", image: "https://www.uneca.org/eca-events/sites/default/files/styles/event_detail_image/public/eventimages/2026_un-gim_geospatial_powering_development_edited.png?itok=LXIuQAT5" },
  { title: "Big 5 Construct Kenya", date: "21-23 Oct 2026", location: "Nairobi, Kenya", tag: "Construction", description: "Major East African construction marketplace with materials, suppliers, architects, developers and construction technology.", href: "https://www.big5constructkenya.com/" },
  { title: "AARSE 2026", date: "26-30 Oct 2026", location: "Harare, Zimbabwe", tag: "EO / Remote Sensing", description: "African remote sensing, GIS and geospatial intelligence conference with natural-resource and climate applications.", href: "https://www.aarse2026.org/", image: "https://www.aarse2026.org/images/conference-image.png" },
  { title: "Green Building Convention 2026", date: "27-29 Oct 2026", location: "Cape Town, South Africa", tag: "Bio-based Construction", description: "Green construction, whole-life carbon, circular materials, finance and the transition to lower-carbon buildings.", href: "https://www.gbcsa.org.za/gbcsa-planet-shapers-events/" },
  { title: "International Hardwood Conference 2026", date: "5-6 Nov 2026", location: "Antwerp, Belgium", tag: "Hardwood Markets", description: "A concentrated view of international hardwood supply, demand, processing, regulation, and trade conditions.", href: "https://www.itto.int/events/2026/11/06/international_hardwood_conference_2026/" },
  { title: "62nd International Tropical Timber Council", date: "9-14 Nov 2026", location: "Yokohama, Japan", tag: "Timber Markets", description: "ITTO's annual governing session on sustainable tropical forest management and trade in tropical timber.", href: "https://www.itto.int/events/2026/11/14/62nd_session_of_the_international_tropical_timber_council_and_sessions_of_the_associated_committees/" },
  { title: "COP31", date: "9-20 Nov 2026", location: "Antalya, Turkiye", tag: "Climate / Carbon", description: "UN climate negotiations covering finance, carbon sinks, land use, adaptation and implementation of the Paris Agreement.", href: "https://unfccc.int/cop31/ifp" },
  { title: "Forestry Science Symposium 2026", date: "24-26 Nov 2026", location: "Stellenbosch, South Africa", tag: "Commercial Forestry", description: "Research and industry gathering on science and innovation for sustainable, resilient and valuable timber resources.", href: "https://forestry.co.za/events/2026-forestry-science-symposium/" },
  { title: "International Conference on Meliaceae", date: "11-12 Jan 2027", location: "Virtual", tag: "Genetics / Silviculture", description: "Melia, Khaya, mahogany and related high-value species: genetics, seed, propagation, plantations, wood science and value addition.", href: "https://www.iufro.org/events/international-conference-on-meliaceae", image: "https://www.iufro.org/images/fileadmin/science/divisions/div1/10204/_coverImageTabletWebp/835048/online-conference27-cover_2026-09-21-101045_mnui.webp" },
  { title: "16th Annual Wood Conference", date: "23 Feb 2027", location: "Cape Town, South Africa", tag: "Timber Construction", description: "Sub-Saharan African timber-construction conference linking architecture, engineering, investment and sustainable building.", href: "https://www.woodconference.co.za/", image: "https://www.woodconference.co.za/fileadmin/_processed_/1/d/csm_wood-conference-registration-2026-18_52bf6c7ac2.jpg" },
  { title: "RCMRD International Conference 2027", date: "8-11 Mar 2027", location: "Nairobi, Kenya", tag: "EO / Geospatial", description: "From Earth Intelligence to Action and Impact - EO and geospatial technology applied to development and resilience.", href: "https://www.rcmrd.org/en/resources/upcoming-events", image: "https://rcmrd.org/images/countryimgwebp/logo-rcmrd1.webp" },
  { title: "International Mass Timber Conference & Expo", date: "16-19 Mar 2027", location: "Portland, USA", tag: "Mass Timber", description: "Large global meeting across the mass-timber supply chain, from forestry and manufacturing to development and construction.", href: "https://masstimberconference.com/", image: "https://masstimberconference.com/wp-content/uploads/2026/08/developer_home_final.png" },
  { title: "Dubai WoodShow 2027", date: "6-8 Apr 2027", location: "Dubai, UAE", tag: "Wood Industry", description: "The MENA region's B2B marketplace for timber, panels, engineered wood, machinery, buyers, distributors, and exporters.", href: "https://www.woodshowglobal.com/dubai" },
  { title: "Woodtech Africa 2027", date: "8-10 Apr 2027", location: "Nairobi, Kenya", tag: "Wood Processing", description: "Woodworking machinery, timber, panels, composites, sawmilling, furniture production and wood-industry suppliers.", href: "https://woodtechafrica.com/venue-information/" },
  { title: "LIGNA 2027", date: "10-14 May 2027", location: "Hannover, Germany", tag: "Wood Industry", description: "Major global wood-processing fair covering sawmills, forestry machinery, panels, automation, woodworking and energy from wood.", href: "https://www.ligna.de/", image: "https://www.ligna.de/files/files/mainstage/ligna/mainstage_fallback_m-ligna.jpg" },
  { title: "interzum 2027", date: "11-14 May 2027", location: "Cologne, Germany", tag: "Wood Products", description: "Global furniture-production and interiors supply fair covering materials, components, manufacturing and emerging product systems.", href: "https://www.interzum.com/en/", image: "https://media.koelnmesse.io/interzum2021/redaktionell/interzum/img/diverse_2/themenfeature_themenwelten_1200jpg_t01_720_1024.jpg" },
  { title: "IUFRO Division 5 / SWST Conference", date: "30 May-3 Jun 2027", location: "Tartu, Estonia", tag: "Forest Products", description: "Wood quality, processing, plantation wood, circular bioeconomy, forest-products markets and wood valorisation.", href: "https://www.iufro.org/events/all-division-5-conference-future-forest-use-advancing-wood-science-and-forest-products-for-a-circular-bioeconomy", image: "https://www.iufro.org/images/fileadmin/science/divisions/div5/50000/_coverImageTabletWebp/730449/IUFRO_veebib%C3%A4nner_ver6_2026-02-09-180224_lntk_2026-02-09-180259_lhzu.webp" },
  { title: "Afriwood Kenya 2027", date: "1-3 Jul 2027", location: "Nairobi, Kenya", tag: "Wood Processing", description: "East African trade show for timber processing, woodworking machinery, furniture manufacturing and wood-industry technology.", href: "https://expogr.com/afriwood/", image: "https://expogr.com/afriwood/images/gallery1.jpg" },
  { title: "World Conference on Timber Engineering 2027", date: "15-19 Aug 2027", location: "Edmonton, Canada", tag: "Timber Construction", description: "Global timber-engineering conference spanning structural design, fire, sustainability, manufacturing and low-carbon construction.", href: "https://wcte2027.swoogo.com/wcte2027/" },
  { title: "Woodrise 2027", date: "25-29 Oct 2027", location: "Nara, Japan", tag: "Mass Timber", description: "International wood and timber-construction event already listed on ITTO's 2027 calendar.", href: "https://www.itto.int/events/55th_session_of_the_international_tropical_timber_council_and_sessions_of_t" },
]

const editorialCategories: EditorialCategory[] = ["Information", "Investment Models", "Videos", "Events"]
const initialVisibleStoryCount = 8
const defaultInformationTopic = "Policy & Regulation"

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

  const [, setSearchParams] = useSearchParams()

  // Market stories switch the Markets atlas above (which reads `?market=`) and scroll to it,
  // instead of reloading the page.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!story.market || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setSearchParams({ market: story.market }, { replace: true, preventScrollReset: true })
    document.getElementById("sector-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
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
      onClick={handleClick}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointerEffect}
      className={`landing-story-card group relative block overflow-hidden bg-zinc-900 [perspective:1100px] transition-[width,height,transform] duration-500 ${size ?? ""}`}
    >
      {story.video ? (
        <AutoPlayVideo ref={(node) => { mediaRef.current = node }} src={assetUrl(story.video)} poster={assetUrl(story.image)} loop className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" />
      ) : (
        <img ref={(node) => { mediaRef.current = node }} src={story.image} alt="" className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" loading="lazy" decoding="async" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10 transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />
      {story.badge === "Coming soon" ? <div aria-hidden="true" className="coming-soon-card-tint" /> : null}
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
    <article className={`landing-story-card group relative block min-h-[320px] overflow-hidden bg-zinc-900 text-white ${size}`}>
      <AutoPlayVideo src={assetUrl(video.previewSrc)} loop className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
      <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
        <Clock3 className="size-3" /> Last updated: {video.uploadedAt}
      </span>
      <YouTubeVideoDialog videoId={video.videoId} title={video.title}>
        <button type="button" className="absolute inset-0 z-10" aria-label={`Watch ${video.title}`} />
      </YouTubeVideoDialog>
      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">Video</p>
        <h3 className="landing-product-title mt-3 font-semibold">{video.title}</h3>
        <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] transition-colors group-hover:text-emerald-300">Watch now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </article>
  )
}

function EventTile({ event, size = "" }: { event: EditorialEvent; size?: string }) {
  return (
    <article className={`emerald-border-hover group relative flex min-h-[300px] flex-col justify-between overflow-hidden border border-emerald-700/40 bg-transparent p-6 text-emerald-950 sm:p-7 dark:border-emerald-800/60 dark:text-emerald-50 ${size}`}>
      <img
        src={event.image ?? assetUrl("/favicon.png")}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-25 transition-transform duration-700 group-hover:scale-105 dark:opacity-35"
        loading="lazy"
        decoding="async"
        onError={({ currentTarget }) => { currentTarget.src = assetUrl("/favicon.png") }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/90 via-emerald-100/75 to-emerald-200/65 dark:from-emerald-950/85 dark:via-emerald-950/75 dark:to-zinc-950/80" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300"><CalendarDays className="size-4" /> {event.date}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800/75 dark:text-emerald-100/65"><MapPin className="size-3.5" /> {event.location}</span>
      </div>
      <div className="relative z-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-emerald-700/80 dark:text-emerald-300/80">{event.tag}</p>
        <h3 className="text-2xl font-semibold text-emerald-950 dark:text-white">{event.title}</h3>
        <p className="mt-3 text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/70">{event.description}</p>
        <a href={event.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-emerald-800 transition-colors hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-emerald-400">View event <ExternalLink className="size-3.5" /></a>
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
      className={`landing-player-card group relative flex flex-col justify-between overflow-hidden border border-emerald-700/40 bg-transparent p-6 text-emerald-950 transition-all duration-500 hover:border-emerald-400 dark:text-white sm:p-7 ${size}`}
      onDoubleClick={onFocus}
    >
      <img
        src={player.image}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full scale-110 object-contain p-8 opacity-[.22] transition-all duration-700 group-hover:scale-100 group-hover:opacity-[.1] dark:opacity-[.50] dark:group-hover:opacity-[.16]"
        loading="lazy"
      />
      <div className="relative flex items-center justify-between gap-4">
        <span className="grid size-14 shrink-0 place-items-center">
          <img src={player.image} alt="" className="size-full object-contain" loading="lazy" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300">{player.role}</span>
      </div>
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-300/80">Key Players</p>
        <h3 className="landing-player-title mt-2 font-semibold">{player.name}</h3>
        <p className="mt-1 text-sm text-emerald-900/75 dark:text-white/70">{player.organisation}</p>
        <p className="mt-2 text-xs text-emerald-800/70 dark:text-white/50">{player.note}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <a
            href={player.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-emerald-800 transition-colors hover:text-emerald-950 focus-visible:text-emerald-950 dark:text-emerald-200/80 dark:hover:text-white dark:focus-visible:text-white"
            aria-label={`Visit ${player.name} website`}
          >
            Website <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}

function ResourceTile({
  resource,
  size,
  onFocus,
}: {
  resource: { name: string; href: string; image: string; description: string }
  size: string
  onFocus?: () => void
}) {
  return (
    <a
      href={resource.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`landing-product-card group relative block overflow-hidden bg-zinc-900 transition-all duration-500 ${size}`}
      onDoubleClick={onFocus}
    >
      <img src={resource.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10 transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />
      <div className="landing-card-content absolute inset-x-0 bottom-0 z-10 translate-y-2 p-5 text-white transition-transform duration-500 group-hover:translate-y-0 sm:p-7 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-200">Tools &amp; Intelligence</p>
        <h3 className="landing-product-title mt-3 font-semibold">{resource.name}</h3>
        <p className="mt-2 max-w-md text-sm font-medium text-white/80">{resource.description}</p>
        <span className="landing-card-action mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] transition-all duration-500">Visit site <ArrowRight className="size-4 -rotate-45 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  )
}

function MetricPair({ metrics, size, onFocus, onSelectInformation }: { metrics: SectorMetric[]; size: string; onFocus: () => void; onSelectInformation: (topic: string) => void }) {
  return (
    <div className={`landing-metric-pair grid grid-rows-2 gap-2 ${size}`}>
      {metrics.map((metric) => (
        <MetricTile key={metric.label} metric={metric} size="min-h-0" onFocus={onFocus} onSelectInformation={onSelectInformation} />
      ))}
    </div>
  )
}

export function SectorSearchSection() {
  return (
    <section id="sector-map" className="scroll-mt-16 bg-emerald-100 py-16 text-emerald-950 dark:bg-[#07110c] dark:text-emerald-50 sm:py-20 lg:py-24">
      <div className={landingContainer}>
        <h2 className="landing-section-heading mb-6 uppercase">Markets</h2>
        <ScrollReveal delay={80}>
          <Suspense
            fallback={
              <div className="flex min-h-[38rem] items-center justify-center border border-white/10 bg-black/20 text-sm text-white/60">
                Loading sector map
              </div>
            }
          >
            <MarketAtlasShell marketId="seedlings" linkMode="query" />
          </Suspense>
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
      const topic = typeof detail === "string"
        ? category === "Information" ? defaultInformationTopic : null
        : detail.topic ?? (category === "Information" ? defaultInformationTopic : null)
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
    setActiveTopic(category === "Information" ? defaultInformationTopic : null)
    setVisibleCount(initialVisibleStoryCount)
    setFocusMode(null)
  }

  const selectTopic = (category: EditorialCategory, topic: string) => {
    setActiveCategory(category)
    setActiveTopic(topic)
    setVisibleCount(initialVisibleStoryCount)
    setFocusMode(null)
  }

  const selectInformationTopic = (topic: string) => {
    selectTopic("Information", topic)
  }

  const toggleFocus = (nextMode: Exclude<EditorialFocus, null>) => {
    setFocusMode((currentMode) => currentMode === nextMode ? null : nextMode)
  }

  return (
    <section id="brief" className="border-t border-emerald-900/30 bg-emerald-100 pb-20 pt-16 text-emerald-950 dark:border-emerald-900/60 dark:bg-[#07110c] dark:text-emerald-50 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
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
              activeTopic={activeCategory === category ? activeTopic : null}
              onSelect={() => selectCategory(category)}
              onSelectTopic={(topic) => selectTopic(category, topic)}
            />
          ))}
        </ScrollReveal>

        <div className="editorial-grid-transition" key={`${activeCategory}-${activeTopic ?? "all"}-${focusMode ?? "mixed"}`}>
          {activeCategory === "Information" ? (
            <InformationLiveHub
              activeTopic={activeTopic ?? defaultInformationTopic}
            />
          ) : focusMode ? (
            <div className="editorial-focus-surface rounded-[2rem] border border-emerald-400/20 p-3 sm:p-5 lg:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1 text-emerald-950 dark:text-emerald-50">
                <p className="text-xs font-semibold uppercase tracking-[.2em]">
                  {focusMode === "metrics" ? "Sector in numbers" : focusMode === "players" ? "Sector actors" : "Tools & Intelligence"}
                </p>
                <p className="text-xs text-emerald-800/70 dark:text-emerald-100/60">Double-click any card to return to the editorial mosaic</p>
              </div>
              <div className={`grid gap-2 ${focusMode === "products" ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {focusMode === "metrics" ? sectorMetrics.map((metric) => (
                  <MetricTile key={metric.label} metric={metric} size="min-h-[280px]" onFocus={() => toggleFocus("metrics")} onSelectInformation={selectInformationTopic} />
                )) : null}
                {focusMode === "players" ? sectorPlayers.map((player) => (
                  <PlayerTile key={player.name} player={player} size="min-h-[320px]" onFocus={() => toggleFocus("players")} />
                )) : null}
                {focusMode === "products" ? forestryResources.map((resource) => (
                  <ResourceTile key={resource.name} resource={resource} size="min-h-[360px]" onFocus={() => toggleFocus("products")} />
                )) : null}
              </div>
            </div>
          ) : (
            <div key={activeCategory} className="editorial-mosaic-grid grid grid-cols-1 gap-2 xl:grid-cols-12 xl:[grid-auto-flow:dense]">
            {activeCategory === "All" ? (
              <>
                <StoryTile story={visibleStories[0]} size="xl:col-span-8 xl:row-span-[48]" />
                <MetricPair metrics={sectorMetrics.slice(0, 2)} size="xl:col-span-4 xl:row-span-[48]" onFocus={() => toggleFocus("metrics")} onSelectInformation={selectInformationTopic} />

                <ResourceTile resource={forestryResources[0]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />
                <StoryTile story={visibleStories[1]} size="xl:col-span-8 xl:row-span-[36]" />

                <MetricPair metrics={sectorMetrics.slice(2, 4)} size="xl:col-span-4 xl:row-span-[48]" onFocus={() => toggleFocus("metrics")} onSelectInformation={selectInformationTopic} />
                <StoryTile story={visibleStories[2]} size="xl:col-span-8 xl:row-span-[36]" />
                <StoryTile story={visibleStories[3]} size="xl:col-span-4 xl:row-span-[36]" />
                <PlayerTile player={sectorPlayers[0]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("players")} />
                <VideoTile video={editorialVideos[0]} size="xl:col-span-4 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[1]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("players")} />
                <EventTile event={editorialEvents[0]} size="xl:col-span-4 xl:row-span-[36]" />

                {bannerVisible ? (
                  <div className="min-h-[240px] xl:col-span-12 xl:row-span-[21]">
                    <SeedlingsBanner className="h-full min-h-[240px] rounded-none" onVisibilityChange={setBannerVisible} />
                  </div>
                ) : null}

                <EoTile config={eoCountries.UG} size="xl:col-span-12 xl:row-span-[48]" />

                <ResourceTile resource={forestryResources[1]} size="xl:col-span-6 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />
                <PlayerTile player={sectorPlayers[2]} size="xl:col-span-3 xl:row-span-[36]" onFocus={() => toggleFocus("players")} />
                <StoryTile story={visibleStories[4]} size="xl:col-span-12 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[3]} size="xl:col-span-3 xl:row-span-[36]" onFocus={() => toggleFocus("players")} />

                <StoryTile story={visibleStories[5]} size="xl:col-span-9 xl:row-span-[30]" />
                <ResourceTile resource={forestryResources[2]} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("products")} />

                <EventTile event={editorialEvents[1]} size="xl:col-span-4 xl:row-span-[36]" />
                <VideoTile video={editorialVideos[1]} size="xl:col-span-8 xl:row-span-[30]" />

                <EoTile config={eoCountries.KE} size="xl:col-span-12 xl:row-span-[48]" />

                <MetricPair metrics={sectorMetrics.slice(4, 6)} size="xl:col-span-4 xl:row-span-[36]" onFocus={() => toggleFocus("metrics")} onSelectInformation={selectInformationTopic} />
                <StoryTile story={visibleStories[6]} size="xl:col-span-8 xl:row-span-[60]" />
                <PlayerTile player={sectorPlayers[4]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <StoryTile story={visibleStories[7]} size="xl:col-span-4 xl:row-span-[30]" />
                <PlayerTile player={sectorPlayers[5]} size="xl:col-span-4 xl:row-span-[30]" onFocus={() => toggleFocus("players")} />
                <EoTile config={eoCountries.TZ} size="xl:col-span-12 xl:row-span-[48]" />
                <EventTile event={editorialEvents[3]} size="xl:col-span-3 xl:row-span-[30]" />
                <VideoTile video={editorialVideos[2]} size="xl:col-span-9 xl:row-span-[30]" />
                <EventTile event={editorialEvents[2]} size="xl:col-span-3 xl:row-span-[30]" />
                <VideoTile video={editorialVideos[3]} size="xl:col-span-8 xl:row-span-[30]" />
              </>
            ) : activeCategory === "Videos" ? (
              editorialVideos.map((video) => <VideoTile key={video.videoId} video={video} size="xl:col-span-6 xl:row-span-[36]" />)
            ) : activeCategory === "Events" ? (
              editorialEvents.map((event) => <EventTile key={event.title} event={event} size="xl:col-span-6 xl:row-span-[31]" />)
            ) : (
              visibleStories.map((story) => <StoryTile key={story.title} story={story} size="xl:col-span-12 xl:row-span-[37]" />)
            )}
          </div>
          )}
        </div>

        {activeCategory !== "Information" && activeCategory !== "Videos" && activeCategory !== "Events" && visibleCount < filteredStories.length ? (
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
  activeTopic,
  onSelect,
  onSelectTopic,
}: {
  category: EditorialCategory
  isActive: boolean
  activeTopic: string | null
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
                aria-pressed={isActive && activeTopic === sub.topic}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[.1em] transition-colors duration-300 ${
                  isActive && activeTopic === sub.topic
                    ? "bg-white text-emerald-950"
                    : isActive
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
