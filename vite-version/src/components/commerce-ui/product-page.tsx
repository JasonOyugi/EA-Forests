"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Heart,
  Leaf,
  MapPinned,
  Phone,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageCarouselBasic from "./image-carousel-basic";
import StarRatingFractions from "./star-rating-fractions";
import { Map, MapCircle, MapMarker, MapMarkerClusterGroup, MapPopup, MapTileLayer, MapTooltip } from "@/components/ui/map";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ForestryServicesCountdownBanner } from "@/components/commerce-ui/forestry-services-countdown-banner";
import { ForestryServicesSaleBanner } from "@/components/commerce-ui/forestry-services-sale-banner";
import type { ShopItem, ShopItemMapPoint } from "@/app/shop/types";
import { getNurserySpeciesOffers } from "@/app/shop/data/nursery-data";
import {
  convertMoney,
  CurrencySelect,
  formatMoney,
  useCurrencyRates,
  type CurrencyCode,
} from "@/app/models/currency";
import { useMap } from "react-leaflet";

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
  country?: string;
  region?: string;
  species?: string;
  capacity?: string;
  certification?: string;
  locationConfidence?: string;
  varieties?: string[];
  traceability?: string;
  availability?: string;
  pricePerSeedling?: number | null;
  pricePer100Seedlings?: number | null;
  pricePer500Seedlings?: number | null;
  pricePer1000Seedlings?: number | null;
};

