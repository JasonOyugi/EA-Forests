import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EnhancedProductCard } from "@/components/commerce-ui/enhanced-product-card"
import { usePlantingLocation } from "@/stores/planting-location-store"
import { filterOffers, minimumPrices, offerDistance, seedlingSelections, selectionsForOffers } from "../lib/planting-material"
import { MaterialGeography, MaterialQuantity, MaterialRegion, MaterialSelect } from "./planting-controls"
import type { MaterialFilters, MaterialSelection } from "../data/planting-material-types"
import type { ShopItem } from "../types"

export function PlantingMarket({ inventory }: { inventory: ShopItem[] }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const material = params.get("material") === "seed" ? "seed" : "seedling"
  const location = usePlantingLocation((state) => state.location)
  const [filters, setFilters] = useState<MaterialFilters>({ country: params.get("country") ?? "all" })
  const [selection, setSelection] = useState<MaterialSelection>(seedlingSelections[0])
  const [sort, setSort] = useState("relevance")
  const [sortCurrency, setSortCurrency] = useState("KES")
  const [visibleCount, setVisibleCount] = useState(24)
  const [selectedSpecies, setSelectedSpecies] = useState("all")
  const items = useMemo(() => inventory.filter((item) => item.plantingMaterialType === material), [inventory, material])
  const offers = useMemo(() => items.flatMap((item) => item.plantingOffers ?? []), [items])
  const species = [...new Set(items.map((item) => item.species ?? item.name))].sort()
  const activeFilters = { ...filters, location }
  const search = params.get("q") ?? ""
  const quantityFor = (item: ShopItem) => material === "seedling" ? selection : selectionsForOffers("seed", item.plantingOffers ?? [])[0]
  const filtered = items.map((item) => ({ item, offers: filterOffers(item.plantingOffers ?? [], activeFilters, quantityFor(item)) }))
    .filter(({ item, offers: matching }) => {
      if (selectedSpecies !== "all" && item.species !== selectedSpecies) return false
      const text = [item.name, item.description, ...matching.flatMap((offer) => [offer.variety, offer.provenance, offer.supplier.name])].join(" ").toLowerCase()
      if (!text.includes(search.trim().toLowerCase())) return false
      const constrained = [filters.country, filters.region, filters.supplier, filters.variety, filters.availability].some((value) => value && value !== "all") || filters.pricedOnly || (location && filters.radiusKm)
      return !constrained || matching.length > 0
    }).sort((a, b) => {
      if (sort.startsWith("price")) {
        const left = minimumPrices(a.offers, quantityFor(a.item)).find((price) => price.currency === sortCurrency)?.amount
        const right = minimumPrices(b.offers, quantityFor(b.item)).find((price) => price.currency === sortCurrency)?.amount
        if (left === undefined || right === undefined) return Number(left === undefined) - Number(right === undefined)
        return sort === "price-low" ? left - right : right - left
      }
      if (location) return (offerDistance(a.offers[0], location) ?? Infinity) - (offerDistance(b.offers[0], location) ?? Infinity)
      return Number(b.item.name === "Pinus patula") - Number(a.item.name === "Pinus patula")
        || Number(b.item.imageGallery?.[0]?.specificity === "species-level") - Number(a.item.imageGallery?.[0]?.specificity === "species-level")
        || a.item.name.localeCompare(b.item.name)
    })
  const navigateTo = (item: ShopItem) => {
    const query = new URLSearchParams({ material, quantity: String(quantityFor(item).quantity), unit: quantityFor(item).unit })
    for (const key of ["country", "region", "supplier", "variety", "availability"] as const) if (filters[key] && filters[key] !== "all") query.set(key, filters[key]!)
    navigate(`/shop/seedlings/${item.slug}?${query}`)
  }
  return <div className="space-y-6 pb-10">
    <MaterialGeography offers={offers} filters={activeFilters} onChange={setFilters} showRegion={false} inlineControls countryRowAction={
      <div className="inline-flex rounded-full border p-1" role="group" aria-label="Planting material view">
        {(["seedling", "seed"] as const).map((view) => <Button key={view} className="rounded-full px-6" variant={material === view ? "default" : "ghost"}
          aria-pressed={material === view} onClick={() => { const next = new URLSearchParams(params); next.set("material", view); setParams(next); setFilters({}); setSelectedSpecies("all"); setVisibleCount(24) }}>{view === "seed" ? "Seeds" : "Seedlings"}</Button>)}
      </div>
    } leadingControl={
      <Input className="h-10 w-full min-w-0 sm:w-44 sm:flex-1 lg:min-w-32" aria-label="Search planting material" placeholder="Search species or supplier" value={search} onChange={(event) => { const next = new URLSearchParams(params); next.set("q", event.target.value); setParams(next, { replace: true }); setVisibleCount(24) }} />
    }>
      <div className="w-full shrink-0 sm:w-32"><MaterialSelect label="Species" hideLabel options={species} value={selectedSpecies} onChange={(value) => { setSelectedSpecies(value); setVisibleCount(24) }} /></div>
      <div className="w-full shrink-0 sm:w-36"><MaterialRegion offers={offers} filters={activeFilters} onChange={setFilters} hideLabel /></div>
      {material === "seedling" ? <div className="shrink-0"><MaterialQuantity options={seedlingSelections} value={selection} onChange={setSelection} /></div> : null}
    </MaterialGeography>
    {material === "seed" ? <p className="text-sm text-muted-foreground">Seed quantities follow published supplier units. Pack sizes that cannot be verified are labelled.</p> : null}
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">More filters & sorting</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MaterialSelect label="Suppliers" value={filters.supplier ?? "all"} options={[...new Map(offers.map((offer) => [offer.supplier.id, { value: offer.supplier.id, label: offer.supplier.name }])).values()]} onChange={(supplier) => setFilters({ ...filters, supplier })} />
        <MaterialSelect label="Varieties / sources" value={filters.variety ?? "all"} options={[...new Set(offers.flatMap((offer) => [offer.variety, offer.provenance]).filter((value): value is string => !!value))].sort()} onChange={(variety) => setFilters({ ...filters, variety })} />
        <MaterialSelect label="Availability" value={filters.availability ?? "all"} options={["available", "seasonal", "order-only", "unknown"]} onChange={(availability) => setFilters({ ...filters, availability })} />
        <label className="grid gap-1.5 text-sm">Sort<select className="h-10 rounded-md border bg-background px-3" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">{location ? "Nearest suppliers" : "Relevance"}</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        {sort.startsWith("price") ? <label className="grid gap-1.5 text-sm">Compare currency<select className="h-10 rounded-md border bg-background px-3" value={sortCurrency} onChange={(event) => setSortCurrency(event.target.value)}>{["KES", "UGX", "TZS", "USD"].map((currency) => <option key={currency}>{currency}</option>)}</select><span className="text-xs text-muted-foreground">Unpriced offers follow priced offers.</span></label> : null}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.pricedOnly ?? false} onChange={(event) => setFilters({ ...filters, pricedOnly: event.target.checked })} />Current prices only</label>
      </div>
    </details>
    <p className="text-sm text-muted-foreground" aria-live="polite">{filtered.length} {material === "seed" ? "seed" : "seedling"} products · {new Set(filtered.flatMap(({ offers }) => offers.map((offer) => offer.supplier.id))).size} matching suppliers</p>
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, visibleCount).map(({ item }) => <EnhancedProductCard key={item.id} item={item} quantity={0}
      onAdd={() => navigateTo(item)} onDecrement={() => {}} onClick={navigateTo} theme="seedlings" showVariants
      materialFilters={activeFilters} materialSelection={material === "seedling" ? selection : undefined}
      onMaterialSelectionChange={material === "seedling" ? setSelection : undefined} />)}</div>
    {!filtered.length ? <div className="rounded-xl border border-dashed p-8 text-center"><p>No planting material matches these filters.</p><Button className="mt-4" variant="outline" onClick={() => { setFilters({}); setSelectedSpecies("all"); setParams({ material }) }}>Clear filters</Button></div> : null}
    {filtered.length > visibleCount ? <Button variant="outline" onClick={() => setVisibleCount(visibleCount + 24)}>Show more products</Button> : null}
  </div>
}
