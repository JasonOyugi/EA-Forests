"use client"

import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowRight, Clock3, Search } from "lucide-react"

import { LandingFooter } from "@/app/landing/components/footer"
import { editorialActionLabels } from "@/app/landing/components/editorial-actions"
import type { EditorialCategory } from "@/app/landing/components/editorial-actions"
import { Input } from "@/components/ui/input"
import { EditorialHeader } from "./editorial-header"
import { forestryArticles } from "./data"

const categories: Array<EditorialCategory | "All"> = ["All", "Information", "Markets", "Tools and Models", "Investment/Projects"]

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCategory = searchParams.get("category")
  const initialCategory = categories.includes(requestedCategory as EditorialCategory) ? requestedCategory as EditorialCategory : "All"
  const [category, setCategory] = useState<EditorialCategory | "All">(initialCategory)
  const [query, setQuery] = useState("")

  const visibleArticles = useMemo(() => forestryArticles.filter((article) => {
    const matchesCategory = category === "All" || article.category === category
    const haystack = `${article.title} ${article.deck} ${article.topic}`.toLowerCase()
    return matchesCategory && haystack.includes(query.trim().toLowerCase())
  }), [category, query])

  const chooseCategory = (nextCategory: EditorialCategory | "All") => {
    setCategory(nextCategory)
    setSearchParams(nextCategory === "All" ? {} : { category: nextCategory })
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-zinc-950">
      <EditorialHeader />
      <main>
        <section className="border-b border-zinc-300 py-14 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-700">Briefing archive</p>
            <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_.55fr] lg:items-end">
              <div><h1 className="text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Articles & intelligence</h1><p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">The complete EA Forests editorial archive: briefings, market signals, tools and project intelligence.</p></div>
              <label className="relative block"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive" className="h-12 rounded-none border-zinc-400 bg-white pl-11" /></label>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="mb-9 flex flex-wrap gap-x-6 gap-y-3 border-b border-zinc-300 pb-4">
              {categories.map((item) => <button key={item} type="button" onClick={() => chooseCategory(item)} className={`border-b-2 pb-3 text-xs font-bold uppercase tracking-[.13em] transition-colors ${category === item ? "border-emerald-700 text-emerald-800" : "border-transparent text-zinc-500 hover:text-zinc-950"}`}>{item}</button>)}
            </div>

            {visibleArticles.length ? (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {visibleArticles.map((article) => (
                  <Link key={article.slug} to={`/articles/${article.slug}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden bg-zinc-900"><img src={article.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
                    <div className="border-b border-zinc-300 py-5">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.18em]"><span className="text-emerald-700">{article.category}</span><span className="inline-flex items-center gap-1 text-zinc-500"><Clock3 className="size-3" />{article.publishedAt}</span></div>
                      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-.025em] group-hover:text-emerald-800">{article.title}</h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">{article.deck}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">{editorialActionLabels[article.category]} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <div className="border border-zinc-300 bg-white p-10 text-center text-zinc-600">No articles match this search.</div>}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
