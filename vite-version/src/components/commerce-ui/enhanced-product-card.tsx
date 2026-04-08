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
import VariantSelectorMultiple from "./variant-selector-multiple";
import type { ShopItem } from "@/app/shop/types";

interface EnhancedProductCardProps {
  item: ShopItem;
  quantity: number;
  onAdd: (itemId: string, variant?: string) => void;
  onDecrement: (itemId: string) => void;
  onFavorite?: (itemId: string) => void;
  isFavorite?: boolean;
  showVariants?: boolean;
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
  onClick,
  className,
}: EnhancedProductCardProps) {
  const [selectedVariants, setSelectedVariants] = React.useState<string[]>([]);

  // Mock variants for demonstration - in real app, this would come from item data
  const mockVariants = [
    { id: "size-s", value: "small", label: "Small" },
    { id: "size-m", value: "medium", label: "Medium" },
    { id: "size-l", value: "large", label: "Large" },
  ];

  const handleAddToCart = () => {
    onAdd(item.id, selectedVariants.join(","));
  };

  return (
    <Card className={cn("group overflow-hidden transition-all hover:shadow-lg cursor-pointer", className)} onClick={() => onClick?.(item)}>
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {item.stockStatus === "in-stock" && (
            <Badge className="bg-green-500 text-white">In Stock</Badge>
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
          <Button size="sm" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="line-clamp-2 text-lg">{item.name}</CardTitle>
          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">(4.2)</span>
        </div>

        {/* Variants */}
        {showVariants && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Size</span>
            <VariantSelectorMultiple
              values={selectedVariants}
              onValuesChange={setSelectedVariants}
              variants={mockVariants}
              className="justify-start"
            />
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {formatCurrency(item.price, item.currency)}
          </div>
          <div className="text-sm text-muted-foreground">
            {item.kind === "service" ? "Service" : "Product"} · {item.unitLabel}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {quantity > 0 ? `${quantity} in cart` : "Add to cart"}
        </div>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <Button variant="outline" size="sm" onClick={() => onDecrement(item.id)}>
              -
            </Button>
          )}
          <Button size="sm" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {quantity > 0 ? quantity : "Add"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}