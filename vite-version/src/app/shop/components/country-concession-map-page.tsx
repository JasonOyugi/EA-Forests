"use client"

import * as React from "react"
import { ArrowLeft, ArrowUpRight, Globe2, MapPinned } from "lucide-react"

import type { ShopItem, ShopItemMapPoint } from "@/app/shop/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, MapMarker, MapPopup, MapTileLayer } from "@/components/ui/map"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CountryConcessionMapPageProps {
  item: ShopItem
  onBack: () => void
}

const mapStyleOptions = [
  {
    value: "carto",
    label: "Light atlas",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    value: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  {
    value: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
] as const

function getMapCenter(points: ShopItemMapPoint[]) {
  const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length
  const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length
  return [latitude, longitude] as [number, number]
}

function ConcessionPin({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <div className={`absolute inset-0 rounded-full blur-lg ${active ? "bg-emerald-400/45" : "bg-emerald-300/25"}`} />
      <div
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/65 text-white shadow-lg ${
          active
            ? "scale-105 bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950"
            : "bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800"
        }`}
      >
        <Globe2 className="h-5 w-5" />
      </div>
    </div>
  )
}

export function CountryConcessionMapPage({ item, onBack }: CountryConcessionMapPageProps) {
  const points = item.mapPoints ?? []
  const [selectedMapStyle, setSelectedMapStyle] = React.useState<(typeof mapStyleOptions)[number]["value"]>("carto")
  const [selectedPointId, setSelectedPointId] = React.useState<string>(points[0]?.id ?? "")
  const selectedPoint =
    points.find((point) => point.id === selectedPointId) ?? points[0]
  const activeMapStyle = mapStyleOptions.find((option) => option.value === selectedMapStyle) ?? mapStyleOptions[0]
  const fallbackMapCenter: [number, number] = [-1.2864, 36.8172]
  const mapCenter: [number, number] = points.length > 0 ? getMapCenter(points) : fallbackMapCenter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Select value={selectedMapStyle} onValueChange={(value) => setSelectedMapStyle(value as (typeof mapStyleOptions)[number]["value"])}>
          <SelectTrigger className="w-[170px] cursor-pointer">
            <SelectValue placeholder="Map type" />
          </SelectTrigger>
          <SelectContent>
            {mapStyleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50/70">
        <CardHeader className="gap-4 border-b border-emerald-100/70">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <MapPinned className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl">
                {item.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.12fr)_340px]">
          <div className="overflow-hidden rounded-[1.8rem] border border-emerald-200 bg-white">
            <Map center={mapCenter} zoom={7} className="h-[560px] w-full">
              <MapTileLayer url={activeMapStyle.url} attribution={activeMapStyle.attribution} />
              {points.map((point) => (
                <MapMarker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={<ConcessionPin active={selectedPoint?.id === point.id} />}
                  iconAnchor={[24, 24]}
                  eventHandlers={{ click: () => setSelectedPointId(point.id) }}
                >
                  <MapPopup className="w-72 border-0 p-0">
                    <div className="overflow-hidden rounded-[1rem] bg-background">
                      <div className="relative h-32 overflow-hidden">
                        <img src={point.image} alt={point.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">{point.category}</div>
                          <div className="mt-1 text-lg font-semibold text-white">{point.name}</div>
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <p className="text-sm leading-6 text-muted-foreground">{point.summary}</p>
                        <Button size="sm" className="w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => setSelectedPointId(point.id)}>
                          Focus concession
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </MapPopup>
                </MapMarker>
              ))}
            </Map>
          </div>

          {selectedPoint ? (
            <div className="space-y-4 rounded-[1.8rem] border border-emerald-200 bg-white/90 p-5">
              <div className="overflow-hidden rounded-[1.3rem] border border-emerald-100">
                <img src={selectedPoint.image} alt={selectedPoint.name} className="h-44 w-full object-cover" />
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">{selectedPoint.category}</div>
                <h3 className="mt-2 text-2xl font-semibold">{selectedPoint.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedPoint.summary}</p>
              </div>

              <div className="space-y-3">
                {selectedPoint.details?.map((detail) => (
                  <div key={detail} className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/55 px-4 py-3 text-sm text-muted-foreground">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {points.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => setSelectedPointId(point.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      point.id === selectedPoint.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-transparent hover:border-emerald-300"
                    }`}
                  >
                    <div className="font-medium">{point.name}</div>
                    <div className="text-xs text-muted-foreground">{point.summary}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
