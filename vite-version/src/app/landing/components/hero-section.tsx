"use client"

import { useState } from "react"
import { ArrowRight, Play, Star } from "lucide-react"
import { AiFillYoutube } from "react-icons/ai"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAppUrl } from "@/lib/utils"
import { landingContainer, landingHeroLeadClass } from "./landing-shared"

const heroVideos = [
  {
    src: "/profit.mp4",
    previewLabel: "Next video: Profit from Eucalyptus",
    youtubeUrl: "https://www.youtube.com/watch?v=pZ7zwi2LU5o",
  },
  {
    src: "/genetics.mp4",
    previewLabel: "Next video: Understand Genetics",
    youtubeUrl: "https://www.youtube.com/watch?v=6OknnFuDQE8&t=104s",
  },
  {
    src: "/mill.mp4",
    previewLabel: "Next video: Tree sawmilling",
    youtubeUrl: "https://www.youtube.com/watch?v=GdHRBmweOTY",
  },
  {
    src: "/vc.mp4",
    previewLabel: "Next video: sector overview (FAO)",
    youtubeUrl: "https://www.youtube.com/watch?v=yEVeFWKyLqI",
  },
] as const

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })

  const nextIndex = (currentIndex + 1) % heroVideos.length
  const tiltX = (pointer.y - 50) * -0.12
  const tiltY = (pointer.x - 50) * 0.12

  const openInvestmentsGrid = () => {
    window.dispatchEvent(
      new CustomEvent("editorial:filter", { detail: "Investments" })
    )
    window.requestAnimationFrame(() => {
      document.getElementById("brief")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  return (
    <section
      id="hero"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width) * 100,
          y: ((event.clientY - bounds.top) / bounds.height) * 100,
        })
      }}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a, button")) return
        setCurrentIndex(nextIndex)
      }}
      className="landing-hero-shell landing-hero-height relative isolate overflow-hidden bg-black"
    >
      <video key={heroVideos[currentIndex].src} src={heroVideos[currentIndex].src} loop muted autoPlay playsInline preload="metadata" className="absolute inset-0 -z-30 size-full object-cover object-center" />
      <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,13,9,.88)_0%,rgba(3,13,9,.64)_42%,rgba(3,13,9,.2)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-transparent to-black/45" />

      <div className={`${landingContainer} landing-hero-height relative z-20 flex items-center py-16 text-left sm:py-20 lg:py-24`}>
        <div className="w-full">
          <div className="landing-fade-up landing-delay-1 mb-8 flex justify-start">
            <a href={getAppUrl("/shop/seedlings#featured-products")} className="group inline-flex">
              <Badge variant="outline" className="badge-emerald-run max-w-full whitespace-normal rounded-lg border border-emerald-300/50 bg-black/20 px-2 py-2 text-left text-sm leading-5 text-emerald-50 backdrop-blur transition-shadow duration-300 hover:bg-emerald-400/10 hover:shadow-[0_0_22px_rgba(16,185,129,.3)] sm:text-xs">
                <span className="hero-badge-star-shell mr-2 inline-flex size-5 items-center justify-center rounded-full"><Star className="h-3 w-3 fill-current" /></span>
                New: Pine Hybrids in stock!!
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Badge>
            </a>
          </div>

          <h1 className="landing-hero-title landing-fade-up landing-delay-2 text-white">
            Profit From Forestry in{" "}
            <span className="emerald-glitter-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-100 bg-clip-text text-transparent">East Africa</span>{" "}
            Today
          </h1>

          <p className={`landing-fade-up landing-delay-3 text-white/85 ${landingHeroLeadClass}`}>
            From nurseries to building with timber, start generating cash from East African forestry now!
          </p>

          <div className="landing-fade-up landing-delay-4 flex flex-col justify-start gap-4 sm:flex-row">
            <Button variant="outline" size="lg" asChild className="h-auto min-h-11 cursor-pointer whitespace-normal border-white/50 bg-white/8 px-5 py-3 text-xs text-white transition-all duration-300 hover:bg-white/14 hover:text-emerald-100 hover:shadow-[0_0_24px_rgba(16,185,129,.35)] sm:px-7 sm:text-xs">
              <a
                href="#brief"
                onClick={(event) => {
                  event.preventDefault()
                  openInvestmentsGrid()
                }}
              ><Play className="mr-2 h-4 w-4" />Plant A Commercial Forest</a>
            </Button>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute z-0 hidden h-44 w-72 overflow-hidden rounded-2xl border border-white/25 bg-black shadow-2xl transition-[opacity,transform] duration-300 md:block"
        style={{
          left: `${pointer.x}%`,
          top: `${pointer.y}%`,
          opacity: isHovering ? 1 : 0,
          transform: `translate(-50%, -50%) translate3d(0, 0, 0) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${isHovering ? 1 : 0.7})`,
        }}
      >
        <video key={heroVideos[nextIndex].src} src={heroVideos[nextIndex].src} muted loop playsInline autoPlay preload="metadata" className="size-full scale-110 object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap border border-white/25 bg-black/35 px-3 py-1 text-xs tracking-[.18em] text-white/90 backdrop-blur-sm">
          {heroVideos[nextIndex].previewLabel}
        </span>
      </div>

      <a
        href={heroVideos[currentIndex].youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch on YouTube: ${heroVideos[currentIndex].previewLabel}`}
        className="hero-youtube-badge absolute bottom-5 right-5 z-30 inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-red-600/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:bottom-8 sm:right-8"
      >
        <AiFillYoutube className="size-6" />
      </a>
    </section>
  )
}
