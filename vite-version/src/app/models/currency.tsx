"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CurrencyCode = "USD" | "KES" | "TZS" | "UGX" | "GBP"

export const currencyOptions: Array<{
  code: CurrencyCode
  label: string
}> = [
  { code: "USD", label: "USD" },
  { code: "KES", label: "KSh" },
  { code: "TZS", label: "TZS" },
  { code: "UGX", label: "UGX" },
  { code: "GBP", label: "GBP" },
]

export const fallbackUsdRates: Record<CurrencyCode, number> = {
  USD: 1,
  KES: 129,
  TZS: 2600,
  UGX: 3700,
  GBP: 0.79,
}

export interface CurrencyRatesResponse {
  base: "USD"
  rates: Record<CurrencyCode, number>
  currencies: CurrencyCode[]
  source: string
  as_of: string
  message: string
}

export function convertMoney(
  value: number | null | undefined,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<CurrencyCode, number>
) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const fromRate = rates[fromCurrency] || fallbackUsdRates[fromCurrency] || 1
  const toRate = rates[toCurrency] || fallbackUsdRates[toCurrency] || 1
  return (value / fromRate) * toRate
}

export function formatMoney(
  value: number | null | undefined,
  currency: CurrencyCode,
  maximumFractionDigits = currency === "USD" || currency === "GBP" ? 2 : 0
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(value)
}

export function useCurrencyRates(apiBaseUrl: string) {
  const [data, setData] = React.useState<CurrencyRatesResponse>({
    base: "USD",
    rates: fallbackUsdRates,
    currencies: ["USD", "KES", "TZS", "UGX", "GBP"],
    source: "fallback_static",
    as_of: "",
    message: "Using fallback rates.",
  })

  React.useEffect(() => {
    let cancelled = false

    async function loadRates() {
      try {
        const response = await fetch(`${apiBaseUrl}/currency/rates`)
        const responseText = await response.text()
        const parsed = responseText ? JSON.parse(responseText) : null
        if (!response.ok) {
          throw new Error(parsed?.detail || `Currency request failed with status ${response.status}.`)
        }
        if (!cancelled && parsed?.rates) {
          setData(parsed as CurrencyRatesResponse)
        }
      } catch {
        if (!cancelled) {
          setData((current) => ({
            ...current,
            source: "fallback_static",
          }))
        }
      }
    }

    void loadRates()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  return data
}

export function CurrencySelect({
  value,
  onChange,
  rateSource,
}: {
  value: CurrencyCode
  onChange: (value: CurrencyCode) => void
  rateSource?: string
}) {
  return (
    <label className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">Currency</span>
        {rateSource ? (
          <span className="truncate text-xs text-muted-foreground">
            {rateSource === "fallback_static" ? "Fallback rates" : "Live rates"}
          </span>
        ) : null}
      </div>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as CurrencyCode)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencyOptions.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
