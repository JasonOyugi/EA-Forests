import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import gsap from "gsap"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { marketConfigs } from "../market-config"
import { getActorsByMode, getActorsForRegion, getCountriesForActors, getUnassignedActors } from "../data"
import { marketRegions, type MarketCountry } from "../../data/market-map"
import type { ActorMode, MarketId } from "../types"
import { TitleModeSelector } from "./title-mode-selector"
import { RegionMap } from "./region-map"
import { ActorTable } from "./actor-table"
import { ActorDetailDrawer } from "./actor-detail-drawer"
import { getActorById } from "../data"

function actorMatchesSearch(name: string, species: string | null, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return name.toLowerCase().includes(q) || (species?.toLowerCase().includes(q) ?? false)
}

interface MarketAtlasShellProps {
  marketId: MarketId
  /** "route" (default) navigates to the next market's own `/shop/:slug` route — used by the
   * standalone shop pages. "query" instead keeps the visitor on the current page and drives the
   * active market via a `?market=` query param — used when the shell is embedded inline (e.g. the
   * landing page), where advancing markets must not navigate away mid-scroll. */
  linkMode?: "route" | "query"
}

const UNASSIGNED_REGION = "unassigned"

export function MarketAtlasShell({ marketId, linkMode = "route" }: MarketAtlasShellProps) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const shellRef = useRef<HTMLDivElement>(null)

  const marketParam = params.get("market") as MarketId | null
  const activeMarketId = linkMode === "query" && marketParam && marketParam in marketConfigs ? marketParam : marketId
  const market = marketConfigs[activeMarketId]

  const modeParam = params.get("mode") as ActorMode | null
  const activeMode = market.subModes.some((sm) => sm.mode === modeParam) ? (modeParam as ActorMode) : market.defaultMode
  const activeSubMode = market.subModes.find((sm) => sm.mode === activeMode)!
  const search = params.get("q") ?? ""
  const regionId = params.get("region")
  const actorId = params.get("actor")
  const view = params.get("view") === "actors" ? "actors" : "regional"

  const actorsByMode = useMemo(
    () => Object.fromEntries(market.subModes.map((sm) => [sm.mode, getActorsByMode(sm.mode)])) as Partial<Record<ActorMode, ReturnType<typeof getActorsByMode>>>,
    [market]
  )
  const activeActors = actorsByMode[activeMode] ?? []
  const countries = useMemo(() => getCountriesForActors(activeActors), [activeActors])
  const country = (countries.includes(params.get("country") ?? "") ? params.get("country") : countries[0] ?? "Kenya") as MarketCountry

  const searchedActors = useMemo(
    () => activeActors.filter((actor) => actorMatchesSearch(actor.name, actor.species, search)),
    [activeActors, search]
  )
  const countryActors = useMemo(
    () => searchedActors.filter((actor) => actor.country === country),
    [searchedActors, country]
  )
  const countryRegions = useMemo(() => marketRegions.filter((region) => region.country === country), [country])

  // "unassigned" is a pseudo-region: actors whose source location is too coarse to place on the map.
  const showUnassigned = regionId === UNASSIGNED_REGION
  const tableActors = useMemo(() => {
    if (view === "actors") return countryActors
    if (search.trim()) return countryActors
    if (regionId === UNASSIGNED_REGION) return getUnassignedActors(countryActors, country)
    if (regionId) return getActorsForRegion(countryActors, regionId)
    return []
  }, [countryActors, country, regionId, search, view])

  const unassignedCount = useMemo(() => getUnassignedActors(countryActors, country).length, [countryActors, country])
  const mappedCount = useMemo(() => countryActors.filter((actor) => actor.locations.some((location) => location.latitude != null && location.longitude != null)).length, [countryActors])

  const selectedActor = actorId ? getActorById(actorId) : undefined
  const visibleSelectedActor = selectedActor?.country === country && selectedActor.modes.includes(activeMode) ? selectedActor : undefined
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null)
  const [mapFocus, setMapFocus] = useState<{ ids: string[]; serial: number } | null>(null)

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  function handleMapActorClick(ids: string[]) {
    if (!ids.length) return
    setMapFocus((previous) => ({ ids, serial: (previous?.serial ?? 0) + 1 }))
    if (!ids.every((id) => tableActors.some((actor) => actor.id === id))) updateParams({ view: "actors", region: null, actor: null, q: null })
    else if (actorId) updateParams({ actor: null })
  }

  useEffect(() => { setMapFocus(null) }, [activeMarketId, activeMode, country])
  useEffect(() => {
    if (!mapFocus) return
    const row = [...(shellRef.current?.querySelectorAll<HTMLTableRowElement>("[data-market-actor-id]") ?? [])]
      .find((element) => element.dataset.marketActorId === mapFocus.ids[0])
    if (!row) return
    const frame = window.requestAnimationFrame(() => {
      row.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" })
      row.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [mapFocus, tableActors, view])

  function handleAdvance() {
    const nextMarket = marketConfigs[market.nextMarket]
    if (linkMode === "query") {
      const next = new URLSearchParams()
      next.set("market", nextMarket.id)
      if (country) next.set("country", country)
      if (search) next.set("q", search)
      if (view === "actors") next.set("view", "actors")
      setParams(next, { replace: true })
      return
    }
    const next = new URLSearchParams()
    if (country) next.set("country", country)
    if (search) next.set("q", search)
    if (view === "actors") next.set("view", "actors")
    navigate(`${nextMarket.route}?${next.toString()}`)
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!shellRef.current) return
    gsap.fromTo(
      shellRef.current,
      { opacity: 0, x: 12 },
      { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
    )
  }, [activeMarketId])

  return (
    <div ref={shellRef} className="market-atlas isolate relative z-0 space-y-6 rounded-[2rem] p-4 md:p-6" data-market={activeSubMode.dataMarketKey}>
      <TitleModeSelector
        market={market}
        activeMode={activeMode}
        onModeChange={(mode) => updateParams({ mode, region: null, actor: null })}
        onAdvance={handleAdvance}
        nextMarketName={marketConfigs[market.nextMarket].name}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={country} onValueChange={(value) => updateParams({ country: value, region: null, actor: null })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(event) => { setMapFocus(null); updateParams({ q: event.target.value || null }) }}
          placeholder={`Search ${market.name.toLowerCase()}`}
          className="w-full max-w-xs"
        />
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm" role="group" aria-label="Map view">
          {(["regional", "actors"] as const).map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => { setMapFocus(null); updateParams({ view: option, region: null, actor: null }) }} className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-accent)] ${view === option ? "bg-[var(--market-accent)] text-[var(--market-canvas)] shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{option === "actors" ? "Individual" : "Regional"}</button>)}
        </div>
        <p className="text-sm text-muted-foreground">
          {countryActors.length} business{countryActors.length === 1 ? "" : "es"} in {country}
          {view === "actors" ? ` · ${mappedCount} with mapped locations` : ""}
          {unassignedCount > 0 ? (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => updateParams({ region: showUnassigned ? null : UNASSIGNED_REGION, actor: null })}
                className="underline underline-offset-4 transition-colors hover:text-foreground"
                aria-pressed={showUnassigned}
              >
                {unassignedCount} without a mapped region
              </button>
            </>
          ) : null}
        </p>
      </div>

      <RegionMap
        market={market}
        country={country}
        regions={countryRegions}
        actorsByMode={actorsByMode}
        activeMode={activeMode}
        selectedRegionId={showUnassigned ? null : regionId}
        onRegionSelect={(id) => updateParams({ region: id, actor: null })}
        selectedActorId={actorId ?? mapFocus?.ids[0] ?? null}
        onActorSelect={(id) => updateParams({ actor: id })}
        onMapActorClick={handleMapActorClick}
        hoveredActorId={hoveredActorId}
        onActorHover={setHoveredActorId}
        view={view}
        countryActors={countryActors}
      />

      {view === "regional" && regionId && (
        <p className="text-sm font-medium">
          {showUnassigned ? `Actors in ${country} without a mapped region` : `Actors in ${countryRegions.find((r) => r.id === regionId)?.name ?? "selected region"}`}
          <span className="ml-2 text-muted-foreground">{tableActors.length}</span>
        </p>
      )}
      {view === "regional" && !regionId && !search.trim() && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select a region on the map, or search, to see actors.
        </p>
      )}
      {(view === "actors" || regionId || search.trim()) && (
        <ActorTable
          mode={activeMode}
          actors={tableActors}
          selectedActorId={actorId}
          focusedActorIds={mapFocus?.ids ?? []}
          onActorSelect={(id) => updateParams({ actor: id })}
          hoveredActorId={hoveredActorId}
          onActorHover={setHoveredActorId}
          emptyState={market.emptyState}
        />
      )}

      <ActorDetailDrawer actor={visibleSelectedActor ?? null} onClose={() => updateParams({ actor: null })} />
    </div>
  )
}
