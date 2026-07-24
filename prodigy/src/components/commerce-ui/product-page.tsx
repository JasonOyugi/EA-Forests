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
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { assetUrl, cn, getAppUrl } from "@/lib/utils";
import ImageCarouselBasic from "./image-carousel-basic";
import StarRatingFractions from "./star-rating-fractions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const LazyPharmacyMap = React.lazy(() =>
  import("@/components/ui/map").then((mapModule) => ({
    default: function PharmacyMapInner({
      retailers,
      selectedRetailer,
      onSelectRetailer,
    }: {
      retailers: RetailerLocation[];
      selectedRetailer: RetailerLocation;
      onSelectRetailer: (retailer: RetailerLocation) => void;
    }) {
      const { Map, MapMarker, MapPopup, MapTileLayer } = mapModule;
      const center: [number, number] = [selectedRetailer.latitude, selectedRetailer.longitude];

      return (
        <Map key={selectedRetailer.id} center={center} zoom={12} className="min-h-[360px] rounded-xl">
          <MapTileLayer />
          {retailers.map((retailer) => {
            const isActive = selectedRetailer.id === retailer.id;

            return (
              <MapMarker
                key={retailer.id}
                position={[retailer.latitude, retailer.longitude]}
                icon={
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-primary shadow-lg",
                      isActive ? "border-primary" : "border-white"
                    )}
                  >
                    <Store className="h-4 w-4" />
                  </div>
                }
              >
                <MapPopup>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">{retailer.name}</div>
                    <p className="text-xs leading-5 text-muted-foreground">{retailer.address}</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary"
                      onClick={() => onSelectRetailer(retailer)}
                    >
                      Select pharmacy
                    </button>
                  </div>
                </MapPopup>
              </MapMarker>
            );
          })}
        </Map>
      );
    },
  }))
);

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
  if (shop === "wellness-products") {
    return {
      name: "Prodigy Wellness Pharmacy",
      location: "Nairobi, Kenya",
      since: "2018",
      fulfillment: "Ships in 2-4 business days",
    };
  }

  if (shop === "hospital-services") {
    return {
      name: "Prodigy Hospital Care Supplies",
      location: "Nairobi, Kenya",
      since: "2016",
      fulfillment: "Appointments confirmed within 24 hours",
    };
  }

  return {
    name: "GluCare Clinic",
    location: "Nairobi, Kenya",
    since: "2019",
    fulfillment: "Onboarding scheduled within 48 hours",
  };
}

function getCommerceCopy(shop: ShopItem["shop"]) {
  if (shop === "wellness-products") {
    return {
      panelTitle: "Nearest pharmacy",
      panelDescription:
        "Choose a pharmacy marker to inspect the nearest retailer, review contact details, and place the order with that pharmacy in mind.",
      popupEyebrow: "Pharmacy partner",
      selectedBadge: "Selected pharmacy",
      quickActionLabel: "Contact pharmacy",
      directCallLabel: "Call pharmacy",
    };
  }

  if (shop === "hospital-services") {
    return {
      panelTitle: "Hospital supply support",
      panelDescription: "Review procurement support details for this hospital care category.",
      popupEyebrow: "Hospital supply",
      selectedBadge: "Selected support desk",
      quickActionLabel: "Contact support",
      directCallLabel: "Call support",
    };
  }

  return {
    panelTitle: "Nearest clinic",
    panelDescription:
      "Choose a marker to inspect the nearest clinic, review contact details, and continue with that clinic in mind.",
    popupEyebrow: "Clinical partner",
    selectedBadge: "Selected clinic",
    quickActionLabel: "Contact clinic",
    directCallLabel: "Call clinic",
  };
}

