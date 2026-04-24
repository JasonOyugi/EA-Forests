"use client"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, MapPinned } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, MapPolygon, MapPopup, MapTileLayer } from "@/components/ui/map"
import {
  createPolygon,
  getGroupEstimatedMetrics,
  getSubBlockEstimatedMetrics,
  initialAssetGroups,
  speciesProfile,
  type AssetGroup,
} from "../components/data-table"

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function DashboardAssetsMapPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("site") ?? initialAssetGroups[0]?.id
  const selectedGroup =
    initialAssetGroups.find((group) => group.id === selectedId) ?? initialAssetGroups[0]

  const handleSelect = (group: AssetGroup) => {
    const next = new URLSearchParams(searchParams)
    next.set("site", group.id)
    setSearchParams(next, { replace: true })
  }

  const siteContext: Record<string, { nearestTown: string }> = {
    "group-1": { nearestTown: "Gulu" },
    "group-2": { nearestTown: "Nakuru" },
    "group-3": { nearestTown: "Iringa" },
    "group-4": { nearestTown: "Mbale" },
  }

  return (
    <BaseLayout
      title="Asset Map"
      description="Compare all portfolio sites on one map. Outer polygons represent total allocated hectares; shaded inner polygons represent planted hectares."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200 bg-white/95">
            <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Portfolio Sites Map</CardTitle>
                <CardDescription>Polygons are coloured by species and scaled to each block footprint.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[82vh] min-h-[780px]">
                <Map center={selectedGroup.mapCenter} zoom={8} className="min-h-full rounded-none">
                  <MapTileLayer />
                  {initialAssetGroups.flatMap((group) =>
                    group.subBlocks.flatMap((subBlock, index) => {
                      const polygons = createPolygon(group.mapCenter, index, subBlock.size, subBlock.plantedSize)
                      const speciesColor = speciesProfile[subBlock.variety].color
                      const isSelected = group.id === selectedGroup.id

                      return [
                        <MapPolygon
                          key={`${subBlock.id}-outer`}
                          positions={polygons.outer}
                          pathOptions={{
                            color: speciesColor,
                            weight: isSelected ? 4 : 3,
                            fillColor: speciesColor,
                            fill: true,
                            fillOpacity: isSelected ? 0.22 : 0.14,
                          }}
                        >
                          <MapPopup className="w-80 p-0">
                            <div className="overflow-hidden rounded-md">
                              <div
                                className="px-4 py-3 text-white"
                                style={{ backgroundColor: speciesColor }}
                              >
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em]">
                                  {group.block} · {subBlock.subBlock}
                                </div>
                                <div className="mt-1 text-lg font-semibold capitalize">{subBlock.variety}</div>
                                <div className="text-sm text-white/85">{group.location}, {group.country}</div>
                              </div>
                              <div className="space-y-3 p-4 text-sm">
                                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Coordinates</div>
                                    <div className="mt-1 font-medium text-slate-900">
                                      {group.mapCenter[0].toFixed(4)}, {group.mapCenter[1].toFixed(4)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Nearest Town</div>
                                    <div className="mt-1 font-medium text-slate-900">
                                      {siteContext[group.id]?.nearestTown ?? "Regional hub"}
                                    </div>
                                  </div>
                                </div>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                  <table className="w-full text-left text-sm">
                                    <tbody>
                                      {[
                                        ["Size", `${subBlock.size.toFixed(2)} ha`],
                                        ["Planted", `${subBlock.plantedSize.toFixed(2)} ha`],
                                        ["Expected Volume", `${getSubBlockEstimatedMetrics(group, subBlock).estimatedVolume.toLocaleString()} m3`],
                                        ["Value", `$${getSubBlockEstimatedMetrics(group, subBlock).estimatedValuation.toLocaleString()}`],
                                        ["Investment", `$${getSubBlockEstimatedMetrics(group, subBlock).investmentPlaced.toLocaleString()}`],
                                      ].map(([label, value]) => (
                                        <tr key={label} className="border-b last:border-b-0">
                                          <th className="bg-slate-50 px-3 py-2 font-medium text-slate-600">{label}</th>
                                          <td className="px-3 py-2 text-slate-900">{value}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </MapPopup>
                        </MapPolygon>,
                        <MapPolygon
                          key={`${subBlock.id}-inner`}
                          positions={polygons.inner}
                          pathOptions={{
                            color: speciesColor,
                            weight: isSelected ? 3 : 2.5,
                            fillColor: speciesColor,
                            fill: true,
                            fillOpacity: isSelected ? 0.54 : 0.38,
                          }}
                        />,
                      ]
                    })
                  )}
                </Map>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="border-slate-200 bg-white/95">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-emerald-700" />
                  <CardTitle>{selectedGroup.block}</CardTitle>
                </div>
                <CardDescription>{selectedGroup.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Estimated volume</div>
                  <div className="mt-1 text-base font-semibold">{formatCompact(getGroupEstimatedMetrics(selectedGroup).estimatedVolume)} m3</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Estimated valuation</div>
                  <div className="mt-1 text-base font-semibold">${formatCompact(getGroupEstimatedMetrics(selectedGroup).estimatedValuation)}</div>
                </div>
                {selectedGroup.subBlocks.map((subBlock) => (
                  <div key={subBlock.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: speciesProfile[subBlock.variety].color }}
                      />
                      <span className="font-medium capitalize">{subBlock.variety}</span>
                      <span className="text-muted-foreground">{subBlock.subBlock}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatCompact(subBlock.size)} ha total, {formatCompact(subBlock.plantedSize)} ha planted
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {initialAssetGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleSelect(group)}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition ${
                    group.id === selectedGroup.id
                      ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <div className="font-medium text-slate-900">{group.block}</div>
                  <div className="mt-1 text-sm text-slate-600">{group.location}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
