"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent, WheelEvent } from "react"
import { ArrowLeft, ArrowRight, Mail } from "lucide-react"

const newsletterStories = [
  {
    chapter: "Policy and regulation",
    strapline: "EA Forest live",
    title: "How the US-Iran war is reshaping East African forestry",
    summary: "From fuel prices to trade decisions, track every effect the war in Iran has on East African forestry.",
    location: "East Africa",
    image: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA28mi8n.img?w=2048&h=1365&m=4&q=81",
    href: "/articles",
    accent: "#e96e65",
  },
  {
    chapter: "Finance and Markets",
    strapline: "World Bank page",
    title: "The carbon markets are set to inject +$300m into Ethiopia's economy",
    summary: "Ethiopia becomes the first country to reach issuance under the World Bank BioCarbon Fund ISFL.",
    location: "Oromia: Ethiopia",
    image: "https://advocacy4oromia.org/wp-content/uploads/2014/06/landscape-around-dube-bute-in-the-oromia-region.jpg",
    href: "https://cats.worldbank.org/ProgramDetails?programId=352&sectorId=70&utm_source=chatgpt.com",
    accent: "#c5cf86",
  },
  {
    chapter: "Investments",
    strapline: "CAFI Report",
    title: "CAFI approves a new $22.65m private-sector finance facility",
    summary: "A project implemented by the CFC to begin financing SMEs in deforestation-free value chains across the Congo Basin.",
    location: "DRC",
    image: "https://files.nettsteder.regjeringen.no/wpuploads01/sites/543/2023/09/Yangambi-Research-Station-1500x1000-1.jpg",
    href: "https://cafi.org/app/uploads/2026/03/EB.2026.20-Decision-Private-Sector-CFC-Project-Approval.pdf",
    accent: "#a980c0",
  },
  {
    chapter: "Genetics",
    strapline: "Forest News",
    title: "Genetic quality is moving into the regulatory system",
    summary: "Potentially changes who can credibly supply seedlings and seed, and how they are evaluated.",
    location: "Kenya/Rwanda",
    image: "https://www.forestsnews.org/wp-content/uploads/2026/08/KT_251107_ICRAF_QTS_86352-1024x1536.jpg",
    href: "https://www.forestsnews.org/162337/strengthening-policy-tree-seed-systems-africa",
    accent: "#6ce3a9",
  },
  {
    chapter: "Technology",
    strapline: "EA Forests Live",
    title: "The latest in geospatial intelligence for forestry",
    summary: "Follow the latest developments in geospatial intelligence relevant to forestry in East Africa",
    location: "East Africa",
    image: "https://eros.usgs.gov/doi-remote-sensing-activities/sites/default/files/public/USGS/Wu_lidar.png",
    href: "https://eaforests.org/ea-forests-live/geospatial-intelligence-forestry",
    accent: "#8d92d1",
  },
] as const

const chapterNumber = (value: number) => String(value + 1).padStart(2, "0")
const stackWidth = "clamp(52px, 5vw, 82px)"
const nextPeek = "clamp(96px, 11vw, 172px)"
const offsetFor = (index: number) => `clamp(${index * 16}px, ${index * 3.25}vw, ${index * 52}px)`

