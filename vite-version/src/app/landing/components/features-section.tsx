"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import { TiLocationArrow } from "react-icons/ti"

import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"

type BentoCardProps = {
  src: string
  title: React.ReactNode
  description?: string
  isComingSoon?: boolean
  href?: string
}

function BentoCard({ src, title, description, isComingSoon, href }: BentoCardProps) {
  const [loading, setLoading] = useState(true)
  const isExternal = href?.startsWith("http")
  const content = (
    <div className="relative size-full overflow-hidden">
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-sm font-medium text-white shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading video
          </div>
        </div>
      ) : null}

      <video
        src={src}
        loop
        muted
        autoPlay
        playsInline
        preload="metadata"
        className="absolute left-0 top-0 size-full object-cover object-center"
        onLoadStart={() => setLoading(true)}
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onError={() => setLoading(false)}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

      <div className="relative z-10 flex size-full flex-col justify-between p-5 text-white">
        <div>
          <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {title}
          </h3>
          {description ? (
            <p className="mt-3 max-w-[48ch] text-sm text-white/80 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {isComingSoon ? (
          <div className="w-fit rounded-full bg-white/10 px-4 py-2 text-xs uppercase text-white/70 backdrop-blur">
            <TiLocationArrow className="mr-1 inline" />
            coming soon
          </div>
        ) : null}
      </div>
    </div>
  )

  return href ? (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="block size-full"
    >
      {content}
    </a>
  ) : (
    content
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className={`bg-muted/30 ${landingSectionPadding}`}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            Our Features
          </Badge>
          <h2 className={landingHeadingClass}>
            Everything you need to know about East Africa forests in one place
          </h2>
        </ScrollReveal>

        <ScrollReveal className="mb-7" delay={80}>
          <BentoTilt className="relative h-full w-full overflow-hidden rounded-xl border bg-card shadow-sm md:h-[50vh]">
            <BentoCard
              src="/feature-1.mp4"
              title={<>Trade Forestry Assets</>}
              description="Have a forest? Looking to source roundwood or carbon? Click here to find credible partners asap."
              href="/shop/roundwood"
            />
          </BentoTilt>
        </ScrollReveal>

        <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-2 md:auto-rows-[200px]">
          <ScrollReveal className="h-full md:row-span-2" delay={120}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                src="/feature-2.mp4"
                title={<>The Nursery Shop</>}
                description="Want to start a forest? Whether you already have land or not, you can find and plant the latest generation of tree species, hybrids, and clones."
                href="/shop/seedlings"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={180}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                src="/feature-3.mp4"
                title={<>Market Insight Tools</>}
                description="Forestry on steroids - introduce cutting edge, on-the-ground analysis to calculate the most profitable trades and deals in real-time"
                href="https://github.com/JasonOyugi/EA-Forestry-Geospatial-Analysis.git"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                src="/feature-4.mp4"
                title={<>Project Development</>}
                description="Create, develop, execute and monitor a forestry-based project with AI"
                isComingSoon
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <BentoTilt className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                src="/feature-5.mp4"
                title={<>More coming soon!!</>}
                description="!!!"
                isComingSoon
              />
            </BentoTilt>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