function getSeedlingVariantVisual(variantId?: string) {
  if (variantId === "small") {
    return {
      hover: "hover:border-emerald-400 hover:shadow-[0_0_0_2px_rgba(61, 204, 196,0.12)] hover:bg-emerald-50/35",
      selected: "border-emerald-500 bg-emerald-50 text-emerald-950",
      priceCard: "border-emerald-400/55 bg-emerald-100/95",
      priceText: "text-emerald-950",
    };
  }
  if (variantId === "medium") {
    return {
      hover: "hover:border-emerald-600 hover:shadow-[0_0_0_2px_rgba(23, 179, 172,0.18)] hover:bg-emerald-100/40",
      selected: "border-emerald-700 bg-emerald-200 text-emerald-950",
      priceCard: "border-emerald-600/60 bg-emerald-200/95",
      priceText: "text-emerald-950",
    };
  }
  if (variantId === "large") {
    return {
      hover: "hover:border-emerald-800 hover:shadow-[0_0_0_2px_rgba(12, 118, 114,0.22)] hover:bg-emerald-200/45",
      selected: "border-emerald-900 bg-emerald-700 text-white",
      priceCard: "border-emerald-800/70 bg-emerald-700/95",
      priceText: "text-white",
    };
  }
  return {
    hover: "hover:border-emerald-500 hover:shadow-[0_0_0_2px_rgba(61, 204, 196,0.12)] hover:bg-emerald-50/35",
    selected: "border-emerald-600 bg-emerald-100 text-emerald-950",
    priceCard: "border-emerald-400/55 bg-emerald-100/95",
    priceText: "text-emerald-950",
  };
}

function getNearestRetailers(item: ShopItem): RetailerLocation[] {
  if (item.shop === "wellness-products") {
    return [
      {
        id: `${item.id}-westlands`,
        name: "Prodigy Wellness Pharmacy - Westlands",
        description: "Flagship wellness pharmacy stocking supplements, skincare, and weight-management products.",
        image: item.imageGallery?.[0]?.url ?? item.image,
        latitude: -1.2673,
        longitude: 36.8055,
        phone: "+254 700 120 440",
        email: "orders@prodigyhealthcare.co.ke",
        address: "Westlands, Nairobi, Kenya",
        leadTime: "Collection or dispatch within 2-4 business days",
      },
      {
        id: `${item.id}-cbd`,
        name: "Prodigy Wellness Pharmacy - CBD",
        description: "City-centre wellness pharmacy with same-day pickup for online orders.",
        image: item.imageGallery?.[1]?.url ?? item.image,
        latitude: -1.2864,
        longitude: 36.8172,
        phone: "+254 711 305 522",
        email: "cbd@prodigyhealthcare.co.ke",
        address: "Nairobi CBD, Kenya",
        leadTime: "Dispatch scheduling within 48 hours",
      },
      {
        id: `${item.id}-mombasa-road`,
        name: "Prodigy Wellness Pharmacy - Mombasa Road",
        description: "Distribution hub supporting larger wellness product orders and bulk fulfilment.",
        image: item.imageGallery?.[2]?.url ?? item.image,
        latitude: -1.3197,
        longitude: 36.9275,
        phone: "+254 733 889 104",
        email: "hello@prodigyhealthcare.co.ke",
        address: "Mombasa Road, Nairobi, Kenya",
        leadTime: "Same-week coordination for larger orders",
      },
    ];
  }

  const retailer = getRetailerInfo(item.shop);
  const entityLabel = item.shop === "hospital-services" ? "care team" : "clinic";
  return [
    {
      id: `${item.id}-retailer`,
      name: retailer.name,
      description: `${retailer.name} is the nearest available ${entityLabel} currently shown for this listing.`,
      image: item.image,
      latitude: -1.2864,
      longitude: 36.8172,
      phone: "+254 700 000 000",
      email: "hello@prodigyhealthcare.co.ke",
      address: retailer.location,
      leadTime: retailer.fulfillment,
    },
  ];
}

