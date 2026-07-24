"use client"

import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BentoTilt } from '@/components/ui/bento-tilt'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from './landing-shared'
import { useEmblaWheelNavigation } from './use-embla-wheel-navigation'

const blogs = [
    {
      id: 1,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Health Information',
      title: 'Ranges of Blood Sugar Levels',
      description:
        'Knowing the range of your blood glucose levels is crucial in managing your diabetes effectively.',
      href: 'https://www.glucare.center/health-information',
    },
    {
      id: 2,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Health Information',
      title: 'Dealing with Diabetes and Foot Issues',
      description:
        'Diabetes often causes gradual foot problems due to high blood sugar levels affecting nerves and blood vessels.',
      href: 'https://www.glucare.center/health-information',
    },
    {
      id: 3,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Health Information',
      title: 'Ten Steps to Improving Your Type 1 Diabetes Control',
      description:
        'A practical, step-by-step series covering timing, correction factors, physical activity, and more.',
      href: 'https://www.glucare.center/health-information',
    },
    {
      id: 4,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Skincare',
      title: 'Understanding Acne: Types, Causes, and Myths Debunked',
      description:
        'A clear breakdown of the different types of acne, what actually causes breakouts, and common myths worth ignoring.',
      href: 'https://www.prodigyhealthcare.co.ke/blog',
    },
    {
      id: 5,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Skincare',
      title: 'Daily Skincare Routine for Pimples & Oily Skin',
      description:
        'Simple, dermatologist-informed steps to manage oily skin and reduce pimples as part of a daily routine.',
      href: 'https://www.prodigyhealthcare.co.ke/blog',
    },
  ]

export function BlogSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: false,
  })
  const handleWheel = useEmblaWheelNavigation(emblaApi)

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi])

  return (
    <section id="blog" className={`section-map-shell section-map-blog relative overflow-hidden ${landingSectionPadding}`}>
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className={landingContainer}>
        {/* Section Header */}
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass}>Health Library</Badge>
          <h2 className={landingHeadingClass}>
            Health information from our care team
          </h2>
          <p className={landingLeadClass}>
            Practical guidance on diabetes management and everyday wellness, from our specialists.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mx-auto max-w-6xl" delay={90}>
          <div className="relative">
            <div ref={emblaRef} className="overflow-hidden" onWheel={handleWheel}>
              <div className="-ml-4 flex gap-8 py-4 px-4 md:-ml-6 lg:-ml-8">
                {blogs.map(blog => (
                  <div key={blog.id} className="min-w-0 flex-[0_0_100%] pl-4 md:flex-[0_0_50%] lg:flex-[0_0_33.333%]">
                    <BentoTilt className="h-full">
                      <Card className="h-full overflow-hidden py-0">
                        <CardContent className="flex h-full flex-col px-0">
                          <div className="aspect-video">
                            <img
                              src={blog.image}
                              alt={blog.title}
                              className="size-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="flex flex-1 flex-col space-y-3 p-6">
                            <p className="text-muted-foreground text-xs tracking-widest uppercase">
                              {blog.category}
                            </p>
                            <a
                              href={blog.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer"
                            >
                              <h3 className="text-xl font-bold transition-colors hover:text-primary">{blog.title}</h3>
                            </a>
                            <p className="text-muted-foreground flex-1">{blog.description}</p>
                            <a
                              href={blog.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-primary hover:underline cursor-pointer"
                            >
                              Learn More
                              <ArrowRight className="size-4" />
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    </BentoTilt>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {blogs.map((blog, index) => (
                  <button
                    key={blog.id}
                    type="button"
                    aria-label={`Go to ${blog.title}`}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={cn(
                      'h-2.5 rounded-full transition-all',
                      index === selectedIndex ? 'w-8 bg-emerald-500' : 'w-2.5 bg-foreground/20'
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
      </div>
    </section>
  )
}
