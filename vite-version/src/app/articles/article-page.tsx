import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Clock3, Share2 } from "lucide-react"

import { LandingFooter } from "@/app/landing/components/footer"
import { Button } from "@/components/ui/button"
import { EditorialHeader } from "./editorial-header"
import { forestryArticles, getArticleBySlug } from "./data"

export default function ArticlePage() {
  const { articleSlug } = useParams()
  const article = getArticleBySlug(articleSlug)
  if (!article) return <Navigate to="/errors/not-found" replace />

  const related = forestryArticles.filter((item) => item.slug !== article.slug && item.category === article.category).slice(0, 3)

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-zinc-950">
      <EditorialHeader />
      <main>
        <article>
          <header className="mx-auto max-w-5xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-20">
            <Link to="/articles" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-zinc-500 hover:text-emerald-700"><ArrowLeft className="size-4" /> Archive</Link>
            <p className="mt-8 text-xs font-bold uppercase tracking-[.22em] text-emerald-700">{article.category} / {article.topic}</p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-.05em] sm:text-6xl lg:text-7xl">{article.title}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600 sm:text-xl">{article.deck}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500"><span>{article.author}</span><span>•</span><span>{article.publishedAt}</span><span>•</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{article.readTime}</span></div>
          </header>

          <div className="mx-auto max-w-[1240px] px-4 sm:px-6"><div className="aspect-[16/8] overflow-hidden bg-zinc-900"><img src={article.image} alt="" className="size-full object-cover" /></div></div>

          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_180px] lg:py-16">
            <div className="mx-auto max-w-3xl">
              {article.sections.map((section) => (
                <section key={section.heading} className="mb-11">
                  <h2 className="text-3xl font-semibold tracking-[-.035em]">{section.heading}</h2>
                  <div className="mt-5 space-y-5">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-lg leading-8 text-zinc-700">{paragraph}</p>)}</div>
                </section>
              ))}
              <aside className="mt-12 border-l-4 border-emerald-700 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Editorial note</p><p className="mt-3 text-sm leading-6 text-zinc-600">This first-pass article is editorial sample content. Sources and field verification should be added before production publication.</p></aside>
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start"><Button variant="outline" className="w-full rounded-none"><Share2 className="size-4" /> Share</Button><div className="mt-5 border-t border-zinc-300 pt-5 text-xs leading-5 text-zinc-500">Published by the EA Forests editorial desk for sector decision support.</div></aside>
          </div>
        </article>

        {related.length ? <section className="border-t border-zinc-300 py-14"><div className="mx-auto max-w-[1240px] px-4 sm:px-6"><div className="mb-7 flex items-end justify-between"><h2 className="text-3xl font-semibold tracking-tight">Related reads</h2><Link to="/articles" className="inline-flex items-center gap-2 text-sm font-semibold">View archive <ArrowRight className="size-4" /></Link></div><div className="grid gap-5 md:grid-cols-3">{related.map((item) => <Link key={item.slug} to={`/articles/${item.slug}`} className="group"><div className="aspect-[4/3] overflow-hidden"><img src={item.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" /></div><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{item.category}</p><h3 className="mt-2 text-xl font-semibold leading-tight group-hover:text-emerald-800">{item.title}</h3></Link>)}</div></div></section> : null}
      </main>
      <LandingFooter />
    </div>
  )
}
