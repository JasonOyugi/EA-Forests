"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/app/shop/lib/format";
import { ArrowLeft, Heart, ShoppingCart, Truck, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageCarouselBasic from "./image-carousel-basic";
import StarRatingFractions from "./star-rating-fractions";
import type { ShopItem } from "@/app/shop/types";

interface ProductPageProps {
  item: ShopItem;
  quantity: number;
  onAdd: (itemId: string, variant?: string) => void;
  onDecrement: (itemId: string) => void;
  onFavorite?: (itemId: string) => void;
  onBack: () => void;
  isFavorite?: boolean;
  className?: string;
}

function deriveRatingFromId(id: string) {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const rating = 4 + (hash % 5) * 0.25
  const reviewCount = 18 + (hash % 73)

  return { rating, reviewCount }
}

function getRetailerInfo(shop: ShopItem["shop"]) {
  if (shop === "seedlings") {
    return {
      name: "EA Forests Nursery Division",
      location: "Nakuru, Kenya",
      since: "2014",
      fulfillment: "Ships in 2-4 business days",
    }
  }

  if (shop === "forests-land") {
    return {
      name: "EA Forests Land Holdings",
      location: "Nairobi, Kenya",
      since: "2011",
      fulfillment: "Documents ready within 24 hours",
    }
  }

  if (shop === "forestry-services") {
    return {
      name: "EA Forests Field Operations",
      location: "Nairobi, Kenya",
      since: "2012",
      fulfillment: "Site team mobilization in 3-5 days",
    }
  }

  return {
    name: "EA Forests Timber Exchange",
    location: "Eldoret, Kenya",
    since: "2013",
    fulfillment: "Dispatch scheduling within 48 hours",
  }
}

export function ProductPage({
  item,
  quantity,
  onAdd,
  onDecrement,
  onFavorite,
  onBack,
  isFavorite = false,
  className,
}: ProductPageProps) {
  const defaultVariant = item.variants?.[0]
  const [selectedVariant, setSelectedVariant] = React.useState<string>(defaultVariant?.id ?? "")

  const activeVariant = item.variants?.find((variant) => variant.id === selectedVariant) ?? defaultVariant
  const { rating, reviewCount } = React.useMemo(() => deriveRatingFromId(item.id), [item.id])
  const retailerInfo = React.useMemo(() => getRetailerInfo(item.shop), [item.shop])

  const dummyReviews = React.useMemo(
    () => [
      {
        id: `${item.id}-r1`,
        name: "Amina K.",
        rating: 5,
        text: "Healthy stock and very consistent sizing across trays.",
      },
      {
        id: `${item.id}-r2`,
        name: "David M.",
        rating: 4.75,
        text: "Strong germination results, delivery updates were clear.",
      },
      {
        id: `${item.id}-r3`,
        name: "Grace N.",
        rating: 4.5,
        text: "Good quality overall, would order again for next planting cycle.",
      },
    ],
    [item.id]
  )

  const linkedPromos = React.useMemo(
    () => [
      {
        id: `${item.id}-p1`,
        title: "Featured Deals",
        description: "See highlighted offers for this shop.",
        href: `/shop/${item.shop}?q=featured`,
      },
      {
        id: `${item.id}-p2`,
        title: "New Arrivals",
        description: "Browse the latest products and bundles.",
        href: `/shop/${item.shop}?q=new`,
      },
      {
        id: `${item.id}-p3`,
        title: "More In This Category",
        description: "Explore related options in the same domain.",
        href: `/shop/${item.shop}?q=${encodeURIComponent(item.domain)}`,
      },
    ],
    [item.domain, item.id, item.shop]
  )

  const activeUnitLabel =
    activeVariant?.unitLabel ??
    (activeVariant?.count ? `per ${activeVariant.count} seedlings` : item.unitLabel)

  const images =
    item.imageGallery && item.imageGallery.length > 0
      ? item.imageGallery
      : [{ url: item.image, title: item.name }];

  const handleAddToCart = () => {
    onAdd(item.id, activeVariant?.id);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to products
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image carousel */}
        <div className="space-y-4">
          <ImageCarouselBasic
            images={images}
            aspectRatio="square"
            showThumbs={true}
            className="w-full"
          />
        </div>

        {/* Product details */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{item.name}</h1>
                <div className="flex items-center gap-2">
                  <StarRatingFractions value={rating} readOnly iconSize={16} />
                  <span className="text-sm text-muted-foreground">{rating.toFixed(2)}/5 • {reviewCount} reviews</span>
                </div>
              </div>
              <div className="flex gap-2">
                {onFavorite && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onFavorite(item.id)}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        isFavorite ? "fill-red-500 text-red-500" : ""
                      )}
                    />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={item.stockStatus === "in-stock" ? "default" : "secondary"}>
                {item.stockStatus === "quote" ? "Quote required" : item.stockStatus}
              </Badge>
              {item.tags.includes("featured") && (
                <Badge variant="secondary" className="bg-emerald-400 animate-pulse opacity-100">Featured</Badge>
              )}
            </div>

            <p className="text-lg text-muted-foreground">{item.description}</p>

            <div className="text-4xl font-bold">
              {formatCurrency(activeVariant?.price ?? item.price, item.currency)}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {activeUnitLabel}
              </span>
            </div>
          </div>

          <Separator />

          {/* Variants */}
          <div className="space-y-4">
            <h3 className="font-semibold">Options</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Size</span>
                {item.variants?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant.id)}
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
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No size variants available.</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>Free shipping on orders over $100</span>
          </div>

          {/* Add to cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {quantity > 0 && (
                  <Button variant="outline" onClick={() => onDecrement(item.id)}>
                    -
                  </Button>
                )}
                {quantity > 0 && (
                  <span className="w-12 text-center font-medium">{quantity}</span>
                )}
                <Button onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {quantity > 0 ? "Add more" : "Add to cart"}
                </Button>
              </div>
            </div>
            {quantity > 0 && (
              <p className="text-sm text-muted-foreground">
                {quantity} {item.name.toLowerCase()} in your cart
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Additional sections could go here */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Detailed description of the {item.name.toLowerCase()} would go here.
              This could include specifications, care instructions, and other relevant information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{item.kind}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit:</span>
              <span>{activeUnitLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock Status:</span>
              <span>{item.stockStatus}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Retailer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Enterprise:</span> {retailerInfo.name}</p>
            <p><span className="text-muted-foreground">Location:</span> {retailerInfo.location}</p>
            <p><span className="text-muted-foreground">Operating Since:</span> {retailerInfo.since}</p>
            <p><span className="text-muted-foreground">Fulfillment:</span> {retailerInfo.fulfillment}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyReviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    {review.name}
                  </div>
                  <span className="text-xs text-muted-foreground">{review.rating.toFixed(2)}/5</span>
                </div>
                <StarRatingFractions value={review.rating} readOnly iconSize={14} className="mb-1" />
                <p className="text-xs text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Deals & Promo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedPromos.map((promo) => (
              <div key={promo.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{promo.title}</p>
                <p className="mb-3 text-xs text-muted-foreground">{promo.description}</p>
                <Button asChild size="sm" variant="outline">
                  <a href={promo.href}>Open</a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}