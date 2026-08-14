"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Factory,
  FlaskConical,
  Leaf,
  Mail,
  Map,
  Trees,
} from "lucide-react"

import { LandingFooter } from "@/app/landing/components/footer"
import { forestryArticles, type ForestryArticle } from "@/app/articles/data"
import { EditorialHeader } from "@/app/articles/editorial-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

const discoverTopics = [
  { name: "Markets", eyebrow: "Demand & trade", description: "Roundwood flows, processor demand and price signals.", image: "/greenbuilding.webp", href: "/articles?category=Markets" },
  { name: "Policy", eyebrow: "Rules & institutions", description: "Regulatory notes with source documents kept visible.", image: "/CMA_KE.png", href: "/articles?category=Information" },
  { name: "Nurseries", eyebrow: "Planting supply", description: "Operators, capacity, quality and production timing.", image: "/tz.jpg", href: "/articles/nursery-partnerships-east-africa" },
  { name: "Planting Material", eyebrow: "Genetics", description: "Seed, clones and evidence for planting decisions.", image: "/eucalyptus.jpg", href: "/articles/best-planting-material-east-africa" },
  { name: "Silviculture", eyebrow: "Forest operations", description: "Establishment, tending, measurement and field practice.", image: "/forest.webp", href: "/articles" },
  { name: "Carbon", eyebrow: "Project activity", description: "Forestry-linked carbon projects and integrity questions.", image: "/about.webp", href: "/articles" },
  { name: "Land", eyebrow: "Sites & access", description: "Site constraints, productive potential and project fit.", image: "/maps.jpg", href: "/shop/forests-land" },
  { name: "Investment", eyebrow: "Capital & assets", description: "Project structures, return logic and downside cases.", image: "/drylands.webp", href: "/articles?category=Investment%2FProjects" },
  { name: "Research", eyebrow: "Evidence", description: "Trials, site matching, forestry science and data gaps.", image: "/KEFRI.png", href: "/articles?category=Tools+and+Models" },
  { name: "Jobs & Tenders", eyebrow: "Opportunities", description: "Work, procurement and partnership opportunities.", image: "/contact-2.webp", href: "/articles" },
] as const

const metrics = [
  { label: "Commercial forestry area", target: 420, suffix: "k ha", context: "Regional planted-forest estimate", source: "Illustrative sample · Source pending" },
  { label: "Seedling demand", target: 68, suffix: "M / yr", context: "Estimated planting-material need", source: "Illustrative sample · Source pending" },
  { label: "Timber demand outlook", target: 7.4, suffix: "%", context: "Indicative demand-growth scenario", source: "Illustrative sample · Source pending", decimals: 1 },
  { label: "Investment activity", target: 24, prefix: "$", suffix: "M", context: "Visible project pipeline under review", source: "Illustrative sample · Source pending" },
  { label: "Carbon project activity", target: 18, suffix: " projects", context: "Forestry-linked initiatives tracked", source: "Illustrative sample · Source pending" },
  { label: "Nursery capacity", target: 46, suffix: "M", context: "Potential annual seedling capacity", source: "Illustrative sample · Source pending" },
] as const

const sectorPlayers = [
  { name: "KEFRI", organisation: "Kenya Forestry Research Institute", role: "Research", note: "Works on forestry research, technology development and knowledge relevant to Kenya's forest sector.", image: "/KEFRI.png", icon: FlaskConical },
  { name: "UTGA", organisation: "Uganda Timber Growers Association", role: "Growers", note: "Represents and supports commercial timber growers within Uganda's forestry ecosystem.", image: "/UTGA.png", icon: Trees },
  { name: "Gatsby Africa", organisation: "Forestry sector development", role: "Development", note: "Works on inclusive and competitive sector development initiatives in East Africa.", image: "/Gatsby-Africa.png", icon: Building2 },
  { name: "CrossBoundary", organisation: "Investment advisory platform", role: "Investment", note: "Works on investment mobilisation and transaction support across African markets.", image: "/Crossboundary.png", icon: BriefcaseBusiness },
  { name: "CMA Kenya", organisation: "Capital Markets Authority", role: "Public agency", note: "Regulates and develops Kenya's capital markets, relevant to emerging investment structures.", image: "/CMA_KE.png", icon: BarChart3 },
  { name: "Hoffman", organisation: "Forestry operator profile", role: "Operations", note: "Included as a neutral operator spotlight; detailed profile information is to be verified.", image: "/Hoffman.png", icon: Factory },
] as const

