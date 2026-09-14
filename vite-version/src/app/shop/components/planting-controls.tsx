import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import { usePlantingLocation } from "@/stores/planting-location-store"
import { formatMaterialMoney, minimumPrices, selectionKey, selectionLabel } from "../lib/planting-material"
import type { MaterialFilters, MaterialSelection, PlantingMaterialOffer } from "../data/planting-material-types"
import { cn } from "@/lib/utils"

export function MaterialQuantity({ options, value, onChange, onDark = false }: {
  options: MaterialSelection[]; value: MaterialSelection; onChange: (value: MaterialSelection) => void; onDark?: boolean
}) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Planting material quantity">
    {options.map((option) => <button type="button" key={selectionKey(option)} aria-pressed={selectionKey(value) === selectionKey(option)}
      onClick={(event) => { event.stopPropagation(); onChange(option) }}
      className={cn("min-h-10 rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2",
        selectionKey(value) === selectionKey(option) ? "border-emerald-700 bg-emerald-100 text-emerald-950" : onDark ? "border-white/65 text-white hover:bg-white/15" : "border-border bg-background hover:bg-muted")}>{selectionLabel(option)}</button>)}
  </div>
}

export function MaterialHeadline({ offers, selection, className }: { offers: PlantingMaterialOffer[]; selection: MaterialSelection; className?: string }) {
  const minima = minimumPrices(offers, selection)
  return <div className={className} aria-live="polite">
    {minima.length ? <><span className="text-xs font-medium">Starting from</span>
      {minima.map((price) => <div key={price.currency} className="mt-1">
        <span className="text-2xl font-semibold">{formatMaterialMoney(price.amount, price.currency)}</span>
        <p className="text-xs">for {selectionLabel(selection)}{price.kind === "inferred" ? " · Estimated from unit price" : ""}</p>
      </div>)}
      {minima.length > 1 ? <p className="mt-2 text-xs">Minimum shown separately for each currency.</p> : null}
    </> : <><p className="text-xl font-semibold">Price on request</p><p className="mt-1 text-xs">No verified current price for {selectionLabel(selection).toLowerCase()}.</p></>}
  </div>
}

export function MaterialSelect({ label, value, options, onChange, hideLabel = false }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void; hideLabel?: boolean }) {
  return <label className="grid min-w-0 gap-1.5 text-sm"><span className={hideLabel ? "sr-only" : "font-medium"}>{label}</span>
    <select className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All {label.toLowerCase()}</option>
      {options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
}

type MaterialGeographyProps = { offers: PlantingMaterialOffer[]; filters: MaterialFilters; onChange: (next: MaterialFilters) => void }

export function MaterialRegion({ offers, filters, onChange, hideLabel = false }: MaterialGeographyProps & { hideLabel?: boolean }) {
  const regions = [...new Set(offers.filter((offer) => !filters.country || filters.country === "all" || offer.supplier.country === filters.country)
    .map((offer) => offer.supplier.region).filter((region): region is string => !!region))].sort()
  return <MaterialSelect label="Regions" hideLabel={hideLabel} value={filters.region ?? "all"} options={regions} onChange={(region) => onChange({ ...filters, region })} />
}

export function MaterialGeography({ offers, filters, onChange, showRegion = true, children, countryRowAction, leadingControl, inlineControls = false }: MaterialGeographyProps & { showRegion?: boolean; children?: ReactNode; countryRowAction?: ReactNode; leadingControl?: ReactNode; inlineControls?: boolean }) {
  const { status, message, requestLocation, clearLocation, location } = usePlantingLocation()
  const countries = [...new Set(offers.map((offer) => offer.supplier.country).filter((country): country is string => !!country))].sort()
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Supplier country">
        {["all", ...countries].map((country) => <Button key={country} size="sm" variant={(filters.country ?? "all") === country ? "default" : "outline"}
          aria-pressed={(filters.country ?? "all") === country} onClick={() => onChange({ ...filters, country, region: "all" })}>{country === "all" ? "All" : country}</Button>)}
      </div>
      {countryRowAction}
    </div>
    <div className={cn("flex flex-wrap items-center gap-3", inlineControls && "lg:flex-nowrap")}>
      {leadingControl}
      {status === "idle" || status === "loading" ? <Button variant="outline" className={cn("h-auto min-h-10 whitespace-normal text-left", inlineControls && "min-w-0 shrink")} disabled={status === "loading"} onClick={requestLocation}>
        <MapPin className="size-4 shrink-0" />{status === "loading" ? "Finding your location…" : "Use my location to find nearby nurseries"}</Button> : null}
      {location ? <><Button variant="ghost" size="sm" onClick={clearLocation}>Clear my location</Button>
        <label className="flex items-center gap-2 text-sm">Within<select aria-label="Nearby radius" value={filters.radiusKm ?? "all"}
          className="h-10 rounded-md border bg-background px-2" onChange={(e) => onChange({ ...filters, radiusKm: e.target.value === "all" ? null : Number(e.target.value) })}>
          <option value="all">Any distance</option>{[50, 100, 250, 500].map((km) => <option key={km} value={km}>{km} km</option>)}
        </select></label></> : null}
      {showRegion ? <div className="w-full sm:w-56"><MaterialRegion offers={offers} filters={filters} onChange={onChange} /></div> : null}
      {children}
    </div>
    {message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}
  </div>
}
