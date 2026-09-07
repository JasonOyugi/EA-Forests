import { useEffect } from "react"
import { Circle, useMap } from "react-leaflet"
import { Factory, LocateFixed } from "lucide-react"
import { Map, MapMarker, MapTileLayer, MapTooltip, MapZoomControl } from "@/components/ui/map"
import { useSupply } from "./context"
import { distanceKm, number, selectedTonnes } from "./selectors"
import type { MapMode, SupplyLot } from "./types"

function CatchmentView({ position, radiusKm }: { position: [number, number]; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    const fit = () => {
      map.invalidateSize()
      const lat = radiusKm / 111.2
      const lon = lat / Math.cos(position[0] * Math.PI / 180)
      map.fitBounds([[position[0] - lat, position[1] - lon], [position[0] + lat, position[1] + lon]], { padding: [26, 26], animate: false })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, position, radiusKm])
  return null
}
function markerLabel(lot: SupplyLot, mode: MapMode, tonnes: number) {
  if (mode === "cost") return lot.deliveredCostUgxPerT.value === null ? "Cost ?" : `${number(lot.deliveredCostUgxPerT.value / 1000)}k/t`
  if (mode === "confidence") return lot.gradeTonnes.provenance.verification === "verified" ? "Verified" : "Unverified"
  if (mode === "operations") return lot.stage
  if (mode === "opportunity") return lot.feasibility === "unknown" ? "Verify access" : "Review supply"
  return `${(tonnes / 1000).toFixed(1)}k t`
}
export function SupplyMap() {
  const { data, context, analysis, update } = useSupply()
  const processor = data.processor
  const visible = analysis.eligible.filter(lot => !context.quarter || lot.availability.planningDate.slice(0, 4) + "-Q" + (Math.floor((Number(lot.availability.planningDate.slice(5, 7)) - 1) / 3) + 1) === context.quarter)
  const modeCopy: Record<MapMode, string> = {
    supply: "Marker values show compatible tonnes; point locations are illustrative.",
    cost: "UGX per delivered tonne · illustrative total costs. Unknown costs stay unpriced.",
    confidence: "No field-verified supply connected. Verification status is separate from pipeline stage.",
    opportunity: "Feasible candidates first; then availability date and compatible tonnes.",
    operations: "Demonstration commercial stages. Stage labels do not establish measured evidence.",
  }
  return <div className="si-map-wrap">
    <div className="si-map-summary"><span><LocateFixed size={15} /> <strong>{context.radiusKm} km</strong> straight-line radius</span><span>{analysis.selected.length} matching clusters</span></div>
    <div className="si-map-canvas" role="region" aria-label={`Supply map: ${analysis.selected.length} clusters within ${context.radiusKm} km. The adjacent list provides keyboard selection.`}>
      <Map center={processor.position} zoom={9} className="si-leaflet" scrollWheelZoom={false} attributionControl>
        <MapTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" darkUrl="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <CatchmentView position={processor.position} radiusKm={context.radiusKm} />
        <Circle center={processor.position} radius={context.radiusKm * 1000} pathOptions={{ color: "#267965", weight: 2, dashArray: "6 6", fillColor: "#7ba997", fillOpacity: 0.10 }} interactive={false} />
        <MapMarker position={processor.position} title={`${processor.name}, example processor`} icon={<span className="si-factory-pin"><Factory size={19} /></span>} iconSize={[38, 38]} iconAnchor={[19, 19]} iconClassName="si-marker-icon">
          <MapTooltip direction="bottom" permanent>{processor.name} · preview</MapTooltip>
        </MapMarker>
        {visible.map(lot => {
          const inRange = distanceKm(processor.position, lot.position) <= context.radiusKm
          const selected = context.selectedSupplyId === lot.id
          const tonnes = selectedTonnes(lot, context.grade)
          return <MapMarker key={`${lot.id}-${context.mapMode}-${context.grade}-${inRange}-${selected}`} position={lot.position} opacity={inRange ? 1 : 0.3}
            title={`${lot.name}: ${number(tonnes)} tonnes, ${inRange ? "inside" : "outside"} catchment, preview`}
            icon={<span className={`si-supply-pin ${selected ? "is-selected" : ""} ${context.mapMode === "confidence" ? "is-unverified" : ""}`}><i /><b>{markerLabel(lot, context.mapMode, tonnes)}</b></span>}
            iconSize={[86, 32]} iconAnchor={[12, 16]} iconClassName="si-marker-icon"
            eventHandlers={{ click: () => { if (inRange) update({ selectedSupplyId: lot.id }); else update({ radiusKm: 100, selectedSupplyId: lot.id }) } }}>
            <MapTooltip>{lot.id} · {lot.name} · {inRange ? "Preview candidate" : "Outside selected radius"}</MapTooltip>
          </MapMarker>
        })}
        <MapZoomControl position="bottomleft" />
      </Map>
      <span className="si-map-watermark">ILLUSTRATIVE SUPPLY POINTS</span>
    </div>
    <p className="si-map-legend"><i />{modeCopy[context.mapMode]}</p>
  </div>
}
