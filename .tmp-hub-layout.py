from pathlib import Path

root=Path('vite-version/src/app/landing/components')
p=root/'editorial-landing-section.tsx'
s=p.read_text(encoding='utf-8'); start=s.index('function MetricTile('); end=s.index('\nfunction PlayerTile(',start)
block=s[start:end].replace('function MetricTile(', 'export function MetricTile(')
block=block.replace('  return (\n    <article', '  const Tag = onSelectInformation ? "article" : "a"\n\n  return (\n    <Tag')
block=block.replace('      role="button"', '      href={onSelectInformation ? undefined : metric.website}\n      target={onSelectInformation ? undefined : "_blank"}\n      rel={onSelectInformation ? undefined : "noopener noreferrer"}\n      role={onSelectInformation ? "button" : undefined}')
block=block.replace('if (event.key === "Enter" || event.key === " ")', 'if (onSelectInformation && (event.key === "Enter" || event.key === " "))')
block=block.replace('aria-label={`Open ${metric.informationTopic} information for ${metric.label}`}', 'aria-label={onSelectInformation ? `Open ${metric.informationTopic} information for ${metric.label}` : `Read source for ${metric.label}`}')
block=block.replace('</article>', '</Tag>')
(root/'metric-tile.tsx').write_text('import { MetricCardDecoration } from "./metric-card-decoration"\nimport type { SectorMetric } from "./sector-data"\n\n'+block,encoding='utf-8')
s=s[:start]+s[end:]; s=s.replace('import { MetricCardDecoration } from "./metric-card-decoration"','import { MetricTile } from "./metric-tile"'); p.write_text(s,encoding='utf-8')

p=root/'information-live-hub.tsx'; s=p.read_text(encoding='utf-8')
s=s.replace('import { MetricCardDecoration } from "./metric-card-decoration"','import { MetricTile } from "./metric-tile"')
start=s.index('const topicCardImages:'); end=s.index('const cardKindLabels:',start)
s=s[:start]+'''function InformationCardBackground({ image }: { image?: string }) {
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,7,.3)_0%,rgba(3,10,7,.35)_25%,rgba(3,10,7,.8)_62%,rgba(3,10,7,.96)_100%)]" />
    </div>
  )
}

'''+s[end:]
start=s.index('type InformationMetric'); end=s.index('  if (card.kind ===',start)
s=s[:start]+'''function ResearchCardTile({ card, className = "" }: { card: ResearchCard; className?: string }) {
'''+s[end:]
s=s.replace('${spanClass}', '${className}').replace(' fallbackImage={fallbackImage}', '')
s=s.replace('const cardImages = topicCardImages[activeSlug] ?? topicCardImages["policy-regulation"]','const leadCard = topic.cards[0]\n  const supportingCards = topic.cards.slice(1)')
s=s.replace('? topic.cards\n    : topic.cards.filter', '? supportingCards\n    : supportingCards.filter')
s=s.replace('      <nav aria-label=', '''      <div className="grid gap-2 p-2 md:grid-cols-2">
        {topicMetrics.map((metric) => <MetricTile key={metric.label} metric={metric} size="min-h-[18rem]" />)}
        {leadCard ? <ResearchCardTile card={leadCard} className="md:col-span-2" /> : null}
      </div>

      <nav aria-label=''')
s=s.replace('? topic.cards.length\n            : topic.cards.filter', '? supportingCards.length\n            : supportingCards.filter')
start=s.index('      <div className="grid gap-2 p-2 md:grid-cols-2 xl:'); end=s.index('\n    </section>',start)
s=s[:start]+'''      <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-12 xl:auto-rows-[4px]">
        {cards.map((card, index) => (
          <ResearchCardTile
            key={card.id}
            card={card}
            className={index % 5 < 2 ? "xl:col-span-6 xl:row-span-[48]" : "xl:col-span-4 xl:row-span-[36]"}
          />
        ))}
        {cards.length === 0 ? <p className="p-6 text-sm text-white/60 md:col-span-2 xl:col-span-12 xl:row-span-[8]">No additional stories in this topic yet.</p> : null}
      </div>'''+s[end:]
# Keep short-row cards readable at three columns.
s=s.replace('className="relative mt-16"','className="relative mt-10"').replace('className="relative mt-8 flex flex-wrap','className="relative mt-5 flex flex-wrap')
p.write_text(s,encoding='utf-8')
