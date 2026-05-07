"use client"

import { useState } from "react"

import { BentoTilt } from "@/components/ui/bento-tilt"

export function ForestryServicesSaleBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <BentoTilt className="amber-pulse-on-hover rounded-xl">
      <div className="group relative overflow-hidden rounded-xl">
        <button
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white/85 transition hover:bg-black/45 hover:text-white focus:outline-none"
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
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

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://assets-global.website-files.com/620e6fc20903c76d73735e50/626e6724d34d607f14a2904d_Blue%20tree%20planter%20Blog%20Compressed.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-black/5" />
        <div className="sale-banner-shape absolute -left-10 top-8 h-28 w-28 rounded-full bg-amber-300/14 blur-sm" />
        <div className="sale-banner-shape sale-banner-shape-delayed absolute right-12 top-14 h-12 w-12 rotate-12 rounded-2xl bg-white/12" />
        <div className="sale-banner-shape absolute bottom-8 left-[18%] h-8 w-8 rounded-full bg-orange-200/18" />
        <div className="sale-banner-shape sale-banner-shape-delayed absolute -bottom-10 right-[14%] h-32 w-32 rounded-full bg-amber-500/12 blur-md" />

        <div className="relative z-10 px-6 py-8 pr-14 md:px-10 md:pr-16">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 flex items-center justify-center">
              <div className="service-badge-glow service-badge-boundary rounded-full bg-amber-500 px-4 py-1 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                Limited Seasonal Offer
              </div>
            </div>

            <h2 className="mb-3 text-center text-3xl font-extrabold tracking-wide text-white md:text-4xl lg:text-5xl">
              Seedlings + Services Bundle
            </h2>

            <div className="mb-4 flex justify-center">
              <div className="relative">
                <div className="text-center text-5xl font-bold text-white drop-shadow md:text-6xl">20% OFF</div>
                <div className="service-exclusive-badge absolute -right-8 -top-3 z-10 rotate-12 whitespace-nowrap rounded-md border border-amber-200/60 bg-amber-500 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-[0_8px_22px_rgba(251,191,36,0.28)] backdrop-blur-sm">
                  EXCLUSIVE
                </div>
              </div>
            </div>

            <p className="mb-6 text-center text-lg text-white/90">
              Special discounts on selected forestry service bundles for this campaign window.
            </p>

            <div className="flex flex-col items-center justify-center space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
              <button
                type="button"
                className="group/cta relative overflow-hidden rounded-md bg-white px-6 py-3 font-medium text-orange-600 transition-all hover:bg-white/90"
                onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-amber-300/35 via-amber-200/15 to-transparent transition-transform duration-900 group-hover/cta:translate-x-[220%]" />
                <span className="relative z-10">Shop Services</span>
              </button>
              <button
                type="button"
                className="group/ghost relative overflow-hidden rounded-md border border-white/40 bg-transparent px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
                onClick={() => document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" })}
              >
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-white/28 via-white/10 to-transparent transition-transform duration-900 group-hover/ghost:translate-x-[220%]" />
                <span className="relative z-10">View Deals</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </BentoTilt>
  )
}
