"use client"

import { useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, HeartPulse, Stethoscope } from "lucide-react"

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

const glucareBlogHref = "https://www.glucare.center/health-information"

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

const diabetesCards: ActionCard[] = [
  {
    title: "Explore diabetes care programs",
    description: "Review structured remission, management, nutrition, and monitoring programs.",
    href: "/shop/diabetes-programs",
    image: "/diabetic1.jpg",
    icon: HeartPulse,
    label: "View programs",
  },
  {
    title: "Get diabetes care support",
    description: "Book consultation time for care planning, program guidance, and next steps.",
    href: "/calendar",
    image: "/green.jpg",
    icon: Stethoscope,
    label: "Book support",
  },
]

const diabetesArticles: Article[] = [
  {
    title: "Understanding blood sugar ranges",
    category: "Diabetes information",
    description:
      "A practical guide to glucose ranges and what they can mean for daily diabetes decisions.",
    image: "/body cs.jpg",
    href: glucareBlogHref,
  },
  {
    title: "Foot care habits for diabetes",
    category: "Diabetes information",
    description:
      "Simple checks and routines that help reduce avoidable foot problems linked to diabetes.",
    image: "/human-anatomy.jpg",
    href: glucareBlogHref,
  },
  {
    title: "Ten steps to stronger diabetes control",
    category: "Diabetes information",
    description:
      "Everyday planning ideas for meals, activity, tracking, medication timing, and support.",
    image: "/mealplan.jpg",
    href: glucareBlogHref,
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
          <CardContent className="flex h-full flex-col p-0">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={article.image}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = "/diabetic1.jpg"
                }}
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-5">
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
            <div key={article.title} className="min-w-0 flex-[0_0_100%] pl-5 md:flex-[0_0_50%] xl:flex-[0_0_33.333%]">
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
            Diabetes Care Hub
          </Badge>
          <h2 className={landingHeadingClass}>
            Diabetes programs, care support, and information together
          </h2>
          <p className={`${landingLeadClass} max-w-4xl`}>
            GluCare brings the program path, consultation path, and education path into one focused diabetes care section.
          </p>
        </ScrollReveal>

        <div id="blog" className="space-y-8">
          <ScrollReveal delay={90}>
            <div className="grid gap-5 lg:grid-cols-2">
              {diabetesCards.map((card) => (
                <ActionBentoCard key={card.title} card={card} />
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-2xl font-semibold tracking-tight">Diabetes information</h3>
              </div>
              <ArticleCarousel articles={diabetesArticles} />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={220}>
            <a
              href="/calendar"
              className="group flex flex-col gap-4 rounded-xl border bg-card/70 p-5 transition-colors hover:border-emerald-400/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Ready to talk through your results?</h3>
                  <p className="text-sm text-muted-foreground">
                    Book a consultation and bring your questions, tools, or program preferences.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Book consultation
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
