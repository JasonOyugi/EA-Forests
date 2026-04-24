"use client"

import { BentoTilt } from "@/components/ui/bento-tilt"

export function ForestryServicesSaleBanner() {
  return (
    <BentoTilt className="amber-pulse-on-hover rounded-xl">
      <div className="group relative overflow-hidden rounded-xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://assets-global.website-files.com/620e6fc20903c76d73735e50/626e6724d34d607f14a2904d_Blue%20tree%20planter%20Blog%20Compressed.jpg")',
          }}
        />
        <div className="absolute inset-0 bg-black/5" />

        <div className="relative z-10 px-6 py-8 md:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 flex items-center justify-center">
              <div className="service-badge-glow rounded-full bg-amber-500 px-4 py-1 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                Limited Seasonal Offer
              </div>
            </div>

            <h2 className="mb-3 text-center text-3xl font-extrabold tracking-wide text-white md:text-4xl lg:text-5xl">
              Seedlings + Services Bundle
            </h2>

            <div className="mb-4 flex justify-center">
              <div className="relative">
                <div className="text-center text-5xl font-bold text-white drop-shadow md:text-6xl">20% OFF</div>
                <div className="service-badge-glow absolute -right-6 -top-1 rotate-12 rounded-md border-2 border-amber-600 bg-amber-500 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
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
