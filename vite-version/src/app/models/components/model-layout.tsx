import type { ReactNode } from "react"

import { LandingFooter } from "@/app/landing/components/footer"
import { FocusedNav } from "@/components/layouts/focused-nav"
import "@/app/landing/landing-responsive.css"

interface ModelLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

/**
 * Shell for the public model pages: focused navbar, a use-at-your-own-risk notice, and the landing
 * page's footer (so "free support" points at a real contact block on the same page).
 */
export function ModelLayout({ children, title, description }: ModelLayoutProps) {
  return (
    <div className="@container/main flex min-h-svh flex-col bg-background text-foreground">
      <FocusedNav />
      <div
        role="note"
        className="border-b border-border/70 bg-muted/60 px-4 py-2.5 text-center text-xs tracking-wide text-muted-foreground sm:px-6"
      >
        <span className="font-semibold uppercase tracking-[0.2em] text-foreground">Disclaimer</span>
        <span className="mx-2" aria-hidden="true">·</span>
        These models give indicative estimates; use them at your own risk.{" "}
        <a
          href="#contact"
          className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          Contact us for free support
        </a>
      </div>
      <main className="flex flex-1 flex-col gap-4 py-6 md:gap-6">
        {title ? (
          <div className="px-4 lg:px-6">
            <div className="flex flex-col gap-2">
              <h1 className="type-display-title">{title}</h1>
              {description ? <p className="type-body-copy max-w-3xl text-muted-foreground">{description}</p> : null}
            </div>
          </div>
        ) : null}
        {children}
      </main>
      <div className="landing-page">
        <LandingFooter />
      </div>
    </div>
  )
}
