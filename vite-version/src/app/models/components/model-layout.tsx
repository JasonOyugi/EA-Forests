import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"

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
      <FocusedNav
        navigation={
          <nav aria-label="Models" className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 py-2 text-xs font-medium sm:gap-x-4 sm:text-sm">
            {[
              { to: "/models/site-species-analysis", label: "Site-species" },
              { to: "/models/model-2", label: "Silviculture" },
              { to: "/models/model-3", label: "Roundwood" },
              { to: "/models/clonal-eucalyptus-nursery", label: "Nursery" },
            ].map((model) => (
              <NavLink
                key={model.to}
                to={model.to}
                className={({ isActive }) => `whitespace-nowrap rounded px-1 py-2 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive ? "text-primary underline underline-offset-4" : "text-foreground"}`}
              >
                {model.label}
              </NavLink>
            ))}
          </nav>
        }
      />
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
              {description ? <p className="type-body-copy text-muted-foreground">{description}</p> : null}
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
