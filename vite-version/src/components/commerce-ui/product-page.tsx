"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/app/shop/lib/format";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Heart,
  MapPinned,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageCarouselBasic from "./image-carousel-basic";
import StarRatingFractions from "./star-rating-fractions";
import { Map, MapMarker, MapPopup } from "@/components/ui/map";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ShopItem, ShopItemMapPoint } from "@/app/shop/types";

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
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rating = 4 + (hash % 5) * 0.25;
  const reviewCount = 18 + (hash % 73);

  return { rating, reviewCount };
}

function getRetailerInfo(shop: ShopItem["shop"]) {
  if (shop === "seedlings") {
    return {
      name: "EA Forests Nursery Division",
      location: "Nakuru, Kenya",
      since: "2014",
      fulfillment: "Ships in 2-4 business days",
    };
  }

  if (shop === "forests-land") {
    return {
      name: "EA Forests Land Holdings",
      location: "Nairobi, Kenya",
      since: "2011",
      fulfillment: "Documents ready within 24 hours",
    };
  }

  if (shop === "forestry-services") {
    return {
      name: "EA Forests Field Operations",
      location: "Nairobi, Kenya",
      since: "2012",
      fulfillment: "Site team mobilization in 3-5 days",
    };
  }

  return {
    name: "EA Forests Timber Exchange",
    location: "Eldoret, Kenya",
    since: "2013",
    fulfillment: "Dispatch scheduling within 48 hours",
  };
}

function getMapCenter(points: ShopItemMapPoint[]) {
  const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
  return [latitude, longitude] as [number, number];
}

function UgandaMarker({ active }: { active: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform",
          active
            ? "scale-105 bg-gradient-to-br from-yellow-300 via-red-500 to-black"
            : "bg-gradient-to-br from-black via-yellow-300 to-red-600"
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-black tracking-[0.25em] text-slate-900">
          UG
        </div>
      </div>
      <div className="mt-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        Site
      </div>
    </div>
  );
}

