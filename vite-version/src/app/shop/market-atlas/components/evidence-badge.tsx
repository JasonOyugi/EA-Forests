import { cn } from "@/lib/utils"
import type { EvidenceClass } from "../types"

// Evidence class is shown as market-color shade (A darkest -> D palest) *and* as the letter
// itself and a distinct border style, so it never depends on color alone (brief §11). "A" means
// most strongly evidenced, not "best" or "recommended".
const BORDER_STYLE: Record<EvidenceClass, string> = {
  A: "border-solid border-2",
  B: "border-solid border",
  C: "border-dashed border",
  D: "border-dotted border",
}

export function EvidenceBadge({ evidenceClass, className }: { evidenceClass: EvidenceClass | null; className?: string }) {
  if (!evidenceClass) {
    return <span className={cn("text-xs text-muted-foreground", className)}>Unclassified</span>
  }

  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
        BORDER_STYLE[evidenceClass],
        className
      )}
      style={{
        borderColor: `var(--market-marker-${evidenceClass.toLowerCase()})`,
        color: `var(--market-marker-${evidenceClass.toLowerCase()})`,
      }}
      title={`Evidence class ${evidenceClass}`}
    >
      {evidenceClass}
    </span>
  )
}
