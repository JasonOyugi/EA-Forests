"use client"

import { ArrowRight, Building2, Clock3, Factory, LandPlot, MapPinned, Sprout, Tractor } from "lucide-react"
import { useRef, useState } from "react"
import type { MouseEvent } from "react"

import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { editorialActionLabels } from "./editorial-actions"
import type { EditorialCategory } from "./editorial-actions"

type Story = {
  title: string
  category: EditorialCategory
  image: string
  href: string
  size: string
  updatedAt: string
  video?: string
}

const stories: Story[] = [
  { title: "Here's how forests make money in East Africa", category: "Information", image: "https://cdn.agriland.ie/uploads/2020/09/Image-source-Veon-2.jpg", href: "/articles/how-forests-make-money-east-africa", size: "md:col-span-8 h-[420px]", updatedAt: "12 Aug 2026" },
  { title: "Ready to sell your wood?", category: "Markets", image: "https://saforestryonline.co.za/wp-content/uploads/2025/07/The-John-Deere-2144G-tracked-swing-harvester-is-ideal-for-fast-growing-high-yield-plantations-scaled.jpg", href: "/shop/roundwood", size: "md:col-span-4 h-[420px]", updatedAt: "11 Aug 2026" },
  { title: "The best planting material for East Africa", category: "Markets", image: "https://dryrocktreesnursery.com/cdn/shop/files/lodgepoletray.jpg?v=1759249757&width=1946", href: "/shop/seedlings", size: "md:col-span-4 h-[320px]", updatedAt: "10 Aug 2026" },
  { title: "The ultimate site-species analysis tool", category: "Tools and Models", image: "/maps.jpg", href: "/models/site-species-analysis", size: "md:col-span-4 h-[320px]", updatedAt: "9 Aug 2026" },
  { title: "It is time to restore the drylands profitably", category: "Investment/Projects", image: "/drylands.webp", href: "/articles/dryland-forestry-investment-case", size: "md:col-span-4 h-[320px]", updatedAt: "8 Aug 2026" },
  { title: "Everything you need to know about clonal nursery business ", category: "Tools and Models", image: "https://eucalyptusclones.in/images/clonal-gallery-1.png", href: "/models", size: "md:col-span-5 h-[360px]", updatedAt: "7 Aug 2026" },
  { title: "Build a high-performance forest asset today", category: "Investment/Projects", image: "/about.webp", href: "/shop/roundwood#market-concessions", size: "md:col-span-7 h-[360px]", updatedAt: "6 Aug 2026" },
  { title: "Find a contractor", category: "Markets", image: "https://lh7-rt.googleusercontent.com/docsz/AD_4nXf0_QfLRGSzr9zYlJv3HOg7b-maJggsWo5S6wrH5lq-x1s1zm1SAKkolOdTqXJG6gTNBEzWHEhUS20KjJsmyGx-8YH3sFe0Kpp9X0r94k-mRMNz6u0usF3XGmq_hHb_eLtgB1UsRpCJ5ajw3vaz0F8?key=bd1pwDgRDy0juO9kdazY2Q", href: "/shop/seedlings", size: "md:col-span-3 h-[300px]", updatedAt: "5 Aug 2026" },
  { title: "The top nurseries in the world are looking for partnerships in East Africa. Is it you?", category: "Information", image: "https://www.totalenergygroup.com/wp-content/uploads/2018/08/greenhouse_interior.jpg", href: "/articles/nursery-partnerships-east-africa", size: "md:col-span-5 h-[300px]", updatedAt: "4 Aug 2026" },
  { title: "Model the forest before committing capital", category: "Tools and Models", image: "/apps.png", video: "/hero-3.mp4", href: "/models/model-2", size: "md:col-span-4 h-[300px]", updatedAt: "3 Aug 2026" },
  { title: "High-performance forests and stronger returns", category: "Investment/Projects", image: "/ke.jpg", href: "/shop/forests-land/high-performance-forests", size: "md:col-span-7 h-[360px]", updatedAt: "2 Aug 2026" },
  { title: "Join the people building the sector", category: "Information", image: "/contact-2.webp", href: "#contact", size: "md:col-span-5 h-[360px]", updatedAt: "1 Aug 2026" },
]

const editorialCategories: EditorialCategory[] = ["Information", "Markets", "Tools and Models", "Investment/Projects"]

