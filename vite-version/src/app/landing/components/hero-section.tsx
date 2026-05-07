"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { AiFillYoutube } from "react-icons/ai";
import { ArrowRight, Play, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import VideoPreview from "@/components/VideoPreview"
import { DotPattern } from "@/components/dot-pattern"
import { getAppUrl } from "@/lib/utils"

export function HeroSection() {
  const totalVideos = 4
  const videoLabels = [
    { url: "https://www.youtube.com/watch?v=VIDEO_ID_1" },
    { url: "https://www.youtube.com/watch?v=VIDEO_ID_2" },
    { url: "https://www.youtube.com/watch?v=VIDEO_ID_3" },
    { url: "https://www.youtube.com/watch?v=VIDEO_ID_4" },
  ]

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
        onStart: () => {
          if (nextVdRef.current) {
            nextVdRef.current.play().catch(() => {});
          }
        },
        
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
  return (
    <section
      id="hero"
      className="landing-hero-shell relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-16 sm:pt-20 pb-16"
    >
      <div aria-hidden className="hero-map-bg absolute inset-0" />
      <div aria-hidden className="hero-map-tint absolute inset-0" />
      <div className="absolute inset-0">
        <DotPattern className="opacity-100" size="lg" fadeStyle="none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="landing-fade-up landing-delay-1 mb-8 flex justify-center">
            <a href="/shop/seedlings#featured-products" className="group inline-flex">
              <Badge
                variant="outline"
                className="badge-emerald-run text-primary rounded-lg px-4 py-2 
                          border border-emerald-500/40
                          bg-transparent hover:bg-emerald-400/5
                          transition-shadow duration-300
                          hover:shadow-[0_0_22px_rgba(16,185,129,0.35)]"
              >
                <span className="hero-badge-star-shell mr-2 inline-flex size-5 items-center justify-center rounded-full">
                  <Star className="h-3 w-3 fill-current" />
                </span>
                New: Pine Hybrids in stock!!
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Badge>
            </a>
          </div>

          <h1 className="landing-fade-up landing-delay-2 mb-6 font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Profit From Forestry in{" "}
            <span className='emerald-glitter-text bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-200 bg-clip-text text-transparent'>
              East Africa
            </span>{" "}
            Today
          </h1>

          <p className="landing-fade-up landing-delay-3 mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            From nurseries to building with timber, start generating cash from East African forestry now!
          </p>

          <div className="landing-fade-up landing-delay-4 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a
                href={getAppUrl("/auth/sign-up")}
                className="group relative overflow-hidden"
              >
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="emerald-border-hover text-base cursor-pointer
                        transition-all duration-300
                        hover:text-emerald-400
                        hover:bg-secondary/20
                        hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              <a href="#pricing">
                <Play className="mr-2 h-4 w-4" />
                Plant A Commercial Forest
              </a>
            </Button>
          </div>
        </div>

        {/* HERO VISUAL */}
        <div className="landing-video-reveal mx-auto mt-20 max-w-6xl">
          <div ref={rootRef} className="relative group [perspective:1200px]">
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

                {/* MINI PREVIEW (MATCHES SECOND HERO) */}
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

                {/* NEXT VIDEO (EXPANDS ON CLICK, MATCHES SECOND HERO) */}
                <video
                  ref={nextVdRef}
                  data-next-video="true"
                  src={getVideoSrc(currentIndex)}
                  poster={getPosterSrc(currentIndex)}
                  loop
                  muted
                  playsInline
                  preload="none"
                  className="absolute left-1/2 top-1/2 invisible z-20 h-48 w-64 -translate-x-1/2 -translate-y-1/2 object-cover object-center"
                />

                {/* BACKGROUND VIDEO (MATCHES SECOND HERO BEHAVIOR) */}
                <video
                  src={getVideoSrc(currentIndex === totalVideos - 1 ? 1 : currentIndex)}
                  poster={getPosterSrc(currentIndex === totalVideos - 1 ? 1 : currentIndex)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute left-0 top-0 size-full object-cover object-center"
                  onCanPlayThrough={() => setBgReady(true)}
                  onError={() => setForceHideLoader(true)}
                />

                <div className="hero-youtube-badge absolute bottom-5 right-5 z-40 rounded-lg bg-red-500/50 px-2 py-1 backdrop-blur-sm transition-transform duration-300">
                  <a
                    href={videoLabels[currentIndex - 1].url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-bold text-white"
                  >
                   <AiFillYoutube />
                  </a>
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
