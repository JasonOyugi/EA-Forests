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

  const actorsByMode = useMemo(
    () => Object.fromEntries(market.subModes.map((sm) => [sm.mode, getActorsByMode(sm.mode)])) as Partial<Record<ActorMode, ReturnType<typeof getActorsByMode>>>,
    [market]
  )
  const activeActors = actorsByMode[activeMode] ?? []
  const countries = useMemo(() => getCountriesForActors(activeActors), [activeActors])
  const country = (params.get("country") ?? countries[0] ?? "Kenya") as MarketCountry

  const searchedActors = useMemo(
    () => activeActors.filter((actor) => actorMatchesSearch(actor.name, actor.species, search)),
    [activeActors, search]
  )
  const countryActors = useMemo(
    () => searchedActors.filter((actor) => actor.country === country),
    [searchedActors, country]
  )
  const countryRegions = useMemo(() => marketRegions.filter((region) => region.country === country), [country])

  const tableActors = useMemo(() => {
    if (search.trim()) return countryActors
    if (regionId) return getActorsForRegion(countryActors, regionId)
    return []
  }, [countryActors, regionId, search])

  const unassignedCount = useMemo(() => getUnassignedActors(countryActors, country).length, [countryActors, country])

  const selectedActor = actorId ? getActorById(actorId) : undefined
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null)

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  function handleAdvance() {
    const nextMarket = marketConfigs[market.nextMarket]
    if (linkMode === "query") {
      const next = new URLSearchParams()
      next.set("market", nextMarket.id)
      if (country) next.set("country", country)
      if (search) next.set("q", search)
      setParams(next, { replace: true })
      return
    }
    const next = new URLSearchParams()
    if (country) next.set("country", country)
    if (search) next.set("q", search)
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
          onChange={(event) => updateParams({ q: event.target.value || null })}
          placeholder={`Search ${market.name.toLowerCase()}`}
          className="w-full max-w-xs"
        />
        <p className="text-sm text-muted-foreground">
          {countryActors.length} actor{countryActors.length === 1 ? "" : "s"} in {country}
          {unassignedCount > 0 ? ` · ${unassignedCount} without a mapped region` : ""}
        </p>
      </div>

      <RegionMap
        market={market}
        country={country}
        regions={countryRegions}
        actorsByMode={actorsByMode}
        activeMode={activeMode}
        selectedRegionId={regionId}
        onRegionSelect={(id) => updateParams({ region: id, actor: null })}
        selectedActorId={actorId}
        onActorSelect={(id) => updateParams({ actor: id })}
        hoveredActorId={hoveredActorId}
        onActorHover={setHoveredActorId}
      />

      {regionId && (
        <p className="text-sm font-medium">
          Actors in {countryRegions.find((r) => r.id === regionId)?.name ?? "selected region"}
          <span className="ml-2 text-muted-foreground">{tableActors.length}</span>
        </p>
      )}
      {!regionId && !search.trim() && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select a region on the map, or search, to see actors.
        </p>
      )}
      {(regionId || search.trim()) && (
        <ActorTable
          mode={activeMode}
          actors={tableActors}
          selectedActorId={actorId}
          onActorSelect={(id) => updateParams({ actor: id })}
          hoveredActorId={hoveredActorId}
          onActorHover={setHoveredActorId}
          emptyState={market.emptyState}
        />
      )}

      <ActorDetailDrawer actor={selectedActor ?? null} onClose={() => updateParams({ actor: null })} />
    </div>
  )
}
