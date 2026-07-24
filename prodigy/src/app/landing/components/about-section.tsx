"use client"

import { useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, ChevronLeft, ChevronRight, HeartHandshake, ShoppingBag, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { cn } from "@/lib/utils"
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from "./landing-shared"
import { useEmblaWheelNavigation } from "./use-embla-wheel-navigation"

const prodigyBlogHref = "https://www.prodigyhealthcare.co.ke/blog"

type ActionCard = {
  title: string
  description: string
  href: string
  image: string
  icon: LucideIcon
  label: string
}

type Article = {
  title: string
  category: string
  description: string
  image: string
  href: string
}

type CareSection = {
  eyebrow: string
  title: string
  description: string
  cards: ActionCard[]
  articles: Article[]
}

const careSections: CareSection[] = [
  {
    eyebrow: "Nutrition",
    title: "Nutrition products and support for everyday care",
    description:
      "Practical nutrition support for energy, recovery, weight goals, and better daily habits.",
    cards: [
      {
        title: "Shop nutritional products",
        description: "Browse supplements, meal replacement shakes, and daily nutrition essentials.",
        href: "/shop/wellness-products?q=supplements",
        image: "/shake1.jpg",
        icon: ShoppingBag,
        label: "Shop nutrition",
      },
      {
        title: "Get nutritional support",
        description: "Talk to the Prodigy team about nutrition goals and product guidance.",
        href: "#contact",
        image: "/veggie.png",
        icon: HeartHandshake,
        label: "Get support",
      },
    ],
    articles: [
      {
        title: "Gut health and mood: the daily nutrition link",
        category: "Nutrition",
        description:
          "Simple food and supplement habits that can support digestive comfort, energy, and routine.",
        image: "/nutritionist1.jpg",
        href: prodigyBlogHref,
      },
      {
        title: "Using meal replacement shakes well",
        category: "Nutrition",
        description:
          "How to fit balanced shakes into a practical weight-management or recovery plan.",
        image: "/mealplan.jpg",
        href: prodigyBlogHref,
      },
    ],
  },
  {
    eyebrow: "Skin",
    title: "Skin care products and support for visible progress",
    description:
      "Everyday skin care guidance for oily skin, dark spots, uneven tone, and simple routines.",
    cards: [
      {
        title: "Shop skin care products",
        description: "Browse serums, moisturizers, and targeted topical products from Prodigy.",
        href: "/shop/wellness-products?q=skincare",
        image: "/skin1.jpg",
        icon: ShoppingBag,
        label: "Shop skin care",
      },
      {
        title: "Get skin care support",
        description: "Ask for help choosing a routine and matching products to your skin goals.",
        href: "#contact",
        image: "/skin.jpg",
        icon: Sparkles,
        label: "Get support",
      },
    ],
    articles: [
      {
        title: "Daily routine for pimples and oily skin",
        category: "Skin care",
        description:
          "A simple, repeatable routine for cleansing, treatment, moisture, and sun protection.",
        image: "/skin2.jpg",
        href: prodigyBlogHref,
      },
      {
        title: "Dark spots, scars, and uneven tone",
        category: "Skin care",
        description:
          "What to consider when building a product routine for visible skin tone goals.",
        image: "/skin4.jpg",
        href: prodigyBlogHref,
      },
    ],
  },
]

function ActionBentoCard({ card }: { card: ActionCard }) {
  const Icon = card.icon

  return (
    <BentoTilt className="h-full">
      <a href={card.href} className="group block h-full">
        <Card className="h-full overflow-hidden py-0">
          <CardContent className="relative flex min-h-[280px] flex-col justify-end p-6">
            <img
              src={card.image}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/38 to-black/10" />
            <div className="relative z-10">
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold leading-tight text-white">{card.title}</h3>
              <p className="mt-3 max-w-[44ch] text-sm leading-6 text-white/82">{card.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                {card.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </CardContent>
        </Card>
      </a>
    </BentoTilt>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <BentoTilt className="h-full">
      <a href={article.href} target="_blank" rel="noopener noreferrer" className="group block h-full">
        <Card className="h-full overflow-hidden py-0">
          <CardContent className="grid h-full gap-0 p-0 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="relative min-h-[180px] overflow-hidden">
              <img
                src={article.image}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex flex-col justify-between p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{article.category}</p>
                <h4 className="mt-3 text-lg font-semibold leading-tight group-hover:text-primary">
                  {article.title}
                </h4>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{article.description}</p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </CardContent>
        </Card>
      </a>
    </BentoTilt>
  )
}

function ArticleCarousel({ articles }: { articles: Article[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: articles.length > 1,
    align: "start",
    skipSnaps: false,
  })
  const handleWheel = useEmblaWheelNavigation(emblaApi)

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)

    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi])

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden" onWheel={handleWheel}>
        <div className="-ml-5 flex">
          {articles.map((article) => (
            <div key={article.title} className="min-w-0 flex-[0_0_100%] pl-5 md:flex-[0_0_50%]">
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" className="cursor-pointer rounded-full" onClick={() => emblaApi?.scrollPrev()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          {articles.map((article, index) => (
            <button
              key={article.title}
              type="button"
              aria-label={`Go to ${article.title}`}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                index === selectedIndex ? "w-8 bg-emerald-500" : "w-2.5 bg-foreground/20"
              )}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" className="cursor-pointer rounded-full" onClick={() => emblaApi?.scrollNext()}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function AboutSection() {
  return (
    <section id="about" className={landingSectionPadding}>
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>
            Personal Care
          </Badge>
          <h2 className={landingHeadingClass}>
            Shop products, get support, and take your health to the next level!
          </h2>
          <p className={`${landingLeadClass} max-w-4xl`}>
            Prodigy is your partner in finding the latest and best personal care products and guidance to maximise your health.
          </p>
        </ScrollReveal>

        <div id="blog" className="space-y-16">
          {careSections.map((section, sectionIndex) => (
            <ScrollReveal key={section.title} delay={sectionIndex * 100}>
              <div className="space-y-7">
                <div className="w-full">
                  <Badge variant="outline" className={landingBadgeClass}>
                    {section.eyebrow}
                  </Badge>
                  <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                    {section.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                    {section.description}
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {section.cards.map((card) => (
                    <ActionBentoCard key={card.title} card={card} />
                  ))}
                </div>

                <ArticleCarousel articles={section.articles} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
