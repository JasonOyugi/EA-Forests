"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import { ArrowLeft, ArrowRight, Mail } from "lucide-react"
import { getAppUrl } from "@/lib/utils"
import { editorialActionLabels } from "./editorial-actions"

const newsletterStories = [
  {
    title: "Pine hybrids enter the East African planting market",
    category: "Information",
    location: "East Africa",
    date: "12 Aug 2026",
    image: "/forest.webp",
    href: "/shop/seedlings#featured-products",
  },
  {
    title: "Where roundwood demand is moving this month",
    category: "Markets",
    location: "Regional",
    date: "11 Aug 2026",
    image: "/greenbuilding.webp",
    href: "/shop/roundwood",
  },
  {
    title: "Match species to site before the rains arrive",
    category: "Tools and Models",
    location: "East Africa",
    date: "9 Aug 2026",
    image: "/maps.jpg",
    href: "/models/site-species-analysis",
  },
  {
    title: "The investment case for dryland forestry",
    category: "Investment/Projects",
    location: "Kenya",
    date: "8 Aug 2026",
    image: "/drylands.webp",
    href: "/shop/forests-land/dryland-frontier-forests",
  },
  {
    title: "What better genetics change at plantation scale",
    category: "Information",
    location: "Uganda",
    date: "5 Aug 2026",
    image: "/eucalyptus.jpg",
    href: "/shop/seedlings",
  },
] as const

const twoDigits = (value: number) => String(value + 1).padStart(2, "0")
const stackWidth = "clamp(42px, 5vw, 70px)"
const nextPeek = "clamp(48px, 8vw, 110px)"
const offsetFor = (index: number) => `clamp(${index * 12}px, ${index * 2.4}vw, ${index * 34}px)`

export function NewsletterSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const wheelTotalRef = useRef(0)
  const wheelCooldownRef = useRef(false)
  const wheelTimerRef = useRef<number | null>(null)
  const pointerStartRef = useRef<number | null>(null)
  const pointerDraggedRef = useRef(false)

  const moveTo = useCallback((index: number) => {
    setSelectedIndex(Math.min(Math.max(index, 0), newsletterStories.length - 1))
  }, [])

  useEffect(() => () => {
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current)
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
    window.setTimeout(() => { wheelCooldownRef.current = false }, 480)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = event.clientX
    pointerDraggedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current === null) return
    const offset = event.clientX - pointerStartRef.current
    if (Math.abs(offset) > 5) pointerDraggedRef.current = true
    setDragOffset(Math.max(-90, Math.min(90, offset * 0.4)))
  }

  const finishPointerGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current !== null) {
      const offset = event.clientX - pointerStartRef.current
      if (offset < -45) moveTo(selectedIndex + 1)
      if (offset > 45) moveTo(selectedIndex - 1)
    }
    pointerStartRef.current = null
    setDragOffset(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section id="newsletter" className="overflow-hidden bg-[#111713] py-12 text-white sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 border-b border-white/15 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">Weekly newsletter</p>
            <a href={getAppUrl("/newsletter")} className="group mt-3 inline-flex items-center gap-3">
              <h2 className="text-4xl font-semibold tracking-[-.04em] transition-colors group-hover:text-emerald-300 sm:text-5xl">The EA Forests Brief</h2>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Open the full intelligence publication for weekly features, essential reads, sector data and field notes.</p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:flex-row">
            <a href={getAppUrl("/newsletter")} className="group inline-flex w-fit items-center gap-3 bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-200">
              Open the Briefing
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href={getAppUrl("/newsletter#subscribe")} className="group inline-flex w-fit items-center gap-3 border border-white/30 px-5 py-3 text-sm font-semibold transition-colors hover:border-emerald-300 hover:text-emerald-300">
              <Mail className="size-4" /> Join the mailing list
            </a>
          </div>
        </div>

        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerGesture}
          onPointerCancel={finishPointerGesture}
          className="relative h-[440px] cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing sm:h-[520px]"
          aria-label="Weekly updates carousel"
        >
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
                key={story.title}
                className="absolute inset-y-0 overflow-hidden bg-black shadow-[-12px_0_28px_rgba(0,0,0,.3)] transition-[left,width,transform,opacity,filter] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{
                  left,
                  width,
                  zIndex: isActive ? 30 : isPast ? 10 + index : 20 - index,
                  opacity: isFuture && index > selectedIndex + 1 ? 0.5 : 1,
                  filter: isActive ? "none" : "saturate(.72) brightness(.72)",
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
                  className="group relative block size-full overflow-hidden"
                  aria-label={isActive ? story.title : `Show update ${index + 1}: ${story.title}`}
                >
                  <img src={story.image} alt="" draggable={false} className="absolute inset-0 size-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/5" />

                  {!isActive ? (
                    <span className="absolute left-1/2 top-5 z-10 -translate-x-1/2 text-[10px] font-bold tracking-[.18em] text-white/75">
                      {twoDigits(index)}
                    </span>
                  ) : null}

                  <div className={`absolute inset-x-0 bottom-0 p-6 transition-all duration-500 sm:p-9 ${isActive ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200">
                      {story.date} <span className="mx-1 text-white/35">|</span> {story.category} <span className="mx-1 text-white/35">|</span> {story.location}
                    </p>
                    <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-.03em] sm:text-4xl lg:text-5xl">{story.title}</h3>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                      {editorialActionLabels[story.category]} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </a>
              </article>
            )
          })}
        </div>

        <div className="mt-8 flex items-center gap-5">
          <span className="min-w-16 text-xs font-semibold tracking-[.18em] text-white/70">
            {twoDigits(selectedIndex)} / {String(newsletterStories.length).padStart(2, "0")}
          </span>
          <div className="relative h-px flex-1 overflow-hidden bg-white/20">
            <span className="absolute inset-y-0 left-0 bg-emerald-300 transition-[width] duration-500" style={{ width: `${((selectedIndex + 1) / newsletterStories.length) * 100}%` }} />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={selectedIndex === 0} onClick={() => moveTo(selectedIndex - 1)} aria-label="Previous newsletter story" className="grid size-11 place-items-center border border-white/25 transition-colors hover:border-emerald-300 hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft className="size-4" /></button>
            <button type="button" disabled={selectedIndex === newsletterStories.length - 1} onClick={() => moveTo(selectedIndex + 1)} aria-label="Next newsletter story" className="grid size-11 place-items-center border border-white/25 transition-colors hover:border-emerald-300 hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-30"><ArrowRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  )
}
