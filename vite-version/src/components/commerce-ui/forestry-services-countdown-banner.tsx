"use client"

import { useEffect, useState } from "react"

export function ForestryServicesCountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({ hours: 24, minutes: 0, seconds: 0 })

  useEffect(() => {
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 24)

    const timer = setInterval(() => {
      const difference = expiry.getTime() - Date.now()

      if (difference <= 0) {
        clearInterval(timer)
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      setTimeLeft({ hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const hh = String(timeLeft.hours).padStart(2, "0")
  const mm = String(timeLeft.minutes).padStart(2, "0")
  const ss = String(timeLeft.seconds).padStart(2, "0")

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-900 via-yellow-700 to-orange-700 p-8">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-300 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-orange-400 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto text-center">
        <div className="inline-block rounded-lg bg-white/10 px-4 py-1 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          Flash Sale
        </div>

        <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">Don&apos;t miss your chance to save!</h2>

        <p className="mx-auto mt-2 max-w-2xl text-amber-100">
          Discount pricing on premium forestry services expires when the timer reaches zero.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center">
          <p className="mb-2 text-sm font-medium text-amber-200">OFFER EXPIRES IN</p>
          <div
            style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
            className="flex items-baseline text-4xl font-semibold text-white md:text-6xl"
          >
            {hh}:{mm}:{ss}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl sm:w-auto"
            onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            Shop Now
          </button>
          <button
            type="button"
            className="w-full rounded-lg border border-white/30 bg-white/5 px-8 py-3 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
            onClick={() => document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
