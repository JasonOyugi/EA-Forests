"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/app/shop/lib/format";
import { ArrowLeft, Heart, ShoppingCart, Star, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import VariantSelectorMultiple from "./variant-selector-multiple";
import ImageCarouselBasic from "./image-carousel-basic";
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
  const [selectedVariants, setSelectedVariants] = React.useState<string[]>([]);

  const images =
    item.imageGallery && item.imageGallery.length > 0
      ? item.imageGallery
      : [{ url: item.image, title: item.name }];

  // Mock variants
  const mockVariants = [
    { id: "size-s", value: "small", label: "Small" },
    { id: "size-m", value: "medium", label: "Medium" },
    { id: "size-l", value: "large", label: "Large" },
  ];

  const handleAddToCart = () => {
    onAdd(item.id, selectedVariants.join(","));
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
                  <span className="text-sm text-muted-foreground">(4.2 • 24 reviews)</span>
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
              {formatCurrency(item.price, item.currency)}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                per {item.unitLabel}
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
                <VariantSelectorMultiple
                  values={selectedVariants}
                  onValuesChange={setSelectedVariants}
                  variants={mockVariants}
                  className="mt-2"
                />
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
              <span>{item.unitLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock Status:</span>
              <span>{item.stockStatus}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}