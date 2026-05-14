"use client"

import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type ScrollRevealProps = HTMLAttributes<HTMLDivElement> & {
  delay?: number
  distance?: number
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  style,
  delay = 0,
  distance = 28,
  once = true,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)

          if (once) {
            observer.unobserve(entry.target)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [once])

  const revealStyle = {
    ...style,
    "--reveal-delay": `${delay}ms`,
    "--reveal-distance": `${distance}px`,
  } as CSSProperties

  return (
    <div
      ref={ref}
      className={cn("scroll-reveal", isVisible && "is-visible", className)}
      style={revealStyle}
      {...props}
    >
      {children}
    </div>
  )
}
