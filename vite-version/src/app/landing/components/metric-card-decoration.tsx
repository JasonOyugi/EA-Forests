import type { CSSProperties } from "react"

import { assetUrl } from "@/lib/utils"

type PixelStyle = CSSProperties & {
  "--pixel-size": string
  "--pixel-x": string
  "--pixel-y": string
  "--pixel-tint": string
  "--pixel-accent-share": string
  "--pixel-opacity-min": string
  "--pixel-opacity-max": string
  "--pixel-scale-min": string
  "--pixel-scale-max": string
  "--pixel-duration": string
  "--pixel-delay": string
}

const pixelCount = 6
const pixelTints = ["#ffffff", "#f8fafc", "#f5f5f4", "#fefce8"]

function seededRandom(seed: number) {
  const sine = Math.sin(seed) * 10000
  return sine - Math.floor(sine)
}

function accentSeed(accent: string) {
  return [...accent].reduce((seed, character) => seed + character.charCodeAt(0), 0)
}

function pixelStyle(accent: string, index: number): PixelStyle {
  const seed = accentSeed(accent) + index * 37
  const size = 5 + Math.round(seededRandom(seed + 1) * 17)
  const tint = pixelTints[Math.floor(seededRandom(seed + 4) * pixelTints.length)]
  const accentShare = 42 + Math.round(seededRandom(seed + 5) * 44)
  const opacityMin = 0.1 + seededRandom(seed + 6) * 0.2
  const opacityMax = 0.42 + seededRandom(seed + 7) * 0.5
  const scaleMin = 0.62 + seededRandom(seed + 8) * 0.28
  const scaleMax = 1.08 + seededRandom(seed + 9) * 0.72
  const duration = 2.4 + seededRandom(seed + 10) * 4.4
  const delay = -seededRandom(seed + 11) * duration

  return {
    "--pixel-size": `${size}px`,
    "--pixel-x": `${6 + seededRandom(seed + 2) * 86}%`,
    "--pixel-y": `${8 + seededRandom(seed + 3) * 76}%`,
    "--pixel-tint": tint,
    "--pixel-accent-share": `${accentShare}%`,
    "--pixel-opacity-min": opacityMin.toFixed(2),
    "--pixel-opacity-max": opacityMax.toFixed(2),
    "--pixel-scale-min": scaleMin.toFixed(2),
    "--pixel-scale-max": scaleMax.toFixed(2),
    "--pixel-duration": `${duration.toFixed(2)}s`,
    "--pixel-delay": `${delay.toFixed(2)}s`,
  }
}

/** Shared section-colored pixels and brand watermark for editorial metrics. */
export function MetricCardDecoration({ accent = "#10b981" }: { accent?: string }) {
  return (
    <div aria-hidden="true" className="metric-card-decoration pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ color: accent }}>
      {Array.from({ length: pixelCount }, (_, index) => (
        <span key={index} className="metric-card-pixel" style={pixelStyle(accent, index)} />
      ))}
      <span
        className="absolute -bottom-12 -right-12 size-36 bg-current opacity-35 sm:-bottom-16 sm:-right-16 sm:size-40"
        style={{
          maskImage: `url("${assetUrl("/favicon-dark.png")}")`,
          WebkitMaskImage: `url("${assetUrl("/favicon-dark.png")}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </div>
  )
}
