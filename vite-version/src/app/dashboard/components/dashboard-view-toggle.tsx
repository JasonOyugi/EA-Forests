import { Link, useSearchParams } from "react-router-dom"
import { Factory, Trees } from "lucide-react"

import { cn } from "@/lib/utils"

const dashboardViews = [
  { key: "supply", label: "Supply Intelligence", icon: Factory },
  { key: "assets", label: "Asset Intelligence", icon: Trees },
] as const

type DashboardView = (typeof dashboardViews)[number]["key"]

/** Segmented switch between the Supply and Asset Intelligence dashboard pages. */
export function DashboardViewToggle() {
  const [params] = useSearchParams()
  const active: DashboardView = params.get("view") === "assets" ? "assets" : "supply"

  const viewHref = (view: DashboardView) => {
    const next = new URLSearchParams(params)
    next.set("view", view)
    return `/dashboard?${next.toString()}`
  }

  return (
    <nav
      aria-label="Dashboard view"
      className="inline-flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-1"
    >
      {dashboardViews.map(({ key, label, icon: Icon }) => {
        const isActive = key === active
        return (
          <Link
            key={key}
            to={viewHref(key)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center gap-2 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
