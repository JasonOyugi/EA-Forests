import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router-dom"
import ProcessorOverview from "./processor-overview"

const AssetOverview = lazy(() => import("./asset-overview"))

export default function DashboardPage() {
  const [params] = useSearchParams()
  return params.get("view") === "assets"
    ? <Suspense fallback={<p className="p-6">Loading asset preview...</p>}><AssetOverview /></Suspense>
    : <ProcessorOverview />
}
