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
  theme?: "wellness-products" | "hospital-services" | "diabetes-programs";
  compact?: boolean;
  items: ShopItem[];
  quantities: Record<string, number>;
  onAdd: (itemId: string, variant?: string) => void;
  onDecrement: (itemId: string) => void;
  onClick?: (item: ShopItem) => void;
  onViewAll?: () => void;
  className?: string;
}

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
    theme === "wellness-products"
      ? seedlingsConfig[type]
      : theme === "diabetes-programs"
      ? forestsLandConfig[type]
      : theme === "hospital-services"
      ? seedlingsConfig[type]
      : seedlingsConfig[type]
  const Icon = config.icon
  const cardClass =
    theme === "wellness-products"
      ? type === "featured"
        ? "emerald-border-hover rounded-2xl border border-transparent bg-transparent shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(23, 179, 172,0.18)]"
        : "emerald-border-hover rounded-2xl border border-emerald-300 bg-secondary/100 overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(23, 179, 172,0.24)]"
      : theme === "diabetes-programs"
      ? "rounded-2xl border border-slate-200 bg-transparent overflow-hidden"
      : theme === "hospital-services"
      ? type === "featured"
        ? "emerald-border-hover rounded-2xl border border-transparent bg-transparent shadow-none overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(23, 179, 172,0.18)]"
        : "emerald-border-hover rounded-2xl border border-emerald-300 bg-secondary/100 overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(23, 179, 172,0.24)]"
      : ""

  return (
    <section className={className}>
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === "new" && theme === "wellness-products" ? (
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
                showVariants={theme === "wellness-products" || type === "featured"}
                compact={compact}
                showDescription={theme === "wellness-products" || type !== "featured"}
                theme={theme}
                pricePulseOnHover={(theme === "wellness-products" || theme === "hospital-services") && (type === "featured" || type === "new")}
                runningBorderOnHover={(theme === "wellness-products" || theme === "hospital-services") && type === "new"}
                onClick={onClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
