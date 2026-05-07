"use client"

import { useState, useEffect } from "react"

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === "undefined") return false
    const fullscreenDocument = document as FullscreenDocument
    return !!(fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement)
  })

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenDocument = document as FullscreenDocument
      setIsFullscreen(!!(fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener)
    }
  }, [])

  const enterFullscreen = () => {
    const fullscreenDocument = document as FullscreenDocument
    const fullscreenElement = document.documentElement as FullscreenElement

    if (!fullscreenDocument.fullscreenElement && !fullscreenDocument.webkitFullscreenElement) {
      if (fullscreenElement.requestFullscreen) {
        fullscreenElement.requestFullscreen().catch(console.error)
      } else {
        fullscreenElement.webkitRequestFullscreen?.()
      }
    }
  }

  const exitFullscreen = () => {
    const fullscreenDocument = document as FullscreenDocument

    if (fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
      if (fullscreenDocument.exitFullscreen) {
        fullscreenDocument.exitFullscreen().catch(console.error)
      } else {
        fullscreenDocument.webkitExitFullscreen?.()
      }
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
