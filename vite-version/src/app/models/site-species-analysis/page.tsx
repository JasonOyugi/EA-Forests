"use client"

import * as React from "react"

import { BaseLayout } from "@/components/layouts/base-layout"

import {
  SiteClassificationAnalysis,
  type LockedCoordinate,
} from "@/app/models/site-classification/page"
import {
  TrialSiteClassifierAnalysis,
  TrialSiteClassifierMap,
  useTrialArtifacts,
  type SelectedPoint,
} from "@/app/models/trial-site-classifier/page"

export default function SiteSpeciesAnalysisPage() {
  const trialArtifactsState = useTrialArtifacts()
  const [selectedPoint, setSelectedPoint] = React.useState<SelectedPoint | null>(null)
  const [siteAnalysisRunKey, setSiteAnalysisRunKey] = React.useState(0)

  const selectedCoordinate = React.useMemo<LockedCoordinate | null>(
    () =>
      selectedPoint
        ? {
            lat: selectedPoint.latitude,
            lon: selectedPoint.longitude,
          }
        : null,
    [selectedPoint]
  )

  const handleSharedPointSelected = React.useCallback((point: SelectedPoint) => {
    setSelectedPoint(point)
    setSiteAnalysisRunKey((current) => current + 1)
  }, [])

  const handleSiteCoordinateChange = React.useCallback(
    (coordinate: LockedCoordinate | null) => {
      setSelectedPoint(
        coordinate
          ? {
              latitude: coordinate.lat,
              longitude: coordinate.lon,
            }
          : null
      )
    },
    []
  )

  return (
    <BaseLayout
      title="Site-species analysis"
      description="Select analysis period and then double click on map."
    >
      <div className="space-y-8">
        <div className="@container/main px-4 lg:px-6">
          <TrialSiteClassifierMap
            {...trialArtifactsState}
            selectedPoint={selectedPoint}
            onPointSelected={handleSharedPointSelected}
            selectOn="doubleClick"
          />
        </div>

        <SiteClassificationAnalysis
          coordinate={selectedCoordinate}
          onCoordinateChange={handleSiteCoordinateChange}
          autoRunKey={siteAnalysisRunKey}
          hideMap
        />

        <TrialSiteClassifierAnalysis
          selectedPoint={selectedPoint}
          onSelectedPointChange={setSelectedPoint}
          hideMap
          selectionMode="doubleClick"
          artifactsState={trialArtifactsState}
        />
      </div>
    </BaseLayout>
  )
}
