"use client"

import { useState } from "react"
import { BentoTilt } from "@/components/ui/bento-tilt"

export function ForestsLandTopBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <BentoTilt>
      <div className="group uganda-banner relative overflow-hidden rounded-xl border border-white/10 bg-black px-4 py-3 shadow-md">
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="uganda-banner-boundary absolute inset-0 rounded-xl" />
          <div className="absolute -inset-[2px] rounded-xl bg-[linear-gradient(90deg,#111111_0%,#facc15_50%,#dc2626_100%)] opacity-25 blur-xl" />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 animate-bannerCoreGlow" />
          <div className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 animate-bannerPulseRing" />
          <div className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 animate-bannerPulseRingDelayed" />
        </div>

        <div className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 sm:block">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full
                animate-spinSlow motion-paused group-hover:motion-running
                bg-[conic-gradient(from_0deg,#000000_0deg_120deg,#FCD116_120deg_240deg,#D90000_240deg_360deg)]
                p-[3px]">
              <div className="h-full w-full rounded-full bg-slate-950/95" />
            </div>

            <div className="absolute inset-1 rounded-full animate-ugandaHalo bg-[conic-gradient(from_180deg,#111111,#facc15,#dc2626,#111111)] opacity-40 blur-sm" />

            <div className="uganda-crane-badge relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white shadow-md">
              <svg viewBox="0 0 64 64" aria-label="Crested crane" className="h-8 w-8">
                <circle cx="32" cy="32" r="30" fill="white" />
                <path d="M20 42c8-2 13-7 16-15 2 5 3 10 2 16-3 2-7 4-12 4-3 0-5-2-6-5z" fill="#111111" />
                <path d="M31 18c4 2 7 5 9 9l-4 2c-1-3-3-6-6-8z" fill="#D90000" />
                <path d="M39 18c4 1 7 3 10 6l-4 2c-2-2-4-3-7-4z" fill="#FCD116" />
                <path d="M35 30c4-1 7 0 10 3-2 1-5 1-8 1-1 3-3 6-6 8l-2-3c3-2 5-5 6-9z" fill="#9ca3af" />
                <path d="M28 26c-1 5-3 10-8 14l-4-1c4-3 7-8 9-14z" fill="#9ca3af" />
                <circle cx="34" cy="23" r="2" fill="#111111" />
              </svg>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3 pr-0 sm:pr-24">
          <div className="flex flex-1 items-center justify-center text-center sm:justify-start sm:text-left">
            <div className="hidden sm:block">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-3 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <defs>
                  <linearGradient id="ugandaBolt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="0">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="33%" stopColor="#FCD116" />
                    <stop offset="66%" stopColor="#D90000" />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>
                </defs>

                <path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  stroke="url(#ugandaBolt)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="uganda-bolt"
                />
              </svg>

            </div>

            <p className="flex items-center text-sm font-medium text-white">
              <span className="mr-2 rounded-full bg-black px-2 py-0.5 text-xs font-bold uganda-badge">
                NEW
              </span>
              <span>
                <span className="font-bold">Ugandan Concessions</span> are now available for review and acquisition.
                <a
                  href="#featured-products"
                  className="ml-1.5 whitespace-nowrap underline hover:text-yellow-200"
                  onClick={(event) => {
                    event.preventDefault()
                    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  View featured opportunities
                </a>
              </span>
            </p>
          </div>

          <button
            className="ml-3 flex-shrink-0 text-white focus:outline-none"
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </BentoTilt>
  )
}
