import type { ReactNode } from "react"
import { MapLayers, MapLayersControl, MapTileLayer } from "@/components/ui/map"

/**
 * The one shared "Map ⇄ Satellite" basemap control every public map surface uses (Market Atlas,
 * SSMT card, Site Analysis card, EO cards) — do not roll a bespoke tile-layer list per tool.
 * "Satellite" is Esri World Imagery *plus* Esri's free Reference/World_Boundaries_and_Places
 * tiles stacked on top (roads/labels/admin boundaries over imagery, Google-Earth-like) — both
 * registered under the same "Satellite" name so they show/hide together as one selectable option,
 * both free and keyless. Switching basemap never remounts `children` — it only swaps which
 * registered `MapTileLayer`s are visible, so overlays/markers/viewport/selection are untouched.
 */
export function BasemapLayers({ children }: { children?: ReactNode }) {
  return (
    <MapLayers defaultTileLayer="Map">
      <MapTileLayer
        name="Map"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapTileLayer
        name="Satellite"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Imagery &amp; boundaries &copy; Esri"
      />
      <MapTileLayer
        name="Satellite"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        attribution=""
      />
      {children}
      <MapLayersControl tileLayersLabel="Basemap" layerGroupsLabel="" />
    </MapLayers>
  )
}
