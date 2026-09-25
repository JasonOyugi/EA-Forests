// Thin adapters so the existing `shopPageComponents` registry (which renders `{shop, inventory}`
// props from `config/shops.tsx`) can mount the shared Market Atlas shell. The Atlas reads actor
// data directly from `market-atlas/data.ts`, not from the legacy per-shop inventory JSON.
import { MarketAtlasShell } from "./components/market-atlas-shell"

export function SeedlingsMarketAtlasPage() {
  return <MarketAtlasShell marketId="seedlings" />
}

export function ForestryServicesMarketAtlasPage() {
  return <MarketAtlasShell marketId="forestry-services" />
}

export function WoodMarketsAtlasPage() {
  return <MarketAtlasShell marketId="wood-markets-map" />
}
