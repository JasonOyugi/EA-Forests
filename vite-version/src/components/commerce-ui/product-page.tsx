"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/app/shop/lib/format";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Heart,
  Mail,
  MapPinned,
  Phone,
  Store,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageCarouselBasic from "./image-carousel-basic";
import StarRatingFractions from "./star-rating-fractions";
import { Map, MapMarker, MapPopup, MapTileLayer } from "@/components/ui/map";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ForestsLandTopBanner } from "@/components/commerce-ui/forests-land-top-banner";
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner";
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner";
import { FloatingCart } from "@/app/shop/components/floating-cart";
import { useShopStore } from "@/stores/shop-store";
import { useShallow } from "zustand/react/shallow";
import type { ShopItem, ShopItemMapPoint } from "@/app/shop/types";

type ReviewSort = "highToLow" | "lowToHigh" | "newest";

type ReviewEntry = {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
};

type RetailerLocation = {
  id: string;
  name: string;
  description: string;
  image: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  address: string;
  leadTime: string;
};

interface ProductPageProps {
  item: ShopItem;
  shopItems: ShopItem[];
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

function getCommerceCopy(shop: ShopItem["shop"]) {
  if (shop === "seedlings") {
    return {
      panelTitle: "Nearest retailers",
      panelDescription:
        "Choose a nursery marker to inspect the nearest retailer, review contact details, and place the order with that seller in mind.",
      popupEyebrow: "Nursery partner",
      selectedBadge: "Selected retailer",
      quickActionLabel: "Contact retailer",
      directCallLabel: "Call nursery",
    };
  }

  if (shop === "forestry-services") {
    return {
      panelTitle: "Nearest field teams",
      panelDescription:
        "Choose a field-team marker to inspect the nearest service provider, review contact details, and line up delivery with that team in mind.",
      popupEyebrow: "Field operations team",
      selectedBadge: "Selected field team",
      quickActionLabel: "Contact team",
      directCallLabel: "Call team",
    };
  }

  return {
    panelTitle: "Nearest providers",
    panelDescription:
      "Choose a marker to inspect the nearest provider, review contact details, and continue with that partner in mind.",
    popupEyebrow: "Commercial partner",
    selectedBadge: "Selected provider",
    quickActionLabel: "Contact provider",
    directCallLabel: "Call provider",
  };
}

function getMapCenter(points: ShopItemMapPoint[]) {
  const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
  return [latitude, longitude] as [number, number];
}

function getRetailerMapCenter(points: RetailerLocation[]) {
  const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
  return [latitude, longitude] as [number, number];
}

function getSeedlingVariantVisual(variantId?: string) {
  if (variantId === "small") {
    return {
      hover: "hover:border-emerald-400 hover:shadow-[0_0_0_2px_rgba(52,211,153,0.12)] hover:bg-emerald-50/35",
      selected: "border-emerald-500 bg-emerald-50 text-emerald-950",
      priceCard: "border-emerald-400/55 bg-emerald-100/95",
      priceText: "text-emerald-950",
    };
  }
  if (variantId === "medium") {
    return {
      hover: "hover:border-emerald-600 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.18)] hover:bg-emerald-100/40",
      selected: "border-emerald-700 bg-emerald-200 text-emerald-950",
      priceCard: "border-emerald-600/60 bg-emerald-200/95",
      priceText: "text-emerald-950",
    };
  }
  if (variantId === "large") {
    return {
      hover: "hover:border-emerald-800 hover:shadow-[0_0_0_2px_rgba(4,120,87,0.22)] hover:bg-emerald-200/45",
      selected: "border-emerald-900 bg-emerald-700 text-white",
      priceCard: "border-emerald-800/70 bg-emerald-700/95",
      priceText: "text-white",
    };
  }
  return {
    hover: "hover:border-emerald-500 hover:shadow-[0_0_0_2px_rgba(52,211,153,0.12)] hover:bg-emerald-50/35",
    selected: "border-emerald-600 bg-emerald-100 text-emerald-950",
    priceCard: "border-emerald-400/55 bg-emerald-100/95",
    priceText: "text-emerald-950",
  };
}

function getNearestRetailers(item: ShopItem): RetailerLocation[] {
  if (item.shop === "seedlings") {
    return [
      {
        id: `${item.id}-nakuru`,
        name: "Nakuru Highlands Nursery",
        description: "Large-format nursery with strong hybrid eucalyptus and pine handling plus flexible tray packaging for commercial buyers.",
        image: item.imageGallery?.[0]?.url ?? item.image,
        latitude: -0.3031,
        longitude: 36.08,
        phone: "+254 700 120 440",
        email: "orders@nakuruhighlandsnursery.co.ke",
        address: "Lanet, Nakuru County, Kenya",
        leadTime: "Collection or dispatch within 2-4 business days",
      },
      {
        id: `${item.id}-eldoret`,
        name: "Rift Valley Clonal Nursery",
        description: "Focused on high-performance timber seedlings with batch preparation for larger institutional planting orders.",
        image: item.imageGallery?.[1]?.url ?? item.image,
        latitude: 0.5143,
        longitude: 35.2698,
        phone: "+254 711 305 522",
        email: "sales@riftvalleyclonalnursery.com",
        address: "Eldoret bypass, Uasin Gishu, Kenya",
        leadTime: "Dispatch scheduling within 48 hours",
      },
      {
        id: `${item.id}-nairobi`,
        name: "Athi Plains Nursery Hub",
        description: "Convenient nursery hub for coordination, order consolidation, and contractor-linked pickup near Nairobi.",
        image: item.imageGallery?.[2]?.url ?? item.image,
        latitude: -1.3197,
        longitude: 36.9275,
        phone: "+254 733 889 104",
        email: "hello@athiplainsnursery.africa",
        address: "Mlolongo, Machakos County, Kenya",
        leadTime: "Same-week coordination for larger orders",
      },
    ];
  }

  const retailer = getRetailerInfo(item.shop);
  const entityLabel = item.shop === "forestry-services" ? "service team" : "seller";
  return [
    {
      id: `${item.id}-retailer`,
      name: retailer.name,
      description: `${retailer.name} is the nearest available ${entityLabel} currently shown for this listing.`,
      image: item.image,
      latitude: -1.2864,
      longitude: 36.8172,
      phone: "+254 700 000 000",
      email: "hello@eaforests.com",
      address: retailer.location,
      leadTime: retailer.fulfillment,
    },
  ];
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

function RetailerMarker({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className={cn("absolute inset-0 scale-110 rounded-full blur-xl transition-opacity", active ? "bg-emerald-400/45 opacity-100" : "bg-emerald-300/20 opacity-70")} />
      <div
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform",
          active ? "scale-105 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-900" : "bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800"
        )}
      >
        <Store className="h-5 w-5 text-white" />
      </div>
    </div>
  );
}

