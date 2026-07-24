"use client"

import { HeartPulse, ShoppingBag, Stethoscope, BookOpen } from "lucide-react"

import { BentoTilt } from "@/components/ui/bento-tilt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"

const values = [
  {
    title: "Shop nutritional products",
    href: "/shop/wellness-products",
    icon: ShoppingBag,
    image: "/shake1.jpg",
    description:
      "Browse our online nutritional store for supplements, substitute foods, and weight-management products.",
  },
  {
    title: "Book nutritional support",
    href: "/shop/hospital-services",
    icon: Stethoscope,
    image: "/veggie.png",
    description:
      "Premium nutritional support provided by experts tailored to your needs.",
  },
  {
    title: "Start a remission program",
    href: "/shop/diabetes-programs",
    icon: HeartPulse,
    image: "/diabetic1.jpg",
    description:
      "Enrol in GluCare's professional, structured, remission-focused diabetes programs, personalised around you.",
  },
  {
    title: "Learn from our health library",
    href: "#blog",
    icon: BookOpen,
    image: "/head%20cs.jpg",
    description:
      "Explore health information, practical daily steps, and guidance from our specialists.",
  },
] as const

export function AboutSection() {
  return (
    <section id="about" className={landingSectionPadding}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            The Wellness Hub
          </Badge>
          <h2 className={landingHeadingClass}>
            Did you know that 90% of your body’s "happiness chemical" is actually made in your gut?
          </h2>
          <p className={`${landingLeadClass} max-w-4xl`}>
            It's true. Serotonin is almost entirely produced by your digestive system, and when you actively starve the good gut bacteria needed to manufacture that chemical, your brain suffers. 
            That means a bad mood, high anxiety, or sudden brain fog often has nothing to do with your mind, and everything to do with what you ate for lunch!
          </p>
        </ScrollReveal>

        <div className="mb-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => (
            <ScrollReveal key={value.title} className="h-full" delay={index * 90}>
              <a href={value.href} className="block h-full">
                <BentoTilt className="h-full">
                  <Card className="about-value-card group h-full overflow-hidden py-2 shadow-xs transition-all hover:-translate-y-1 hover:shadow-[0_6px_12px_rgba(23, 179, 172,0.28)]">
                    <div className="absolute inset-0">
                      <img
                        src={value.image}
                        alt=""
                        className="about-card-bg size-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="about-card-bg-overlay absolute inset-0" />
                    </div>
                    <CardContent className="relative z-10 p-8">
                      <div className="flex flex-col items-center text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 backdrop-blur-sm">
                          <value.icon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-6 text-lg font-bold text-white group-hover:underline sm:text-xl">
                          {value.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-white/80 sm:text-base">{value.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </BentoTilt>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-16 text-center" delay={120}>
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-muted-foreground">Built for practical, everyday healthcare</span>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="emerald-border-hover text-base cursor-pointer transition-all duration-300 hover:bg-tertiary/30 hover:text-emerald-300 hover:shadow-[0_0_24px_rgba(23, 179, 172,0.35)]"
            >
              <a href="#contact">
                Talk to our team
              </a>
            </Button>

            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a href="/shop/diabetes-programs" className="group relative overflow-hidden">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  Request an Assessment
                </span>
              </a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

