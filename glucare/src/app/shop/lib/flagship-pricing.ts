import type { ShopItem } from "../types"

export type FlagshipProductSlug =
  | "core-forests"
  | "high-performance-forests"
  | "dryland-frontier-forests"

type FlagshipPricingDefinition = {
  name: string
  monthlyPrice: number
  yearlyPrice: number
}

export const flagshipPricingCatalog: Record<
  FlagshipProductSlug,
  FlagshipPricingDefinition
> = {
  "core-forests": {
    name: "Core Forests",
    monthlyPrice: 250,
    yearlyPrice: 2200,
  },
  "high-performance-forests": {
    name: "High-Performance Forests",
    monthlyPrice: 550,
    yearlyPrice: 5100,
  },
  "dryland-frontier-forests": {
    name: "Dryland Forests",
    monthlyPrice: 550,
    yearlyPrice: 5100,
  },
}

function formatUsd(value: number) {
  return `USD ${new Intl.NumberFormat("en-US").format(value)}`
}

function formatDollar(value: number) {
  return `$${new Intl.NumberFormat("en-US").format(value)}`
}

export function formatFlagshipRate(
  value: number,
  cadence: "month" | "year",
  spaced = false
) {
  return spaced
    ? `${formatUsd(value)} / ${cadence} / ha`
    : `${formatUsd(value)}/${cadence}/ha`
}

export function getFlagshipPricing(slug: string) {
  const pricing = flagshipPricingCatalog[slug as FlagshipProductSlug]

  if (!pricing) return null

  const maintenanceYearlyPrice = pricing.yearlyPrice / 2
  const maintenanceMonthlyPrice = pricing.monthlyPrice / 2

  return {
    ...pricing,
    maintenanceYearlyPrice,
    maintenanceMonthlyPrice,
    startingMonthlyLabel: `Establishment from ${formatFlagshipRate(
      pricing.monthlyPrice,
      "month"
    )}`,
    startingLabel: `Establishment from ${formatFlagshipRate(
      pricing.monthlyPrice,
      "month"
    )} or ${formatFlagshipRate(pricing.yearlyPrice, "year")}`,
    monthlyLabel: formatFlagshipRate(pricing.monthlyPrice, "month", true),
    yearlyLabel: formatFlagshipRate(pricing.yearlyPrice, "year", true),
    monthlyDisplayLabel: `${formatDollar(pricing.monthlyPrice)}/ha`,
    yearlyDisplayLabel: `${formatDollar(pricing.yearlyPrice)}/ha`,
    maintenanceMonthlyDisplayLabel: `${formatDollar(maintenanceMonthlyPrice)}/ha`,
    maintenanceYearlyDisplayLabel: `${formatDollar(maintenanceYearlyPrice)}/ha`,
    maintenanceYearlyLabel: formatFlagshipRate(
      maintenanceYearlyPrice,
      "year",
      true
    ),
  }
}

export function normalizeFlagshipShopItem(item: ShopItem): ShopItem {
  const pricing = getFlagshipPricing(item.slug)

  if (!pricing) return item

  return {
    ...item,
    name: pricing.name,
    price: pricing.yearlyPrice,
    unitLabel: "establishment / year / ha",
    minimumPriceLabel: pricing.startingLabel,
    variants: item.variants?.map((variant, index) => ({
      ...variant,
      price: pricing.yearlyPrice,
      secondaryPrice: pricing.maintenanceYearlyPrice,
      unitLabel: "establishment / year / ha",
      secondaryUnitLabel: "maintenance / year / ha",
      badge: undefined,
      description:
        index === 0
          ? "Standard flagship rate per hectare for the selected strategy."
          : variant.description,
    })),
  }
}
