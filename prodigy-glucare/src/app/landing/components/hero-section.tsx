"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Building2, HeartPulse, LoaderCircle, Star, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DotPattern } from "@/components/dot-pattern"
import { getAppUrl } from "@/lib/utils"
import { landingContainer, landingHeroHeadingClass, landingHeroLeadClass } from "./landing-shared"

interface HeroFeatureCardProps {
  href: string
  video: string
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
}

function HeroFeatureCard({ href, video, icon: Icon, title, description, ctaLabel }: HeroFeatureCardProps) {
  const [loading, setLoading] = useState(true)

  return (
    <a
      href={href}
      className="group relative isolate flex min-h-[220px] flex-col justify-end overflow-hidden rounded-lg border p-6 transition-colors hover:border-emerald-400/50"
    >
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-sm"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-white" />
        </div>
      ) : null}

      <video
        src={video}
        loop
        muted
        autoPlay
        playsInline
        preload="metadata"
        className="absolute inset-0 -z-10 size-full object-cover object-center"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 backdrop-blur-sm">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/80">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
        {ctaLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </a>
  )
}

export function HeroSection() {
  return (
    <section
      id="hero"
      className="landing-hero-shell relative overflow-hidden bg-gradient-to-b from-background to-background/80 pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24"
    >
      <div aria-hidden className="hero-map-bg absolute inset-0" />
      <div aria-hidden className="hero-map-tint absolute inset-0" />

      <div className="absolute inset-0">
        <DotPattern className="opacity-100" size="lg" fadeStyle="none" />
      </div>

      <div className={`${landingContainer} relative`}>
        <div className="mx-auto max-w-4xl text-center">
          <div className="landing-fade-up landing-delay-1 mb-8 flex justify-center">
            <a href="#about" className="group inline-flex">
              <Badge
                variant="outline"
                className="badge-emerald-run rounded-lg border border-emerald-500/40 bg-transparent px-4 py-2 text-primary transition-shadow duration-300 hover:bg-emerald-400/5 hover:shadow-[0_0_22px_rgba(23,179,172,0.2)]"
              >
                <span className="hero-badge-star-shell mr-2 inline-flex size-5 items-center justify-center rounded-full">
                  <Star className="h-3 w-3 fill-current" />
                </span>
                Take free quiz to assess your health risks
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Badge>
            </a>
          </div>

          <h1 className={`landing-fade-up landing-delay-2 ${landingHeroHeadingClass}`}>
            Daily Essentials For Your{" "}
            <span className="emerald-glitter-text bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-200 bg-clip-text text-transparent">
              Body & Practice
            </span>
          </h1>

          <p className={`landing-fade-up landing-delay-3 ${landingHeroLeadClass}`}>
            From personal nutrition to clinic support, we provide daily healthcare needs for individuals and medical facilities at wholesale prices. 
          </p>

          <div className="landing-fade-up landing-delay-4 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="cursor-pointer text-base" asChild>
              <a href={getAppUrl("/shop/wellness-products")} className="group relative overflow-hidden">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  Shop Wellness Products
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="emerald-border-hover cursor-pointer text-base transition-all duration-300 hover:bg-secondary/20 hover:text-emerald-400 hover:shadow-[0_0_24px_rgba(23, 179, 172,0.35)]"
            >
              <a href={getAppUrl("/shop/diabetes-programs")}>
                <HeartPulse className="mr-2 h-4 w-4" />
                Book a Free Consultation
              </a>
            </Button>
          </div>
        </div>

        <div className="landing-video-reveal mx-auto mt-20 w-full">
          <div className="relative grid gap-4 rounded-xl bg-transparent p-4 shadow-2xl sm:grid-cols-2 sm:p-6">
            <HeroFeatureCard
              href={getAppUrl("/shop/hospital-services")}
              video="/hospital.mp4"
              icon={Building2}
              title="For Hospitals"
              description="Dialysis consumables, disinfectants, and wound care supplies for hospitals and dialysis centers."
              ctaLabel="Browse hospital supplies"
            />

            <HeroFeatureCard
              href={getAppUrl("/shop/diabetes-programs")}
              video="/diabetes.mp4"
              icon={Stethoscope}
              title="GluCare Diabetes Center"
              description="Specialized, remission-focused diabetes care with structured, personalized programs."
              ctaLabel="View core programs"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

