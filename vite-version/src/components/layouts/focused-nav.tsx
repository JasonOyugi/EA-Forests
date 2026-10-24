import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

interface FocusedNavProps {
  className?: string
  investmentLinks?: boolean
  navigation?: ReactNode
}

/**
 * Stripped-back header for focused journeys (investment pathways, sample dashboards):
 * one route home to the landing page and the theme toggle, with optional pathway links.
 */
export function FocusedNav({ className, investmentLinks = false, navigation }: FocusedNavProps) {
  return (
    <header className={cn("focused-nav sticky top-0 z-40 w-full border-b border-border/70 bg-background", className)}>
      <div className={cn("mx-auto flex w-full max-w-[120rem] items-center justify-between px-4 sm:px-6 lg:px-8", navigation ? "min-h-14 gap-3" : "h-14")}>
        <Link
          to="/landing"
          className="-mx-2 inline-flex min-h-11 items-center gap-2.5 px-2 font-semibold tracking-tight text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo size={26} alt="" className="focused-nav-logo" />
          <span className={investmentLinks || navigation ? "hidden sm:inline" : undefined}>EA Forests</span>
          <span className="sr-only">— back to the landing page</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          {navigation}
          {investmentLinks && (
            <nav aria-label="Investment pathways" className="flex min-w-0 items-center gap-1 text-xs font-medium sm:gap-3 sm:text-sm">
              <Link to="/shop/forests-land/core-forests" data-pathway="basic" className="rounded px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="sm:hidden">Core</span><span className="hidden sm:inline">Core Forests</span></Link>
              <Link to="/shop/forests-land/high-performance-forests" data-pathway="improved" className="rounded px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="sm:hidden">High Perf.</span><span className="hidden sm:inline">High Performance</span></Link>
              <Link to="/shop/forests-land/dryland-frontier-forests" data-pathway="drylands" className="rounded px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Drylands</Link>
            </nav>
          )}
          <ModeToggle variant="ghost" />
        </div>
      </div>
    </header>
  )
}
