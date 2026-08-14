"use client"

import { ArrowRight, CalendarDays, HeartPulse, Star, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DotPattern } from "@/components/dot-pattern"
import { getAppUrl } from "@/lib/utils"
import { landingContainer, landingHeroHeadingClass, landingHeroLeadClass } from "./landing-shared"

export function HeroSection() {
  return (
    <section
      id="hero"
      className="landing-hero-shell relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-black pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24"
    >
      <video
        src="/diabetes.mp4"
        loop
        muted
        autoPlay
        playsInline
        preload="metadata"
        className="absolute inset-0 -z-30 size-full object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 -z-20 bg-gradient-to-b from-black/70 via-black/45 to-black/75" />
      <div aria-hidden className="absolute inset-0 -z-10">
        <DotPattern className="opacity-40" size="lg" fadeStyle="none" />
      </div>

      <div className={`${landingContainer} relative flex min-h-[calc(100vh-12rem)] items-center`}>
        <div className="max-w-4xl">
          <div className="landing-fade-up landing-delay-1 mb-8 flex">
            <a href="#about" className="group inline-flex">
              <Badge
                variant="outline"
                className="badge-emerald-run rounded-lg border border-emerald-300/50 bg-black/20 px-4 py-2 text-emerald-50 backdrop-blur transition-shadow duration-300 hover:bg-emerald-400/10 hover:shadow-[0_0_22px_rgba(23,179,172,0.24)]"
              >
                <span className="hero-badge-star-shell mr-2 inline-flex size-5 items-center justify-center rounded-full">
                  <Star className="h-3 w-3 fill-current" />
                </span>
                Take free quiz to assess your diabetes risk
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Badge>
            </a>
          </div>

          <h1 className={`landing-fade-up landing-delay-2 text-white ${landingHeroHeadingClass}`}>
            GluCare{" "}
            <span className="emerald-glitter-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-cyan-100 bg-clip-text text-transparent">
              Diabetes Center
            </span>
          </h1>

          <p className={`landing-fade-up landing-delay-3 max-w-2xl text-white/82 ${landingHeroLeadClass}`}>
            Structured diabetes care, remission-focused programs, health tools, and consultation support in one focused care experience.
          </p>

          <div className="landing-fade-up landing-delay-4 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="cursor-pointer text-base" asChild>
              <a href="#pricing" className="group relative overflow-hidden">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  View Diabetes Programs
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="cursor-pointer border-white/50 bg-white/8 text-base text-white transition-all duration-300 hover:bg-white/14 hover:text-emerald-100 hover:shadow-[0_0_24px_rgba(23,179,172,0.35)]"
            >
              <a href={getAppUrl("/calendar")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Book a Consultation
              </a>
            </Button>

            <Button
              variant="ghost"
              size="lg"
              asChild
              className="cursor-pointer text-base text-white hover:bg-white/10 hover:text-emerald-100"
            >
              <a href={getAppUrl("/models")}>
                <HeartPulse className="mr-2 h-4 w-4" />
                Health Tools
              </a>
            </Button>
          </div>
        </div>
      </div>
      <a
        href="https://www.youtube.com/results?search_query=GluCare+Diabetes+Center"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Watch GluCare videos on YouTube"
        className="hero-youtube-badge absolute bottom-6 right-6 z-20 inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur transition-transform hover:bg-red-600/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Youtube className="h-5 w-5" />
      </a>
    </section>
  )
}
