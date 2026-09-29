"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"

type AutoPlayVideoProps = Omit<
  ComponentPropsWithoutRef<"video">,
  "autoPlay" | "muted" | "playsInline" | "preload"
> & {
  eager?: boolean
}

export const AutoPlayVideo = forwardRef<HTMLVideoElement, AutoPlayVideoProps>(
  function AutoPlayVideo({ eager = false, src, ...props }, forwardedRef) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [shouldLoad, setShouldLoad] = useState(eager)
    const [shouldPlay, setShouldPlay] = useState(eager)
    // With reduced motion the video still loads (so its first frame shows) but never plays.
    const [reduceMotion, setReduceMotion] = useState(
      () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )

    useEffect(() => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      const onChange = () => setReduceMotion(query.matches)
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    }, [])

    useImperativeHandle(
      forwardedRef,
      () => videoRef.current as HTMLVideoElement
    )

    useEffect(() => {
      const video = videoRef.current
      if (!video || eager) return

      if (!("IntersectionObserver" in window)) {
        setShouldLoad(true)
        setShouldPlay(true)
        return
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          setShouldPlay(entry.isIntersecting)
          if (entry.isIntersecting) setShouldLoad(true)
        },
        { rootMargin: "240px 0px" }
      )

      observer.observe(video)
      return () => observer.disconnect()
    }, [eager])

    useEffect(() => {
      const video = videoRef.current
      if (!video || !shouldLoad) return

      if (shouldPlay && !reduceMotion) {
        void video.play().catch(() => {
          // Muted autoplay can still be deferred by browser power-saving modes.
        })
      } else {
        video.pause()
      }
    }, [shouldLoad, shouldPlay, reduceMotion])

    return (
      <video
        {...props}
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        autoPlay={eager && !reduceMotion}
        muted
        playsInline
        preload={eager || reduceMotion ? "metadata" : "none"}
      />
    )
  }
)