const sectors = [
  { name: "Land", description: "Sites, forest land and opportunities", icon: LandPlot, href: "/shop/forests-land" },
  { name: "Genetics & nurseries", description: "Proven genetics, seed and planting stock", icon: Sprout, href: "/shop/seedlings" },
  { name: "Contractors", description: "Establishment and field services", icon: Tractor, href: "/shop/forests-land" },
  { name: "Processors", description: "Mills, buyers and timber markets", icon: Factory, href: "/shop/roundwood#market-concessions" },
  { name: "Developers", description: "Projects, land and investment", icon: Building2, href: "/shop/forests-land" },
] as const

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
      className={`group relative block min-h-[280px] overflow-hidden bg-zinc-900 [perspective:1100px] transition-[width,height,transform] duration-500 ${size ?? story.size}`}
    >
      {story.video ? (
        <video ref={(node) => { mediaRef.current = node }} src={story.video} poster={story.image} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" />
      ) : (
        <img ref={(node) => { mediaRef.current = node }} src={story.image} alt="" className="absolute inset-0 size-full origin-center object-cover transition-transform ease-out will-change-transform [transform:perspective(1100px)_rotateX(0deg)_rotateY(0deg)_translate3d(0,0,0)_scale(1.02)]" loading="lazy" decoding="async" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10 transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />
      <div ref={lightRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300" />
      <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-medium text-white/65 backdrop-blur-sm sm:left-5 sm:top-5">
        <Clock3 className="size-3" /> Last updated: {story.updatedAt}
      </span>
      <div className="absolute inset-x-0 bottom-0 z-10 translate-y-2 p-5 text-white transition-transform duration-500 group-hover:translate-y-0 sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200"><span className="mx-1 text-white/45">|</span>{story.category}</p>
        <h3 className="mt-2 max-w-2xl text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{story.title}</h3>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-0 transition-all duration-500 group-hover:opacity-100">{editorialActionLabels[story.category]} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  )
}

export function SectorSearchSection() {
  return (
    <section id="discover" className="py-12 text-zinc-900 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-2">
        <ScrollReveal className="grid items-stretch gap-3" delay={80}>
          <a href="/shop/roundwood#market-concessions" className="group relative min-h-[380px] overflow-hidden bg-zinc-900 p-6 text-white sm:p-8">
            <img src="/maps.jpg" alt="East African forestry sector map" className="absolute inset-0 size-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-zinc-950/72 to-black/25" />
            <div className="relative flex min-h-[316px] flex-col justify-between">
              <MapPinned className="size-8 text-emerald-200" />
              <div>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">The Map of the Sector</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/75">Explore the people, assets and market activity behind the region&apos;s forestry value chain.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Open map <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </div>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

export function EditorialBriefSection() {
  const [visibleCount, setVisibleCount] = useState(7)
  const [activeCategory, setActiveCategory] = useState<EditorialCategory | "All">("All")
  const filteredStories = activeCategory === "All" ? stories : stories.filter((story) => story.category === activeCategory)
  const visibleStories = filteredStories.slice(0, visibleCount)

  const selectCategory = (category: EditorialCategory | "All") => {
    setActiveCategory(category)
    setVisibleCount(7)
  }

  const filteredSize = (index: number) => {
    if (visibleStories.length === 1) return "md:col-span-12 h-[440px]"
    if (visibleStories.length === 2) return "md:col-span-6 h-[400px]"
    if (visibleStories.length === 3) return "md:col-span-4 h-[360px]"
    const sizes = [
      "md:col-span-7 h-[360px]",
      "md:col-span-5 h-[360px]",
      "md:col-span-4 h-[360px]",
      "md:col-span-4 h-[360px]",
      "md:col-span-4 h-[360px]",
      "md:col-span-5 h-[360px]",
      "md:col-span-7 h-[360px]",
    ]
    return sizes[index % sizes.length]
  }

  return (
    <section id="brief" className="pb-16 text-zinc-900 sm:pb-24">
      <div className="mx-auto max-w-[1440px] px-2">

        <ScrollReveal className="mb-7 flex flex-wrap gap-2" delay={40}>
          {(["All", ...editorialCategories] as const).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => selectCategory(category)}
              aria-pressed={activeCategory === category}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${activeCategory === category ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-700 hover:text-emerald-700"}`}
            >
              {category}
            </button>
          ))}
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div key={activeCategory} className="grid grid-cols-1 gap-2 md:grid-cols-12">
            {visibleStories.map((story, index) => <StoryTile key={story.title} story={story} size={activeCategory === "All" ? undefined : filteredSize(index)} />)}
          </div>
        </ScrollReveal>

        {visibleCount < filteredStories.length ? (
          <ScrollReveal className="mt-10 border-t border-zinc-300 pt-6 text-center" delay={140}>
            <button type="button" onClick={() => setVisibleCount(filteredStories.length)} className="group inline-flex items-center gap-3 text-sm text-primary uppercase tracking-[.16em]">Load more stories <ArrowRight className="size-4 rotate-90 transition-transform group-hover:translate-y-1" /></button>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  )
}
