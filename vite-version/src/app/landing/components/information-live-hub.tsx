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
import { informationCardImages } from "@/app/information/card-images"
import { assetUrl } from "@/lib/utils"

import { sectorMetrics } from "./sector-data"
import { MetricTile } from "./metric-tile"

type InformationLiveHubProps = {
  activeTopic: string
}

const allSignals = "All"

function InformationCardBackground({ cardId, image }: { cardId: string; image?: string }) {
  const photo = informationCardImages[cardId]
  image = photo?.url ?? image
  if (!image) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        src={image.startsWith("/") ? assetUrl(image) : image}
        alt=""
        className="size-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        loading="lazy"
        decoding="async"
        onError={({ currentTarget }) => { currentTarget.style.visibility = "hidden" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(236,253,245,.08)_0%,rgba(236,253,245,.22)_30%,rgba(236,253,245,.78)_64%,rgba(236,253,245,.94)_100%)] dark:bg-[linear-gradient(180deg,rgba(3,10,7,.1)_0%,rgba(3,10,7,.22)_30%,rgba(3,10,7,.8)_64%,rgba(3,10,7,.96)_100%)]" />
    </div>
  )
}

/** Attribution the CC BY / BY-SA photo licences require. Plain text: the card itself is a link. */
function PhotoCredit({ cardId }: { cardId: string }) {
  const photo = informationCardImages[cardId]
  if (!photo) return null
  return (
    <span className="ml-auto normal-case tracking-normal font-medium opacity-70" title={photo.source}>
      Photo: {photo.credit} · {photo.license}
    </span>
  )
}

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