const hospitalCategoryTeasers = [
  {
    value: "dialysis-consumables",
    label: "Dialysis Consumables",
    description: "Concentrates, tubing, and machine-care essentials for renal units.",
    image: assetUrl("/KNH.webp"),
  },
  {
    value: "high-level-disinfectants",
    label: "High Level Disinfectants",
    description: "Validated formulas for clinical equipment and sensitive devices.",
    image: assetUrl("/acs.jpg"),
  },
  {
    value: "vascular-access-icu",
    label: "Vascular Access & ICU",
    description: "Access and critical-care supplies for high acuity workflows.",
    image: assetUrl("/human-anatomy.jpg"),
  },
  {
    value: "antiseptics",
    label: "Antiseptics",
    description: "Skin-preparation and wound-antisepsis products for clinical use.",
    image: assetUrl("/body%20cs.jpg"),
  },
  {
    value: "wound-care",
    label: "Wound Care",
    description: "Dressings and pads for protection, comfort, and recovery.",
    image: assetUrl("/heal.mp4"),
  },
  {
    value: "liquids-gels-soaps",
    label: "Liquids, Gels, Soaps",
    description: "Hand hygiene liquids and rubs for daily hospital use.",
    image: assetUrl("/healthws.jpg"),
  },
  {
    value: "hospital-disinfectant-and-antiseptic-wipes",
    label: "Disinfectant & Antiseptic Wipes",
    description: "Ready-to-use wipes for surfaces, skin prep, and care areas.",
    image: assetUrl("/NairobiHospital.png"),
  },
];

