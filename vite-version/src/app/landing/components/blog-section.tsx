"use client"

import { useEffect, useRef, useState, type WheelEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BentoTilt } from '@/components/ui/bento-tilt'
import { cn } from '@/lib/utils'


const blogs = [
    {
      id: 1,
      image: '/greenbuilding.webp',
      category: 'Markets',
      title: 'Building green in East Africa',
      description:
        'Exploring how forests, engineering and green architecture are transforming building development and accelerating innovation.',
    },
    {
      id: 2,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Genetics',
      title: 'Planting clonal forests',
      description:
        'One individual tree to make an entire forest? Learn how!',
    },
    {
      id: 3,
      image: 'https://ui.shadcn.com/placeholder.svg',
      category: 'Climate',
      title: 'How to tap into the carbon markets with forestry',
      description:
        'Step-by-step practical guide on navigating the carbon landscape.',
    },
  ]

export function BlogSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const wheelDeltaRef = useRef(0)
  const wheelCooldownRef = useRef(false)
  const wheelResetTimerRef = useRef<number | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: false,
  })

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

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!emblaApi) return

    const dominantDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (Math.abs(dominantDelta) < 16) return

    event.preventDefault()
    if (wheelCooldownRef.current) return

    wheelDeltaRef.current += dominantDelta
    if (wheelResetTimerRef.current !== null) {
      window.clearTimeout(wheelResetTimerRef.current)
    }
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelDeltaRef.current = 0
      wheelResetTimerRef.current = null
    }, 140)

    if (Math.abs(wheelDeltaRef.current) < 120) return

    if (wheelDeltaRef.current > 0) {
      emblaApi.scrollNext()
    } else {
      emblaApi.scrollPrev()
    }

    wheelDeltaRef.current = 0
    wheelCooldownRef.current = true
    window.setTimeout(() => {
      wheelCooldownRef.current = false
    }, 320)
  }

  return (
    <section id="blog" className="section-map-shell section-map-blog relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4 border border-emerald-500/40">Latest Insights</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            From our blog
          </h2>
          <p className="text-lg text-muted-foreground">
            Stay updated with the latest trends, best practices, and insights from our team of experts.
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
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
                              className="size-full object-cover dark:invert dark:brightness-[0.95]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="flex flex-1 flex-col space-y-3 p-6">
                            <p className="text-muted-foreground text-xs tracking-widest uppercase">
                              {blog.category}
                            </p>
                            <a
                              href="#"
                              onClick={e => e.preventDefault()}
                              className="cursor-pointer"
                            >
                              <h3 className="text-xl font-bold transition-colors hover:text-primary">{blog.title}</h3>
                            </a>
                            <p className="text-muted-foreground flex-1">{blog.description}</p>
                            <a
                              href="#"
                              onClick={e => e.preventDefault()}
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
        </div>
      </div>
    </section>
  )
}