function SweepActionButton({
  href,
  icon,
  children,
  onClick,
  variant = "outline",
  className,
}: {
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "outline" | "solid";
  className?: string;
}) {
  const buttonClassName =
    variant === "solid"
      ? "w-full cursor-pointer overflow-hidden rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
      : "cursor-pointer overflow-hidden rounded-full border-emerald-200/80 bg-transparent text-foreground hover:bg-transparent";
  const iconClassName = variant === "solid" ? "group-hover:animate-[cartShake_0.55s_ease-in-out]" : "group-hover:animate-[cartShake_0.55s_ease-in-out]";

  if (href) {
    return (
      <Button variant={variant === "solid" ? "default" : "outline"} className={cn(buttonClassName, className)} asChild>
        <a href={href} onClick={onClick} className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-4 py-2.5">
          <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
          <span className="relative z-10 inline-flex items-center group-hover:text-emerald-400">
            <span className={cn("mr-2 inline-flex", iconClassName)}>{icon}</span>
            {children}
          </span>
        </a>
      </Button>
    );
  }

  return (
    <Button variant={variant === "solid" ? "default" : "outline"} className={cn(buttonClassName, className)} onClick={onClick} asChild>
      <button type="button" className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-4 py-2.5">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
        <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
          <span className={cn("mr-2 inline-flex", iconClassName)}>{icon}</span>
          {children}
        </span>
      </button>
    </Button>
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

function RetailerMapPanel({
  retailers,
  selectedRetailer,
  onSelectRetailer,
  onAddToCart,
  copy,
}: {
  retailers: RetailerLocation[];
  selectedRetailer: RetailerLocation;
  onSelectRetailer: (retailer: RetailerLocation) => void;
  onAddToCart: () => void;
  copy: ReturnType<typeof getCommerceCopy>;
}) {
  const mapCenter = getRetailerMapCenter(retailers);

  return (
    <div className="emerald-border-hover rounded-[2rem] border border-transparent bg-transparent p-3 transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(16,185,129,0.2)]">
      <div className="space-y-2 px-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPinned className="h-5 w-5 text-emerald-700" />
          {copy.panelTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {copy.panelDescription}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="h-[430px] overflow-hidden rounded-2xl border border-emerald-200">
          <Map center={mapCenter} zoom={8} className="h-full w-full">
            <MapTileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {retailers.map((retailer) => (
                <MapMarker
                  key={retailer.id}
                  position={[retailer.latitude, retailer.longitude]}
                  icon={<RetailerMarker active={selectedRetailer.id === retailer.id} />}
                  iconAnchor={[24, 24]}
                  eventHandlers={{ click: () => onSelectRetailer(retailer) }}
                >
                <MapPopup className="w-[min(28rem,calc(100vw-3rem))] border-0 p-2">
                  <div className="overflow-hidden rounded-[1rem] bg-background">
                    <div className="relative h-36 overflow-hidden">
                      <img src={retailer.image} alt={retailer.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">{copy.popupEyebrow}</div>
                        <div className="mt-1 text-lg font-semibold text-white">{retailer.name}</div>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-sm leading-6 text-muted-foreground">{retailer.description}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>{retailer.address}</p>
                        <p>{retailer.phone}</p>
                        <p>{retailer.email}</p>
                      </div>
                      <div className="grid gap-2">
                        <SweepActionButton href={`tel:${retailer.phone.replace(/\s+/g, "")}`} icon={<Phone className="h-4 w-4" />}>
                          {copy.quickActionLabel}
                        </SweepActionButton>
                        <SweepActionButton
                          icon={<ShoppingCart className="h-4 w-4" />}
                          onClick={() => {
                            onSelectRetailer(retailer);
                            onAddToCart();
                          }}
                          variant="solid"
                        >
                          Add to cart
                        </SweepActionButton>
                      </div>
                    </div>
                  </div>
                </MapPopup>
              </MapMarker>
            ))}
          </Map>
        </div>

        <div className="space-y-5 rounded-2xl bg-transparent p-1">
          <div className="overflow-hidden rounded-2xl">
            <img src={selectedRetailer.image} alt={selectedRetailer.name} className="h-44 w-full object-cover" />
          </div>
          <div>
            <Badge className="bg-emerald-100 text-emerald-900">{copy.selectedBadge}</Badge>
            <h3 className="mt-3 text-xl font-semibold">{selectedRetailer.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedRetailer.description}</p>
          </div>
          <div className="grid gap-3">
            <div className="border-b border-emerald-200/70 pb-3 text-sm">
              <div className="font-medium">Address</div>
              <div className="text-muted-foreground">{selectedRetailer.address}</div>
            </div>
            <div className="border-b border-emerald-200/70 pb-3 text-sm">
              <div className="font-medium">Lead time</div>
              <div className="text-muted-foreground">{selectedRetailer.leadTime}</div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SweepActionButton href={`mailto:${selectedRetailer.email}`} icon={<Mail className="h-4 w-4" />}>
              Contact
            </SweepActionButton>
            <SweepActionButton href={`tel:${selectedRetailer.phone.replace(/\s+/g, "")}`} icon={<Phone className="h-4 w-4" />}>
              {copy.directCallLabel}
            </SweepActionButton>
          </div>
          <SweepActionButton className="w-full" icon={<ShoppingCart className="h-4 w-4" />} onClick={onAddToCart} variant="solid">
            Add to cart
          </SweepActionButton>
        </div>
      </div>
    </div>
  );
}

function CustomerRatingsPanel({
  initialReviews,
  initialAverage,
}: {
  initialReviews: ReviewEntry[];
  initialAverage: number;
}) {
  const [sortOrder, setSortOrder] = React.useState<ReviewSort>("highToLow");
  const [name, setName] = React.useState("");
  const [ratingInput, setRatingInput] = React.useState(5);
  const [reviewText, setReviewText] = React.useState("");
  const [userReviews, setUserReviews] = React.useState<ReviewEntry[]>([]);

  const allReviews = React.useMemo(() => [...userReviews, ...initialReviews], [initialReviews, userReviews]);
  const averageRating = React.useMemo(() => {
    if (allReviews.length === 0) return initialAverage;
    return allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
  }, [allReviews, initialAverage]);

  const sortedReviews = React.useMemo(() => {
    const reviews = [...allReviews];
    if (sortOrder === "highToLow") {
      return reviews.sort((a, b) => b.rating - a.rating);
    }
    if (sortOrder === "lowToHigh") {
      return reviews.sort((a, b) => a.rating - b.rating);
    }
    return reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allReviews, sortOrder]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !reviewText.trim()) return;

    setUserReviews((current) => [
      {
        id: `user-review-${Date.now()}`,
        name: name.trim(),
        rating: ratingInput,
        text: reviewText.trim(),
        date: new Date().toISOString(),
      },
      ...current,
    ]);
    setName("");
    setRatingInput(5);
    setReviewText("");
    setSortOrder("newest");
  };

  return (
    <Card className="border-emerald-200 bg-white/95">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-700" />
          <CardTitle>Customer ratings</CardTitle>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <StarRatingFractions value={averageRating} readOnly iconSize={16} />
              <span className="text-sm font-medium">{averageRating.toFixed(2)}/5</span>
            </div>
            <p className="text-sm text-muted-foreground">{allReviews.length} total ratings</p>
          </div>

          <div className="w-full sm:w-[180px]">
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as ReviewSort)}>
              <SelectTrigger>
                <SelectValue placeholder="Order ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highToLow">Ratings: High to low</SelectItem>
                <SelectItem value="lowToHigh">Ratings: Low to high</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-sm font-medium">Add your rating</div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            <div className="space-y-2 rounded-xl border border-emerald-200/70 bg-white/75 px-3 py-2.5">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Your rating</div>
              <StarRatingFractions value={ratingInput} onChange={setRatingInput} iconSize={22} color="#f4b400" />
              <div className="text-xs text-muted-foreground">{ratingInput.toFixed(2)} / 5 selected</div>
            </div>
          </div>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Share your experience with this nursery stock, quality, fulfillment, or communication."
            className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
            Submit rating
          </Button>
        </form>

        <div className="space-y-3">
          {sortedReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  {review.name}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <StarRatingFractions value={review.rating} readOnly iconSize={14} />
                <span className="text-xs text-muted-foreground">{review.rating.toFixed(2)}/5</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{review.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OtherDealsPanel() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-2xl font-semibold">What next?</h3>
        <p className="text-sm text-muted-foreground">Keep moving through the rest of the platform after you shortlist the right nursery stock.</p>
      </div>
      <div className="space-y-4">
        <ForestryServicesSaleBanner />
        <ForestryServicesCountdownBanner />
        <ForestsLandTopBanner />
      </div>
    </div>
  );
}

export function ProductPage({
  item,
  shopItems,
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
  const {
    cart,
    checkoutState,
    removeItem,
    clearCart,
    beginFakeCheckout,
    getCartSubtotal,
    getCartCount,
  } = useShopStore(
    useShallow((state) => ({
      cart: state.cart,
      checkoutState: state.checkoutState,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
      beginFakeCheckout: state.beginFakeCheckout,
      getCartSubtotal: state.getCartSubtotal,
      getCartCount: state.getCartCount,
    }))
  );
  const selectedPoint =
    item.mapPoints?.find((point) => point.id === selectedPointId) ?? item.mapPoints?.[0] ?? null;
  const isSeedlingsItem = item.shop === "seedlings";
  const isEnhancedCommerceItem = item.shop === "seedlings" || item.shop === "forestry-services";
  const seedlingVariantVisual = getSeedlingVariantVisual(activeVariant?.id);
  const { rating, reviewCount } = React.useMemo(() => deriveRatingFromId(item.id), [item.id]);
  const retailerInfo = React.useMemo(() => getRetailerInfo(item.shop), [item.shop]);
  const commerceCopy = React.useMemo(() => getCommerceCopy(item.shop), [item.shop]);
  const nearestRetailers = React.useMemo(() => getNearestRetailers(item), [item]);
  const [selectedRetailerId, setSelectedRetailerId] = React.useState<string>(nearestRetailers[0]?.id ?? "");
  const selectedRetailer =
    nearestRetailers.find((retailer) => retailer.id === selectedRetailerId) ?? nearestRetailers[0];

  React.useEffect(() => {
    setSelectedRetailerId(nearestRetailers[0]?.id ?? "");
  }, [nearestRetailers]);

  const dummyReviews = React.useMemo(
    () => [
      {
        id: `${item.id}-r1`,
        name: "Amina K.",
        rating: 5,
        date: "2026-04-12",
        text:
          item.shop === "forests-land"
            ? "The diligence pack was clean and the site framing made comparison much easier."
            : item.shop === "forestry-services"
              ? "Mobilisation was smooth and the team handled site prep with strong field discipline."
              : "Healthy stock and very consistent sizing across trays.",
      },
      {
        id: `${item.id}-r2`,
        name: "David M.",
        rating: 4.75,
        date: "2026-03-27",
        text:
          item.shop === "forests-land"
            ? "Clear pricing logic and strong context around the operating model."
            : item.shop === "forestry-services"
              ? "Good reporting cadence and the maintenance checklist was handled exactly as scoped."
              : "Strong germination results, delivery updates were clear.",
      },
      {
        id: `${item.id}-r3`,
        name: "Grace N.",
        rating: 4.5,
        date: "2026-02-18",
        text:
          item.shop === "forests-land"
            ? "Useful for getting from shortlist to diligence conversation quickly."
            : item.shop === "forestry-services"
              ? "The field crew adapted well to our terrain and follow-up communication stayed clear."
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
  const subtotal = getCartSubtotal(shopItems);
  const cartCount = getCartCount();

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
                <Button variant="outline" size="icon" onClick={handleAddToCart} className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {quantity > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                      {quantity}
                    </span>
                  ) : null}
                </Button>
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

            <div
              className={cn(
                "rounded-2xl border p-5 transition-colors duration-300",
                isSeedlingsItem
                  ? cn(seedlingVariantVisual.priceCard, seedlingVariantVisual.priceText)
                  : "border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50/70"
              )}
            >
              <div className="flex items-center gap-2 text-4xl font-bold">
                {formatCurrency(activeVariant?.price ?? item.price, item.currency)}
                <span className={cn("ml-2 text-sm font-normal", isSeedlingsItem ? "text-current/80" : "text-muted-foreground")}>{activeUnitLabel}</span>
              </div>
              {activeVariant?.secondaryPrice ? (
                <p className={cn("mt-2 text-sm", isSeedlingsItem ? "text-current/78" : "text-muted-foreground")}>
                  Maintenance {formatCurrency(activeVariant.secondaryPrice, item.currency)}{" "}
                  {activeVariant.secondaryUnitLabel}
                </p>
              ) : null}
              {item.minimumPriceLabel ? <p className={cn("mt-2 text-sm", isSeedlingsItem ? "text-current/78" : "text-muted-foreground")}>{item.minimumPriceLabel}</p> : null}
              {isSeedlingsItem ? (
                <p className={cn("mt-3 text-sm", isSeedlingsItem ? "text-current/80" : "text-muted-foreground")}>
                  <span className="font-medium">*</span> Price is exclusive of delivery fees, which should be agreed directly with the nursery.
                </p>
              ) : null}
            </div>
          </div>

          <Separator />

          <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
            <div className="rounded-2xl border border-transparent bg-transparent">
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
                <div className="grid gap-3 border-t border-slate-200/60 px-4 py-4">
                  {item.variants?.length ? (
                    item.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant.id)}
                        className={cn(
                          "emerald-border-hover rounded-2xl border px-4 py-3 text-left transition",
                          selectedVariant === variant.id
                            ? getSeedlingVariantVisual(variant.id).selected
                            : cn("border-slate-200 bg-transparent", getSeedlingVariantVisual(variant.id).hover)
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
                <Button onClick={handleAddToCart} className="cursor-pointer text-base" asChild>
                  <button type="button" className="group relative overflow-hidden rounded-full">
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                    <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                      <ShoppingCart className="mr-2 h-4 w-4 group-hover:animate-[cartShake_0.55s_ease-in-out]" />
                      {quantity > 0 ? "Add more" : "Add to cart"}
                    </span>
                  </button>
                </Button>
              </div>
            </div>
            {quantity > 0 ? (
              <p className="text-sm text-muted-foreground">{quantity} {item.name.toLowerCase()} in your cart</p>
            ) : null}
          </div>

          {item.highlights?.length ? (
            <Collapsible open={highlightsOpen} onOpenChange={setHighlightsOpen}>
              <div className="emerald-border-hover rounded-2xl border border-transparent bg-transparent transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(16,185,129,0.16)]">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <h3 className="font-semibold">Why this offer stands out</h3>
                    <p className="text-sm text-muted-foreground">{item.highlights.length} key points</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", highlightsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 border-t border-slate-200/60 px-4 py-4">
                    {item.highlights.map((highlight) => (
                      <div key={highlight} className="flex gap-3 py-1">
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

      <div className="grid gap-8 md:grid-cols-1">
        <div className="space-y-4">
          <CardTitle>Specifications</CardTitle>
          <div className="space-y-3">
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
          </div>
        </div>
      </div>

      {isEnhancedCommerceItem && selectedRetailer ? (
        <div className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <RetailerMapPanel
              retailers={nearestRetailers}
              selectedRetailer={selectedRetailer}
              onSelectRetailer={(retailer) => setSelectedRetailerId(retailer.id)}
              onAddToCart={handleAddToCart}
              copy={commerceCopy}
            />
            <CustomerRatingsPanel initialReviews={dummyReviews} initialAverage={rating} />
          </div>
          <OtherDealsPanel />
        </div>
      ) : (
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
      )}

      <FloatingCart
        items={shopItems}
        cart={cart}
        subtotal={subtotal}
        cartCount={cartCount}
        checkoutActive={checkoutState === "submitted"}
        onAdd={(itemId) => onAdd(itemId)}
        onDecrement={onDecrement}
        onRemove={removeItem}
        onCheckout={beginFakeCheckout}
        onClear={clearCart}
      />
    </div>
  );
}
