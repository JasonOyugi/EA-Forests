import { useEffect, useMemo } from "react"
import { useMap } from "react-leaflet"
import { Map, MapCircleMarker, MapMarker, MapPopup, MapTileLayer, MapTooltip, MapZoomControl } from "@/components/ui/map"
import { Leaf } from "lucide-react"
import type { MaterialCoordinate, PlantingMaterialOffer } from "../data/planting-material-types"
import { validCoordinate } from "../lib/planting-material"

function SupplierViewport({ points, location }: { points: MaterialCoordinate[]; location: MaterialCoordinate | null }) {
  const map = useMap()
  useEffect(() => {
    const coordinates = [...points, ...(location ? [location] : [])].map((point): [number, number] => [point.latitude, point.longitude])
    if (coordinates.length) map.fitBounds(coordinates, { padding: [35, 35], maxZoom: 11, animate: false })
    map.invalidateSize()
  }, [map, points, location])
  return null
}

export function PlantingSupplierMap({ offers, location }: { offers: PlantingMaterialOffer[]; location: MaterialCoordinate | null }) {
  const suppliers = useMemo(() => [...new globalThis.Map(offers.map((offer) => [offer.supplier.id, offer.supplier])).values()], [offers])
  const mapped = suppliers.filter((supplier) => validCoordinate(supplier.coordinate))
  const points = useMemo(() => suppliers.flatMap((supplier) => validCoordinate(supplier.coordinate) ? [supplier.coordinate] : []), [suppliers])
  if (!mapped.length) return <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No verified supplier locations match this filter. Suppliers without coordinates remain in the list below.</div>
  return <div className="space-y-2">
    <div className="relative isolate h-[360px] overflow-hidden rounded-2xl border sm:h-[440px]" aria-label="Supplier locations map">
      <Map center={[points[0].latitude, points[0].longitude]} zoom={6} className="!z-0 h-full w-full">
        <MapTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        <SupplierViewport points={points} location={location} />
        <MapZoomControl />
        {mapped.map((supplier) => <MapMarker key={supplier.id} position={[supplier.coordinate!.latitude, supplier.coordinate!.longitude]}
          icon={<span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-emerald-800 text-white shadow"><Leaf className="size-4" /></span>} iconSize={[36, 36]}>
          <MapPopup><div className="max-w-64 space-y-2"><strong>{supplier.name}</strong><p>{supplier.address}</p><p>{supplier.coordinatePrecision}</p><a href={`#supplier-${supplier.id}`} className="underline">View supplier offers</a></div></MapPopup>
          <MapTooltip>{supplier.name}</MapTooltip>
        </MapMarker>)}
        {location ? <MapCircleMarker center={[location.latitude, location.longitude]} radius={8} pathOptions={{ color: "#ffffff", fillColor: "#2563eb", fillOpacity: 1 }}><MapTooltip>Your location</MapTooltip></MapCircleMarker> : null}
      </Map>
    </div>
    <p className="text-xs text-muted-foreground">{mapped.length} mapped of {suppliers.length} suppliers. Locations may represent centre vicinities; confirm the collection point. Map © OpenStreetMap contributors.</p>
  </div>
}
