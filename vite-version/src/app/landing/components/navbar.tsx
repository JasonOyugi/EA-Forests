"use client"

import { useEffect, useState } from "react"
import { Menu, Github, LayoutDashboard, X, Moon, Sun } from "lucide-react"
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
import { ModeToggle } from "@/components/mode-toggle"
import { useTheme } from "@/hooks/use-theme"

const navigationItems = [
  { name: "Home", href: "#hero" },
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
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
  const { setTheme, theme } = useTheme()

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
    <header className="landing-navbar sticky top-0 z-50 w-full overflow-hidden border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div
        aria-hidden
        className="navbar-map-bg absolute inset-0 transition-opacity duration-300"
        style={{ opacity: heroProgress * 0.5 }}
      />
      <div
        aria-hidden
        className="navbar-map-tint absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0.45 + heroProgress * 0.3 }}
      />
      <div className="container relative z-10 mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <a
            href="#hero"
            className="flex items-center space-x-2 cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Logo size={32} />
            <span className="font-bold">EA Forests</span>
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

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-2">
          <ModeToggle variant="ghost" />
          <Button variant="ghost" size="icon" asChild className="cursor-pointer">
            <a
              href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button 
            variant="outline"
            size="lg"
            asChild
            className="emerald-border-hover text-base cursor-pointer
                      transition-all duration-300
                      hover:text-emerald-400
                      hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]">
            <a href={getAppUrl("/dashboard")} target="_blank" rel="noopener noreferrer">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </a>
          </Button>
          <Button variant="ghost" asChild className="cursor-pointer">
            <a href={getAppUrl("/auth/sign-in")}>Sign In</a>
          </Button>
          <Button size="lg" className="text-base cursor-pointer" asChild>
            <a
              href={getAppUrl("/auth/sign-up")}
              className="group relative overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
              <span className="relative z-10 inline-flex items-center group-hover:text-emerald-300">
                Get Started
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
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Logo size={16} />
                  </div>
                  <SheetTitle className="text-lg font-semibold">EA Forests</SheetTitle>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className="cursor-pointer h-8 w-8"
                    >
                      <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>

                    <Button variant="ghost" size="icon" asChild className="cursor-pointer h-8 w-8">
                      <a
                        href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub Repository"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>

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
              </div>

              {/* Footer Actions */}
              <div className="border-t p-6 space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" size="lg" asChild className="emerald-border-hover text-base cursor-pointer transition-all duration-300 hover:text-emerald-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                    <a href={getAppUrl("/dashboard")}>
                      <LayoutDashboard className="size-4" />
                      Dashboard
                    </a>
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="lg" asChild className="cursor-pointer">
                      <a href={getAppUrl("/auth/sign-in")}>Sign In</a>
                    </Button>
                    <Button asChild size="lg" className="cursor-pointer">
                      <a href={getAppUrl("/auth/sign-up")}>Get Started</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
