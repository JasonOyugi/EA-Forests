"use client"

import { useEffect } from "react"
import { getAppUrl } from "@/lib/utils"

/**
 * The weekly briefing / newsletter experience now lives on the landing
 * page's editorial section and subscribe form. This route forwards visitors
 * and any existing bookmarks/links there instead of duplicating that content.
 */
export default function NewsletterPage() {
  const destination = `${getAppUrl("/landing")}#contact`

  useEffect(() => {
    window.location.replace(destination)
  }, [destination])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f3ef] px-6 text-center text-zinc-950">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Redirecting</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em]">Taking you to the weekly briefing</h1>
        <p className="mt-4 text-sm text-zinc-600">
          If you are not redirected automatically, <a className="underline underline-offset-4" href={destination}>open the briefing</a>.
        </p>
      </div>
    </div>
  )
}
