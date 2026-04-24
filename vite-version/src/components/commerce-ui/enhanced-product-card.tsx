"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/app/shop/lib/format";
import { ArrowUpRight, Heart, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import StarRatingFractions from "@/components/commerce-ui/star-rating-fractions";
import type { ShopItem } from "@/app/shop/types";

interface EnhancedProductCardProps {
  item: ShopItem;
  quantity: number;
  onAdd: (itemId: string, variant?: string) => void;
  onDecrement: (itemId: string) => void;
  onFavorite?: (itemId: string) => void;
  isFavorite?: boolean;
  showVariants?: boolean;
  compact?: boolean;
  showDescription?: boolean;
  theme?: "seedlings" | "forests-land" | "forestry-services" | "roundwood";
  onClick?: (item: ShopItem) => void;
  pricePulseOnHover?: boolean;
  runningBorderOnHover?: boolean;
  className?: string;
}

function deriveRatingFromId(id: string) {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const rating = 4 + (hash % 5) * 0.25
  const reviewCount = 18 + (hash % 73)

  return { rating, reviewCount }
}

export function EnhancedProductCard({
  item,
  quantity,
  onAdd,
  onDecrement,
  onFavorite,
  isFavorite = false,
  showVariants = false,
  compact = false,
  showDescription = true,
  theme,
  onClick,
  pricePulseOnHover = false,
  runningBorderOnHover = false,
  className,
}: EnhancedProductCardProps) {
  const defaultVariant = item.variants?.[0]
  const [selectedVariant, setSelectedVariant] = React.useState<string>(defaultVariant?.id ?? "")

  const startingVariant = item.variants?.[0] ?? defaultVariant
  const activeVariant = item.variants?.find((variant) => variant.id === selectedVariant) ?? defaultVariant
  const { rating, reviewCount } = React.useMemo(() => deriveRatingFromId(item.id), [item.id])

  const activeUnitLabel =
    activeVariant?.unitLabel ??
    (activeVariant?.count ? `per ${activeVariant.count} seedlings` : item.unitLabel)

  const activeSecondaryPrice = activeVariant?.secondaryPrice
  const activeSecondaryUnitLabel = activeVariant?.secondaryUnitLabel
  const compactHighlights = item.highlights?.slice(0, compact ? 2 : 3) ?? []
  const featuredStyleCard = theme === "seedlings" && compact
  const gridVariantShade = (variantId: string) => {
    if (theme !== "seedlings") return "border-black bg-transparent text-slate-700 hover:border-slate-500"
    if (variantId === "small") return "border-black bg-transparent text-slate-900 hover:border-emerald-400 hover:text-emerald-900 hover:shadow-[0_0_0_3px_rgba(52,211,153,0.18)]"
    if (variantId === "medium") return "border-black bg-transparent text-slate-900 hover:border-emerald-500 hover:text-emerald-950 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
    if (variantId === "large") return "border-black bg-transparent text-slate-900 hover:border-emerald-700 hover:text-emerald-950 hover:shadow-[0_0_0_3px_rgba(4,120,87,0.22)]"
    return "border-black bg-transparent text-slate-900 hover:border-emerald-500 hover:text-emerald-950 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
  }
  const gridVariantSelectedShade = (variantId: string) => {
    if (theme !== "seedlings") return variantButtonSelected
    if (variantId === "small") return "border-emerald-500 bg-emerald-100 text-emerald-950 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]"
    if (variantId === "medium") return "border-emerald-700 bg-emerald-300 text-emerald-950 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
    if (variantId === "large") return "border-emerald-900 bg-emerald-600 text-white shadow-[0_0_0_3px_rgba(4,120,87,0.22)]"
    return "border-emerald-600 bg-emerald-200 text-emerald-950 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]"
  }

  const handlePrimaryAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (item.kind === "asset" && onClick) {
      onClick(item)
      return
    }

    onAdd(item.id, activeVariant?.id)
  }

  const accentDotClass =
    theme === "seedlings"
      ? "bg-emerald-600"
      : theme === "forests-land"
      ? "bg-slate-700"
      : theme === "forestry-services"
      ? "bg-amber-700"
      : theme === "roundwood"
      ? "bg-rose-700"
      : "bg-slate-700"

  const themeStyles = {
    seedlings: {
      stockBadgeClass: "bg-emerald-600 text-white",
      starActiveClass: "fill-emerald-400 text-emerald-400",
      themeCardClass: "border border-emerald-100 bg-white/80",
      quickAddButtonClass: "bg-emerald-700 text-white hover:bg-emerald-800",
      footerButtonClass: "bg-emerald-700 text-white hover:bg-emerald-800 emerald-border-hover",
      variantButtonSelected: "border-emerald-700 bg-emerald-100 text-emerald-900",
      accentClass: "text-emerald-700",
      shellClass: "from-white via-emerald-50 to-lime-50/70",
    },
    "forests-land": {
      stockBadgeClass: "bg-slate-700 text-white",
      starActiveClass: "fill-slate-700 text-slate-700",
      themeCardClass: "border border-slate-200 bg-white/90",
      quickAddButtonClass: "bg-slate-700 text-white hover:bg-slate-800",
      footerButtonClass: "bg-slate-700 text-white hover:bg-slate-800 emerald-border-hover",
      variantButtonSelected: "border-slate-700 bg-slate-100 text-slate-900",
      accentClass: "text-slate-700",
      shellClass: "from-white via-slate-50 to-emerald-50/70",
    },
    "forestry-services": {
      stockBadgeClass: "bg-amber-700 text-white",
      starActiveClass: "fill-amber-500 text-amber-500",
      themeCardClass: "border border-amber-200 bg-white/90",
      quickAddButtonClass: "bg-amber-700 text-white hover:bg-amber-800",
      footerButtonClass: "bg-amber-700 text-white hover:bg-amber-800 emerald-border-hover",
      variantButtonSelected: "border-amber-700 bg-amber-100 text-amber-900",
      accentClass: "text-amber-700",
      shellClass: "from-white via-amber-50 to-orange-50/70",
    },
    roundwood: {
      stockBadgeClass: "bg-rose-800 text-white",
      starActiveClass: "fill-rose-500 text-rose-500",
      themeCardClass: "border border-rose-200 bg-white/90",
      quickAddButtonClass: "bg-rose-800 text-white hover:bg-rose-900",
      footerButtonClass: "bg-rose-800 text-white hover:bg-rose-900 emerald-border-hover",
      variantButtonSelected: "border-rose-800 bg-rose-100 text-rose-900",
      accentClass: "text-rose-700",
      shellClass: "from-white via-rose-50 to-orange-50/70",
    },
    default: {
      stockBadgeClass: "bg-green-500 text-white",
      starActiveClass: "fill-yellow-400 text-yellow-400",
      themeCardClass: "",
      quickAddButtonClass: "",
      footerButtonClass: "emerald-border-hover",
      variantButtonSelected: "border-slate-300 bg-white text-slate-700",
      accentClass: "text-slate-700",
      shellClass: "from-white via-slate-50 to-slate-100",
    },
  }

  const activeTheme = theme ? themeStyles[theme] : themeStyles.default
  const stockBadgeClass = activeTheme.stockBadgeClass
  const starActiveClass = activeTheme.starActiveClass
  const themeCardClass = activeTheme.themeCardClass
  const footerButtonClass = activeTheme.footerButtonClass
  const variantButtonSelected = activeTheme.variantButtonSelected
  const shellClass = activeTheme.shellClass

  const footerFallbackText = item.domain ? item.domain.replace(/(^|\s)\S/g, (match) => match.toUpperCase()) : item.kind === "service" ? "Service" : "Product"
  const startingPrice = formatCurrency(
    featuredStyleCard ? startingVariant?.price ?? item.price : activeVariant?.price ?? item.price,
    item.currency
  )
  const startingUnitLabel =
    startingVariant?.unitLabel ??
    (startingVariant?.count ? `per ${startingVariant.count} seedlings` : item.unitLabel)

  const cardEl = (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden bg-gradient-to-br py-0 transition-all hover:-translate-y-1 hover:shadow-lg",
        shellClass,
        themeCardClass,
        className
      )}
      style={runningBorderOnHover ? { border: "none", background: "white" } : undefined}
      onClick={() => onClick?.(item)}
    >
      <div className="relative bg-black">
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-300 group-hover:scale-105 [filter:brightness(0.72)_saturate(0.9)_contrast(1.03)]",
            compact ? "aspect-[5/4]" : "aspect-[4/3]"
          )}
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.24) 48%, rgba(0,0,0,0.76) 100%), url(${item.image})`,
          }}
        />

        {/* Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
          {item.stockStatus === "in-stock" && <Badge className={stockBadgeClass}>In Stock</Badge>}
          {item.tags.includes("featured") && !item.featuredLabel && (
            <Badge variant="secondary" className="bg-white animate-pulse opacity-100">
              Featured
            </Badge>
          )}
          {item.tags.includes("new") && (
            <Badge
              variant="destructive"
              className="bg-emerald-400 animate-pulse opacity-100"
            >
              New
            </Badge>
          )}
          {item.featuredLabel ? (
            <Badge variant="secondary" className="bg-black/80 text-white">
              {item.featuredLabel}
            </Badge>
          ) : null}
        </div>

        {/* Favorite button */}
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
            onClick={() => onFavorite(item.id)}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
              )}
            />
          </Button>
        )}

        <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-4">
          <div className="flex-1" />

          <div className="space-y-3">
            <CardTitle
              className={cn(
                "line-clamp-2 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.38)]",
                compact ? "text-xl" : "text-xl"
              )}
            >
              {item.name}
            </CardTitle>

            {showDescription ? (
              <CardDescription
                className={cn(
                  "line-clamp-2 text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]",
                  featuredStyleCard ? "text-sm leading-6" : "text-sm"
                )}
              >
                {item.description}
              </CardDescription>
            ) : null}

            <div className="flex items-center gap-2">
              <StarRatingFractions
                value={rating}
                readOnly
                iconSize={featuredStyleCard ? 16 : compact ? 12 : 14}
                className={cn("gap-x-0.5", starActiveClass)}
              />
              <span
                className={cn(
                  "text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]",
                  featuredStyleCard ? "text-sm" : compact ? "text-xs" : "text-sm"
                )}
              >
                {rating.toFixed(2)}/5
              </span>
              <span
                className={cn(
                  "text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]",
                  featuredStyleCard ? "text-sm" : "text-xs"
                )}
              >
                ({reviewCount})
              </span>
            </div>

            {showVariants && !compact && item.variants?.length ? (
              <div className="space-y-2">
                <span className="text-sm font-medium text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                  Seedling band
                </span>
                <div className="flex flex-wrap gap-2">
                  {item.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedVariant(variant.id)
                      }}
                      className={cn(
                        "rounded-full border transition",
                        "px-3 py-2 text-sm",
                        selectedVariant === variant.id
                          ? gridVariantSelectedShade(variant.id)
                          : gridVariantShade(variant.id)
                      )}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
                {activeVariant?.description ? (
                  <p className="text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    {activeVariant.description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {compactHighlights.length > 0 && (compact || !showDescription) ? (
              <div className="space-y-2">
                {compactHighlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-start gap-2 text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
                  >
                    <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", accentDotClass)} />
                    <span className="line-clamp-2">{highlight}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={cn("flex items-start justify-between gap-4", compact && "pt-1")}>
              <div>
                {featuredStyleCard ? (
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    Starting from
                  </div>
                ) : null}
                <div
                  className={cn(
                    "font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-colors",
                    featuredStyleCard ? "text-2xl" : compact ? "text-lg" : "text-2xl",
                    pricePulseOnHover && "group-hover:text-green-200 group-hover:animate-pulse"
                  )}
                >
                  {startingPrice}
                </div>
                {!compact ? (
                  <div className="text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    {activeUnitLabel}
                  </div>
                ) : null}
                {!compact && activeSecondaryPrice ? (
                  <div className="text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    Maintenance {formatCurrency(activeSecondaryPrice, item.currency)}{" "}
                    {activeSecondaryUnitLabel}
                  </div>
                ) : null}
                {compact && activeSecondaryPrice ? (
                  <div className="text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    + {formatCurrency(activeSecondaryPrice, item.currency)} maintenance
                  </div>
                ) : null}
                {!activeSecondaryPrice && item.minimumPriceLabel && !compact ? (
                  <div className="text-xs text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
                    {item.minimumPriceLabel}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CardFooter className={cn("flex items-center justify-between gap-3 pt-3 pb-3", compact && "pt-2")}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {compact ? (
            <span className="text-xs text-muted-foreground">{startingUnitLabel}</span>
          ) : quantity > 0 ? (
            `${quantity} in cart`
          ) : (
            footerFallbackText
          )}
        </div>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onDecrement(item.id)
              }}
            >
              -
            </Button>
          )}
          <Button size="sm" className={footerButtonClass} onClick={handlePrimaryAction}>
            {item.kind === "asset" ? (
              <ArrowUpRight className="mr-2 h-4 w-4" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {quantity > 0 && item.kind !== "asset" ? quantity : item.ctaLabel ?? "Add"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )

  if (runningBorderOnHover) {
    return (
      <div className="group/ring relative overflow-hidden rounded-lg bg-emerald-300/70 p-[1.5px]">
        <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover/ring:opacity-100">
          <div
            className="h-full w-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, #059669 38deg, #34d399 78deg, transparent 136deg, transparent 216deg, #10b981 276deg, #6ee7b7 322deg, transparent 360deg)",
              animation: "emerald-spin-border 1.8s linear infinite",
            }}
          />
        </div>
        <div className="relative z-10">{cardEl}</div>
      </div>
    )
  }

  return cardEl
}
