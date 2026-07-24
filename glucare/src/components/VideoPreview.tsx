"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

type VideoPreviewProps = {
  children: React.ReactNode
  className?: string
  perspective?: number
}

export default function VideoPreview({
  children,
  className = "",
  perspective = 500,
}: VideoPreviewProps) {
  const [isHovering, setIsHovering] = useState(false)

  const sectionRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const currentTarget = e.currentTarget
    const rect = currentTarget.getBoundingClientRect()

    const xOffset = e.clientX - (rect.left + rect.width / 2)
    const yOffset = e.clientY - (rect.top + rect.height / 2)

    if (!isHovering) return

    gsap.to(sectionRef.current, {
      x: xOffset,
      y: yOffset,
      rotationY: xOffset / 2,
      rotationX: -yOffset / 2,
      transformPerspective: perspective,
      duration: 1,
      ease: "power1.out",
    })

    gsap.to(contentRef.current, {
      x: -xOffset,
      y: -yOffset,
      duration: 1,
      ease: "power1.out",
    })
  }

  useEffect(() => {
    if (isHovering) return

    gsap.to(sectionRef.current, {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      duration: 1,
      ease: "power1.out",
    })

    gsap.to(contentRef.current, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "power1.out",
    })
  }, [isHovering])

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`absolute z-50 size-full overflow-hidden rounded-lg ${className}`}
      style={{ perspective: `${perspective}px` }}
    >
      <div
        ref={contentRef}
        className="origin-center rounded-lg"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </section>
  )
}
