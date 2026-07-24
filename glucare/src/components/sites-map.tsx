"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"

// Fix default icon issue
type LeafletDefaultIconPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: string
}

const defaultIconPrototype = L.Icon.Default.prototype as LeafletDefaultIconPrototype
delete defaultIconPrototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

type Site = {
  name: string
  type: "planting" | "silviculture"
  lat: number
  lng: number
}

export function SitesMap({ sites }: { sites: Site[] }) {
  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl border">
      <MapContainer
        center={[0.2, 35.5]}
        zoom={7}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sites.map((site) => (
          <Marker key={site.name} position={[site.lat, site.lng]}>
            <Popup>
              <div>
                <strong>{site.name}</strong>
                <br />
                {site.type}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
