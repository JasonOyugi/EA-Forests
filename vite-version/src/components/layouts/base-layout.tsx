"use client"

import * as React from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ThemeCustomizer, ThemeCustomizerTrigger } from "@/components/theme-customizer"

interface BaseLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function BaseLayout({ children, title, description }: BaseLayoutProps) {
  const [themeCustomizerOpen, setThemeCustomizerOpen] = React.useState(false)

  return (
    <div
      className="flex min-h-svh flex-col"
      style={{ "--header-height": "calc(var(--spacing) * 14)" } as React.CSSProperties}
    >
      <SiteHeader />
      <div className="flex flex-1 flex-col py-6">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6">
            {title && (
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-2">
                  <h1 className="type-display-title">{title}</h1>
                  {description && (
                    <p className="type-body-copy max-w-3xl text-muted-foreground">{description}</p>
                  )}
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Theme Customizer */}
      <ThemeCustomizerTrigger onClick={() => setThemeCustomizerOpen(true)} />
      <ThemeCustomizer
        open={themeCustomizerOpen}
        onOpenChange={setThemeCustomizerOpen}
      />
    </div>
  )
}
