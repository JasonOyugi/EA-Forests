"use client"

import React from "react"
import { LandingNavbar } from "./components/navbar"
import { HeroSection } from "./components/hero-section"
import { LogoCarousel } from "./components/logo-carousel"
import { FeaturesSection } from "./components/features-section"
import { TestimonialsSection } from "./components/testimonials-section"
import { BlogSection } from "./components/blog-section"
import { PricingSection } from "./components/pricing-section"
import { CTASection } from "./components/cta-section"
import { ContactSection } from "./components/contact-section"
import { FaqSection } from "./components/faq-section"
import { LandingFooter } from "./components/footer"
import { AboutSection } from "./components/about-section"
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
        <LogoCarousel />
        <AboutSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <BlogSection />
        <FaqSection />
        <CTASection />
        <ContactSection />
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
