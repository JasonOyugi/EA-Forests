"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/app/shop/lib/format";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopItem, ShopItemVariant } from "@/app/shop/types";

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
  className?: string;
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
  className,
}: EnhancedProductCardProps) {
  const defaultVariant = item.variants?.[0]
  const [selectedVariant, setSelectedVariant] = React.useState<string>(defaultVariant?.id ?? "")

  const activeVariant = item.variants?.find((variant) => variant.id === selectedVariant) ?? defaultVariant

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onAdd(item.id, activeVariant?.id)
  }

  const themeStyles = {
    seedlings: {
      stockBadgeClass: "bg-emerald-600 text-white",
      starActiveClass: "fill-emerald-400 text-emerald-400",
      themeCardClass: "border border-emerald-100 bg-white/80",
      quickAddButtonClass: "bg-emerald-700 text-white hover:bg-emerald-800",
      footerButtonClass: "bg-emerald-700 text-white hover:bg-emerald-800",
      variantButtonSelected: "border-emerald-700 bg-emerald-100 text-emerald-900",
    },
    "forests-land": {
      stockBadgeClass: "bg-slate-700 text-white",
      starActiveClass: "fill-slate-700 text-slate-700",
      themeCardClass: "border border-slate-200 bg-white/90",
      quickAddButtonClass: "bg-slate-700 text-white hover:bg-slate-800",
      footerButtonClass: "bg-slate-700 text-white hover:bg-slate-800",
      variantButtonSelected: "border-slate-700 bg-slate-100 text-slate-900",
    },
    "forestry-services": {
      stockBadgeClass: "bg-amber-700 text-white",
      starActiveClass: "fill-amber-500 text-amber-500",
      themeCardClass: "border border-amber-200 bg-white/90",
      quickAddButtonClass: "bg-amber-700 text-white hover:bg-amber-800",
      footerButtonClass: "bg-amber-700 text-white hover:bg-amber-800",
      variantButtonSelected: "border-amber-700 bg-amber-100 text-amber-900",
    },
    roundwood: {
      stockBadgeClass: "bg-rose-800 text-white",
      starActiveClass: "fill-rose-500 text-rose-500",
      themeCardClass: "border border-rose-200 bg-white/90",
      quickAddButtonClass: "bg-rose-800 text-white hover:bg-rose-900",
      footerButtonClass: "bg-rose-800 text-white hover:bg-rose-900",
      variantButtonSelected: "border-rose-800 bg-rose-100 text-rose-900",
    },
    default: {
      stockBadgeClass: "bg-green-500 text-white",
      starActiveClass: "fill-yellow-400 text-yellow-400",
      themeCardClass: "",
      quickAddButtonClass: "",
      footerButtonClass: "",
      variantButtonSelected: "border-slate-300 bg-white text-slate-700",
    },
  }

  const activeTheme = theme ? themeStyles[theme] : themeStyles.default
  const stockBadgeClass = activeTheme.stockBadgeClass
  const starActiveClass = activeTheme.starActiveClass
  const themeCardClass = activeTheme.themeCardClass
  const quickAddButtonClass = activeTheme.quickAddButtonClass
  const footerButtonClass = activeTheme.footerButtonClass
  const variantButtonSelected = activeTheme.variantButtonSelected

  const footerTagPriority = ["featured", "popular", "new", "timber", "agroforestry", "restoration", "reforestation", "conservation"]
  const footerBadgeTags = item.tags.filter((tag) => footerTagPriority.includes(tag)).slice(0, 2)
  const footerFallbackText = item.domain ? item.domain.replace(/(^|\s)\S/g, (match) => match.toUpperCase()) : item.kind === "service" ? "Service" : "Product"

  return (
    <Card className={cn("group cursor-pointer overflow-hidden py-0 transition-all hover:shadow-lg", themeCardClass, className)} onClick={() => onClick?.(item)}>
      <div className="relative">
        <div className={cn("overflow-hidden bg-transparent", compact ? "aspect-[5/4]" : "aspect-[4/3]")}>
          <img
            src={item.image}
            alt={item.name}
            className="block h-full w-full object-cover object-top transition-transform group-hover:scale-105"
          />
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {item.stockStatus === "in-stock" && (
            <Badge className={stockBadgeClass}>In Stock</Badge>
          )}
          {item.tags.includes("featured") && (
            <Badge variant="secondary">Featured</Badge>
          )}
          {item.tags.includes("new") && (
            <Badge variant="destructive">New</Badge>
          )}
        </div>

        {/* Favorite button */}
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
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

        {/* Quick add overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" className={quickAddButtonClass} onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className={cn("line-clamp-2", compact ? "text-base" : "text-lg")}>{item.name}</CardTitle>
          {showDescription ? (
            compact ? (
              <CardDescription className="line-clamp-2 text-muted-foreground">{item.tags.join(" ")}</CardDescription>
            ) : (
              <CardDescription className="line-clamp-2">{item.description}</CardDescription>
            )
          ) : null}
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact ? "py-0" : "py-4")}> 
        {!compact && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < 4 ? starActiveClass : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(4.2)</span>
          </div>
        )}

        {showVariants && !compact && item.variants?.length ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">Size</span>
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
                    "rounded-full border px-3 py-2 text-sm transition",
                    selectedVariant === variant.id
                      ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  )}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            <div className={cn("font-bold", compact ? "text-lg" : "text-2xl")}> 
              {formatCurrency(activeVariant?.price ?? item.price, item.currency)}
            </div>
            {activeVariant?.label && !compact ? (
              <div className="text-xs text-muted-foreground">{activeVariant.label} size</div>
            ) : null}
          </div>
          {!compact && (
            <div className="text-sm text-muted-foreground">
              {item.kind === "service" ? "Service" : "Product"} · {item.unitLabel}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t pt-2 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {quantity > 0 ? (
            `${quantity} in cart`
          ) : footerBadgeTags.length > 0 ? (
            footerBadgeTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </Badge>
            ))
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
          <Button size="sm" className={footerButtonClass} onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {quantity > 0 ? quantity : "Add"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}