function ResearchCardTile({ card, className = "" }: { card: ResearchCard; className?: string }) {
  if (card.kind === "timeline" && card.timeline) {
    return (
      <article className={`group relative overflow-hidden border border-emerald-900/20 bg-transparent dark:border-white/12 ${className}`}>
        <InformationCardBackground cardId={card.id} image={card.image} />
        <div className="relative min-h-[20rem] overflow-hidden p-6 sm:p-8">
          <div className="relative flex min-h-[17rem] flex-col justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[.68rem] font-semibold uppercase tracking-[.16em] text-emerald-800/80 dark:text-white/65">
              <span className="inline-flex items-center gap-1.5" style={{ color: "var(--information-accent)" }}><Globe2 className="size-3.5" /> Live timeline</span>
              <span aria-hidden>/</span>
              <span>{card.geography}</span>
            </div>
            <div>
              {card.signal ? <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em]" style={{ color: "var(--information-accent)" }}>{card.signal}</p> : null}
              <h3 className="max-w-3xl text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.02] tracking-[-.04em] text-emerald-950 dark:text-white">{card.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-900/75 dark:text-emerald-50/70 sm:text-base">{card.summary}</p>
              <p className="mt-4 text-[.62rem] font-medium normal-case tracking-normal text-emerald-800/60 dark:text-white/40"><PhotoCredit cardId={card.id} /></p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-emerald-900/20 bg-transparent p-5 dark:border-white/10 sm:p-8">
          <div className="relative ml-2 border-l border-emerald-900/20 pl-6 dark:border-white/15 sm:ml-3 sm:pl-8">
            {card.timeline.map((entry) => (
              <a
                key={`${entry.date}-${entry.title}`}
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/entry relative block border-b border-emerald-900/15 py-5 first:pt-0 last:border-b-0 last:pb-0 dark:border-white/9"
              >
                <span className="absolute -left-[1.82rem] top-6 size-2.5 rounded-full border-2 border-emerald-100 dark:border-[#07110c] sm:-left-[2.3rem]" style={{ backgroundColor: "var(--information-accent)" }} />
                <div className="grid gap-2 sm:grid-cols-[5.5rem_1fr] sm:gap-5">
                  <p className="text-xs font-semibold uppercase tracking-[.14em]" style={{ color: "var(--information-accent)" }}>{entry.date}</p>
                  <div>
                    <h4 className="flex items-start justify-between gap-4 text-base font-semibold text-emerald-950/90 transition-colors group-hover/entry:text-emerald-950 dark:text-white/90 dark:group-hover/entry:text-white">
                      {entry.title}
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 opacity-45 transition-all group-hover/entry:-translate-y-0.5 group-hover/entry:translate-x-0.5 group-hover/entry:opacity-100" />
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-emerald-900/70 dark:text-emerald-50/58">{entry.impact}</p>
                    <p className="mt-3 text-[.68rem] font-semibold uppercase tracking-[.14em] text-emerald-800/65 dark:text-white/38">Source: {entry.publisher}</p>
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
      className={`group relative flex min-h-[21rem] flex-col justify-between overflow-hidden border border-emerald-900/20 bg-transparent p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 dark:border-white/12 sm:p-7 ${className}`}
    >
      <InformationCardBackground cardId={card.id} image={card.image} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[.68rem] font-semibold uppercase tracking-[.16em] text-emerald-800/75 dark:text-white/55">
          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--information-accent)" }}><CardKindIcon kind={card.kind} /> {cardKindLabels[card.kind]}</span>
          <span aria-hidden>/</span>
          <span>{card.publisher}</span>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-emerald-800/65 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-emerald-950 dark:text-white/45 dark:group-hover:text-white" />
      </div>

      <div className="relative mt-10">
        {card.signal ? <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em]" style={{ color: "var(--information-accent)" }}>{card.signal}</p> : null}
        <h3 className={`font-semibold leading-[1.08] tracking-[-.025em] text-emerald-950 dark:text-white ${card.size === "feature" ? "max-w-3xl text-3xl sm:text-5xl" : "text-2xl sm:text-[1.75rem]"}`}>{card.title}</h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-900/75 dark:text-emerald-50/64">{card.summary}</p>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-emerald-900/20 pt-4 text-[.68rem] font-semibold uppercase tracking-[.13em] text-emerald-800/65 dark:border-white/10 dark:text-white/45">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {card.publishedAt}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {card.geography}</span>
        <PhotoCredit cardId={card.id} />
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
  const leadCard = topic.cards[0]
  const supportingCards = topic.cards.slice(1)
  const accentStyle = {
    "--information-accent": topic.accent,
  } as CSSProperties

  useEffect(() => {
    setActiveSubtopic(allSignals)
  }, [activeSlug])

  const topicMetrics = sectorMetrics.filter((metric) => metric.informationTopic === topic.label)
  const cards = activeSubtopic === allSignals
    ? supportingCards
    : supportingCards.filter((card) => card.subtopics.includes(activeSubtopic))

  return (
    <section
      key={topic.slug}
      aria-labelledby={`information-${topic.slug}`}
      className="overflow-hidden bg-transparent"
      style={accentStyle}
    >
      <header className="grid gap-8 border-b border-emerald-900/20 p-5 dark:border-white/10 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-10">
        <div>
          <h2 id={`information-${topic.slug}`} className="text-[clamp(2.35rem,5vw,5rem)] font-semibold leading-[.96] tracking-[-.045em]" style={{ color: "var(--information-accent)" }}>{topic.label}</h2>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <p className="text-sm font-semibold text-emerald-950/80 dark:text-white/80">{topic.updatedAt}</p>
            <p className="mt-1 text-[.68rem] font-semibold uppercase tracking-[.16em] text-emerald-800/70 dark:text-white/45">Weekly refresh</p>
          </div>
        </div>
      </header>

      <div className="grid gap-2 p-2 md:grid-cols-2">
        {topicMetrics.map((metric) => <MetricTile key={metric.label} metric={metric} size="min-h-[18rem]" />)}
        {leadCard ? <ResearchCardTile card={leadCard} className="md:col-span-2" /> : null}
      </div>

      <nav aria-label={`${topic.label} research filters`} className="flex gap-2 overflow-x-auto border-b border-emerald-900/20 bg-transparent p-3 dark:border-white/10 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[allSignals, ...topic.subtopics].map((subtopic) => {
          const isActive = activeSubtopic === subtopic
          const count = subtopic === allSignals
            ? supportingCards.length
            : supportingCards.filter((card) => card.subtopics.includes(subtopic)).length

          return (
            <button
              key={subtopic}
              type="button"
              onClick={() => setActiveSubtopic(subtopic)}
              aria-pressed={isActive}
              className={`inline-flex min-w-max items-center gap-2 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/70 dark:focus-visible:ring-white/70 ${isActive ? "" : "border-emerald-900/20 text-emerald-800 dark:border-white/12 dark:text-emerald-50/70"}`}
              style={isActive
                ? { backgroundColor: topic.accent, borderColor: topic.accent, color: "#04100b" }
                : undefined}
            >
              {subtopic}
              <span className="text-[.62rem] opacity-55">{count}</span>
            </button>
          )
        })}
      </nav>

      <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-[4px]">
        {cards.map((card, index) => (
          <ResearchCardTile
            key={card.id}
            card={card}
            className={index % 5 < 2 ? "xl:col-span-6 xl:row-span-[48]" : "xl:col-span-4 xl:row-span-[36]"}
          />
        ))}
        {cards.length === 0 ? <p className="p-6 text-sm text-emerald-800/70 dark:text-white/60 md:col-span-2 xl:col-span-12 xl:row-span-[8]">No additional stories in this topic yet.</p> : null}
      </div>
    </section>
  )
}
