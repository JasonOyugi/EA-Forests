import type { ReactNode } from "react"
import { ArrowRight, Gauge, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export interface ComingSoonPreviewProps {
  title?: string
  description?: string
  eyebrow?: string
  links?: Array<{ label: string; href: string }>
  children?: ReactNode
  className?: string
}

export function ComingSoonPreview({
  title = "Portfolio Intelligence — Coming Soon",
  description = "Monitor forest assets, projected value, timber volumes, market exposure and operational activity in one place.",
  eyebrow = "Illustrative preview — not live portfolio data.",
  links = [
    { label: "Models", href: "/models" },
    { label: "Marketplace", href: "/shop/seedlings" },
  ],
  children,
  className,
}: ComingSoonPreviewProps) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/80 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70", className)}>
      <div aria-hidden="true" className="coming-soon-card-tint" />
      {children ?? null}

      <div className="relative flex min-h-[210px] flex-col justify-center gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
          <Gauge className="h-3.5 w-3.5" />
          <span>{eyebrow}</span>
        </div>

        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-100 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Preview
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h3>
          <p className="max-w-lg text-sm leading-6 text-slate-200 sm:text-base">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              {link.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
