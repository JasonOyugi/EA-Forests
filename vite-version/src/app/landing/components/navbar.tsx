"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"

const smoothScrollTo = (targetId: string) => {
  if (!targetId.startsWith("#")) return
  const element = document.querySelector(targetId)
  if (!element) return
  element.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [heroProgress, setHeroProgress] = useState(0)

  useEffect(() => {
    const updateHeroProgress = () => {
      const hero = document.getElementById("hero")
      if (!hero) {
        setHeroProgress(0)
        return
      }

      const rect = hero.getBoundingClientRect()
      const scrollableDistance = Math.max(rect.height - 96, 1)
      const rawProgress = -rect.top / scrollableDistance
      const clamped = Math.min(Math.max(rawProgress, 0), 1)
      setHeroProgress(clamped)
    }

    updateHeroProgress()
    window.addEventListener("scroll", updateHeroProgress, { passive: true })
    window.addEventListener("resize", updateHeroProgress)

    return () => {
      window.removeEventListener("scroll", updateHeroProgress)
      window.removeEventListener("resize", updateHeroProgress)
    }
  }, [])

  return (
    <header className="landing-navbar sticky top-0 z-50 w-full overflow-hidden border-b border-transparent bg-transparent backdrop-blur-xl">
      <div
        aria-hidden
        className="navbar-map-bg absolute inset-0 transition-opacity duration-300"
        style={{ opacity: heroProgress * 0.42 }}
      />
      <div
        aria-hidden
        className="navbar-map-tint absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0.06 + heroProgress * 0.34 }}
      />
      <div className="container relative z-10 mx-auto flex h-16 items-center justify-between px-4">
        <a href="#hero" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold">EA Forests</span>
        </a>

        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="ghost"
            onClick={(event) => {
              event.preventDefault()
              smoothScrollTo("#contact")
            }}
          >
            Contact
          </Button>
          <ModeToggle variant="ghost" />
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[320px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col">
            <div className="flex flex-col h-full">
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Logo size={16} />
                  <SheetTitle className="text-sm">EA Forests</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="ml-auto h-8 w-8"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex flex-1 flex-col justify-between p-6">
                <Button
                  variant="ghost"
                  size="lg"
                  className="justify-start text-base"
                  onClick={() => {
                    setIsOpen(false)
                    setTimeout(() => smoothScrollTo("#contact"), 100)
                  }}
                >
                  Contact
                </Button>
                <div className="flex justify-center"><ModeToggle variant="outline" /></div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
