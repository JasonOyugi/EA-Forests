"use client"

import * as React from "react"
import { ChevronDown, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ModelAssumptionsDisclosure({
  description,
  actions,
  children,
}: {
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const [isPinned, setIsPinned] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const isExpanded = isPinned || isHovered

  return (
    <section
      className="min-w-0 rounded-[1.5rem] border bg-background/75 p-4 shadow-sm transition-all duration-300 sm:p-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={isExpanded}
          onClick={() => setIsPinned((value) => !value)}
          onFocus={() => setIsHovered(true)}
          className="block h-auto min-w-0 flex-1 cursor-pointer rounded-[1.25rem] bg-transparent p-0 text-left text-foreground hover:bg-transparent focus-visible:bg-transparent"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold">Input Assumptions</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        </Button>

        <div className="flex items-center gap-2">
          {actions}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={isExpanded ? "Hide assumptions" : "Show assumptions"}
            title={isExpanded ? "Hide assumptions" : "Show assumptions"}
            onClick={() => setIsPinned((value) => !value)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300",
          isExpanded
            ? "mt-5 grid-rows-[1fr] opacity-100"
            : "mt-2 grid-rows-[0fr] opacity-80"
        )}
      >
        <div className="min-w-0 overflow-hidden">
          <div className="min-w-0 space-y-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  )
}