const fieldNotes = [
  { label: "Nursery note", title: "Advance orders reduce production uncertainty", date: "12 Aug" },
  { label: "Market signal", title: "Delivered-log distance remains a decisive variable", date: "11 Aug" },
  { label: "Policy watch", title: "Track source documents before acting on a summary", date: "9 Aug" },
  { label: "Research note", title: "Comparable trial sites matter more than proximity alone", date: "7 Aug" },
] as const

function AnimatedMetric({ target, prefix = "", suffix, decimals = 0 }: { target: number; prefix?: string; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target)
      return
    }

    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      const startedAt = performance.now()
      const duration = 1100
      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(target * eased)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      observer.disconnect()
    }, { threshold: 0.45 })
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target])

  return <span ref={ref}>{prefix}{value.toFixed(decimals)}{suffix}</span>
}

function BriefingCard({ article }: { article: ForestryArticle }) {
  return (
    <Link to={`/articles/${article.slug}`} className="group relative block border-t border-zinc-300 pt-4 transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
        <img src={article.image} alt="" className="size-full scale-[1.03] object-cover transition-[transform,filter] duration-700 group-hover:scale-110 group-hover:brightness-105" />
        <div className="absolute inset-0 bg-emerald-950/0 transition-colors duration-500 group-hover:bg-emerald-950/10" />
        <span className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-300 transition-[width] duration-500 group-hover:w-full" />
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">{article.category} / {article.publishedAt}</p>
      <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-.025em] decoration-emerald-700 decoration-2 underline-offset-4 group-hover:underline">{article.title}</h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">{article.deck}</p>
    </Link>
  )
}

