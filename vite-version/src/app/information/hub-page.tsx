"use client"

import { useMemo, useRef, useState } from "react"
import type { CSSProperties, TouchEvent, WheelEvent } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

import { LandingFooter } from "@/app/landing/components/footer"
import { forestryArticles } from "@/app/articles/data"
import { getInformationHubTopic, informationHubOrder, informationHubTopics } from "./data"

type PolicyHighlight = {
  value: string
  title: string
  context: string
}

type TopicNewsItem = {
  title: string
  source: string
  date: string
  href: string
  image: string
}

type PolicySubtopic = {
  id: string
  title: string
  summary: string
  highlights: PolicyHighlight[]
  news: TopicNewsItem[]
}

const policySubtopics: PolicySubtopic[] = [
  {
    id: "us-iran-war-impact",
    title: "Impact of US-Iran war on regional forestry",
    summary:
      "Conflict-led energy and shipping shocks pass directly into East African harvesting, haulage, and export economics.",
    highlights: [
      {
        value: "High",
        title: "Fuel cost exposure",
        context:
          "Haulage and processing are diesel-intensive; regional fuel shocks move delivered-log economics within weeks.",
      },
      {
        value: "3",
        title: "Trade corridors watched",
        context:
          "Red Sea / Gulf shipping, regional fuel imports, and cross-border log and sawn-timber permits.",
      },
      {
        value: "Analysis",
        title: "Read type",
        context:
          "Editorial desk tracking, not a verified policy filing - treat as a starting point for your own checks.",
      },
      {
        value: "+8-21 days",
        title: "Expected shipping delays",
        context:
          "Rerouting and transshipment congestion can stretch East Africa inbound and outbound forestry cargo timelines.",
      },
      {
        value: "Elevated",
        title: "Marine insurance pressure",
        context:
          "War-risk insurance premia can lift freight rates for timber-linked imports and exports before customs adjusts.",
      },
    ],
    news: [
      {
        title: "Regional impact monitor for conflict-linked energy and freight volatility",
        source: "World Bank Commodities",
        date: "Updated weekly",
        href: "https://www.worldbank.org/en/research/commodity-markets",
        image:
          "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Crude and product benchmarks used in East Africa fuel pass-through analysis",
        source: "U.S. EIA",
        date: "Live",
        href: "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm",
        image:
          "https://images.unsplash.com/photo-1541891432-6e3fdc1f5a33?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Shipping disruption dashboard for Red Sea-linked marine traffic",
        source: "UNCTAD",
        date: "Periodic",
        href: "https://unctad.org/topic/transport-and-trade-logistics",
        image:
          "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  },
  {
    id: "regional-trade-status",
    title: "Status of regional trade",
    summary:
      "Tariffs, non-tariff barriers, and export-permit policy changes are tracked as hard constraints on forestry market access.",
    highlights: [
      {
        value: "7",
        title: "Major barriers logged (YTD)",
        context:
          "Desk-counted announcements affecting forestry-adjacent imports, exports, permits, and customs treatment.",
      },
      {
        value: "5-35%",
        title: "Import tax range by product",
        context:
          "Observed tariff band for selected wood products across regional customs schedules and ad hoc measures.",
      },
      {
        value: "$6.1B",
        title: "Forestry-adjacent export value",
        context:
          "Regional value estimate across sawn timber, paper, furniture, and other forestry-linked lines.",
      },
      {
        value: "61/100",
        title: "Regional trade score",
        context:
          "Composite desk index of tariff friction, border dwell time, and logistics reliability vs. benchmark peers.",
      },
      {
        value: "Moderate",
        title: "Permit uncertainty",
        context:
          "Export-licensing and SPS interpretation changes are the largest quarter-to-quarter policy risk in this cluster.",
      },
    ],
    news: [
      {
        title: "East African Community tariff and customs updates",
        source: "EAC",
        date: "Official notices",
        href: "https://www.eac.int/trade",
        image:
          "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Trade profile and merchandise data explorer",
        source: "ITC Trade Map",
        date: "Rolling",
        href: "https://www.trademap.org/",
        image:
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "WTO notifications and trade policy tracking",
        source: "WTO",
        date: "Continuous",
        href: "https://www.wto.org/english/tratop_e/tpr_e/tpr_e.htm",
        image:
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  },
  {
    id: "regional-regulations",
    title: "Regional regulations",
    summary:
      "Cross-country policy divergence in harvesting, transport, and product standards creates execution risk in multi-country forestry portfolios.",
    highlights: [
      {
        value: "12",
        title: "Active rule updates tracked",
        context:
          "Forestry-adjacent legal or regulatory changes under consultation, parliamentary process, or implementation.",
      },
      {
        value: "4",
        title: "High-impact compliance themes",
        context:
          "Transport documentation, chain-of-custody evidence, phytosanitary controls, and import classification.",
      },
      {
        value: "Q2",
        title: "Fastest policy revision cycle",
        context:
          "Observed minimum time from draft to implementation in high-priority trade and logistics directives.",
      },
      {
        value: "58%",
        title: "Cross-country rule mismatch",
        context:
          "Share of tracked requirements lacking one-to-one alignment across Kenya, Uganda, and Tanzania.",
      },
      {
        value: "Elevated",
        title: "Enforcement variability",
        context:
          "Interpretation differences between ports and inland checkpoints remain a key operational planning risk.",
      },
    ],
    news: [
      {
        title: "Country legal gazettes and forestry regulations updates",
        source: "Official gazettes",
        date: "As published",
        href: "https://www.ecolex.org/",
        image:
          "https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "FAOLEX forestry legal repository",
        source: "FAO",
        date: "Rolling",
        href: "https://www.fao.org/faolex/en/",
        image:
          "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Regional standards and conformity notices",
        source: "EAC Standards",
        date: "Periodic",
        href: "https://www.eac-quality.net/",
        image:
          "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  },
  {
    id: "public-sector-rd",
    title: "Public sector research and developments",
    summary:
      "Public R&D pipelines shape planting material quality, species adaptation, and extension services that determine long-run forestry productivity.",
    highlights: [
      {
        value: "5",
        title: "National programs monitored",
        context:
          "Research and extension programs with direct implications for species selection, productivity, and market compliance.",
      },
      {
        value: "3",
        title: "Priority species clusters",
        context:
          "Eucalyptus, pine, and climate-resilient mixed species lines dominate current policy-linked R&D focus.",
      },
      {
        value: "18 mo",
        title: "Typical policy-to-field lag",
        context:
          "Elapsed time from policy approval to measurable field-level deployment in extension and nursery programs.",
      },
      {
        value: "Medium",
        title: "Funding execution risk",
        context:
          "Budget disbursement timing remains the primary bottleneck for translating strategy documents into implementation.",
      },
      {
        value: "Growing",
        title: "Cross-border technical exchange",
        context:
          "Joint workshops and technical working groups are improving harmonization of evidence and implementation methods.",
      },
    ],
    news: [
      {
        title: "CIFOR-ICRAF tree seed systems updates",
        source: "CIFOR-ICRAF",
        date: "Rolling",
        href: "https://www.cifor-icraf.org/",
        image:
          "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Regional forestry research network publications",
        source: "FAO Forestry",
        date: "Periodic",
        href: "https://www.fao.org/forestry/en/",
        image:
          "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Government program and extension bulletins",
        source: "National agencies",
        date: "Monthly",
        href: "https://www.kfs.go.ke/",
        image:
          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  },
  {
    id: "sanctions-fx-risk",
    title: "Sanctions and FX pass-through",
    summary:
      "Currency volatility and sanctions-linked payment frictions are increasingly material for imported inputs and export settlement.",
    highlights: [
      {
        value: "High",
        title: "Imported-input FX sensitivity",
        context:
          "Fuel, spare parts, chemicals, and machinery priced in hard currency push rapid cost pass-through when FX weakens.",
      },
      {
        value: "2-6 pts",
        title: "Cost of capital uplift",
        context:
          "Higher sovereign and logistics risk premia can raise financing costs for working capital and inventory cycles.",
      },
      {
        value: "Moderate",
        title: "Settlement friction",
        context:
          "Longer compliance checks and correspondent banking friction can delay supplier payments and shipment release.",
      },
      {
        value: "31%",
        title: "USD-linked contract share",
        context:
          "Approximate share of tracked forestry-adjacent contracts indexed to USD for payment or pricing reference.",
      },
      {
        value: "Watch",
        title: "Re-pricing frequency",
        context:
          "Contracts are increasingly re-priced monthly rather than quarterly where energy and FX volatility is elevated.",
      },
    ],
    news: [
      {
        title: "Regional exchange-rate and reserves monitoring",
        source: "IMF Data",
        date: "Monthly",
        href: "https://data.imf.org/",
        image:
          "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Sanctions and compliance advisories",
        source: "OFAC",
        date: "As released",
        href: "https://ofac.treasury.gov/sanctions-programs-and-country-information",
        image:
          "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
      },
      {
        title: "Cross-border payments and trade finance trends",
        source: "World Bank",
        date: "Periodic",
        href: "https://www.worldbank.org/en/topic/financialsector",
        image:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  },
]

const informationNavLabels: Record<string, string> = {
  "policy-regulation": "Policy & Regulation",
  "finance-markets": "Finance & Markets",
  investments: "Investments",
  genetics: "Genetics",
  technology: "Technology",
}

export default function InformationHubPage() {
  const { topicSlug } = useParams()
  const topic = getInformationHubTopic(topicSlug)
  if (!topic) return <Navigate to="/errors/not-found" replace />

  const isPolicyHub = topic.slug === "policy-regulation"
  const related = forestryArticles.filter((article) => topic.relatedArticleSlugs.includes(article.slug))
  const accentStyle = { "--hub-accent": topic.accent } as CSSProperties

  const [activePolicyTopicIndex, setActivePolicyTopicIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const lastTopicSwitchAt = useRef(0)

  const activePolicyTopic = policySubtopics[activePolicyTopicIndex]

  const goPolicyTopic = (step: number) => {
    setActivePolicyTopicIndex((index) => {
      const total = policySubtopics.length
      return (index + step + total) % total
    })
  }

  const onTopicTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isPolicyHub) return
    setTouchStartX(event.touches[0]?.clientX ?? null)
  }

  const onTopicTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX
    if (Math.abs(delta) >= 48) {
      goPolicyTopic(delta > 0 ? -1 : 1)
    }
    setTouchStartX(null)
  }

  const onTopicWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!isPolicyHub) return
    const now = Date.now()
    if (now - lastTopicSwitchAt.current < 550) return

    const axisDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY

    if (Math.abs(axisDelta) < 60) return
    lastTopicSwitchAt.current = now
    goPolicyTopic(axisDelta > 0 ? 1 : -1)
  }

  const newsItems = useMemo(
    () => (isPolicyHub ? activePolicyTopic.news : []),
    [activePolicyTopic.news, isPolicyHub]
  )
  const scrollingNews = useMemo(() => [...newsItems, ...newsItems], [newsItems])

  return (
    <div className="min-h-screen bg-[#050c08] text-emerald-50" style={accentStyle}>
      <section
        className="relative overflow-hidden border-b border-emerald-900/70"
        onTouchStart={onTopicTouchStart}
        onTouchEnd={onTopicTouchEnd}
        onWheel={onTopicWheel}
      >
        <img src={topic.heroImage} alt="" className="absolute inset-0 size-full object-cover opacity-48" loading="eager" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.12),transparent_44%),linear-gradient(180deg,rgba(1,4,3,0.22),rgba(1,4,3,0.84)_28%,rgba(1,4,3,0.96)_62%,#050c08_100%)]" />

        <div className="relative mx-auto w-full max-w-[1360px] px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10">
          <div className="mb-4">
            <Link
              to="/landing"
              className="inline-flex items-center gap-2 border border-emerald-900/80 bg-[#050c08]/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-200/85 transition-colors hover:border-emerald-500 hover:text-emerald-50"
            >
              Back to landing
            </Link>
          </div>

          <nav className="grid gap-px border border-emerald-900/80 bg-black/35 backdrop-blur-sm sm:grid-cols-5">
            {informationHubOrder.map((slug) => {
              const item = informationHubTopics[slug]
              const isActive = slug === topic.slug
              return (
                <Link
                  key={slug}
                  to={`/information/${slug}`}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-[.14em] transition-colors ${
                    isActive
                      ? "text-[#03100b]"
                      : "bg-[#050c08]/75 text-emerald-100/80 hover:text-emerald-50"
                  }`}
                  style={isActive ? { backgroundColor: item.accent } : undefined}
                >
                  {informationNavLabels[slug] ?? item.label}
                </Link>
              )
            })}
          </nav>

          <div
            className="mt-8 p-6 sm:p-8 lg:p-10"
          >
            {isPolicyHub ? (
              <>
                <div className="mb-6 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goPolicyTopic(-1)}
                      className="border border-emerald-800 bg-[#07110c]/80 p-2 text-emerald-100 hover:border-emerald-400"
                      aria-label="Previous topic"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goPolicyTopic(1)}
                      className="border border-emerald-800 bg-[#07110c]/80 p-2 text-emerald-100 hover:border-emerald-400"
                      aria-label="Next topic"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                <h1 className="max-w-5xl text-[clamp(2.2rem,6.5vw,5.35rem)] font-semibold leading-[.98] tracking-[-.035em]">
                  {activePolicyTopic.title}
                </h1>
                <p className="mt-5 max-w-4xl text-[clamp(1.03rem,1.8vw,1.28rem)] leading-8 text-emerald-100/78">
                  {activePolicyTopic.summary}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[.24em]" style={{ color: "var(--hub-accent)" }}>
                  {topic.eyebrow}
                </p>
                <h1 className="mt-4 max-w-5xl text-[clamp(2.2rem,6.5vw,5.35rem)] font-semibold leading-[.98] tracking-[-.035em]">
                  {topic.label}
                </h1>
                <p className="mt-5 max-w-4xl text-[clamp(1.03rem,1.8vw,1.28rem)] leading-8 text-emerald-100/78">
                  {topic.dek}
                </p>
              </>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-emerald-900/60 pt-5">
              <p className="text-xs uppercase tracking-[.18em] text-emerald-100/55">Updated {topic.updatedAt}</p>
              {isPolicyHub ? (
                <p className="text-xs uppercase tracking-[.18em] text-emerald-100/55">Scroll or swipe to switch policy topics</p>
              ) : null}
            </div>
          </div>

          {isPolicyHub ? (
            <>
              <section className="mt-8 sm:p-7 lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[.22em] text-emerald-100/72">Highlights</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  {activePolicyTopic.highlights.slice(0, 5).map((card) => (
                    <article key={card.title} className="group relative min-h-[184px] overflow-hidden p-4 sm:min-h-[192px]">
                      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                        <span className="absolute -left-12 -top-12 size-32 animate-pulse rounded-full bg-emerald-300/18 blur-[1px] [animation-duration:2.8s]" />
                        <span className="absolute right-8 top-6 size-16 animate-pulse rounded-full bg-emerald-500/22 [animation-delay:350ms] [animation-duration:2.2s]" />
                      </div>
                      <div className="absolute -bottom-16 -right-16 h-40 w-40 overflow-hidden opacity-40" aria-hidden>
                        <img
                          src="/favicon-dark.png"
                          alt=""
                          className="h-full w-full scale-[2.25] object-cover object-left-top"
                          style={{ filter: "brightness(0) saturate(100%)", mixBlendMode: "screen" }}
                        />
                        <div className="absolute inset-0" style={{ backgroundColor: "var(--hub-accent)", mixBlendMode: "multiply" }} />
                      </div>
                      <div className="relative z-10 flex h-full flex-col justify-between">
                        <p className="text-[clamp(3.4rem,6.4vw,5.2rem)] font-semibold leading-[.86] tracking-[-.04em]" style={{ color: "var(--hub-accent)" }}>
                          {card.value}
                        </p>
                        <div>
                          <h2 className="mt-1 text-[clamp(1.18rem,2.1vw,1.62rem)] font-semibold leading-tight text-emerald-50">
                            {card.title}
                          </h2>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mt-8 border border-emerald-900/70 bg-[#050c08]/75 p-5 backdrop-blur-sm sm:p-7 lg:p-8">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <h2 className="text-[clamp(1.4rem,3.5vw,2.25rem)] font-semibold tracking-tight text-emerald-50">Topic news feed</h2>
                  <p className="text-xs uppercase tracking-[.15em] text-emerald-100/58">External sources</p>
                </div>

                <div className="overflow-hidden">
                  <div className="flex w-max gap-4 motion-reduce:animate-none [animation:hub-news-marquee_42s_linear_infinite] hover:[animation-play-state:paused]">
                    {scrollingNews.map((item, index) => (
                      <a
                        key={`${item.href}-${index}`}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block w-[min(78vw,360px)] shrink-0 overflow-hidden border border-emerald-900/65 bg-[#050c08]"
                      >
                        <div className="relative aspect-[16/9] overflow-hidden">
                          <img src={item.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/22 to-transparent" />
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-semibold uppercase tracking-[.15em]" style={{ color: "var(--hub-accent)" }}>
                            {item.source} · {item.date}
                          </p>
                          <h3 className="mt-2 text-base font-semibold leading-tight text-emerald-50 group-hover:text-emerald-200">
                            {item.title}
                          </h3>
                          <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-emerald-200/85">
                            Open source <ExternalLink className="size-3.5" />
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="mt-8 border border-emerald-900/70 bg-[#050c08]/75 p-5 backdrop-blur-sm sm:p-7 lg:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {topic.stats.map((stat) => (
                  <article key={stat.label} className="relative overflow-hidden border border-emerald-900/70 bg-gradient-to-br from-emerald-950 via-zinc-950 to-emerald-950 p-5">
                    <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.06),transparent_45%)]" />
                    <p className="relative text-[2.05rem] font-semibold tracking-[-.02em]" style={{ color: "var(--hub-accent)" }}>{stat.value}</p>
                    <p className="relative mt-2 text-sm font-semibold text-emerald-50">{stat.label}</p>
                    <p className="relative mt-2 text-xs leading-5 text-emerald-100/68">{stat.context}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-emerald-900/60 bg-emerald-950/20">
          <div className="mx-auto w-full max-w-[1360px] px-5 py-14 sm:px-8 lg:px-10">
            <div className="mb-7 flex items-end justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-emerald-50 sm:text-3xl">Related reads</h2>
              <Link to="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200/80 hover:text-emerald-100">
                View archive <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((article) => (
                <Link key={article.slug} to={`/articles/${article.slug}`} className="group block">
                  <div className="aspect-[16/9] overflow-hidden bg-zinc-900">
                    <img src={article.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[.16em]" style={{ color: "var(--hub-accent)" }}>{article.topic}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-tight text-emerald-50 group-hover:text-emerald-200">{article.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <style>{`
        @keyframes hub-news-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 0.5rem)); }
        }
      `}</style>

      <LandingFooter />
    </div>
  )
}