export function NewsletterSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const wheelTotalRef = useRef(0)
  const wheelCooldownRef = useRef(false)
  const wheelTimerRef = useRef<number | null>(null)
  const wheelCooldownTimerRef = useRef<number | null>(null)
  const pointerStartRef = useRef<number | null>(null)
  const pointerDraggedRef = useRef(false)

  const moveTo = useCallback((index: number) => {
    setSelectedIndex(Math.min(Math.max(index, 0), newsletterStories.length - 1))
  }, [])

  useEffect(() => () => {
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current)
    if (wheelCooldownTimerRef.current !== null) window.clearTimeout(wheelCooldownTimerRef.current)
  }, [])

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    const atStart = selectedIndex === 0 && delta < 0
    const atEnd = selectedIndex === newsletterStories.length - 1 && delta > 0

    if (atStart || atEnd || Math.abs(delta) < 4) return

    event.preventDefault()
    if (wheelCooldownRef.current) return

    wheelTotalRef.current += delta
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = window.setTimeout(() => {
      wheelTotalRef.current = 0
      wheelTimerRef.current = null
    }, 150)

    if (Math.abs(wheelTotalRef.current) < 70) return

    moveTo(selectedIndex + (wheelTotalRef.current > 0 ? 1 : -1))
    wheelTotalRef.current = 0
    wheelCooldownRef.current = true
    wheelCooldownTimerRef.current = window.setTimeout(() => {
      wheelCooldownRef.current = false
      wheelCooldownTimerRef.current = null
    }, 520)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    pointerStartRef.current = event.clientX
    pointerDraggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current === null) return
    const offset = event.clientX - pointerStartRef.current
    if (Math.abs(offset) > 5) pointerDraggedRef.current = true
    setDragOffset(Math.max(-100, Math.min(100, offset * 0.42)))
  }

  const finishPointerGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current !== null) {
      const offset = event.clientX - pointerStartRef.current
      if (offset < -45) moveTo(selectedIndex + 1)
      if (offset > 45) moveTo(selectedIndex - 1)
    }

    pointerStartRef.current = null
    setDragOffset(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      moveTo(selectedIndex - 1)
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      moveTo(selectedIndex + 1)
    }
    if (event.key === "Home") {
      event.preventDefault()
      moveTo(0)
    }
    if (event.key === "End") {
      event.preventDefault()
      moveTo(newsletterStories.length - 1)
    }
  }

  return (
    <section id="newsletter" className="overflow-hidden bg-[#070907] text-[#f4f0e8]">
      <div className="border-y border-white/15 px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8">
        <div className="flex items-center justify-between gap-6 text-xs font-semibold uppercase tracking-[.22em] text-white/60">
          <p>EA Forests — Field intelligence</p>
        </div>

        <div className="mt-9 grid gap-8 lg:items-end">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.3em] text-[#3fe3bf]">1st week of September, 2026</p>
          <h2 className="landing-newsletter-heading">
            EA FORESTRY THIS WEEK
          </h2>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border-t border-white/15 px-5 py-5 lg:px-8">
          <span className="min-w-20 text-xs font-semibold tracking-[.18em] text-white/65">
            {chapterNumber(selectedIndex)} / {String(newsletterStories.length).padStart(2, "0")}
          </span>
          <div className="relative h-px overflow-hidden bg-white/20">
            <span
              className="absolute inset-y-0 left-0 bg-[#3fe3bf] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${((selectedIndex + 1) / newsletterStories.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={selectedIndex === 0} onClick={() => moveTo(selectedIndex - 1)} aria-label="Previous forestry brief" className="grid size-11 place-items-center border border-white/30 transition-colors hover:border-[#3fe3bf] hover:bg-[#3fe3bf] focus-visible:border-[#3fe3bf] focus-visible:bg-[#3fe3bf] disabled:cursor-not-allowed disabled:opacity-25 motion-reduce:transition-none"><ArrowLeft className="size-4" /></button>
            <button type="button" disabled={selectedIndex === newsletterStories.length - 1} onClick={() => moveTo(selectedIndex + 1)} aria-label="Next forestry brief" className="grid size-11 place-items-center border border-white/30 transition-colors hover:border-[#3fe3bf] hover:bg-[#3fe3bf] focus-visible:border-[#3fe3bf] focus-visible:bg-[#3fe3bf] disabled:cursor-not-allowed disabled:opacity-25 motion-reduce:transition-none"><ArrowRight className="size-4" /></button>
          </div>
        </div>
        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerGesture}
          onPointerCancel={finishPointerGesture}
          onKeyDown={handleKeyDown}
          className="relative h-[min(74svh,760px)] min-h-[560px] cursor-grab touch-pan-y select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3fe3bf] active:cursor-grabbing"
          role="region"
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Forestry sector briefings"
        >
          <p className="sr-only" aria-live="polite">{newsletterStories[selectedIndex].chapter} briefing, chapter {selectedIndex + 1} of {newsletterStories.length}</p>

          {newsletterStories.map((story, index) => {
            const isPast = index < selectedIndex
            const isActive = index === selectedIndex
            const isFuture = index > selectedIndex
            const activeLeft = offsetFor(selectedIndex)
            const left = isPast
              ? offsetFor(index)
              : isActive
                ? activeLeft
                : `calc(100% - ${nextPeek} + ${offsetFor(index - selectedIndex - 1)})`
            const width = isPast
              ? stackWidth
              : isActive
                ? selectedIndex === newsletterStories.length - 1
                  ? `calc(100% - ${activeLeft})`
                  : `calc(100% - ${activeLeft} - ${nextPeek})`
                : `calc(100% - ${activeLeft} - ${nextPeek})`

            return (
              <article
                key={story.chapter}
                className="absolute inset-y-0 overflow-hidden border-r border-white/20 bg-black shadow-[-18px_0_44px_rgba(0,0,0,.42)] transition-[left,width,transform,opacity,filter] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                style={{
                  left,
                  width,
                  zIndex: isActive ? 30 : isPast ? 10 + index : 20 - index,
                  opacity: isFuture && index > selectedIndex + 1 ? 0.55 : 1,
                  filter: isActive ? "none" : "saturate(.55) brightness(.58)",
                  transform: isActive ? `translateX(${dragOffset}px)` : "translateX(0)",
                }}
              >
                <a
                  href={story.href}
                  onClick={(event) => {
                    if (pointerDraggedRef.current) {
                      event.preventDefault()
                      pointerDraggedRef.current = false
                      return
                    }
                    if (!isActive) {
                      event.preventDefault()
                      moveTo(index)
                    }
                  }}
                  className="group relative block size-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  aria-label={isActive ? `Read the ${story.chapter} brief` : `Show chapter ${index + 1}: ${story.chapter}`}
                >
                  <img
                    src={story.image}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.045] motion-reduce:transition-none"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,4,3,.88)_0%,rgba(2,4,3,.3)_56%,rgba(2,4,3,.16)_100%),linear-gradient(0deg,rgba(2,4,3,.84)_0%,transparent_56%)]" />

                  {!isActive ? (
                    <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center gap-4 py-6 [writing-mode:vertical-rl]">
                      <span className="text-xs tracking-[.22em] text-white/55">{chapterNumber(index)}</span>
                      <span className="text-sm font-semibold uppercase tracking-[.16em]" style={{ color: story.accent }}>{story.chapter}</span>
                    </div>
                  ) : null}

                  <div className={`absolute inset-0 grid grid-rows-[auto_1fr] p-4 transition-[opacity,transform] delay-150 duration-500 motion-reduce:transition-none ${isActive ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
                    <div className="flex items-start justify-between gap-8 self-start">
                      <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">
                        {chapterNumber(index)} / {story.location}
                      </p>
                      <p className="max-w-xs text-right text-xs font-semibold uppercase tracking-[.18em]" style={{ color: story.accent }}>
                        {story.strapline}
                      </p>
                    </div>

                    <div className="w-full self-end">
                      <p className="landing-newsletter-chapter" style={{ color: story.accent }}>
                        {story.chapter}
                      </p>
                      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_20rem] items-center gap-6 border-t border-white/35 pt-5">
                        <h3 className="landing-newsletter-story-title font-medium text-white">
                          {story.title}
                        </h3>
                        <div>
                          <p className="text-base text-white/72">{story.summary}</p>
                          <span className="mt-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[.15em]">
                            Read the brief <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5 motion-reduce:transition-none" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              </article>
            )
          })}
        </div>
      </div>

      <div className="lg:hidden">
        {newsletterStories.map((story, index) => (
          <article key={story.chapter} className="relative min-h-[100svh] border-b border-white/20">
            <a href={story.href} className="group absolute inset-0 block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white">
              <img src={story.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-1000 group-hover:scale-105 motion-reduce:transition-none" />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,4,3,.94)_0%,rgba(2,4,3,.42)_62%,rgba(2,4,3,.2)_100%)]" />
              <div className="absolute inset-0 grid grid-rows-[auto_1fr] p-2">
                <div className="flex items-start justify-between gap-1 self-start text-xs font-semibold uppercase tracking-[.18em]">
                  <span>{chapterNumber(index)} / {story.location}</span>
                  <span className="max-w-[11rem] text-right" style={{ color: story.accent }}>{story.strapline}</span>
                </div>
                <div className="w-full max-w-2xl self-end">
                  <p className="landing-newsletter-chapter" style={{ color: story.accent }}>{story.chapter}</p>
                  <div className="mt-4 grid grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-center gap-4 border-t border-white/40 pt-4 sm:mt-5 sm:gap-6 sm:pt-5">
                    <h3 className="landing-newsletter-story-title font-medium text-white">{story.title}</h3>
                    <div>
                      <p className="type-small-copy text-white/72">{story.summary}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] sm:gap-3 sm:tracking-[.15em]">
                        Read the brief <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1.5 motion-reduce:transition-none" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
      <div className="landing-container mt-6 flex flex-wrap gap-x-6 gap-y-3 py-6 text-xs font-semibold uppercase tracking-[.16em]">
        <a className="group inline-flex items-center gap-2 hover:text-[#3fe3bf] focus-visible:text-[#3fe3bf]" href="#contact">
          <Mail className="size-3.5" /> Subscribe
        </a>
      </div>
    </section>
  )
}
