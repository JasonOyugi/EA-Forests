"use client"

import React from "react"
import { LandingNavbar } from "./components/navbar"
import { HeroSection } from "./components/hero-section"
import { LandingFooter } from "./components/footer"
import { EditorialBriefSection, SectorSearchSection } from "./components/editorial-landing-section"
import { NewsletterSection } from "./components/newsletter-section"
import { LandingThemeCustomizerTrigger } from "./components/landing-theme-customizer-trigger"

const LandingThemeCustomizer = React.lazy(() =>
  import("./components/landing-theme-customizer").then((module) => ({
    default: module.LandingThemeCustomizer,
  }))
)

export default function LandingPage() {
  const [themeCustomizerOpen, setThemeCustomizerOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
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
