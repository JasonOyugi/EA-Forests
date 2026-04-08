"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PromoBannerProps {
  title: string;
  subtitle?: string;
  description: string;
  badge?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  backgroundImage?: string;
  className?: string;
}

export function PromoBanner({
  title,
  subtitle,
  description,
  badge,
  primaryAction,
  secondaryAction,
  backgroundImage,
  className,
}: PromoBannerProps) {
  return (
    <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background", className)}>
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <CardContent className="relative p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {badge && <Badge variant="secondary">{badge}</Badge>}
              {subtitle && (
                <span className="text-sm font-medium text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            {primaryAction && (
              <Button size="lg" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" size="lg" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}