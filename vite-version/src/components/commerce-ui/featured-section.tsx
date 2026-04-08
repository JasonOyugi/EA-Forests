"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Flame, Star, Zap } from "lucide-react";
import { EnhancedProductCard } from "./enhanced-product-card";
import type { ShopItem } from "@/app/shop/types";

interface FeaturedSectionProps {
  title: string;
  subtitle?: string;
  type: "featured" | "new" | "hot" | "bestseller";
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

export function FeaturedSection({
  title,
  subtitle,
  type,
  items,
  quantities,
  onAdd,
  onDecrement,
  onClick,
  onViewAll,
  className,
}: FeaturedSectionProps) {
  const config = sectionConfig[type];
  const Icon = config.icon;

  return (
    <section className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {title}
                  <Badge variant="secondary">{config.badge}</Badge>
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
                onClick={onClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}