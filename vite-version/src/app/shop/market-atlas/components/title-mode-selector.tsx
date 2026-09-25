import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MarketConfig } from "../market-config"
import type { ActorMode } from "../types"

interface TitleModeSelectorProps {
  market: MarketConfig
  activeMode: ActorMode
  onModeChange: (mode: ActorMode) => void
  onAdvance: () => void
  nextMarketName: string
}

/**
 * The market's title doubles as its mode control (brief §3): "SEED / SEEDLINGS →". Each word is
 * an independent, keyboard-operable button; the arrow advances to the next market. Wood Markets
 * has a single sub-mode today, so its title renders as one active (non-toggling) heading.
 */
export function TitleModeSelector({
  market,
  activeMode,
  onModeChange,
  onAdvance,
  nextMarketName,
}: TitleModeSelectorProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h1
        className="flex flex-wrap items-baseline gap-x-3"
        role={market.subModes.length > 1 ? "group" : undefined}
        aria-label={market.subModes.length > 1 ? `${market.name} mode` : undefined}
      >
        {market.subModes.map((subMode, index) => {
          const isActive = subMode.mode === activeMode
          const isToggle = market.subModes.length > 1

          return (
            <span key={subMode.mode} className="flex items-baseline gap-x-3">
              {isToggle ? (
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onModeChange(subMode.mode)}
                  className={cn(
                    "text-3xl font-semibold uppercase tracking-tight transition-colors sm:text-4xl",
                    "hover:text-[var(--market-accent)] focus-visible:text-[var(--market-accent)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--market-accent)]",
                    isActive ? "text-[var(--market-accent)]" : "text-muted-foreground/50"
                  )}
                >
                  {subMode.label}
                </button>
              ) : (
                <span className="text-3xl font-semibold uppercase tracking-tight text-[var(--market-accent)] sm:text-4xl">
                  {subMode.label}
                </span>
              )}
              {index < market.subModes.length - 1 && (
                <span aria-hidden className="text-3xl font-light text-muted-foreground/40 sm:text-4xl">
                  /
                </span>
              )}
            </span>
          )
        })}
      </h1>
      <button
        type="button"
        onClick={onAdvance}
        aria-label={`Go to ${nextMarketName}`}
        title={`Go to ${nextMarketName}`}
        className={cn(
          "ml-1 flex size-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground",
          "transition-colors hover:border-[var(--market-accent)] hover:text-[var(--market-accent)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-accent)]"
        )}
      >
        <ArrowRightIcon className="size-4" />
      </button>
    </div>
  )
}
