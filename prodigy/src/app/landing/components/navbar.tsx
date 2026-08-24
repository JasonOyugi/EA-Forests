"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getAppUrl } from "@/lib/utils"
import { Logo } from "@/components/logo"

const navigationItems = [
  { name: "Home", href: "#hero" },
  { name: "About", href: "#about" },
  { name: "Care", href: "#features" },
  { name: "Team", href: "#team" },
  { name: "Contact", href: "#contact" },
] as const

const shopToggleItems = [
  { name: "Personal Care", href: getAppUrl("/shop/wellness-products") },
  { name: "Hospital Care", href: getAppUrl("/shop/hospital-services") },
] as const

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
        className="navbar-map-bg absolute inset-0 transition-opacity duration-50"
        style={{ opacity: heroProgress * 0.42 }}
      />
      <div
        aria-hidden
        className="navbar-map-tint absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0.06 + heroProgress * 0.34 }}
      />
      <div className="container relative z-10 mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <a
            href="#hero"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Logo size={32} />
            <span className="font-bold">Prodigy</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden xl:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.name}>
                <NavigationMenuLink
                  className="group inline-flex h-10 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary focus:text-primary focus:outline-none cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    if (item.href.startsWith("#")) smoothScrollTo(item.href)
                    else window.location.href = item.href
                  }}
                >
                  {item.name}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden xl:flex items-center gap-1 rounded-full border border-border/70 bg-background/70 p-1 shadow-sm backdrop-blur-sm">
          {shopToggleItems.map((item) => (
            <Button key={item.name} variant="ghost" size="sm" asChild className="rounded-full px-3 text-xs font-medium sm:text-sm">
              <a href={item.href}>{item.name}</a>
            </Button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-2">
          <Button size="lg" className="text-base cursor-pointer" asChild>
            <a
              href={getAppUrl("/shop/wellness-products")}
              className="group relative overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
              <span className="relative z-10 inline-flex items-center group-hover:text-emerald-300">
                Shop Now
              </span>
            </a>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-full sm:w-[400px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg">
                    <Logo size={16} />
                  </div>
                  <SheetTitle className="text-sm">Prodigy</SheetTitle>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-6 space-y-1">
                  {navigationItems.map((item) => (
                    <div key={item.name}>
                      <a
                        href={item.href}
                        className="flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={(e) => {
                          setIsOpen(false)
                          if (item.href.startsWith("#")) {
                            e.preventDefault()
                            setTimeout(() => smoothScrollTo(item.href), 100)
                          }
                        }}
                      >
                        {item.name}
                      </a>
                    </div>
                  ))}
                </nav>

                <div className="px-6 pb-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Shop
                  </div>
                  <div className="grid gap-2">
                    {shopToggleItems.map((item) => (
                      <Button key={item.name} variant="outline" asChild className="justify-start rounded-full">
                        <a href={item.href} onClick={() => setIsOpen(false)}>
                          {item.name}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t p-6 space-y-4">
                <div className="space-y-3">
                  <Button size="lg" className="text-base cursor-pointer w-full" asChild>
                    <a
                      href={getAppUrl("/shop/wellness-products")}
                      className="group relative overflow-hidden"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                      <span className="relative z-10 inline-flex items-center group-hover:text-emerald-300">
                        Shop Personal Care
                      </span>
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
