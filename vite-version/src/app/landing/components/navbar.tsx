"use client"

import { useEffect, useState } from "react"
import { Map as MapIcon, Menu, X } from "lucide-react"
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
import { cn } from "@/lib/utils"
import {
  EDITORIAL_FILTER_EVENT,
  EDITORIAL_STATE_EVENT,
  editorialFilterCategories,
  editorialSubsections,
  type EditorialSelection,
} from "./editorial-actions"

const smoothScrollTo = (targetId: string) => {
  if (!targetId.startsWith("#")) return
  const element = document.querySelector(targetId)
  if (!element) return
  element.scrollIntoView({ behavior: "smooth", block: "start" })
}

/** Scrolls so the section starts just under the sticky navbar. */
const scrollBelowNavbar = (targetId: string) => {
  const element = document.getElementById(targetId)
  if (!element) return
  const navbarHeight = document.querySelector(".landing-navbar")?.getBoundingClientRect().height ?? 64
  window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - navbarHeight, behavior: "smooth" })
}

/** Wait for the sheet's close animation before scrolling the page behind it. */
const SHEET_CLOSE_MS = 250

/** Mobile menu: the editorial grid's category/sub-section toggles, plus Markets. */
function MobileEditorialMenu({ selection, onNavigate }: { selection: EditorialSelection; onNavigate: () => void }) {
  const filter = (category: EditorialSelection["category"], topic?: string) => {
    window.dispatchEvent(new CustomEvent(EDITORIAL_FILTER_EVENT, { detail: { category, topic } }))
    onNavigate()
    setTimeout(() => scrollBelowNavbar("brief"), SHEET_CLOSE_MS)
  }

  const rowClass = (active: boolean) =>
    cn(
      "flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-semibold uppercase tracking-[.14em] transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
    )

  return (
    <nav aria-label="Explore the hub" className="space-y-1">
      <button type="button" aria-pressed={selection.category === "All"} className={rowClass(selection.category === "All")} onClick={() => filter("All")}>
        All
      </button>
      {editorialFilterCategories.map((category) => {
        const subsections = editorialSubsections[category].filter((sub) => sub.topic)
        const categoryActive = selection.category === category
        return (
          <div key={category}>
            <button type="button" aria-pressed={categoryActive && !subsections.length} className={rowClass(categoryActive && !subsections.length)} onClick={() => filter(category)}>
              {category}
            </button>
            {subsections.length ? (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
                {subsections.map((sub) => {
                  const active = categoryActive && selection.topic === sub.topic
                  return (
                    <button
                      key={sub.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => filter(category, sub.topic)}
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-xs font-semibold uppercase tracking-[.1em] transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                      )}
                    >
                      {sub.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="pt-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 rounded-md border border-border px-3 text-left text-sm font-semibold uppercase tracking-[.14em] text-foreground transition-colors hover:border-primary hover:bg-muted"
          onClick={() => {
            onNavigate()
            setTimeout(() => scrollBelowNavbar("sector-map"), SHEET_CLOSE_MS)
          }}
        >
          <MapIcon className="size-4" aria-hidden="true" />
          Markets
        </button>
      </div>
    </nav>
  )
}

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [heroProgress, setHeroProgress] = useState(0)
  // Held here (always mounted) rather than in the sheet, which unmounts its contents when closed.
  const [editorialSelection, setEditorialSelection] = useState<EditorialSelection>({ category: "All", topic: null })

  useEffect(() => {
    const onState = (event: Event) => setEditorialSelection((event as CustomEvent<EditorialSelection>).detail)
    window.addEventListener(EDITORIAL_STATE_EVENT, onState)
    return () => window.removeEventListener(EDITORIAL_STATE_EVENT, onState)
  }, [])

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

              <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 overflow-y-auto p-4">
                <MobileEditorialMenu selection={editorialSelection} onNavigate={() => setIsOpen(false)} />
                <div className="flex items-center justify-between gap-2 border-t pt-4">
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
                  <ModeToggle variant="outline" />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
