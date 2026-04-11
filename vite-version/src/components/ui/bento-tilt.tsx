"use client"

import { useRef, useState } from "react"
import type { MouseEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

type BentoTiltProps = {
  children: ReactNode
  className?: string
  maxTilt?: number
}

export function BentoTilt({ children, className, maxTilt = 6 }: BentoTiltProps) {
  const [transformStyle, setTransformStyle] = useState("")
  const itemRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const element = itemRef.current
    if (!element) return

    const { left, top, width, height } = element.getBoundingClientRect()
    const relativeX = (event.clientX - left) / width
    const relativeY = (event.clientY - top) / height

    const tiltX = (relativeY - 0.5) * maxTilt
    const tiltY = (relativeX - 0.5) * -maxTilt

    setTransformStyle(
      `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.97, .97, .97)`
    )
  }

  const handleMouseLeave = () => setTransformStyle("")

  return (
    <div
      ref={itemRef}
      className={cn("transform-gpu will-change-transform", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle, transition: "transform 200ms ease" }}
    >
      {children}
    </div>
  )
}