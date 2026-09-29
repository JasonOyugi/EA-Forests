"use client"

import React from "react"
import { useLocation } from "react-router-dom"
import { LandingNavbar } from "./components/navbar"
import { HeroSection } from "./components/hero-section"
import { LandingFooter } from "./components/footer"
import { EditorialBriefSection, SectorSearchSection } from "./components/editorial-landing-section"
import { NewsletterSection } from "./components/newsletter-section"
import { LandingThemeCustomizerTrigger } from "./components/landing-theme-customizer-trigger"
import "./landing-responsive.css"

const LandingThemeCustomizer = React.lazy(() =>
  import("./components/landing-theme-customizer").then((module) => ({
    default: module.LandingThemeCustomizer,
  }))
)

/**
 * Deep links such as /landing#sector-map arrive before the lazily rendered sections exist, and
 * content above the target keeps loading afterwards. Wait for the target, then hold it in place
 * for a moment while the layout settles; stop as soon as the visitor scrolls themselves.
 */
function useScrollToHash() {
  const { hash } = useLocation()

  React.useEffect(() => {
    const id = decodeURIComponent(hash.slice(1))
    if (!id) return

    let frame = 0
    let settleUntil = 0
    const findDeadline = performance.now() + 4000
    const stop = () => cancelAnimationFrame(frame)
    const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const
    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true, once: true }))

    const align = () => {
      const now = performance.now()
      const target = document.getElementById(id)
      if (target) {
        if (!settleUntil) settleUntil = now + 2500
        const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
        const drift = target.getBoundingClientRect().top - offset
        if (Math.abs(drift) > 2) window.scrollTo({ top: window.scrollY + drift, behavior: "instant" })
        if (now < settleUntil) frame = requestAnimationFrame(align)
        return
      }
      if (now < findDeadline) frame = requestAnimationFrame(align)
    }
    frame = requestAnimationFrame(align)

    return () => {
      stop()
      userEvents.forEach((type) => window.removeEventListener(type, stop))
    }
  }, [hash])
}

export default function LandingPage() {
  const [themeCustomizerOpen, setThemeCustomizerOpen] = React.useState(false)
  useScrollToHash()

  return (
    <div className="landing-page min-h-screen bg-emerald-100 text-emerald-950 dark:bg-[#07110c] dark:text-emerald-50">
      <LandingNavbar />

      <main>
        <HeroSection />
        <NewsletterSection />
        <SectorSearchSection />
        <EditorialBriefSection />
      </main>

      <LandingFooter />

      <LandingThemeCustomizerTrigger onClick={() => setThemeCustomizerOpen(true)} />
      <React.Suspense fallback={null}>
        {themeCustomizerOpen ? (
          <LandingThemeCustomizer
            open={themeCustomizerOpen}
            onOpenChange={setThemeCustomizerOpen}
          />
        ) : null}
      </React.Suspense>
    </div>
  )
}
