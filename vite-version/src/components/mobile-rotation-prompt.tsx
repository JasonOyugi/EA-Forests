import { useEffect, useState } from "react"
import { RotateCw } from "lucide-react"
import { useLocation } from "react-router-dom"

export function MobileRotationPrompt() {
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(false)
  const [portraitMobile, setPortraitMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px) and (orientation: portrait)")
    const update = () => {
      setPortraitMobile(media.matches)
      if (!media.matches) setDismissed(true)
    }
    setPortraitMobile(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const eligible = pathname === "/models" || pathname.startsWith("/models/") ||
    pathname === "/shop" || /^\/shop\/(seedlings|forestry-services|wood-markets-map)\/?$/.test(pathname) ||
    pathname.startsWith("/asset-intelligence/") || pathname === "/asset-intelligence"

  if (!eligible || !portraitMobile || dismissed) return null

  return (
    <button
      type="button"
      onClick={() => setDismissed(true)}
      aria-label="Rotate your screen for a better experience. Tap to dismiss."
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <RotateCw aria-hidden="true" className="size-5 shrink-0 text-primary" />
      <span>Rotate your screen for a better experience.<span className="mt-1 block text-xs text-muted-foreground">Tap to dismiss</span></span>
    </button>
  )
}