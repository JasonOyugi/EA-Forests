import { useMemo } from "react"
import { Building2, Leaf, Truck, Trees } from "lucide-react"
import { MapMarker, MapMarkerClusterGroup } from "@/components/ui/map"
import type { Actor, ActorLocation, ActorMode } from "../types"

function bestLocation(actor: Actor): ActorLocation | undefined {
  const confidence = { high: 0, medium: 1, low: 2 }
  const type = { factory: 0, nursery: 0, plantation: 1, "timber yard": 1, branch: 2, office: 3, "operational area": 4, other: 5 }
  return actor.locations
    .filter((location) => location.latitude != null && location.longitude != null)
    .sort((a, b) =>
      (confidence[a.coordinateConfidence ?? "low"] - confidence[b.coordinateConfidence ?? "low"]) ||
      ((type[a.locationType ?? "other"] ?? 5) - (type[b.locationType ?? "other"] ?? 5))
    )[0]
}

type Group = { key: string; location: ActorLocation; actors: Actor[] }

export function ActorMapLayer({ actors, mode, selectedActorId, hoveredActorId, onActorSelect, onActorHover }: {
  actors: Actor[]; mode: ActorMode; selectedActorId: string | null; hoveredActorId: string | null
  onActorSelect: (ids: string[]) => void; onActorHover: (id: string | null) => void
}) {
  const groups = useMemo(() => {
    const grouped = new Map<string, Group>()
    for (const actor of actors) {
      const location = bestLocation(actor)
      if (!location) continue
      const key = location.groupKey ?? `${location.country}|${location.latitude}|${location.longitude}`
      if (!grouped.has(key)) grouped.set(key, { key, location, actors: [] })
      grouped.get(key)!.actors.push(actor)
    }
    return [...grouped.values()]
  }, [actors])
  const Icon = mode === "wood" ? Building2 : mode === "harvest_haulage" ? Truck : mode === "silviculture" ? Trees : Leaf

  return <MapMarkerClusterGroup maxClusterRadius={12} icon={(count) => <div className="flex size-9 items-center justify-center rounded-full border-2 border-[var(--market-accent)] bg-[var(--market-canvas)] text-xs font-semibold text-[var(--market-accent)]">{count}</div>}>
    {groups.map(({ key, actors: atLocation, location }) => {
      const active = atLocation.some((actor) => actor.id === selectedActorId || actor.id === hoveredActorId)
      return <MapMarker
        key={key}
        position={[location.latitude!, location.longitude!]}
        iconAnchor={[16, 16]}
        iconSize={[32, 32]}
        icon={<div className="relative flex size-8 items-center justify-center rounded-md border-2 border-[var(--market-canvas)] bg-[var(--market-accent)] text-[var(--market-canvas)] shadow-md" style={{ outline: active ? "2px solid var(--market-accent)" : undefined }}><Icon size={16} strokeWidth={2.3} />{atLocation.length > 1 && <span className="absolute -bottom-2 -right-2 flex min-w-5 items-center justify-center rounded-full border border-[var(--market-canvas)] bg-[var(--market-canvas)] px-1 text-[10px] font-bold leading-4 text-[var(--market-accent)]">{atLocation.length}</span>}</div>}
        eventHandlers={{
          click: () => onActorSelect(atLocation.map((actor) => actor.id)),
          mouseover: () => atLocation.length === 1 && onActorHover(atLocation[0].id),
          mouseout: () => onActorHover(null),
        }}
        title={atLocation.length === 1 ? atLocation[0].name : `${location.town ?? location.district ?? "Shared location"}: ${atLocation.length} actors`}
      />
    })}
  </MapMarkerClusterGroup>
}
