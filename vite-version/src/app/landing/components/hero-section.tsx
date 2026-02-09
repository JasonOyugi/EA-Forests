"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/all"

import { ArrowRight, Play, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import VideoPreview from "@/components/VideoPreview"
import { DotPattern } from "@/components/dot-pattern"
import { getAppUrl } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const totalVideos = 4
  const videoLabels = ["Welcome", "Genetics", "Markets", "Analysis"]

  const [currentIndex, setCurrentIndex] = useState(1)
  const [hasClicked, setHasClicked] = useState(false)

  // ✅ only gate initial UI on background readiness
  const [bgReady, setBgReady] = useState(false)
  const [forceHideLoader, setForceHideLoader] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const nextVdRef = useRef<HTMLVideoElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)

  const getVideoSrc = (index: number) => `/hero-${index}.mp4`

  // Optional posters (recommended). Put these in /public/posters/
  // If you don’t have posters yet, you can remove poster props below.
  const getPosterSrc = (index: number) => `/posters/hero-${index}.jpg`

  // Safety: never block forever (e.g. if a video 404s)
  useEffect(() => {
    const t = window.setTimeout(() => setForceHideLoader(true), 3500)
    return () => window.clearTimeout(t)
  }, [])

  const loading = !bgReady && !forceHideLoader

  const handleMiniVdClick = () => {
    setHasClicked(true)
    setCurrentIndex((prevIndex) => (prevIndex % totalVideos) + 1)
  }

  const handleHoverStart = () => {
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = 0
      previewVideoRef.current.play().catch(() => {})
    }
  }

  const handleHoverEnd = () => {
    previewVideoRef.current?.pause()
  }

  // ✅ CLICK EXPAND TRANSITION — scoped to this component (no global ID collisions)
  useGSAP(
    () => {
      if (!hasClicked) return
      const root = rootRef.current
      if (!root) return

      const nextEl = root.querySelector<HTMLVideoElement>('[data-next-video="true"]')
      const currentEl = root.querySelector<HTMLVideoElement>('[data-current-video="true"]')

      if (!nextEl || !currentEl) return

      gsap.set(nextEl, { visibility: "visible" })

      gsap.to(nextEl, {
        transformOrigin: "center center",
        scale: 1,
        width: "100%",
        height: "100%",
        duration: 1,
        ease: "power1.inOut",
        onStart: () => nextVdRef.current?.play().catch(() => {}),
      })

      gsap.from(currentEl, {
        transformOrigin: "center center",
        scale: 0,
        duration: 1.5,
        ease: "power1.inOut",
      })
    },
    { dependencies: [currentIndex], revertOnUpdate: true, scope: rootRef }
  )

  // ✅ SCROLL MORPH — scoped and safe
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const frame = root.querySelector<HTMLElement>('[data-video-frame="true"]')
      if (!frame) return

      gsap.set(frame, {
        clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
        borderRadius: "0% 0% 40% 10%",
      })

      gsap.from(frame, {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        borderRadius: "0% 0% 0% 0%",
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: frame,
          start: "center center",
          end: "bottom center",
          scrub: true,
        },
      })
    },
    { scope: rootRef }
  )

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-16 sm:pt-20 pb-16"
    >
      <div className="absolute inset-0">
        <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <Badge variant="outline" className="px-4 py-2 border-foreground">
              <Star className="w-3 h-3 mr-2 fill-current" />
              New: Pine Hybrids in stock!!
              <ArrowRight className="w-3 h-3 ml-2" />
            </Badge>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your All-in-One
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              East Africa Forest{" "}
            </span>
            Platform
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Everything you need to know about investing in high performance forests in East Africa
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a href={getAppUrl("/auth/sign-up")}>
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <Button variant="outline" size="lg" className="text-base cursor-pointer" asChild>
              <a href="#demo">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </a>
            </Button>
          </div>
        </div>

        {/* HERO VISUAL */}
        <div className="mx-auto mt-20 max-w-6xl">
          <div ref={rootRef} className="relative group">
            <div className="absolute top-2 lg:-top-8 left-1/2 -translate-x-1/2 w-[90%] mx-auto h-24 lg:h-80 bg-primary/50 rounded-full blur-3xl" />

            <div className="relative rounded-xl border bg-card shadow-2xl overflow-hidden">
              {loading && (
                <div className="absolute inset-0 z-[100] grid place-items-center bg-background/80 backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                </div>
              )}

              <div
                data-video-frame="true"
                className="relative z-10 w-full overflow-hidden rounded-xl aspect-[16/9]"
              >
                {/* Mini preview */}
                <div
                  className="absolute left-1/2 top-1/2 z-50 h-48 w-64 -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out"
                  onMouseEnter={handleHoverStart}
                  onMouseLeave={handleHoverEnd}
                >
                  <VideoPreview>
                    <div
                      onClick={handleMiniVdClick}
                      className="origin-center scale-50 opacity-0 transition-all duration-500 ease-in hover:scale-100 hover:opacity-100"
                    >
                      <video
                        ref={previewVideoRef}
                        data-current-video="true"
                        src={getVideoSrc((currentIndex % totalVideos) + 1)}
                        poster={getPosterSrc((currentIndex % totalVideos) + 1)}
                        loop
                        muted
                        playsInline
                        preload="none"
                        className="h-full w-full origin-center scale-150 object-cover object-center"
                      />
                    </div>
                  </VideoPreview>
                </div>
                {/* Next video (expands on click) */}
                <video
                  ref={nextVdRef}
                  data-next-video="true"
                  src={getVideoSrc(currentIndex)}
                  poster={getPosterSrc(currentIndex)}
                  loop
                  muted
                  playsInline
                  preload="none"          // ✅ only needed when clicked
                  className="absolute left-1/2 top-1/2 invisible z-20 h-48 w-64 -translate-x-1/2 -translate-y-1/2 object-cover object-center"
                />

                {/* Background video (only one that loads immediately) */}
                <video
                  src={getVideoSrc(currentIndex === totalVideos - 1 ? 1 : currentIndex)}
                  poster={getPosterSrc(currentIndex === totalVideos - 1 ? 1 : currentIndex)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"      // ✅ fast start
                  className="absolute left-0 top-0 size-full object-cover object-center"
                  onCanPlayThrough={() => setBgReady(true)} // ✅ loader ends ASAP
                  onError={() => setForceHideLoader(true)}  // ✅ never get stuck
                />

                <div className="absolute bottom-5 right-5 z-40 rounded-lg bg-black/50 px-4 py-2 backdrop-blur-sm">
                  <p className="text-sm sm:text-base text-white font-medium">
                    {videoLabels[currentIndex - 1]}
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 lg:h-48 bg-gradient-to-b from-background/0 via-background/70 to-background" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
