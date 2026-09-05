"use client"

import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  Database,
  FileCheck2,
  Globe2,
  MapPin,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

import {
  informationHubOrder,
  informationHubTopics,
} from "@/app/information/data"
import type { ResearchCard, ResearchCardKind } from "@/app/information/data"
import { assetUrl } from "@/lib/utils"

import { sectorMetrics } from "./sector-data"

type InformationLiveHubProps = {
  activeTopic: string
}

const allSignals = "All"

const cardKindLabels: Record<ResearchCardKind, string> = {
  news: "News",
  official: "Official",
  data: "Data",
  analysis: "Analysis",
  timeline: "Timeline",
}

function CardKindIcon({ kind }: { kind: ResearchCardKind }) {
  if (kind === "official") return <FileCheck2 className="size-3.5" />
  if (kind === "data") return <Database className="size-3.5" />
  if (kind === "analysis") return <BarChart3 className="size-3.5" />
  return <Globe2 className="size-3.5" />
}

type InformationMetric = (typeof sectorMetrics)[number]

function MetricCardTile({ metric }: { metric: InformationMetric }) {
  return (
    <a
      href={metric.website}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex min-h-[21rem] flex-col justify-between overflow-hidden border border-white/12 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 sm:p-7 xl:col-span-6"
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${metric.accent} 58%, #07110c) 0%, color-mix(in srgb, ${metric.accent} 18%, #07110c) 55%, #050807 100%)`,
      }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-[.68rem] font-semibold uppercase tracking-[.16em]" style={{ color: metric.accent }}>Did you know?</span>
        <ArrowUpRight className="size-5 shrink-0 text-white/45 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" />
      </div>
      <div className="relative mt-16">
        <p className="landing-metric-value font-semibold tracking-[-.03em] text-white">{metric.value}</p>
        <p className="mt-3 text-sm font-medium text-white/85">{metric.label}</p>
        <p className="mt-2 text-xs leading-5 text-emerald-50/64">{metric.context}</p>
      </div>
    </a>
  )
}