export default function NewsletterPage() {
  const [selectedTopic, setSelectedTopic] = useState("Markets")
  const discoverRef = useRef<HTMLDivElement | null>(null)
  const feature = forestryArticles[0]
  const supporting = forestryArticles.slice(1, 4)
  const latest = forestryArticles.slice(1, 7)
  const essential = forestryArticles.slice(4, 8)

  const moveDiscover = (direction: number) => discoverRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" })

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-zinc-950">
      <EditorialHeader />
      <main>
        <section className="flex min-h-[calc(100vh-4rem)] items-stretch border-b border-zinc-300 py-6 sm:py-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
            <div className="landing-fade-up mb-5 flex items-center justify-between border-b border-zinc-300 pb-4"><span className="text-xs font-bold uppercase tracking-[.24em] text-emerald-700">Feature of the Week</span><span className="hidden text-xs text-zinc-500 sm:block">East African commercial forestry intelligence</span></div>
            <div className="grid flex-1 gap-4 lg:grid-cols-[1.72fr_.58fr]">
              <Link to={`/articles/${feature.slug}`} className="landing-fade-up landing-delay-1 group relative min-h-[560px] overflow-hidden bg-zinc-900 text-white lg:min-h-0">
                <img src={feature.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10 lg:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">{feature.category} / {feature.publishedAt}</p><h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl lg:text-[5.4rem]">{feature.title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{feature.deck}</p><span className="mt-7 inline-flex items-center gap-2 border-b border-white/55 pb-1 font-semibold">Read the feature <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></div>
              </Link>
              <div className="landing-fade-up landing-delay-2 grid gap-3 lg:grid-rows-3">
                {supporting.map((article, index) => <Link key={article.slug} to={`/articles/${article.slug}`} className="group grid min-h-[160px] grid-cols-[125px_1fr] overflow-hidden border border-zinc-300 bg-white lg:min-h-0 lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_auto]"><div className="overflow-hidden"><img src={article.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.08]" /></div><div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-emerald-700">Latest briefing 0{index + 1}</p><h2 className="mt-1 line-clamp-2 text-base font-semibold leading-tight decoration-emerald-700 underline-offset-4 group-hover:underline">{article.title}</h2><p className="mt-2 text-[10px] text-zinc-500">{article.publishedAt} · {article.readTime}</p></div></Link>)}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 bg-emerald-950 py-12 text-white">
          <ScrollReveal className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8" distance={18}>
            <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Discover</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.035em]">Browse the sector desk</h2></div><div className="hidden gap-2 sm:flex"><button type="button" onClick={() => moveDiscover(-1)} aria-label="Previous topic" className="grid size-10 place-items-center border border-white/25 hover:border-emerald-300 hover:text-emerald-300"><ArrowLeft className="size-4" /></button><button type="button" onClick={() => moveDiscover(1)} aria-label="Next topic" className="grid size-10 place-items-center border border-white/25 hover:border-emerald-300 hover:text-emerald-300"><ArrowRight className="size-4" /></button></div></div>
            <div ref={discoverRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {discoverTopics.map((topic) => {
                const active = selectedTopic === topic.name
                return <div key={topic.name} role="button" tabIndex={0} aria-pressed={active} onClick={(event) => { setSelectedTopic(topic.name); event.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }) }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); setSelectedTopic(topic.name); event.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }) }} className={`group relative h-72 shrink-0 snap-center cursor-pointer overflow-hidden text-left outline-none transition-[flex-basis,transform,opacity] duration-500 ease-out focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 ${active ? "basis-[82%] opacity-100 sm:basis-[430px]" : "basis-[68%] opacity-60 hover:opacity-90 sm:basis-[260px]"}`}><img src={topic.image} alt="" className={`absolute inset-0 size-full object-cover transition-transform duration-700 ${active ? "scale-105" : "scale-100 group-hover:scale-105"}`} /><span className={`absolute inset-0 transition-colors duration-500 ${active ? "bg-gradient-to-t from-black via-black/20 to-transparent" : "bg-black/55"}`} /><span className="absolute inset-x-0 bottom-0 p-5"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">{topic.eyebrow}</span><span className="mt-2 block text-2xl font-semibold">{topic.name}</span><span className={`mt-2 block max-w-sm text-sm leading-6 text-white/65 transition-all duration-500 ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>{topic.description}</span>{active ? <Link to={topic.href} onClick={(event) => event.stopPropagation()} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em]">Explore <ArrowRight className="size-3.5" /></Link> : null}</span><span className={`absolute inset-x-0 bottom-0 h-1 bg-emerald-300 transition-transform duration-500 ${active ? "scale-x-100" : "scale-x-0"}`} /></div>
              })}
            </div>
          </ScrollReveal>
        </section>

        <section className="py-12 sm:py-16">
          <ScrollReveal className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8" distance={22}>
            <div className="mb-7 flex items-end justify-between border-b border-zinc-300 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Latest Briefings</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">The week in forestry</h2></div><Link to="/articles" className="hidden items-center gap-2 text-sm font-semibold sm:inline-flex">Full archive <ArrowRight className="size-4" /></Link></div>
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{latest.map((article) => <BriefingCard key={article.slug} article={article} />)}</div>
          </ScrollReveal>
        </section>

        <section className="border-y border-zinc-300 bg-white py-14 sm:py-20">
          <ScrollReveal className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[.55fr_1.45fr] lg:px-8" distance={22}><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Essential Reads</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Keep these close</h2><p className="mt-4 text-sm leading-6 text-zinc-600">Curated decision support for growers, investors, nurseries and processors.</p></div><div className="divide-y divide-zinc-300 border-t border-zinc-300">{essential.map((article, index) => <Link key={article.slug} to={`/articles/${article.slug}`} className="group grid grid-cols-[40px_1fr_auto] items-center gap-4 py-5 transition-transform hover:translate-x-1"><span className="text-xs text-zinc-400">0{index + 1}</span><span><span className="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">{article.topic}</span><span className="mt-1 block text-xl font-semibold decoration-emerald-700 underline-offset-4 group-hover:underline">{article.title}</span></span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>)}</div></ScrollReveal>
        </section>

        <section className="bg-[#08120d] py-16 text-white sm:py-24">
          <ScrollReveal className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8" distance={24}><div className="mb-10 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">The Sector in Numbers</p><h2 className="mt-3 max-w-3xl text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Evidence before claims.</h2></div><BarChart3 className="hidden size-12 text-emerald-300 sm:block" /></div><div className="grid border-l border-t border-white/20 sm:grid-cols-2 lg:grid-cols-3">{metrics.map((metric, index) => <article key={metric.label} className="min-h-72 border-b border-r border-white/20 p-6 sm:p-8"><span className="text-[10px] font-bold tracking-[.18em] text-white/35">0{index + 1}</span><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-300">{metric.label}</p><p className="mt-8 text-5xl font-semibold tracking-[-.055em] sm:text-6xl"><AnimatedMetric target={metric.target} prefix={"prefix" in metric ? metric.prefix : undefined} suffix={metric.suffix} decimals={"decimals" in metric ? metric.decimals : 0} /></p><p className="mt-4 text-sm text-white/60">{metric.context}</p><p className="mt-8 text-[9px] uppercase tracking-[.14em] text-white/35">{metric.source}</p></article>)}</div></ScrollReveal>
        </section>

        <section className="py-14 sm:py-20"><ScrollReveal className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8" distance={24}><div className="grid overflow-hidden bg-emerald-900 text-white lg:grid-cols-2"><div className="min-h-[440px] overflow-hidden"><img src="/drylands.webp" alt="" className="size-full object-cover transition-transform duration-1000 hover:scale-105" /></div><div className="flex flex-col justify-center p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Special Report / Deep Dive</p><h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-5xl">The dryland forestry opportunity</h2><p className="mt-5 max-w-xl leading-7 text-white/70">A focused editorial package on site constraints, project design, species decisions and responsible investment modelling.</p><Button asChild variant="secondary" className="mt-8 w-fit rounded-none"><Link to="/articles/dryland-forestry-investment-case">Open the report <ArrowRight className="size-4" /></Link></Button></div></div></ScrollReveal></section>

        <section className="border-y border-zinc-300 bg-white py-14 sm:py-20">
          <ScrollReveal className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8" distance={22}><div className="mb-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Key Sector Players</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Institutional spotlights</h2></div><p className="hidden max-w-sm text-right text-xs leading-5 text-zinc-500 sm:block">Neutral, descriptive profiles. Inclusion does not imply ranking or endorsement.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{sectorPlayers.map((player) => { const Icon = player.icon; return <article key={player.name} className="group relative min-h-72 overflow-hidden border border-zinc-300 bg-[#f4f3ef] p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,.09)]"><div className="flex items-start justify-between gap-5"><div className="grid size-20 place-items-center overflow-hidden rounded-full border border-zinc-300 bg-white p-3"><img src={player.image} alt={`${player.name} identity`} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110" /></div><span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700"><Icon className="size-3.5" />{player.role}</span></div><h3 className="mt-8 text-3xl font-semibold tracking-[-.035em]">{player.name}</h3><p className="mt-1 text-sm font-medium text-zinc-500">{player.organisation}</p><p className="mt-5 text-sm leading-6 text-zinc-600">{player.note}</p><span className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-700 transition-[width] duration-500 group-hover:w-full" /></article> })}</div><p className="mt-5 text-xs text-zinc-500 sm:hidden">Neutral, descriptive profiles. Inclusion does not imply ranking or endorsement.</p></ScrollReveal>
        </section>

        <section className="py-14 sm:py-20"><ScrollReveal className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[.55fr_1.45fr] lg:px-8" distance={22}><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Field Notes</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Signals from the ground</h2><Map className="mt-8 size-10 text-emerald-700" /></div><div className="border-t border-zinc-300">{fieldNotes.map((note) => <article key={note.title} className="group grid grid-cols-[80px_1fr] gap-5 border-b border-zinc-300 py-5 transition-transform hover:translate-x-1"><span className="text-xs text-zinc-500">{note.date}</span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">{note.label}</p><h3 className="mt-1 text-xl font-semibold decoration-emerald-700 underline-offset-4 group-hover:underline">{note.title}</h3></div></article>)}</div></ScrollReveal></section>

        <section id="subscribe" className="bg-emerald-700 py-14 text-white sm:py-20"><ScrollReveal className="mx-auto grid max-w-[1100px] gap-8 px-4 text-center sm:px-6" distance={18}><Leaf className="mx-auto size-9" /><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-100">Join the Forestry Briefing</p><h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">One useful briefing for East African forestry, every week.</h2></div><form className="mx-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row" onSubmit={(event) => event.preventDefault()}><Input type="email" required placeholder="Your work email" className="h-12 rounded-none border-white/30 bg-white text-zinc-950" /><Button type="submit" variant="secondary" className="h-12 rounded-none"><Mail className="size-4" /> Subscribe</Button></form><p className="text-xs text-white/65">No invented certainty. Sources and dates stay visible.</p></ScrollReveal></section>
      </main>
      <LandingFooter />
    </div>
  )
}
