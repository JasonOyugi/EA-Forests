"use client"

import { useEffect, useRef, useState } from "react"
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

  const [bgReady, setBgReady] = useState(false)
  const [forceHideLoader, setForceHideLoader] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const bgVdRef = useRef<HTMLVideoElement | null>(null)
  const nextVdRef = useRef<HTMLVideoElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)

  const getVideoSrc = (index: number) => `/home/JasonOyugi/shadcn-dashboard-landing-template/vite-version/public/hero-${index}.mp4`

  useEffect(() => {
    const t = window.setTimeout(() => setForceHideLoader(true), 3500)
    return () => window.clearTimeout(t)
  }, [])

  const loading = !bgReady && !forceHideLoader

  const bgIndex = currentIndex
  const previewIndex = (currentIndex % totalVideos) + 1

  // reset loader + reload bg when src changes
  useEffect(() => {
    setBgReady(false)
    const v = bgVdRef.current
    if (!v) return
    void v.play().catch(() => {})
  }, [bgIndex])

  // keep preview synced
  useEffect(() => {
    const v = previewVideoRef.current
    if (!v) return
  }, [previewIndex])

  // keep next synced
  useEffect(() => {
    const v = nextVdRef.current
    if (!v) return
  }, [currentIndex])

  const handleMiniVdClick = () => {
    setHasClicked(true)
    setCurrentIndex((prev) => (prev % totalVideos) + 1)
  }

  const handleHoverStart = () => {
    const v = previewVideoRef.current
    if (!v) return
    v.currentTime = 0
    void v.play().catch(() => {})
  }

  const handleHoverEnd = () => {
    previewVideoRef.current?.pause()
  }

  useGSAP(
    () => {
      if (!hasClicked) return
      const root = rootRef.current
      if (!root) return

      const nextEl = root.querySelector('[data-next-video="true"]') as HTMLVideoElement | null
      const previewWrap = root.querySelector('[data-preview-wrap="true"]') as HTMLDivElement | null
      if (!nextEl || !previewWrap) return

      gsap.set(nextEl, { visibility: "visible" })

      const startPlay = () => {
        const v = nextVdRef.current
        if (!v) return
      
        const ready = () => {
          v.play().catch(() => {})
        }
      
        if (v.readyState >= 2) ready()
        else v.addEventListener("canplay", ready, { once: true })
      }

      gsap.to(nextEl, {
        transformOrigin: "center center",
        left: 0,
        top: 0,
        xPercent: 0,
        yPercent: 0,
        width: "100%",
        height: "100%",
        scale: 1,
        duration: 1,
        ease: "power1.inOut",
        onStart: startPlay,
      })

      gsap.to(previewWrap, {
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        ease: "power1.out",
      })
    },
    { dependencies: [currentIndex], revertOnUpdate: true, scope: rootRef }
  )

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const frame = root.querySelector('[data-video-frame="true"]') as HTMLElement | null
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
            Your{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              East Africa Forest
            </span>{" "}
            Marketplace
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            From nurseries to building with timber, get everything you need to know about forestry in East Africa
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
                <div
                  data-preview-wrap="true"
                  className="absolute left-1/2 top-1/2 z-50 h-48 w-64 -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden transition-all duration-700 ease-in-out"
                  onMouseEnter={handleHoverStart}
                  onMouseLeave={handleHoverEnd}
                >
                  <VideoPreview>
                    <div
                      onClick={handleMiniVdClick}
                      className="origin-center scale-90 opacity-100 transition-all duration-300 ease-out hover:scale-100"
                    >
                      <video
                        ref={previewVideoRef}
                        src={getVideoSrc(previewIndex)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full origin-center scale-150 object-cover object-center"
                      />
                    </div>
                  </VideoPreview>
                </div>

                <video
                  ref={nextVdRef}
                  data-next-video="true"
                  src={getVideoSrc(currentIndex)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute left-1/2 top-1/2 invisible z-20 h-48 w-64 -translate-x-1/2 -translate-y-1/2 object-cover object-center"
                />

                <video
                  ref={bgVdRef}
                  src={getVideoSrc(bgIndex)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute left-0 top-0 size-full object-cover object-center"
                  onLoadedData={() => setBgReady(true)}
                  onCanPlay={() => setBgReady(true)}
                  onError={() => setForceHideLoader(true)}
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