function ResearchCardTile({ card }: { card: ResearchCard }) {
  const spanClass = card.size === "feature"
    ? "md:col-span-2 xl:col-span-12 xl:row-span-2"
    : card.size === "wide"
      ? "md:col-span-2 xl:col-span-6"
      : card.size === "tall"
        ? "xl:col-span-4 xl:row-span-2"
        : "xl:col-span-4"

  if (card.kind === "timeline" && card.timeline) {
    return (
      <article className={`group overflow-hidden border border-white/12 bg-[#07110c] ${spanClass}`}>
        <div className="relative min-h-[20rem] overflow-hidden p-6 sm:p-8">
          {card.image ? (
            <img src={card.image.startsWith("/") ? assetUrl(card.image) : card.image} alt="" className="absolute inset-0 size-full object-cover opacity-35 transition-transform duration-700 group-hover:scale-[1.025]" loading="lazy" decoding="async" />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,10,7,.98)_4%,rgba(3,10,7,.82)_55%,rgba(3,10,7,.46)_100%)]" />
          <div className="relative flex min-h-[17rem] flex-col justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/65">
              <span className="inline-flex items-center gap-1.5" style={{ color: "var(--information-accent)" }}><Globe2 className="size-3.5" /> Live timeline</span>
              <span aria-hidden>/</span>
              <span>{card.geography}</span>
            </div>
            <div>
              {card.signal ? <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em]" style={{ color: "var(--information-accent)" }}>{card.signal}</p> : null}
              <h3 className="max-w-3xl text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.02] tracking-[-.04em] text-white">{card.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/70 sm:text-base">{card.summary}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-5 sm:p-8">
          <div className="relative ml-2 border-l border-white/15 pl-6 sm:ml-3 sm:pl-8">
            {card.timeline.map((entry) => (
              <a
                key={`${entry.date}-${entry.title}`}
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/entry relative block border-b border-white/9 py-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="absolute -left-[1.82rem] top-6 size-2.5 rounded-full border-2 border-[#07110c] sm:-left-[2.3rem]" style={{ backgroundColor: "var(--information-accent)" }} />
                <div className="grid gap-2 sm:grid-cols-[5.5rem_1fr] sm:gap-5">
                  <p className="text-xs font-semibold uppercase tracking-[.14em]" style={{ color: "var(--information-accent)" }}>{entry.date}</p>
                  <div>
                    <h4 className="flex items-start justify-between gap-4 text-base font-semibold text-white/90 transition-colors group-hover/entry:text-white">
                      {entry.title}
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 opacity-45 transition-all group-hover/entry:-translate-y-0.5 group-hover/entry:translate-x-0.5 group-hover/entry:opacity-100" />
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/58">{entry.impact}</p>
                    <p className="mt-3 text-[.68rem] font-semibold uppercase tracking-[.14em] text-white/38">Source: {entry.publisher}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </article>
    )
  }

  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex min-h-[21rem] flex-col justify-between overflow-hidden border border-white/12 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 sm:p-7 ${spanClass}`}
      style={{
        background: card.image
          ? undefined
          : "linear-gradient(145deg, color-mix(in srgb, var(--information-accent) 13%, #07110c) 0%, #050c08 72%)",
      }}
    >
      {card.image ? (
        <>
          <img src={card.image.startsWith("/") ? assetUrl(card.image) : card.image} alt="" className="absolute inset-0 size-full object-cover opacity-32 transition-all duration-700 group-hover:scale-105 group-hover:opacity-40" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,7,.38)_0%,rgba(3,10,7,.88)_58%,rgba(3,10,7,.98)_100%)]" />
        </>
      ) : (
        <div aria-hidden className="absolute -right-20 -top-20 size-52 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: "var(--information-accent)" }} />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/55">
          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--information-accent)" }}><CardKindIcon kind={card.kind} /> {cardKindLabels[card.kind]}</span>
          <span aria-hidden>/</span>
          <span>{card.publisher}</span>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-white/45 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" />
      </div>

      <div className="relative mt-16">
        {card.signal ? <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em]" style={{ color: "var(--information-accent)" }}>{card.signal}</p> : null}
        <h3 className={`font-semibold leading-[1.08] tracking-[-.025em] text-white ${card.size === "feature" ? "max-w-3xl text-3xl sm:text-5xl" : "text-2xl sm:text-[1.75rem]"}`}>{card.title}</h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/64">{card.summary}</p>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[.68rem] font-semibold uppercase tracking-[.13em] text-white/45">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {card.publishedAt}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {card.geography}</span>
      </div>
    </a>
  )
}

export function InformationLiveHub({ activeTopic }: InformationLiveHubProps) {
  const [activeSubtopic, setActiveSubtopic] = useState(allSignals)
  const activeSlug = informationHubOrder.find(
    (slug) => informationHubTopics[slug].label === activeTopic
  ) ?? informationHubOrder[0]
  const topic = informationHubTopics[activeSlug]
  const accentStyle = {
    "--information-accent": topic.accent,
  } as CSSProperties

  useEffect(() => {
    setActiveSubtopic(allSignals)
  }, [activeSlug])

  const topicMetrics = sectorMetrics.filter((metric) => metric.informationTopic === topic.label)
  const cards = activeSubtopic === allSignals
    ? topic.cards
    : topic.cards.filter((card) => card.subtopics.includes(activeSubtopic))

  return (
    <section
      key={topic.slug}
      aria-labelledby={`information-${topic.slug}`}
      className="overflow-hidden bg-[#050c08]"
      style={accentStyle}
    >
      <header className="grid gap-8 border-b border-white/10 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-10">
        <div>
          <h2 id={`information-${topic.slug}`} className="text-[clamp(2.35rem,5vw,5rem)] font-semibold leading-[.96] tracking-[-.045em]" style={{ color: "var(--information-accent)" }}>{topic.label}</h2>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <p className="text-sm font-semibold text-white/80">{topic.updatedAt}</p>
            <p className="mt-1 text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/45">Research refresh</p>
          </div>
        </div>
      </header>

      <nav aria-label={`${topic.label} research filters`} className="flex gap-2 overflow-x-auto border-b border-white/10 bg-[#07110c] p-3 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[allSignals, ...topic.subtopics].map((subtopic) => {
          const isActive = activeSubtopic === subtopic
          const count = subtopic === allSignals
            ? topic.cards.length
            : topic.cards.filter((card) => card.subtopics.includes(subtopic)).length

          return (
            <button
              key={subtopic}
              type="button"
              onClick={() => setActiveSubtopic(subtopic)}
              aria-pressed={isActive}
              className="inline-flex min-w-max items-center gap-2 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={isActive
                ? { backgroundColor: topic.accent, borderColor: topic.accent, color: "#04100b" }
                : { borderColor: "rgba(255,255,255,.12)", color: "rgba(236,253,245,.68)" }}
            >
              {subtopic}
              <span className="text-[.62rem] opacity-55">{count}</span>
            </button>
          )
        })}
      </nav>

      <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-[minmax(14rem,auto)]">
        {activeSubtopic === allSignals ? topicMetrics.map((metric) => <MetricCardTile key={metric.label} metric={metric} />) : null}
        {cards.map((card) => <ResearchCardTile key={card.id} card={card} />)}
      </div>
    </section>
  )
}
