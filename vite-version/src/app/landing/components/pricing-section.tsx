"use client"

import { useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Core Forests",
    description: "A low-risk entry point into professionally designed forestry investments",
    monthlyPrice: 300,
    yearlyPrice: 3000,
    image: {
      src: "/forest.webp",
      alt: "Core forests plan",
    },
    features: [
      "Conventional, proven species and silviculture",
      "Conservative underwriting with clear rotation visibility",
      "Ideal for first-time forestry investors",
    ],
    cta: "Explore Core Forests",
  },
  {
    name: "High-Performance Forests",
    description: "World-class genetics and optimized systems targeting superior returns",
    monthlyPrice: 800,
    yearlyPrice: 8000,
    image: {
      src: "/about.webp",
      alt: "High-performance forests plan",
    },
    features: [
      "Improved, hybrid and clonal genetics with superior growth traits",
      "Higher yield and shorter rotation potential",
      "Site-genotype matching using performance data",
      "Advanced monitoring and growth forecasting",
      "Designed for return-focused investors",
    ],
    cta: "View High-Performance Plans",
  },
  {
    name: "Dryland & Frontier Forests",
    description: "Cutting edge forestry systems engineered for dry and marginal environments",
    monthlyPrice: 0,
    yearlyPrice: 8000,
    image: {
      src: "/drylands.webp",
      alt: "Dryland and frontier forests plan",
    },
    features: [
      "Elite, stress-tolerant genetics and advanced clones/hybrids",
      "Dryland and water-limited silvicultural systems",
      "Higher biological and execution risk with asymmetric upside",
      "Deep climate-resilience and site analytics",
      "Built for sophisticated, innovation driven capital",
    ],
    cta: "Access Dryland Strategies",
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
    <section id="pricing" className="py-24 sm:py-32 bg-muted/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border border-emerald-500/40">Plant Now!</Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your forest
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
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

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Save 20%</span> On Annual Billing
          </p>
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-10 left-0 z-10 hidden w-20 bg-gradient-to-r from-muted/80 to-transparent lg:block" />
            <div className="pointer-events-none absolute inset-y-10 right-0 z-10 hidden w-20 bg-gradient-to-l from-muted/80 to-transparent lg:block" />

            <div ref={emblaRef} className="overflow-hidden px-2 py-4">
              <div className="-ml-4 flex touch-pan-y [perspective:1400px]">
                {plans.map((plan, index) => {
                  const isActive = index === selectedIndex
                  const showEmeraldState = isActive || hoveredIndex === index
                  const displayedPrice = plan.monthlyPrice === 0 ? "Custom" : `$${isYearly ? plan.yearlyPrice : plan.monthlyPrice}`

                  return (
                    <div
                      key={plan.name}
                      className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_68%] lg:flex-[0_0_38%]"
                    >
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
                            <div className="text-balance text-sm text-muted-foreground line-clamp-2">
                              {plan.description}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className={cn("pricing-price pricing-cta-hover mb-1 text-4xl font-bold transition-all duration-300")}>
                            {displayedPrice}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {plan.monthlyPrice === 0 ? "Tailored structure" : isYearly ? "Per year" : "Per month"}
                          </div>
                        </div>

                        <div>
                          <Button
                            className={cn(
                              "w-full cursor-pointer my-1",
                              showEmeraldState ? "emerald-border-active" : "emerald-border-hover",
                              showEmeraldState
                                ? "border-[0.5px] border-white/25 bg-primary text-primary-foreground shadow-md shadow-black/20 ring-1 ring-primary/15 hover:bg-primary/90"
                                : "border border-transparent bg-background shadow-sm shadow-black/15 ring-1 ring-foreground/10 hover:bg-muted/50"
                            )}
                            variant={showEmeraldState ? "default" : "secondary"}
                          >
                            {plan.cta}
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
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Need custom components or have questions?{" "}
            <Button variant="link" className="h-auto cursor-pointer p-0" asChild>
              <a href="#contact">
                Contact our team
              </a>
            </Button>
          </p>
        </div>
      </div>
    </section>
  )
}
