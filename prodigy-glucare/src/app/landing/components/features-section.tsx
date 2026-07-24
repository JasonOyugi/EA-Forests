"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { BookOpen, HeartPulse, LineChart, LoaderCircle, ShoppingBag, Sparkles, Stethoscope } from "lucide-react"

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
  icon: LucideIcon
  gradient: string
  title: React.ReactNode
  description?: string
  isComingSoon?: boolean
  href?: string
  image?: string
  video?: string
}

function BentoCard({ icon: Icon, gradient, title, description, isComingSoon, href, image, video }: BentoCardProps) {
  const [loading, setLoading] = useState(Boolean(video))

  const content = (
    <div className={`relative size-full overflow-hidden ${image || video ? "" : `bg-gradient-to-br ${gradient}`}`}>
      {video ? (
        <>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-sm"
            >
              <LoaderCircle className="h-4 w-4 animate-spin text-white" />
            </div>
          ) : null}
          <video
            src={video}
            loop
            muted
            autoPlay
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover object-center"
            onLoadedData={() => setLoading(false)}
            onCanPlay={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        </>
      ) : image ? (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        </>
      ) : null}

      <div className="relative z-10 flex size-full flex-col justify-between p-5">
        <div>
          <div
            className={`mb-4 flex size-11 items-center justify-center rounded-2xl shadow-sm backdrop-blur ${
              image || video ? "bg-white/15 text-white" : "bg-background/70 text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h3 className={`text-2xl font-semibold leading-tight tracking-tight sm:text-3xl ${image || video ? "text-white" : ""}`}>
            {title}
          </h3>
          {description ? (
            <p className={`mt-3 max-w-[48ch] text-sm sm:text-base ${image || video ? "text-white/85" : "text-muted-foreground"}`}>
              {description}
            </p>
          ) : null}
        </div>

        {isComingSoon ? (
          <div
            className={`w-fit rounded-full px-4 py-2 text-xs uppercase backdrop-blur ${
              image || video ? "bg-white/15 text-white/80" : "bg-background/70 text-muted-foreground"
            }`}
          >
            coming soon
          </div>
        ) : null}
      </div>
    </div>
  )

  return href ? (
    <a href={href} className="block size-full">
      {content}
    </a>
  ) : (
    content
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className={`${landingSectionPadding}`}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            What we offer
          </Badge>
          <h2 className={landingHeadingClass}>
            Day-to-day Individual + Facility Healthcare Solutions
          </h2>
        </ScrollReveal>

        <ScrollReveal className="mb-7" delay={80}>
          <BentoTilt className="relative h-full w-full overflow-hidden rounded-xl border bg-card shadow-sm md:h-[50vh]">
            <BentoCard
              icon={Sparkles}
              gradient="from-emerald-500/20 via-emerald-500/5 to-transparent"
              video="/heal.mp4"
              title={<>Daily Healthcare Essentials</>}
              description="All your health needs in one place"
              href="#about"
            />
          </BentoTilt>
        </ScrollReveal>

        <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-2 md:auto-rows-[200px] lg:grid-cols-2 lg:auto-rows-[250px]">
          <ScrollReveal className="h-full md:row-span-2" delay={120}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                icon={ShoppingBag}
                gradient="from-emerald-500/20 via-emerald-500/5 to-transparent"
                video="/wellness.mp4"
                title={<>The Wellness Store</>}
                description="Supplements, skincare, and weight-management products at the best prices."
                href="/shop/wellness-products"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={180}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                icon={Stethoscope}
                gradient="from-sky-500/20 via-sky-500/5 to-transparent"
                video="/hospital.mp4"
                title={<>Hospital Essentials</>}
                description="Need disinfectants? Wound care supplies? In wholesale quantities and prices? We got you covered!"
                href="/shop/hospital-services"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                icon={HeartPulse}
                gradient="from-rose-500/20 via-rose-500/5 to-transparent"
                video = "/diabetes.mp4"
                title={<>GluCare Core Programs</>}
                description="Structured, personalised diabetes remission and management programs."
                href="/shop/diabetes-programs"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <BentoTilt className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                icon={BookOpen}
                gradient="from-amber-500/20 via-amber-500/5 to-transparent"
                image="/body cs.jpg"
                title={<>Health Information Library</>}
                description="Practical, easy-to-follow guidance on diabetes management and everyday wellness."
                href="#blog"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={360}>
            <BentoTilt className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                icon={LineChart}
                gradient="from-violet-500/20 via-violet-500/5 to-transparent"
                title={<>Remote Monitoring & Telemedicine</>}
                description="Track progress and consult remotely between visits."
                isComingSoon
              />
            </BentoTilt>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

