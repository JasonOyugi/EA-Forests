"use client"

import { LandingNavbar } from "./components/navbar"
import { HeroSection } from "./components/hero-section"
import { LogoCarousel } from "./components/logo-carousel"
// import { FeaturesSection } from "./components/features-section"
import { TestimonialsSection } from "./components/testimonials-section"
// import { CTASection } from "./components/cta-section"
import { ContactSection } from "./components/contact-section"
import { TeamSection } from "./components/team-section"
import { LandingFooter } from "./components/footer"
import { AboutSection } from "./components/about-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <main>
        <HeroSection />
        <LogoCarousel />
        {/* <FeaturesSection /> */}
        <AboutSection />
        <TestimonialsSection />
        <TeamSection />
        {/* <CTASection /> */}
        <ContactSection />
      </main>

      <LandingFooter />

    </div>
  )
}
