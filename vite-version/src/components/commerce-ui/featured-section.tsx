"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Flame, Star, Zap } from "lucide-react";
import { EnhancedProductCard } from "./enhanced-product-card";
import type { ShopItem } from "@/app/shop/types";

interface FeaturedSectionProps {
  title: string;
  subtitle?: string;
  type: "featured" | "new" | "hot" | "bestseller";
  theme?: "seedlings" | "forests-land" | "forestry-services" | "roundwood";
  compact?: boolean;
  items: ShopItem[];
  quantities: Record<string, number>;
  onAdd: (itemId: string, variant?: string) => void;
  onDecrement: (itemId: string) => void;
  onClick?: (item: ShopItem) => void;
  onViewAll?: () => void;
  className?: string;
}

const sectionConfig = {
  featured: {
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    badge: "Featured",
  },
  new: {
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    badge: "New Arrivals",
  },
  hot: {
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    badge: "Hot Deals",
  },
  bestseller: {
    icon: Star,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    badge: "Bestsellers",
  },
};

const seedlingsConfig = {
  featured: {
    icon: Star,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  new: {
    icon: Zap,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  hot: {
    icon: Flame,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    badge: "Hot Deals",
  },
  bestseller: {
    icon: Star,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    badge: "Bestsellers",
  },
};

const forestsLandConfig = {
  featured: {
    icon: Star,
    color: "text-slate-800",
    bgColor: "bg-slate-100",
  },
  new: {
    icon: Zap,
    color: "text-slate-800",
    bgColor: "bg-slate-100",
  },
  hot: {
    icon: Flame,
    color: "text-slate-800",
    bgColor: "bg-slate-100",
    badge: "Hot Deals",
  },
  bestseller: {
    icon: Star,
    color: "text-slate-800",
    bgColor: "bg-slate-100",
    badge: "Bestsellers",
  },
};

const forestryServicesConfig = {
  featured: {
    icon: Star,
    color: "text-amber-800",
    bgColor: "bg-amber-100",
  },
  new: {
    icon: Zap,
    color: "text-amber-800",
    bgColor: "bg-amber-100",
  },
  hot: {
    icon: Flame,
    color: "text-amber-800",
    bgColor: "bg-amber-100",
    badge: "Hot Deals",
  },
  bestseller: {
    icon: Star,
    color: "text-amber-800",
    bgColor: "bg-amber-100",
    badge: "Bestsellers",
  },
};

const roundwoodConfig = {
  featured: {
    icon: Star,
    color: "text-rose-800",
    bgColor: "bg-rose-100",
  },
  new: {
    icon: Zap,
    color: "text-rose-800",
    bgColor: "bg-rose-100",
  },
  hot: {
    icon: Flame,
    color: "text-rose-800",
    bgColor: "bg-rose-100",
    badge: "Hot Deals",
  },
  bestseller: {
    icon: Star,
    color: "text-rose-800",
    bgColor: "bg-rose-100",
    badge: "Bestsellers",
  },
};

export function FeaturedSection({
  title,
  subtitle,
  type,
  theme,
  compact = false,
  items,
  quantities,
  onAdd,
  onDecrement,
  onClick,
  onViewAll,
  className,
}: FeaturedSectionProps) {
  const config =
    theme === "seedlings"
      ? seedlingsConfig[type]
      : theme === "forests-land"
      ? forestsLandConfig[type]
      : theme === "forestry-services"
      ? forestryServicesConfig[type]
      : theme === "roundwood"
      ? roundwoodConfig[type]
      : sectionConfig[type]
  const Icon = config.icon
  const cardClass =
    theme === "seedlings"
      ? "rounded-2xl border border-emerald-100 bg-transparent overflow-hidden"
      : theme === "forests-land"
      ? "rounded-2xl border border-slate-200 bg-transparent overflow-hidden"
      : theme === "forestry-services"
      ? "rounded-2xl border border-amber-300 bg-amber-50 overflow-hidden"
      : theme === "roundwood"
      ? "rounded-2xl border border-rose-300 bg-rose-50 overflow-hidden"
      : ""

  return (
    <section className={className}>
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === "new" && theme === "seedlings" ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse opacity-100 scale-125"></div>
                  <div className={`relative rounded-full p-2 ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                </div>
              ) : (
                <div className={`rounded-full p-2 ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  {title}
                </CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            {onViewAll && (
              <Button variant="ghost" onClick={onViewAll}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.slice(0, 4).map((item) => (
              <EnhancedProductCard
                key={item.id}
                item={item}
                quantity={quantities[item.id] || 0}
                onAdd={onAdd}
                onDecrement={onDecrement}
                showVariants={type === "featured"}
                compact={compact}
                showDescription={type !== "featured"}
                theme={theme}
                pricePulseOnHover={theme === "seedlings" && (type === "featured" || type === "new")}
                runningBorderOnHover={theme === "seedlings" && type === "new"}
                onClick={onClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
