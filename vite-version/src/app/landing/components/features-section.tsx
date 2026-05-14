"use client"

import { useRef, useState } from "react"
import { TiLocationArrow } from "react-icons/ti"

import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

type BentoTiltProps = {
  children: React.ReactNode
  className?: string
}

function BentoTilt({ children, className = "" }: BentoTiltProps) {
  const [transformStyle, setTransformStyle] = useState<string>("")
  const itemRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = itemRef.current
    if (!el) return

    const { left, top, width, height } = el.getBoundingClientRect()
    const relativeX = (event.clientX - left) / width
    const relativeY = (event.clientY - top) / height

    const tiltX = (relativeY - 0.5) * 6
    const tiltY = (relativeX - 0.5) * -6

    setTransformStyle(
      `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.97, .97, .97)`
    )
  }

  const handleMouseLeave = () => setTransformStyle("")

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle, transition: "transform 200ms ease" }}
    >
      {children}
    </div>
  )
}

type BentoCardProps = {
  src: string
  title: React.ReactNode
  description?: string
  isComingSoon?: boolean
  href?: string
}

function BentoCard({ src, title, description, isComingSoon, href }: BentoCardProps) {
  const content = (
    <div className="relative size-full overflow-hidden">
      <video
        src={src}
        loop
        muted
        autoPlay
        playsInline
        preload="metadata"
        className="absolute left-0 top-0 size-full object-cover object-center"
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
    <a href={href} target="_blank" rel="noopener noreferrer" className="block size-full">
      {content}
    </a>
  ) : (
    content
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/30 py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center" distance={22}>
          <Badge variant="outline" className="mb-4 border-emerald-500/40 text-primary">
            Our Features
          </Badge>
          <h2 className="mb-4 font-bold tracking-tight sm:text-4xl">
            Everything you need to know about East Africa forests in one place
          </h2>
        </ScrollReveal>

        <ScrollReveal className="mb-7" delay={80}>
          <BentoTilt className="relative h-96 w-full overflow-hidden rounded-xl border bg-card shadow-sm md:h-[60vh]">
            <BentoCard
              src="/feature-1.mp4"
              title={<>Trade Forestry Assets</>}
              description="Have a forest? Looking to source roundwood or carbon? Click here to find credible partners asap."
              href="/shop/roundwood"
            />
          </BentoTilt>
        </ScrollReveal>

        <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-2 md:auto-rows-[260px]">
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
            <BentoTilt className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <BentoCard
                src="/feature-3.mp4"
                title={<>Market Insight Tools</>}
                description="Forestry on steroids - introduce cutting edge, on-the-ground analysis to calculate the most profitable trades and deals in real-time"
                href="https://github.com/JasonOyugi/EA-Forestry-Geospatial-Analysis.git"
              />
            </BentoTilt>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <BentoTilt className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
