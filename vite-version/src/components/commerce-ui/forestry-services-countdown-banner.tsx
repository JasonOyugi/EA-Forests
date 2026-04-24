"use client"

import { useEffect, useState } from "react"
import { ArrowRight, BadgePercent } from "lucide-react"

import { BentoTilt } from "@/components/ui/bento-tilt"

export function ForestryServicesCountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({ days: 44, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 44)

    const timer = setInterval(() => {
      const difference = expiry.getTime() - Date.now()

      if (difference <= 0) {
        clearInterval(timer)
        setTimeLeft({ days: 44, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const dd = String(timeLeft.days).padStart(2, "0")
  const hh = String(timeLeft.hours).padStart(2, "0")
  const mm = String(timeLeft.minutes).padStart(2, "0")
  const ss = String(timeLeft.seconds).padStart(2, "0")

  return (
    <BentoTilt className="rounded-xl">
      <div className="countdown-run-border relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-700 via-orange-600 to-emerald-600 p-[2px]">
        <div className="relative overflow-hidden rounded-[calc(theme(borderRadius.xl)-2px)] bg-white p-6 dark:bg-gray-900">
          <div className="countdown-ornament absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400 opacity-10" />
          <div className="countdown-ornament absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-500 opacity-10" />
          <div className="countdown-ornament absolute right-8 top-8 h-4 w-4 rotate-45 bg-amber-500/20" />
          <div className="countdown-ornament absolute bottom-10 right-1/4 h-6 w-6 rounded-full bg-orange-500/15" />

          <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
                <BadgePercent className="h-8 w-8" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="mb-1 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Forestry Membership Offer
              </div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Join Our Forestry Rewards Program
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Unlock service bundle discounts, priority scheduling, early access to planting windows, and enterprise support perks.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  44 days remaining
                </span>
                <span
                  style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
                >
                  {dd}:{hh}:{mm}:{ss}
                </span>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <button
                type="button"
                className="rounded-md bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 font-medium text-white shadow-md transition-all hover:from-amber-700 hover:to-orange-700"
                onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Join Now
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-amber-200 px-5 py-2.5 font-medium text-amber-800 transition-all hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/30"
                onClick={() => document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Benefits
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </BentoTilt>
  )
}
