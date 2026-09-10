"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { getAppUrl } from "@/lib/utils"

const marketsNavItems = [
  { label: "Seed & Seedlings", href: "/shop/seedlings" },
  { label: "Land & Services", href: "/shop/forests-land" },
  { label: "Wood Markets", href: "/shop/wood-markets-map" },
] as const

const modelsNavItems = [
  { label: "Site-species Analysis", href: "/models/site-species-analysis" },
  { label: "Silvicultural Models", href: "/models/model-2" },
  { label: "Roundwood Production", href: "/models/model-3" },
  { label: "Clonal Nursery", href: "/models/clonal-eucalyptus-nursery" },
] as const

// One shared route/component per the regional observatory brief --
// each entry differs only by the ?country= query param, never a
// separate per-country page.
const eoNavItems = [
  { label: "Uganda EO", href: "/dashboard/assets-map?mode=eo&country=UG" },
  { label: "Kenya EO", href: "/dashboard/assets-map?mode=eo&country=KE" },
  { label: "Tanzania EO", href: "/dashboard/assets-map?mode=eo&country=TZ" },
] as const

/** Blurs a nav destination that isn't live yet on hover, popping a "Preview" badge on top of it. */
function PreviewWrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/preview relative inline-flex">
      <span className="transition-[filter] duration-200 group-hover/preview:blur-[1.5px]">{children}</span>
      <span className="pointer-events-none absolute inset-0 flex scale-90 items-center justify-center whitespace-nowrap rounded-md bg-foreground/80 text-[9px] font-semibold uppercase tracking-[0.2em] text-background opacity-0 shadow-sm transition-all duration-150 group-hover/preview:scale-100 group-hover/preview:opacity-100">
        Preview
      </span>
    </span>
  )
}

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-transparent transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6">
          <div className="flex-1 max-w-sm">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>
          <NavigationMenu className="hidden sm:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-sm font-medium hover:bg-accent data-[state=open]:bg-accent/50 dark:text-foreground">
                  Markets
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-56 gap-1 p-2">
                    {marketsNavItems.map((item) => (
                      <li key={item.label}>
                        <NavigationMenuLink asChild>
                          <a
                            href={getAppUrl(item.href)}
                            className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            {item.label}
                          </a>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <PreviewWrap>
                  <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-sm font-medium hover:bg-accent data-[state=open]:bg-accent/50 dark:text-foreground">
                    Models
                  </NavigationMenuTrigger>
                </PreviewWrap>
                <NavigationMenuContent>
                  <ul className="grid w-56 gap-1 p-2">
                    {modelsNavItems.map((item) => (
                      <li key={item.label}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            {item.label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-sm font-medium hover:bg-accent data-[state=open]:bg-accent/50 dark:text-foreground">
                  EO Intelligence
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-56 gap-1 p-2">
                    {eoNavItems.map((item) => (
                      <li key={item.label}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            {item.label}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto flex items-center gap-2">
            <PreviewWrap>
              <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
                <Link to="/dashboard" className="dark:text-foreground">
                  Dashboard
                </Link>
              </Button>
            </PreviewWrap>
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <a
                href={getAppUrl("/landing")}
                rel="noopener noreferrer"
                target="_blank"
                className="dark:text-foreground"
              >
                Landing Page
              </a>
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <a
                href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
                rel="noopener noreferrer"
                target="_blank"
                className="dark:text-foreground"
              >
                GitHub
              </a>
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}

