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

      if (shouldPlay) {
        void video.play().catch(() => {
          // Muted autoplay can still be deferred by browser power-saving modes.
        })
      } else {
        video.pause()
      }
    }, [shouldLoad, shouldPlay])

    return (
      <video
        {...props}
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        autoPlay={eager}
        muted
        playsInline
        preload={eager ? "metadata" : "none"}
      />
    )
  }
)