function SiteMapPanel({
  item,
  selectedPoint,
  onSelectPoint,
}: {
  item: ShopItem;
  selectedPoint: ShopItemMapPoint;
  onSelectPoint: (point: ShopItemMapPoint) => void;
}) {
  if (!item.mapPoints || item.mapPoints.length === 0) return null;

  const mapCenter = getMapCenter(item.mapPoints);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapPinned className="h-5 w-5 text-emerald-700" />
            {item.mapTitle ?? "Site map"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {item.mapDescription ?? "Select a marker to inspect the active site."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200">
            <Map center={mapCenter} zoom={7} className="h-full w-full">
              {item.mapPoints.map((point) => (
                <MapMarker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={<UgandaMarker active={selectedPoint.id === point.id} />}
                  iconAnchor={[22, 42]}
                >
                  <MapPopup className="w-72 border-0 p-0">
                    <div className="overflow-hidden rounded-lg bg-background">
                      <div className="relative h-32 overflow-hidden">
                        <img src={point.image} alt={point.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-3 p-3">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                            {point.category}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground">{point.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{point.summary}</p>
                        <Button size="sm" className="w-full" onClick={() => onSelectPoint(point)}>
                          {point.ctaLabel ?? "Open site"}
                        </Button>
                      </div>
                    </div>
                  </MapPopup>
                </MapMarker>
              ))}
            </Map>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedPoint.category}</Badge>
            <Badge variant="outline">{selectedPoint.label}</Badge>
          </div>
          <CardTitle className="text-xl">{selectedPoint.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{selectedPoint.summary}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img src={selectedPoint.image} alt={selectedPoint.name} className="h-48 w-full object-cover" />
          </div>

          {selectedPoint.metrics?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedPoint.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{metric.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {selectedPoint.details?.length ? (
            <div className="space-y-3">
              {selectedPoint.details.map((detail) => (
                <div key={detail} className="flex gap-3 rounded-xl border border-slate-200 bg-white/75 p-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-2">
            {item.mapPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => onSelectPoint(point)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  point.id === selectedPoint.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-white/80 hover:border-slate-400"
                )}
              >
                <div className="text-sm font-semibold">{point.name}</div>
                <div className="text-xs text-muted-foreground">{point.summary}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
  const defaultVariant = item.variants?.[0];
  const [selectedVariant, setSelectedVariant] = React.useState<string>(defaultVariant?.id ?? "");
  const [selectedPointId, setSelectedPointId] = React.useState<string>(item.mapPoints?.[0]?.id ?? "");
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [highlightsOpen, setHighlightsOpen] = React.useState(false);

  const activeVariant = item.variants?.find((variant) => variant.id === selectedVariant) ?? defaultVariant;
  const selectedPoint =
    item.mapPoints?.find((point) => point.id === selectedPointId) ?? item.mapPoints?.[0] ?? null;
  const { rating, reviewCount } = React.useMemo(() => deriveRatingFromId(item.id), [item.id]);
  const retailerInfo = React.useMemo(() => getRetailerInfo(item.shop), [item.shop]);

  const dummyReviews = React.useMemo(
    () => [
      {
        id: `${item.id}-r1`,
        name: "Amina K.",
        rating: 5,
        text: item.shop === "forests-land"
          ? "The diligence pack was clean and the site framing made comparison much easier."
          : "Healthy stock and very consistent sizing across trays.",
      },
      {
        id: `${item.id}-r2`,
        name: "David M.",
        rating: 4.75,
        text: item.shop === "forests-land"
          ? "Clear pricing logic and strong context around the operating model."
          : "Strong germination results, delivery updates were clear.",
      },
      {
        id: `${item.id}-r3`,
        name: "Grace N.",
        rating: 4.5,
        text: item.shop === "forests-land"
          ? "Useful for getting from shortlist to diligence conversation quickly."
          : "Good quality overall, would order again for next planting cycle.",
      },
    ],
    [item.id, item.shop]
  );

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
  );

  const activeUnitLabel =
    activeVariant?.unitLabel ??
    (activeVariant?.count ? `per ${activeVariant.count} seedlings` : item.unitLabel);

  const images =
    item.imageGallery && item.imageGallery.length > 0 ? item.imageGallery : [{ url: item.image, title: item.name }];

  const handleAddToCart = () => {
    onAdd(item.id, activeVariant?.id);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to products
      </Button>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <ImageCarouselBasic images={images} aspectRatio="square" showThumbs className="w-full" />
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {item.featuredLabel ? <Badge className="bg-black text-white">{item.featuredLabel}</Badge> : null}
                  {item.subtitle ? <Badge variant="outline">{item.subtitle}</Badge> : null}
                </div>
                <h1 className="text-3xl font-bold">{item.name}</h1>
                <div className="flex items-center gap-2">
                  <StarRatingFractions value={rating} readOnly iconSize={16} />
                  <span className="text-sm text-muted-foreground">
                    {rating.toFixed(2)}/5 · {reviewCount} reviews
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {onFavorite ? (
                  <Button variant="outline" size="icon" onClick={() => onFavorite(item.id)}>
                    <Heart className={cn("h-4 w-4", isFavorite ? "fill-red-500 text-red-500" : "")} />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.stockStatus === "in-stock" ? "default" : "secondary"}>
                {item.stockStatus === "quote" ? "Quote required" : item.stockStatus}
              </Badge>
              {item.tags.includes("featured") ? (
                <Badge variant="secondary" className="bg-emerald-400 animate-pulse opacity-100">
                  Featured
                </Badge>
              ) : null}
            </div>

            <p className="text-base text-muted-foreground">{item.description}</p>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50/70 p-5">
              <div className="text-4xl font-bold">
                {formatCurrency(activeVariant?.price ?? item.price, item.currency)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{activeUnitLabel}</span>
              </div>
              {activeVariant?.secondaryPrice ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Maintenance {formatCurrency(activeVariant.secondaryPrice, item.currency)}{" "}
                  {activeVariant.secondaryUnitLabel}
                </p>
              ) : null}
              {item.minimumPriceLabel ? <p className="mt-2 text-sm text-muted-foreground">{item.minimumPriceLabel}</p> : null}
            </div>
          </div>

          <Separator />

          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <div className="rounded-2xl border border-slate-200 bg-white/90">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                <div>
                  <h3 className="font-semibold">Options</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeVariant?.label ?? "No active option"} selected
                  </p>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", optionsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-3 border-t border-slate-200 px-4 py-4">
                  {item.variants?.length ? (
                    item.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant.id)}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-left transition",
                          selectedVariant === variant.id
                            ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                            : "border-slate-200 bg-white hover:border-slate-400"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{variant.label}</span>
                          {variant.badge ? <Badge variant="outline">{variant.badge}</Badge> : null}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(variant.price, item.currency)} {variant.unitLabel}
                        </div>
                        {variant.secondaryPrice ? (
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(variant.secondaryPrice, item.currency)} {variant.secondaryUnitLabel}
                          </div>
                        ) : null}
                        {variant.description ? <div className="mt-2 text-xs text-muted-foreground">{variant.description}</div> : null}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No variants available.</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Separator />

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{retailerInfo.fulfillment}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {quantity > 0 ? (
                  <Button variant="outline" onClick={() => onDecrement(item.id)}>
                    -
                  </Button>
                ) : null}
                {quantity > 0 ? <span className="w-12 text-center font-medium">{quantity}</span> : null}
                <Button onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {quantity > 0 ? "Add more" : "Add to cart"}
                </Button>
              </div>
            </div>
            {quantity > 0 ? (
              <p className="text-sm text-muted-foreground">{quantity} {item.name.toLowerCase()} in your cart</p>
            ) : null}
          </div>

          {item.highlights?.length ? (
            <Collapsible open={highlightsOpen} onOpenChange={setHighlightsOpen}>
              <div className="rounded-2xl border border-slate-200 bg-white/90">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <h3 className="font-semibold">Why this offer stands out</h3>
                    <p className="text-sm text-muted-foreground">{item.highlights.length} key points</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", highlightsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 border-t border-slate-200 px-4 py-4">
                    {item.highlights.map((highlight) => (
                      <div key={highlight} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                        <p className="text-sm text-muted-foreground">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {selectedPoint ? <SiteMapPanel item={item} selectedPoint={selectedPoint} onSelectPoint={(point) => setSelectedPointId(point.id)} /> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{selectedPoint ? "Selected Site Description" : "Description"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">{selectedPoint?.summary ?? item.description}</p>
            {selectedPoint?.details?.map((detail) => (
              <div key={detail} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                <span>{detail}</span>
              </div>
            ))}
            {!selectedPoint && item.detailSections?.length
              ? item.detailSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <div className="font-medium">{section.title}</div>
                    {section.items.map((entry) => (
                      <div key={entry} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                        <span>{entry}</span>
                      </div>
                    ))}
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Type</span>
              <span>{item.kind}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Primary unit</span>
              <span className="text-right">{activeUnitLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Stock status</span>
              <span>{item.stockStatus}</span>
            </div>
            {selectedPoint?.metrics?.map((metric) => (
              <div key={metric.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="text-right">{metric.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="h-full">
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

        <Card className="h-full">
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

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Linked Deals & Promo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedPromos.map((promo) => (
              <div key={promo.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{promo.title}</p>
                <p className="mb-3 text-xs text-muted-foreground">{promo.description}</p>
                <Button asChild size="sm" variant="outline">
                  <a href={promo.href}>
                    Open
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