function pickHospitalCategoryTeasers(itemId: string) {
  const hash = Array.from(itemId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const firstIndex = hash % hospitalCategoryTeasers.length;
  const secondIndex = (firstIndex + 2 + (hash % 3)) % hospitalCategoryTeasers.length;

  return [
    hospitalCategoryTeasers[firstIndex],
    hospitalCategoryTeasers[secondIndex === firstIndex ? (secondIndex + 1) % hospitalCategoryTeasers.length : secondIndex],
  ];
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
      ? "w-full cursor-pointer overflow-hidden rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      : "cursor-pointer overflow-hidden rounded-full border-primary/25 bg-transparent text-foreground hover:bg-primary/5";
  const iconClassName = variant === "solid" ? "group-hover:animate-[cartShake_0.55s_ease-in-out]" : "group-hover:animate-[cartShake_0.55s_ease-in-out]";

  if (href) {
    return (
      <Button variant={variant === "solid" ? "default" : "outline"} className={cn(buttonClassName, className)} asChild>
        <a href={href} onClick={onClick} className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-4 py-2.5">
          <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-primary/25 via-primary/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
          <span className="relative z-10 inline-flex items-center group-hover:text-primary">
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
        <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-primary-foreground/25 via-primary-foreground/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
        <span className="relative z-10 inline-flex items-center group-hover:text-primary-foreground">
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
      <Card className="border-border bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">{item.mapTitle ?? "Available site details"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {item.mapDescription ?? "Select a site to inspect the active location details."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {item.mapPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => onSelectPoint(point)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  point.id === selectedPoint.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{point.name}</span>
                  <Badge variant="outline">{point.label}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{point.summary}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedPoint.category}</Badge>
            <Badge variant="outline">{selectedPoint.label}</Badge>
          </div>
          <CardTitle className="text-xl">{selectedPoint.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{selectedPoint.summary}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={selectedPoint.image} alt={selectedPoint.name} className="h-48 w-full object-cover" />
          </div>

          {selectedPoint.metrics?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedPoint.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border bg-primary/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{metric.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {selectedPoint.details?.length ? (
            <div className="space-y-3">
              {selectedPoint.details.map((detail) => (
                <div key={detail} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          ) : null}

        </CardContent>
      </Card>
    </div>
  );
}

function PharmacyMapPanel({
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
  return (
    <div className="theme-primary-border-hover rounded-[2rem] border border-transparent bg-transparent p-3 transition-shadow duration-300 hover:shadow-lg">
      <div className="space-y-2 px-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPinned className="h-5 w-5 text-primary" />
          {copy.panelTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{copy.panelDescription}</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card">
          <React.Suspense
            fallback={
              <div className="flex min-h-[360px] items-center justify-center text-sm text-muted-foreground">
                Loading nearby pharmacies...
              </div>
            }
          >
            <LazyPharmacyMap
              retailers={retailers}
              selectedRetailer={selectedRetailer}
              onSelectRetailer={onSelectRetailer}
            />
          </React.Suspense>
        </div>

        <div className="grid gap-3">
          {retailers.map((retailer) => (
            <button
              key={retailer.id}
              type="button"
              onClick={() => onSelectRetailer(retailer)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                selectedRetailer.id === retailer.id
                  ? "border-primary bg-primary/10"
                  : "border-primary/20 bg-card hover:border-primary/40"
              )}
            >
              <div className="flex gap-4">
                <img src={retailer.image} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <div>
                  <Badge className="bg-primary/10 text-primary">{copy.popupEyebrow}</Badge>
                  <h3 className="mt-2 font-semibold">{retailer.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{retailer.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 rounded-2xl border border-primary/15 bg-card/70 p-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <img src={selectedRetailer.image} alt={selectedRetailer.name} className="h-36 w-full rounded-xl object-cover lg:h-full" />
        <div className="space-y-4">
          <div>
            <Badge className="bg-primary/10 text-primary">{copy.selectedBadge}</Badge>
            <h3 className="mt-3 text-xl font-semibold">{selectedRetailer.name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedRetailer.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="text-sm">
              <div className="font-medium">Address</div>
              <div className="text-muted-foreground">{selectedRetailer.address}</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Lead time</div>
              <div className="text-muted-foreground">{selectedRetailer.leadTime}</div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SweepActionButton href={`mailto:${selectedRetailer.email}`} icon={<Mail className="h-4 w-4" />}>
              Contact
            </SweepActionButton>
            <SweepActionButton href={`tel:${selectedRetailer.phone.replace(/\s+/g, "")}`} icon={<Phone className="h-4 w-4" />}>
              {copy.directCallLabel}
            </SweepActionButton>
            <SweepActionButton className="w-full" icon={<ShoppingCart className="h-4 w-4" />} onClick={onAddToCart} variant="solid">
              Add to cart
            </SweepActionButton>
          </div>
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
    <Card className="border-border bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
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
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="text-sm font-medium">Add your rating</div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            <div className="space-y-2 rounded-xl border border-primary/20 bg-background/75 px-3 py-2.5">
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
          <Button type="submit">
            Submit rating
          </Button>
        </form>

        <div className="space-y-3">
          {sortedReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-4">
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

function OtherDealsPanel({ item }: { item: ShopItem }) {
  const noun = item.shop === "wellness-products"
    ? "wellness product"
    : item.shop === "hospital-services"
      ? "hospital service"
      : "care program";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-2xl font-semibold">What next?</h3>
        <p className="text-sm text-muted-foreground">Keep moving through the rest of the platform after you shortlist the right {noun}.</p>
      </div>
    </div>
  );
}

function HospitalCategoryRecommendations({ item }: { item: ShopItem }) {
  const teasers = React.useMemo(() => pickHospitalCategoryTeasers(item.id), [item.id]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {teasers.map((teaser) => (
          <a
            key={teaser.value}
            href={`${getAppUrl(`/shop/hospital-services?category=${encodeURIComponent(teaser.value)}`)}#products-section`}
            className="group relative min-h-48 overflow-hidden rounded-lg p-5 text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            {teaser.image.endsWith(".mp4") ? (
              <video
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-105"
                autoPlay
                loop
                muted
                playsInline
                src={teaser.image}
              />
            ) : (
              <img
                src={teaser.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/82 via-sky-900/62 to-black/74" />
            <div className="relative flex min-h-36 flex-col justify-between gap-8">
              <Badge className="w-fit bg-white/16 text-white hover:bg-white/20">Hospital category</Badge>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{teaser.label}</h3>
                <p className="text-sm leading-6 text-white/84">{teaser.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
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
  const isSeedlingsItem = item.shop === "wellness-products";
  const isEnhancedCommerceItem = true;
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
          item.shop === "hospital-services"
              ? "Booking was smooth and the care team was thorough and reassuring."
              : "Great product, arrived quickly and works exactly as described.",
      },
      {
        id: `${item.id}-r2`,
        name: "David M.",
        rating: 4.75,
        date: "2026-03-27",
        text:
          item.shop === "hospital-services"
              ? "Good communication and the visit was handled exactly as scoped."
              : "Consistent quality, would order again.",
      },
      {
        id: `${item.id}-r3`,
        name: "Grace N.",
        rating: 4.5,
        date: "2026-02-18",
        text:
          item.shop === "hospital-services"
              ? "The team adapted well to my schedule and follow-up communication stayed clear."
              : "Good quality overall, would purchase again.",
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
    (activeVariant?.count ? `per ${activeVariant.count} units` : item.unitLabel);

  const images =
    item.imageGallery && item.imageGallery.length > 0 ? item.imageGallery : [{ url: item.image, title: item.name }];

  const handleAddToCart = () => {
    onAdd(item.id, activeVariant?.id);
  };
  const subtotal = getCartSubtotal(shopItems);
  const cartCount = getCartCount();

  return (
    <div className={cn("space-y-6 p-4", className)}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to products
      </Button>

      <div className="mx-auto grid max-w-6xl items-start gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.85fr)] xl:gap-5">
        <div className="space-y-2 lg:max-w-[560px]">
          <ImageCarouselBasic images={images} showThumbs className="w-full" />
        </div>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center">
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
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
                <Badge variant="secondary" className="bg-primary text-primary-foreground animate-pulse opacity-100">
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
                  : "border-primary/20 bg-primary/5 text-foreground"
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
                  <span className="font-medium">*</span> Price is exclusive of delivery fees, which should be agreed directly with the pharmacy.
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
                <div className="grid gap-3 border-t border-border px-4 py-4">
                  {item.variants?.length ? (
                    item.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant.id)}
                        className={cn(
                          "theme-primary-border-hover rounded-2xl border px-4 py-3 text-left transition",
                          selectedVariant === variant.id
                            ? getSeedlingVariantVisual(variant.id).selected
                            : isSeedlingsItem
                              ? cn("border-border bg-transparent", getSeedlingVariantVisual(variant.id).hover)
                              : "border-border bg-transparent hover:border-primary/40 hover:bg-primary/5"
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
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-primary-foreground/25 via-primary-foreground/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                    <span className="relative z-10 inline-flex items-center group-hover:text-primary-foreground">
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
              <div className="theme-primary-border-hover rounded-2xl border border-transparent bg-transparent transition-shadow duration-300 hover:shadow-lg">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <h3 className="font-semibold">Why this offer stands out</h3>
                    <p className="text-sm text-muted-foreground">{item.highlights.length} key points</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", highlightsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    {item.highlights.map((highlight) => (
                      <div key={highlight} className="flex gap-3 py-1">
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
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

      {isEnhancedCommerceItem ? (
        <div className="space-y-6">
          {item.shop === "wellness-products" && selectedRetailer ? (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
              <PharmacyMapPanel
                retailers={nearestRetailers}
                selectedRetailer={selectedRetailer}
                onSelectRetailer={(retailer) => setSelectedRetailerId(retailer.id)}
                onAddToCart={handleAddToCart}
                copy={commerceCopy}
              />
              <CustomerRatingsPanel initialReviews={dummyReviews} initialAverage={rating} />
            </div>
          ) : (
            <CustomerRatingsPanel initialReviews={dummyReviews} initialAverage={rating} />
          )}
          <OtherDealsPanel item={item} />
          {item.shop === "hospital-services" ? <HospitalCategoryRecommendations item={item} /> : null}
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
