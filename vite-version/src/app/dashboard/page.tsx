import { lazy, Suspense } from "react"
import { useSearchParams } from "react-router-dom"

const AssetOverview = lazy(() => import("./asset-overview"))
// The built-out Supply Intelligence workspace (map, evidence, operations --
// see supply/supply-workspace.tsx) was never wired into routing; only its
// simpler processor-overview.tsx placeholder was reachable. This restores
// the DashboardViewToggle's own claim (its "Supply Intelligence" tab is
// marked active by default) to what it actually renders, rather than
// leaving that tab silently pointing at the older placeholder.
const SupplyWorkspace = lazy(() => import("./supply/supply-workspace"))

export default function DashboardPage() {
  const [params] = useSearchParams()
  return params.get("view") === "assets"
    ? <Suspense fallback={<p className="p-6">Loading asset preview...</p>}><AssetOverview /></Suspense>
    : <Suspense fallback={<p className="p-6">Loading supply preview...</p>}><SupplyWorkspace /></Suspense>
}
