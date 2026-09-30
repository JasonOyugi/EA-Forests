import { Link } from "react-router-dom"

import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

interface FocusedNavProps {
  className?: string
}

/**
 * Stripped-back header for focused journeys (investment pathways, sample dashboards):
 * one route home to the landing page and the theme toggle, nothing else.
 */
export function FocusedNav({ className }: FocusedNavProps) {
  return (
    <header className={cn("focused-nav sticky top-0 z-40 w-full border-b border-border/70 bg-background", className)}>
      <div className="mx-auto flex h-14 w-full max-w-[120rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/landing"
          className="-mx-2 inline-flex min-h-11 items-center gap-2.5 px-2 font-semibold tracking-tight text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo size={26} alt="" className="focused-nav-logo" />
          <span>EA Forests</span>
          <span className="sr-only">— back to the landing page</span>
        </Link>
        <ModeToggle variant="ghost" />
      </div>
    </header>
  )
}
