"use client"

import { useCallback, useEffect, useRef, type WheelEvent } from "react"
import useEmblaCarousel from "embla-carousel-react"

type EmblaApi = ReturnType<typeof useEmblaCarousel>[1]

export function useEmblaWheelNavigation(emblaApi: EmblaApi) {
  const wheelDeltaRef = useRef(0)
  const wheelCooldownRef = useRef(false)
  const wheelResetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current)
      }
    }
  }, [])

  return useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
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
    },
    [emblaApi]
  )
}
