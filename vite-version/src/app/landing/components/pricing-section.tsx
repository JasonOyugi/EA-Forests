"use client"

import { useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BentoTilt } from "@/components/ui/bento-tilt"
import {
  flagshipPricingCatalog,
  getFlagshipPricing,
} from "@/app/shop/lib/flagship-pricing"
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

const plans = [
  {
    name: flagshipPricingCatalog["core-forests"].name,
    description: "A low-risk entry point into professionally designed forestry investments",
    monthlyPrice: flagshipPricingCatalog["core-forests"].monthlyPrice,
    yearlyPrice: flagshipPricingCatalog["core-forests"].yearlyPrice,
    image: {
      src: "/forest.webp",
      alt: "Core forests plan",
    },
    features: [
      "Conventional, proven species and silviculture",
      "Conservative, clear and confident projections",
      "Ideal for first-time forestry investors",
    ],
    cta: "Explore Core Forests",
    href: "/shop/forests-land/core-forests",
  },
  {
    name: flagshipPricingCatalog["high-performance-forests"].name,
    description: "World-class genetics and optimized systems targeting superior returns",
    monthlyPrice: flagshipPricingCatalog["high-performance-forests"].monthlyPrice,
    yearlyPrice: flagshipPricingCatalog["high-performance-forests"].yearlyPrice,
    image: {
      src: "/about.webp",
      alt: "High-performance forests plan",
    },
    features: [
      "Best in the world genetics optimised for growth, site and market performance",
      "Cutting edge analysis driven by performance data and advanced mathematical modelling",
      "Advanced geospatial monitoring and market forecasting using machine learning",
      "Designed for return-focused investors",
    ],
    cta: "View High-Performance Plans",
    href: "/shop/forests-land/high-performance-forests",
  },
  {
    name: flagshipPricingCatalog["dryland-frontier-forests"].name,
    description: "Pioneer forestry systems engineered for arid and semi-arid lands (ASALs)",
    monthlyPrice: flagshipPricingCatalog["dryland-frontier-forests"].monthlyPrice,
    yearlyPrice: flagshipPricingCatalog["dryland-frontier-forests"].yearlyPrice,
    image: {
      src: "/drylands.webp",
      alt: "Dryland and frontier forests plan",
    },
    features: [
      "Access to genetics and systems optimized for ASALs",
      "Mahogany type hardwoods that thrive in the drylands and mature in 10 years",
      "Higher execution technicalities and risk with the highest profitability potential",
      "Deep climate-resilience, performance data and site analytics",
      "Built for sophisticated, innovation driven capital with a high risk-reward appetite",
    ],
    cta: "Access Dryland Strategies",
    href: "/shop/forests-land/dryland-frontier-forests",
  },
] as const

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
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

  const cardTransforms = useMemo(
    () =>
      plans.map((_, index) => {
        const count = plans.length
        const rawDelta = index - selectedIndex
        const wrappedDelta =
          Math.abs(rawDelta) > count / 2
            ? rawDelta > 0
              ? rawDelta - count
              : rawDelta + count
            : rawDelta

        if (wrappedDelta === 0) {
          return "scale(1) rotateY(0deg)"
        }

        if (wrappedDelta < 0) {
          return "scale(0.9) rotateY(14deg)"
        }

        return "scale(0.9) rotateY(-14deg)"
      }),
    [selectedIndex]
  )

  return (
    <section id="pricing" className={`section-map-shell section-map-pricing relative overflow-hidden bg-muted/40 ${landingSectionPadding}`}>
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className={landingContainer}>
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>Plant Now!</Badge>
          <h2 className={`text-primary ${landingHeadingClass}`}>
            Choose your forest
          </h2>
          <p className={`${landingLeadClass} mb-8`}>
            It all starts with planting a tree
          </p>

          <div className="mb-2 flex items-center justify-center">
            <ToggleGroup
              type="single"
              value={isYearly ? "yearly" : "monthly"}
              onValueChange={(value) => setIsYearly(value === "yearly")}
              className="cursor-pointer rounded-full border-none bg-secondary p-1 text-secondary-foreground shadow-none"
            >
              <ToggleGroupItem
                value="monthly"
                className="cursor-pointer border border-transparent px-6 !rounded-full transition-colors data-[state=on]:border-border data-[state=on]:bg-background data-[state=on]:text-foreground hover:bg-transparent"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="cursor-pointer border border-transparent px-6 !rounded-full transition-colors data-[state=on]:border-border data-[state=on]:bg-background data-[state=on]:text-foreground hover:bg-transparent"
              >
                Annually
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mx-auto max-w-7xl" delay={100}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-5 left-0 z-10 hidden w-20 bg-gradient-to-r from-muted/80 to-transparent lg:block" />
            <div className="pointer-events-none absolute inset-y-5 right-0 z-10 hidden w-20 bg-gradient-to-l from-muted/80 to-transparent lg:block" />

            <div ref={emblaRef} className="overflow-hidden px-2 py-4" onWheel={handleWheel}>
              <div className="-ml-4 flex touch-pan-y [perspective:1400px]">
                {plans.map((plan, index) => {
                  const isActive = index === selectedIndex
                  const showEmeraldState = isActive || hoveredIndex === index
                  const pricing = getFlagshipPricing(plan.href.split("/").pop() ?? "")
                  const displayedPrice =
                    pricing?.[
                      isYearly ? "yearlyDisplayLabel" : "monthlyDisplayLabel"
                    ] ??
                    `${isYearly ? plan.yearlyPrice : plan.monthlyPrice}`
                  const maintenancePrice = pricing?.[
                    isYearly
                      ? "maintenanceYearlyDisplayLabel"
                      : "maintenanceMonthlyDisplayLabel"
                  ]

                  return (
                    <div
                      key={plan.name}
                      className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_68%] lg:flex-[0_0_38%]"
                    >
                      <BentoTilt className="h-full">
                        <div
                          className={cn(
                            "pricing-carousel-card group grid h-full cursor-pointer grid-rows-[auto_auto_auto_1fr] gap-4 rounded-[28px] border bg-card p-6 shadow-sm",
                            isActive
                              ? "is-active border-emerald-400/60 bg-card"
                              : "border-border/70 bg-card/90",
                            !isActive && "opacity-75"
                          )}
                          style={{
                            transform: cardTransforms[index],
                          }}
                          onClick={() => emblaApi?.scrollTo(index)}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              emblaApi?.scrollTo(index)
                            }
                          }}
                        >
                          <div className="space-y-3">
                            <div
                              className={cn(
                                "relative overflow-hidden rounded-2xl ring-1",
                                showEmeraldState ? "ring-emerald-400/35" : "ring-foreground/10"
                              )}
                            >
                              <div className="h-24 w-full">
                                <img
                                  src={plan.image.src}
                                  alt={plan.image.alt}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent" />
                            </div>

                            <div>
                              <div className="mb-1 text-lg font-medium tracking-tight">
                                {plan.name}
                              </div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {plan.description}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className={cn("pricing-price pricing-cta-hover mb-1 text-4xl font-bold transition-all duration-300")}>
                              {displayedPrice}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Establishment fee
                            </div>
                            {maintenancePrice ? (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Maintenance: {maintenancePrice}
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <Button
                              asChild
                              className={cn(
                                "w-full cursor-pointer my-1",
                                showEmeraldState ? "emerald-border-active" : "emerald-border-hover",
                                showEmeraldState
                                  ? "border-[0.5px] border-white/25 bg-primary text-primary-foreground shadow-md shadow-black/20 ring-1 ring-primary/15 hover:bg-primary/90"
                                  : "border border-transparent bg-secondary shadow-sm shadow-black/15 ring-1 ring-foreground/10 hover:bg-muted/50"
                              )}
                              variant={showEmeraldState ? "default" : "secondary"}
                            >
                              <a href={plan.href}>{plan.cta}</a>
                            </Button>
                          </div>

                          <div>
                            <ul role="list" className="space-y-2 text-sm">
                              {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-3">
                                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                                  <span className="leading-5">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </BentoTilt>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {plans.map((plan, index) => (
                  <button
                    key={plan.name}
                    type="button"
                    aria-label={`Go to ${plan.name}`}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      index === selectedIndex ? "w-8 bg-emerald-500" : "w-2.5 bg-foreground/20"
                    )}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => emblaApi?.scrollNext()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-16 text-center" delay={160}>
          <p className="text-muted-foreground">
            Need custom components or have questions?{" "}
            <Button variant="link" className="h-auto cursor-pointer p-0" asChild>
              <a href="#contact">
                Contact our team
              </a>
            </Button>
          </p>
          <p className="text-xs text-muted-foreground">
            Rates depend highly on the site - ensure you contact us or use our models before making any decisions.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