interface ProductPageProps {
  item: ShopItem;
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
      panelTitle: "Nursery market map",
      panelDescription:
        "Choose a nursery marker to inspect the mapped planting material, capacity, contact details, and location confidence.",
      popupEyebrow: "Mapped nursery",
      selectedBadge: "Selected nursery",
      quickActionLabel: "Call nursery",
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
  if (points.length === 0) return [-1.5, 35.3] as [number, number];
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

function displayDatabaseValue(value: string | number | null | undefined) {
  if (value == null || String(value).trim() === "") return "N/A";
  return String(value).trim();
}

function getNurseryCountry(country: string | null) {
  return country === "Uganda" || country === "Kenya" || country === "Tanzania"
    ? country
    : "Uganda";
}

function getNearestRetailers(item: ShopItem): RetailerLocation[] {
  if (item.shop === "seedlings") {
    return getNurserySpeciesOffers(item)
      .map((offer) => {
        const { nursery } = offer;
        const country = getNurseryCountry(nursery.country);
        const region = displayDatabaseValue(nursery.region);
        const address = displayDatabaseValue(nursery.address);
        const contact = displayDatabaseValue(nursery.contact.phone || nursery.contact.other);

        return {
          id: `nursery-${nursery.id}-${offer.varieties.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: nursery.name,
          description: offer.species,
          image: item.image,
          latitude: Number(nursery.lat),
          longitude: Number(nursery.lon),
          phone: contact,
          email: "",
          address: address === "N/A" ? [region, country].filter((value) => value !== "N/A").join(", ") : address,
          leadTime: displayDatabaseValue(nursery.transport),
          country,
          region,
          species: offer.species,
          capacity: displayDatabaseValue(offer.capacity),
          certification: displayDatabaseValue(nursery.certification),
          locationConfidence: displayDatabaseValue(nursery.source.coordinateConfidence),
          varieties: offer.varieties,
          traceability: displayDatabaseValue(offer.traceability),
          availability: displayDatabaseValue(offer.availability),
          pricePerSeedling: offer.pricePerSeedling,
          pricePer100Seedlings: offer.pricePer100Seedlings,
          pricePer500Seedlings: offer.pricePer500Seedlings,
          pricePer1000Seedlings: offer.pricePer1000Seedlings,
        };
      })
      .filter((nursery) => Number.isFinite(nursery.latitude) && Number.isFinite(nursery.longitude))
      .sort((a, b) =>
        Number(b.pricePerSeedling != null) - Number(a.pricePerSeedling != null) ||
        a.country.localeCompare(b.country) ||
        a.name.localeCompare(b.name)
      );
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

function distanceKm(left: RetailerLocation, right: RetailerLocation) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function CatchmentViewport({
  retailer,
  radiusKm,
}: {
  retailer: RetailerLocation;
  radiusKm: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    const zoom = radiusKm === 100 ? 7 : radiusKm === 250 ? 6 : 5;
    map.setView([retailer.latitude, retailer.longitude], zoom, { animate: true });
  }, [map, radiusKm, retailer.latitude, retailer.longitude]);

  return (
    <MapCircle
      center={[retailer.latitude, retailer.longitude]}
      radius={radiusKm * 1000}
      pathOptions={{
        color: "#047857",
        fillColor: "#10b981",
        fillOpacity: 0.08,
        opacity: 0.75,
        weight: 2,
      }}
    />
  );
}

function SiteMarker({ active }: { active: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-lg transition-transform",
          active && "scale-105 ring-2 ring-primary/25"
        )}
      >
        <MapPinned className="h-5 w-5" />
      </div>
      <div className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
        Site
      </div>
    </div>
  );
}

function RetailerMarker({
  active,
  markerKind = "store",
}: {
  active: boolean;
  markerKind?: "nursery" | "store";
}) {
  const Icon = markerKind === "nursery" ? Leaf : Store;
  const markerClassName = markerKind === "nursery"
    ? "relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-lg transition-transform"
    : "relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-lg transition-transform";
  const glowClassName = markerKind === "nursery"
    ? "absolute inset-0 scale-110 rounded-full bg-emerald-500/25 blur-xl transition-opacity"
    : "absolute inset-0 scale-110 rounded-full bg-primary/25 blur-xl transition-opacity";

  return (
    <div className="relative flex size-12 aspect-square shrink-0 items-center justify-center">
      <div className={cn(glowClassName, active ? "opacity-100" : "opacity-70")} />
      <div
        className={cn(
          markerClassName,
          "aspect-square shrink-0",
          active && (markerKind === "nursery" ? "scale-105 ring-2 ring-emerald-500/25" : "scale-105 ring-2 ring-primary/25")
        )}
        style={{ width: 48, height: 48, borderRadius: "9999px" }}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function NurseryClusterBadge({ count }: { count: number }) {
  return (
    <div
      className="flex size-11 aspect-square shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-700 text-sm font-semibold text-white shadow-lg"
      style={{ width: 44, height: 44, borderRadius: "9999px" }}
    >
      {count}
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

  const mapCenter = getMapCenter(item.mapPoints);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
      <Card className="overflow-hidden border-border bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapPinned className="h-5 w-5 text-primary" />
            {item.mapTitle ?? "Site map"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {item.mapDescription ?? "Select a marker to inspect the active site."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] overflow-hidden rounded-xl border border-border">
            <Map center={mapCenter} zoom={7} className="h-full w-full">
              {item.mapPoints.map((point) => (
                <MapMarker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={<SiteMarker active={selectedPoint.id === point.id} />}
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

          <div className="grid gap-2">
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
  copy,
  markerKind = "store",
}: {
  retailers: RetailerLocation[];
  selectedRetailer: RetailerLocation | null;
  onSelectRetailer: (retailer: RetailerLocation) => void;
  copy: ReturnType<typeof getCommerceCopy>;
  markerKind?: "nursery" | "store";
}) {
  const [catchmentRadiusKm, setCatchmentRadiusKm] = React.useState(500);
  const visibleRetailers =
    markerKind === "nursery" && selectedRetailer
      ? retailers.filter(
          (retailer) =>
            retailer.id === selectedRetailer.id ||
            distanceKm(selectedRetailer, retailer) <= catchmentRadiusKm
        )
      : retailers;
  const mapCenter = selectedRetailer
    ? [selectedRetailer.latitude, selectedRetailer.longitude] as [number, number]
    : getRetailerMapCenter(visibleRetailers);
  const selectedVendorRating = selectedRetailer
    ? deriveRatingFromId(selectedRetailer.id)
    : null;
  const markerNodes = visibleRetailers.map((retailer) => (
    <MapMarker
      key={retailer.id}
      position={[retailer.latitude, retailer.longitude]}
      icon={<RetailerMarker active={selectedRetailer?.id === retailer.id} markerKind={markerKind} />}
      iconAnchor={[24, 24]}
      iconSize={[48, 48]}
      iconClassName="nursery-map-marker"
      eventHandlers={{ click: () => onSelectRetailer(retailer) }}
    >
      <MapPopup className="w-[min(28rem,calc(100vw-3rem))] border-0 p-2">
        <div className="overflow-hidden rounded-[1rem] bg-background">
          {markerKind === "store" ? (
            <div className="relative h-36 overflow-hidden">
              <img src={retailer.image} alt={retailer.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/85">{copy.popupEyebrow}</div>
                <div className="mt-1 text-lg font-semibold text-white">{retailer.name}</div>
              </div>
            </div>
          ) : (
            <div className="border-b border-emerald-700/20 bg-emerald-50 p-4 text-emerald-950">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-emerald-800">{copy.popupEyebrow}</div>
              <div className="mt-1 text-lg font-semibold">{retailer.name}</div>
            </div>
          )}
          <div className="space-y-3 p-4">
            <div className="grid gap-2 text-sm">
              <p><span className="font-medium">Country:</span> {retailer.country ?? "N/A"}</p>
              <p><span className="font-medium">County / region:</span> {retailer.region ?? "N/A"}</p>
                  <p><span className="font-medium">Planting material:</span> {retailer.description}</p>
                  {markerKind === "nursery" ? (
                    <>
                  <p><span className="font-medium">Species:</span> {retailer.species ?? "N/A"}</p>
                  <p><span className="font-medium">Variety:</span> {retailer.varieties?.join(", ") ?? "N/A"}</p>
                  <p><span className="font-medium">Availability:</span> {retailer.availability ?? "N/A"}</p>
                  <p><span className="font-medium">Variety capacity:</span> {retailer.capacity ?? "N/A"}</p>
                  <p><span className="font-medium">Traceability:</span> {retailer.traceability ?? "N/A"}</p>
                  <p><span className="font-medium">Certification:</span> {retailer.certification ?? "N/A"}</p>
                  <p><span className="font-medium">Location confidence:</span> {retailer.locationConfidence ?? "N/A"}</p>
                </>
              ) : null}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{retailer.address}</p>
              <p>{retailer.phone}</p>
              {retailer.email ? <p>{retailer.email}</p> : null}
            </div>
            <div className="grid gap-2">
              {retailer.phone !== "N/A" ? (
                <SweepActionButton href={`tel:${retailer.phone.replace(/\s+/g, "")}`} icon={<Phone className="h-4 w-4" />}>
                  {copy.quickActionLabel}
                </SweepActionButton>
              ) : null}
            </div>
          </div>
        </div>
      </MapPopup>
      <MapTooltip side="top">{retailer.name}</MapTooltip>
    </MapMarker>
  ));

  return (
    <div className="theme-primary-border-hover rounded-[2rem] border border-transparent bg-transparent p-3 transition-shadow duration-300 hover:shadow-lg">
      <div className="space-y-2 px-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPinned className="h-5 w-5 text-primary" />
          {copy.panelTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {copy.panelDescription}
        </p>
        {markerKind === "nursery" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Catchment around selected nursery</span>
              <div className="inline-flex overflow-hidden rounded-md border">
                {[100, 250, 500].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setCatchmentRadiusKm(radius)}
                    className={cn(
                      "h-8 border-r px-3 text-xs font-medium last:border-r-0",
                      catchmentRadiusKm === radius
                        ? "bg-emerald-700 text-white"
                        : "bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
            </div>
            <Badge variant="outline">
              {visibleRetailers.length} of {retailers.length} nurseries
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-primary/20">
          <Map center={mapCenter} zoom={markerKind === "nursery" ? 5 : 8} className="h-full w-full">
            <MapTileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {markerKind === "nursery" && selectedRetailer ? (
              <CatchmentViewport
                retailer={selectedRetailer}
                radiusKm={catchmentRadiusKm}
              />
            ) : null}
            {markerKind === "nursery" ? (
              <MapMarkerClusterGroup
                icon={(count) => <NurseryClusterBadge count={count} />}
                iconClassName="nursery-map-marker"
                iconSize={[44, 44]}
              >
                {markerNodes}
              </MapMarkerClusterGroup>
            ) : markerNodes}
          </Map>
        </div>

        {selectedRetailer ? (
        <div className="space-y-5 rounded-2xl bg-transparent p-1">
          {markerKind === "store" ? (
            <div className="overflow-hidden rounded-2xl">
              <img src={selectedRetailer.image} alt={selectedRetailer.name} className="h-44 w-full object-cover" />
            </div>
          ) : null}
          <div>
            <Badge className="bg-primary/10 text-primary">{copy.selectedBadge}</Badge>
            <h3 className="mt-3 text-xl font-semibold">{selectedRetailer.name}</h3>
          </div>
          <div className="grid gap-3">
            {selectedVendorRating ? (
              <div className="border-b border-primary/20 pb-3 text-sm">
                <div className="font-medium">{markerKind === "nursery" ? "Nursery rating" : "Vendor rating"}</div>
                <div className="mt-1 flex items-center gap-2">
                  <StarRatingFractions
                    value={selectedVendorRating.rating}
                    readOnly
                    iconSize={15}
                  />
                  <span className="text-muted-foreground">
                    {selectedVendorRating.rating.toFixed(2)}/5 ({selectedVendorRating.reviewCount})
                  </span>
                </div>
              </div>
            ) : null}
            <div className="border-b border-primary/20 pb-3 text-sm">
              <div className="font-medium">Address</div>
              <div className="text-muted-foreground">{selectedRetailer.address}</div>
            </div>
            {markerKind === "nursery" ? (
              <>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Planting material</div>
                  <div className="text-muted-foreground">{selectedRetailer.description}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Species</div>
                  <div className="text-muted-foreground">{selectedRetailer.species ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Variety</div>
                  <div className="text-muted-foreground">{selectedRetailer.varieties?.join(", ") ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Availability</div>
                  <div className="text-muted-foreground">{selectedRetailer.availability ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Variety capacity</div>
                  <div className="text-muted-foreground">{selectedRetailer.capacity ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Traceability</div>
                  <div className="text-muted-foreground">{selectedRetailer.traceability ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Certification</div>
                  <div className="text-muted-foreground">{selectedRetailer.certification ?? "N/A"}</div>
                </div>
                <div className="border-b border-primary/20 pb-3 text-sm">
                  <div className="font-medium">Location confidence</div>
                  <div className="text-muted-foreground">{selectedRetailer.locationConfidence ?? "N/A"}</div>
                </div>
              </>
            ) : (
              <div className="border-b border-primary/20 pb-3 text-sm">
                <div className="font-medium">Lead time</div>
                <div className="text-muted-foreground">{selectedRetailer.leadTime}</div>
              </div>
            )}
          </div>
          <SweepActionButton className="w-full" href={`tel:${selectedRetailer.phone.replace(/\s+/g, "")}`} icon={<Phone className="h-4 w-4" />}>
            {copy.directCallLabel}
          </SweepActionButton>
        </div>
        ) : (
          <div className="flex min-h-[24rem] items-center justify-center rounded-md border border-dashed p-6 text-center">
            <div>
              <Leaf className="mx-auto h-8 w-8 text-emerald-700" />
              <h3 className="mt-3 font-semibold">No mapped nursery supplier</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No nursery record explicitly lists this genetic material.
              </p>
            </div>
          </div>
        )}
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
  const isLandItem = item.tags.includes("land");
  const noun = item.shop === "seedlings"
    ? "nursery stock"
    : isLandItem
      ? "land listing"
      : item.shop === "forestry-services"
        ? "field service"
        : "forestry offer";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-2xl font-semibold">What next?</h3>
        <p className="text-sm text-muted-foreground">Keep moving through the rest of the platform after you shortlist the right {noun}.</p>
      </div>
      <div className="space-y-4">
        <ForestryServicesSaleBanner />
        <ForestryServicesCountdownBanner />
      </div>
    </div>
  );
}

export function ProductPage({
  item,
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
  const [currency, setCurrency] = React.useState<CurrencyCode>("USD");
  const apiBaseUrl = React.useMemo(
    () => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api"),
    []
  );
  const currencyRates = useCurrencyRates(apiBaseUrl);

  const activeVariant = item.variants?.find((variant) => variant.id === selectedVariant) ?? defaultVariant;
  const selectedPoint =
    item.mapPoints?.find((point) => point.id === selectedPointId) ?? item.mapPoints?.[0] ?? null;
  const isSeedlingsItem = item.shop === "seedlings";
  const isLandItem = item.tags.includes("land");
  const isLandServicesItem = isLandItem || item.shop === "forestry-services";
  const isEnhancedCommerceItem = item.shop === "seedlings" || item.shop === "forestry-services" || isLandItem;
  const seedlingVariantVisual = getSeedlingVariantVisual(activeVariant?.id);
  const { rating, reviewCount } = React.useMemo(() => deriveRatingFromId(item.id), [item.id]);
  const retailerInfo = React.useMemo(() => getRetailerInfo(item.shop), [item.shop]);
  const commerceCopy = React.useMemo(() => getCommerceCopy(item.shop), [item.shop]);
  const nearestRetailers = React.useMemo(() => getNearestRetailers(item), [item]);
  const [selectedVariety, setSelectedVariety] = React.useState("");
  const availableVarieties = React.useMemo(
    () => Array.from(new Set(nearestRetailers.flatMap((retailer) => retailer.varieties ?? []))),
    [nearestRetailers]
  );
  const activeVariety = availableVarieties.includes(selectedVariety)
    ? selectedVariety
    : availableVarieties[0] ?? "";
  const filteredRetailers = React.useMemo(
    () =>
      !isSeedlingsItem || !activeVariety
        ? nearestRetailers
        : nearestRetailers.filter((retailer) => retailer.varieties?.includes(activeVariety)),
    [activeVariety, isSeedlingsItem, nearestRetailers]
  );
  const [selectedRetailerId, setSelectedRetailerId] = React.useState<string>(nearestRetailers[0]?.id ?? "");
  const selectedRetailer =
    filteredRetailers.find((retailer) => retailer.id === selectedRetailerId) ?? filteredRetailers[0] ?? null;
  const mappedSupplierCount = isSeedlingsItem
    ? new Set(filteredRetailers.map((retailer) => retailer.name)).size
    : item.supplierCount ?? nearestRetailers.length;

  const selectedNurseryPrice = (count: number) => {
    if (!selectedRetailer) return null;
    if (count === 1) return selectedRetailer.pricePerSeedling ?? null;
    if (count === 100) return selectedRetailer.pricePer100Seedlings ?? null;
    if (count === 500) return selectedRetailer.pricePer500Seedlings ?? null;
    if (count === 1000) return selectedRetailer.pricePer1000Seedlings ?? null;
    return null;
  };

  React.useEffect(() => {
    setSelectedRetailerId(filteredRetailers[0]?.id ?? "");
  }, [filteredRetailers]);

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
  const displayCurrency = isSeedlingsItem ? currency : item.currency as CurrencyCode;
  const activePrice = isSeedlingsItem
    ? selectedNurseryPrice(activeVariant?.count ?? 1)
    : activeVariant?.price ?? item.price;
  const activePriceAvailable = isSeedlingsItem
    ? activePrice != null
    : item.priceAvailable !== false;
  const displayPrice = (value: number | null | undefined) =>
    formatMoney(
      convertMoney(value, item.currency as CurrencyCode, displayCurrency, currencyRates.rates),
      displayCurrency
    );

  return (
    <div className={cn("min-w-0 space-y-6 px-3 py-5 sm:px-6 sm:py-6 lg:p-8", className)}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to products
      </Button>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <ImageCarouselBasic images={images} aspectRatio="square" showThumbs className="w-full" />
        </div>

        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {item.featuredLabel ? <Badge className="bg-black text-white">{item.featuredLabel}</Badge> : null}
                  {item.subtitle ? <Badge variant="outline">{item.subtitle}</Badge> : null}
                </div>
              <h1 className="type-display-title max-w-full break-words [overflow-wrap:anywhere] sm:max-w-[14ch]">{item.name}</h1>
                {isSeedlingsItem || isLandServicesItem ? (
                  <div className="text-sm text-muted-foreground">
                    {mappedSupplierCount} mapped {item.shop === "seedlings" ? "nursery " : ""}supplier
                    {mappedSupplierCount === 1 ? "" : "s"}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <StarRatingFractions value={rating} readOnly iconSize={16} />
                    <span className="text-sm text-muted-foreground">
                      {rating.toFixed(2)}/5 · {reviewCount} reviews
                    </span>
                  </div>
                )}
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
                <Badge variant="secondary" className="!bg-white !text-zinc-950 animate-pulse opacity-100 dark:!bg-white dark:!text-zinc-950">
                  Featured
                </Badge>
              ) : null}
            </div>

            <p className="type-body-copy text-muted-foreground">{item.description}</p>
            {item.evidenceNote ? (
              <p className="text-xs leading-5 text-muted-foreground">
                {item.evidenceNote}
              </p>
            ) : null}

            {isSeedlingsItem ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <CurrencySelect value={currency} onChange={setCurrency} rateSource={currencyRates.source} />
                </div>
                {availableVarieties.length > 0 ? (
                  <label className="w-52 space-y-2 text-sm">
                    <span className="font-medium text-amber-700 dark:text-amber-300">Variety</span>
                    <Select value={activeVariety} onValueChange={setSelectedVariety}>
                      <SelectTrigger className="border-amber-500/60 bg-amber-100/60 text-amber-950 focus:ring-amber-500 dark:bg-amber-950/40 dark:text-amber-100">
                        <SelectValue placeholder="Choose variety" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVarieties.map((variety) => (
                          <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "rounded-2xl border p-5 transition-colors duration-300",
                isSeedlingsItem
                  ? cn(seedlingVariantVisual.priceCard, seedlingVariantVisual.priceText)
                  : "border-primary/20 bg-primary/5 text-foreground"
              )}
            >
              {isSeedlingsItem && selectedRetailer ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-current/75">
                  Selected nursery: {selectedRetailer.name}
                  {selectedRetailer.varieties?.length ? ` · ${selectedRetailer.varieties.join(", ")}` : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap items-end gap-2 text-4xl font-bold">
                {activePriceAvailable ? displayPrice(activePrice) : "Price unavailable"}
                {activePriceAvailable ? (
                  <span className={cn("mb-1 ml-2 text-sm font-normal", isSeedlingsItem ? "text-current/80" : "text-muted-foreground")}>{activeUnitLabel}</span>
                ) : null}
              </div>
              {activeVariant?.secondaryPrice ? (
                <p className={cn("mt-2 text-sm", isSeedlingsItem ? "text-current/78" : "text-muted-foreground")}>
                  Maintenance {displayPrice(activeVariant.secondaryPrice)}{" "}
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

          {item.variants?.length ? <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
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
                    item.variants.map((variant) => {
                      const optionPrice = isSeedlingsItem
                        ? selectedNurseryPrice(variant.count)
                        : variant.price;

                      return <button
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
                          {optionPrice == null ? "Price unavailable" : `${displayPrice(optionPrice)} ${variant.unitLabel}`}
                        </div>
                        {variant.secondaryPrice ? (
                          <div className="text-sm text-muted-foreground">
                            {displayPrice(variant.secondaryPrice)} {variant.secondaryUnitLabel}
                          </div>
                        ) : null}
                        {variant.description ? <div className="mt-2 text-xs text-muted-foreground">{variant.description}</div> : null}
                      </button>
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No variants available.</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible> : null}

          <Separator />

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{retailerInfo.fulfillment}</span>
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

      {isEnhancedCommerceItem && (selectedRetailer || isSeedlingsItem) ? (
        <div className="space-y-6">
          <div
            className={cn(
              "items-start gap-6",
              !isSeedlingsItem && !isLandServicesItem &&
                "grid xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]"
            )}
          >
            <RetailerMapPanel
              retailers={filteredRetailers}
              selectedRetailer={selectedRetailer}
              onSelectRetailer={(retailer) => setSelectedRetailerId(retailer.id)}
              copy={commerceCopy}
              markerKind={isSeedlingsItem ? "nursery" : "store"}
            />
            {!isSeedlingsItem && !isLandServicesItem ? (
              <CustomerRatingsPanel initialReviews={dummyReviews} initialAverage={rating} />
            ) : null}
          </div>
          <OtherDealsPanel item={item} />
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

    </div>
  );
}
