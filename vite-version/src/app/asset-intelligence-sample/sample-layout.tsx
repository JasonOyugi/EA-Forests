import type { ReactNode } from "react"

import { FocusedNav } from "@/components/layouts/focused-nav"

interface SampleLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export function SampleLayout({ children, title, description }: SampleLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <FocusedNav />
      <div
        role="note"
        className="border-b border-border/70 bg-muted/60 px-4 py-2.5 text-center text-xs tracking-wide text-muted-foreground sm:px-6"
      >
        <span className="font-semibold uppercase tracking-[0.2em] text-foreground">Sample</span>
        <span className="mx-2" aria-hidden="true">·</span>
        Every asset, figure and payment on this page is synthetic, for illustration only.
      </div>
      <main className="flex flex-1 flex-col gap-4 py-6 md:gap-6">
        {title ? (
          <div className="px-4 lg:px-6">
            <h1 className="type-display-title">{title}</h1>
            {description ? (
              <p className="type-body-copy mt-2 max-w-3xl text-muted-foreground">{description}</p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
