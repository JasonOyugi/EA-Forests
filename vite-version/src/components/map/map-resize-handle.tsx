"use client"

import * as React from "react"
import { GripHorizontal } from "lucide-react"
import { useMap } from "react-leaflet"

import { cn } from "@/lib/utils"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function MapResizeInvalidator() {
  const map = useMap()

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ debounceMoveend: true })
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

export function MapResizeHandle({
  height,
  onHeightChange,
  minHeight = 420,
  maxHeight = 1200,
  className,
}: {
  height: number
  onHeightChange: (height: number) => void
  minHeight?: number
  maxHeight?: number
  className?: string
}) {
  const dragStart = React.useRef<{ y: number; height: number } | null>(null)

  const updateHeight = (nextHeight: number) => {
    onHeightChange(clamp(Math.round(nextHeight), minHeight, maxHeight))
  }

  return (
    <div
      role="separator"
      aria-label="Resize map height"
      aria-orientation="horizontal"
      aria-valuemin={minHeight}
      aria-valuemax={maxHeight}
      aria-valuenow={height}
      tabIndex={0}
      className={cn(
        "group flex h-7 touch-none cursor-ns-resize items-center justify-center border-t bg-muted/35 text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
      onPointerDown={(event) => {
        dragStart.current = { y: event.clientY, height }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!dragStart.current) return
        updateHeight(dragStart.current.height + event.clientY - dragStart.current.y)
      }}
      onPointerUp={(event) => {
        dragStart.current = null
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        dragStart.current = null
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault()
          updateHeight(height + 40)
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          updateHeight(height - 40)
        } else if (event.key === "Home") {
          event.preventDefault()
          updateHeight(minHeight)
        } else if (event.key === "End") {
          event.preventDefault()
          updateHeight(maxHeight)
        }
      }}
    >
      <GripHorizontal className="h-4 w-7 transition-transform group-hover:scale-110" />
      <span className="sr-only">Drag down to make the map taller</span>
    </div>
  )
}
