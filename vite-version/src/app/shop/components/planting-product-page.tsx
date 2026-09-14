import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, ExternalLink, Leaf, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ImageCarouselBasic from "@/components/commerce-ui/image-carousel-basic"
import { usePlantingLocation } from "@/stores/planting-location-store"
import type { ShopItem, ShopItemImage } from "../types"
import type { MaterialFilters, MaterialSelection, PlantingMaterialOffer } from "../data/planting-material-types"
import { filterOffers, formatMaterialMoney, materialAvailability, offerDistance, priceForOffer, quoteMassGrams, selectionLabel, selectionsForOffers } from "../lib/planting-material"
import { MaterialGeography, MaterialHeadline, MaterialQuantity, MaterialSelect } from "./planting-controls"
import { PlantingSupplierMap } from "./planting-supplier-map"

function OfferDetails({ offer, selection }: { offer: PlantingMaterialOffer; selection: MaterialSelection }) {
  const price = priceForOffer(offer, selection)
  const location = usePlantingLocation((state) => state.location)
  const distance = offerDistance(offer, location)
  const technical = offer.material === "seed" ? offer.technical : null
  const rows = technical ? [
    ["Source number", technical.sourceNumber], ["Seed source", technical.seedSource], ["Source type", technical.sourceType === "unknown" ? "Not reported" : technical.sourceType],
    ["Origin", technical.origin], ["Common / local name", technical.commonName],
    ["Seeds / kg", technical.seedsPerKg?.toLocaleString("en-US")], ["Expected seedlings / kg", technical.seedlingsPerKg?.toLocaleString("en-US")],
    ["Germination / viability", technical.germination], ["Purity", technical.purity], ["Pretreatment", technical.pretreatment],
    ["Nursery duration", technical.nursery], ["Planting zones", technical.plantingZones], ["Altitude", technical.altitude], ["Rainfall", technical.rainfall],
    ["Uses", technical.uses], ["Storage", technical.storage], ["Sowing", technical.sowing], ["Collection season", technical.collectionSeason],
  ].filter(([, value]) => value) : [["Variety", offer.variety], ["Traceability", offer.provenance]].filter(([, value]) => value)
  return <article className="rounded-2xl border bg-card p-4 sm:p-5" data-offer-id={offer.id}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 className="text-lg font-semibold">{offer.supplier.name}</h3><p className="mt-1 text-sm text-muted-foreground">{[offer.supplier.station, offer.supplier.region, offer.supplier.country].filter(Boolean).join(" · ")}</p>
        {distance !== null ? <p className="mt-2 flex items-center gap-1 text-sm"><MapPin className="size-4" />Approximately {Math.round(distance)} km away</p> : null}
        {offer.provenance ? <Badge className="mt-2" variant="outline">Source: {offer.provenance}</Badge> : null}
      </div>
      <div className="max-w-sm text-sm">
        <p className="text-xl font-semibold">{price ? formatMaterialMoney(price.amount, price.currency) : "Price on request"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{price ? `for ${selectionLabel(selection)} · ${price.note}` : "Confirm the current price and quoted unit."}</p>
        {price && selection.unit === "seedling" && selection.quantity > 1 ? <p className="mt-1 text-xs">{formatMaterialMoney(price.perUnit, price.currency)} / seedling equivalent</p> : null}
        {price && offer.material === "seed" && quoteMassGrams(price.original) ? <p className="mt-1 text-xs">{formatMaterialMoney(price.original.amount! * 1000 / quoteMassGrams(price.original)!, price.currency)} / kg equivalent</p> : null}
      </div>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">{offer.availabilityNote}</p>
    {rows.length ? <details className="mt-4" open={offer.material === "seed"}>
      <summary className="cursor-pointer text-sm font-medium">{offer.material === "seed" ? "Seed source & planting guidance" : "Planting material details"}</summary>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      {technical ? <p className="mt-3 text-xs text-muted-foreground">Source-specific published guidance; request a current seed-lot test certificate. Figures are not guaranteed establishment yields.</p> : null}
    </details> : null}
    <details className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
      <summary className="cursor-pointer font-medium">Price evidence & source history</summary>
      <div className="mt-3 space-y-3 leading-relaxed"><p>{offer.evidence.notes}</p><p>Supply evidence: {offer.evidence.kind} · {offer.evidence.confidence} confidence · {offer.evidence.freshness}</p>
        {offer.quotes.map((quote, index) => <div key={index}><p>{quote.amount ? `Published amount: ${formatMaterialMoney(quote.amount, quote.currency)}` : "Current price: unknown"} · {quote.unit === "unknown" ? "Commercial unit not verified; excluded from comparisons." : `${quote.quantity} ${quote.unit}`}</p>
          <p>{quote.evidence.kind} · Publication: {quote.evidence.publishedAt ?? "Not stated"} · Accessed: {quote.evidence.accessedAt ?? "Not recorded"}</p><p>{quote.evidence.notes}</p></div>)}
        {offer.historicalQuotes?.map((quote, index) => <p key={index}>Historical only: {quote.amount ? formatMaterialMoney(quote.amount, quote.currency) : "Amount unknown"} / {quote.quantity} {quote.unit} · {quote.evidence.publishedAt}. Excluded from current pricing.</p>)}
        {offer.evidence.url ? <a className="inline-flex items-center gap-1 underline" href={offer.evidence.url} target="_blank" rel="noreferrer">View source record <ExternalLink className="size-3" /></a> : null}
      </div>
    </details>
    <div className="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground"><p>{offer.supplier.address}</p><p>{offer.supplier.ordering}</p><p>{offer.supplier.delivery}</p>
      {offer.supplier.coordinatePrecision ? <p className="text-xs">Location: {offer.supplier.coordinatePrecision}</p> : <p className="text-xs">Collection location not mapped.</p>}
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-sm">
      {offer.supplier.phone ? <a className="rounded-md border px-3 py-2" href={`tel:${offer.supplier.phone.replace(/[^+\d]/g, "")}`}>Call supplier</a> : null}
      {offer.supplier.email ? <a className="rounded-md border px-3 py-2" href={`mailto:${offer.supplier.email}`}>Email supplier</a> : null}
      {offer.supplier.website ? <a className="rounded-md border px-3 py-2" href={offer.supplier.website} target="_blank" rel="noreferrer">Ordering & contact <ExternalLink className="ml-1 inline size-3" /></a> : null}
    </div>
    {offer.supplier.branches?.length ? <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Regional seed centres — confirm the supplying branch</summary>
      <p className="mt-2 text-xs text-muted-foreground">Centre contacts are published; stock of this source at each branch is not verified.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{offer.supplier.branches.map((branch) => <li key={branch.name}><strong>{branch.name}</strong><p className="text-xs text-muted-foreground">{branch.address}</p><a className="text-xs underline" href={`tel:${branch.phone}`}>{branch.phone}</a></li>)}</ul>
    </details> : null}
  </article>
}

export function PlantingProductPage({ item, onBack }: { item: ShopItem; onBack?: () => void }) {
  const [params] = useSearchParams()
  const offers = item.plantingOffers ?? []
  const options = selectionsForOffers(item.plantingMaterialType ?? "seedling", offers)
  const [selection, setSelection] = useState<MaterialSelection>(() => options.find((option) => String(option.quantity) === params.get("quantity") && option.unit === params.get("unit")) ?? options[0])
  const [filters, setFilters] = useState<MaterialFilters>(() => Object.fromEntries(["country", "region", "supplier", "variety", "availability"].map((key) => [key, params.get(key) ?? "all"])))
  const location = usePlantingLocation((state) => state.location)
  const filtered = filterOffers(offers, { ...filters, location }, selection)
  const groups = [...new Map(filtered.map((offer) => [offer.supplier.id, offer.supplier])).values()]
  const images: ShopItemImage[] = item.imageGallery?.length ? item.imageGallery : item.image ? [{ url: item.image, title: item.name }] : []
  return <div className="min-w-0 space-y-6 px-3 py-5 sm:px-6 lg:p-8">
    <Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />Back to products</Button>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">{images.length ? <ImageCarouselBasic images={images.map((image) => ({ ...image, caption: <>
          <p className="font-medium">{image.depicts || image.title || item.name}{image.specificity ? ` / ${image.specificity.replace("-level", "")} reference` : ""}</p>
          {image.specificity === "genus-level" ? <p>Genus reference only; this photograph does not verify the product species or variety.</p> : null}
          <p className="mt-1">{image.creator ? `${image.creator} / ` : ""}{image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{image.license || "Licence"}</a> : image.license}
            {image.sourcePage ? <> / <a href={image.sourcePage} target="_blank" rel="noreferrer" className="underline underline-offset-2">{image.source || "Image source"}</a></> : null}</p>
        </> }))} aspectRatio="hero" imageFit="cover" showThumbs={false} className="w-full max-w-none" />
        : <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted text-muted-foreground lg:h-[70vh] lg:min-h-[480px]"><div className="text-center"><Leaf className="mx-auto mb-3 size-10" /><p>Verified species photography pending</p></div></div>}
      </div>
      <div className="min-w-0 space-y-5"><Badge variant="outline">{item.plantingMaterialType === "seed" ? "Tree seed" : "Seedlings"}</Badge>
        <h1 className="type-display-title break-words">{item.name}</h1><p className="text-muted-foreground">{item.description}</p>
        <p className="text-sm" aria-live="polite">{groups.length} matching suppliers · {materialAvailability(filtered)}</p>
        <div className="space-y-2"><p className="text-sm font-medium">{item.plantingMaterialType === "seed" ? "Quoted seed quantity" : "Seedling quantity"}</p><MaterialQuantity options={options} value={selection} onChange={setSelection} /></div>
        <div className="rounded-2xl border bg-muted/30 p-5"><MaterialHeadline offers={filtered} selection={selection} /><p className="mt-4 text-xs text-muted-foreground">Each supplier’s own price and evidence are shown below. Confirm delivery fees and the final quotation directly.</p></div>
        <a href="#planting-suppliers" className="inline-block rounded-md border px-4 py-2 text-sm">Compare suppliers & sources</a>
      </div>
    </div>
    <section id="planting-suppliers" className="space-y-5 scroll-mt-6"><h2 className="text-2xl font-semibold">{item.plantingMaterialType === "seed" ? "Seed suppliers & source records" : "Nurseries supplying this material"}</h2>
      <MaterialGeography offers={offers} filters={{ ...filters, location }} onChange={setFilters} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><MaterialSelect label="Varieties / sources" value={filters.variety ?? "all"} options={[...new Set(offers.flatMap((offer) => [offer.variety, offer.provenance]).filter((value): value is string => !!value))]} onChange={(variety) => setFilters({ ...filters, variety })} />
        <MaterialSelect label="Suppliers" value={filters.supplier ?? "all"} options={[...new Map(offers.map((offer) => [offer.supplier.id, { value: offer.supplier.id, label: offer.supplier.name }])).values()]} onChange={(supplier) => setFilters({ ...filters, supplier })} />
        <MaterialSelect label="Availability" value={filters.availability ?? "all"} options={["available", "seasonal", "order-only", "unknown"]} onChange={(availability) => setFilters({ ...filters, availability })} /></div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{groups.length} suppliers · {filtered.length} source / variety offers{location ? " · Nearest first" : ""}</p>
      <PlantingSupplierMap offers={filtered} location={location} />
      {groups.map((supplier) => <div key={supplier.id} id={`supplier-${supplier.id}`} className="space-y-4 scroll-mt-5">{filtered.filter((offer) => offer.supplier.id === supplier.id).map((offer) => <OfferDetails key={offer.id} offer={offer} selection={selection} />)}</div>)}
      {!filtered.length ? <div className="rounded-xl border border-dashed p-6"><p>No suppliers match your selected geography or source.</p><Button className="mt-3" variant="outline" onClick={() => setFilters({})}>Clear supplier filters</Button></div> : null}
    </section>
  </div>
}
