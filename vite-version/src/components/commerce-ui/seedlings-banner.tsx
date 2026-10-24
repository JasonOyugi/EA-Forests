"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { informationCardImages } from "@/app/information/card-images";

import { BentoTilt } from "@/components/ui/bento-tilt";
import { cn } from "@/lib/utils";

interface SeedlingsBannerProps {
  variant?: "information" | "markets";
  /** Extra classes merged onto the banner surface, e.g. "rounded-none" for an edge-to-edge layout. */
  className?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

const marketPixels = [
  { name: "Seeds", color: "seed", to: "/shop/seedlings?mode=seeds", image: "kenya-seed-regulation" },
  { name: "Seedlings", color: "seedlings", to: "/shop/seedlings", image: "quality-tree-seed-project" },
  { name: "Silviculture", color: "silviculture", to: "/shop/forestry-services", image: "article-six-pipeline" },
  { name: "Harvest & haulage", color: "harvest", to: "/shop/forestry-services?mode=harvest_haulage", image: "safari-ya-mbao" },
  { name: "Wood markets", color: "wood", to: "/shop/wood-markets-map", image: "tropical-timber-benchmark" },
];

function SeedlingsBanner({ className, onVisibilityChange, variant = "information" }: SeedlingsBannerProps) {
  const isMarkets = variant === "markets";
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  if (!isVisible) return null;

  // Always leads to the landing footer (sign-up/contact): smooth-scroll when it is already on
  // this page, otherwise navigate there.
  const goToFooter = () => {
    const footer = document.getElementById("footer");
    if (footer) footer.scrollIntoView({ behavior: "smooth" });
    else window.location.href = "/landing#footer";
  };

  return (
    <>
    <BentoTilt>
      <div className={cn("relative w-full overflow-hidden rounded-lg py-8", isMarkets ? "mobile-markets-banner min-h-[300px] border-transparent bg-transparent px-6 text-foreground" : "bg-gradient-to-r from-emerald-100 via-emerald-200 to-aquamarine-100 px-8 text-slate-900 shadow-xl", className)}
         role={isMarkets ? undefined : "link"}
         tabIndex={isMarkets ? undefined : 0}
         onClick={isMarkets ? undefined : goToFooter}
         onKeyDown={isMarkets ? undefined : (event) => { if (event.key === "Enter") goToFooter(); }}>
        {isMarkets && <Link to="/shop" aria-label="Explore East Africa forestry goods and services" className="absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring" />}
        {!isMarkets && <button
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-800/10 bg-white/70 text-emerald-900/70 transition hover:bg-white hover:text-emerald-950 focus:outline-none"
          onClick={(event) => {
            event.stopPropagation();
            setIsVisible(false);
          }}
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>}

        {/* Animated background elements */}
        {isMarkets ? <div className="pointer-events-none absolute inset-x-6 bottom-8 z-20 grid h-[360px] gap-1" style={{ gridTemplateColumns: "0.9fr 1.3fr", gridTemplateRows: "1fr 0.65fr 1.25fr 0.85fr", gridTemplateAreas: '"seed seedlings" "silviculture seedlings" "silviculture harvest" "wood wood"' }}>
          {marketPixels.map((pixel) => (
            <Link key={pixel.color} to={pixel.to} aria-label={pixel.name} className="group pointer-events-auto relative isolate flex min-w-0 items-end overflow-hidden rounded-md bg-muted p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" style={{ gridArea: pixel.color }}>
              <img src={informationCardImages[pixel.image].url} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="text-sm font-semibold leading-snug text-white">{pixel.name}</span>
            </Link>
          ))}
        </div> : <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-32 w-32 animate-pulse rounded-full bg-white opacity-100"></div>
          <div className="absolute top-5 right-10 h-12 w-12 rounded-full bg-emerald-200 opacity-40"></div>
          <div className="absolute -right-8 -bottom-8 h-32 w-32 animate-pulse rounded-full bg-green-400 opacity-100"></div>
        </div>}
        <div className={cn("relative z-10 flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0", isMarkets ? "pointer-events-none pb-[390px]" : "pr-8 md:pr-10")}>
          <div
            className={`transition-all duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            {!isMarkets && <p className="mb-3 inline-block rounded-full bg-white/60 px-3 py-1 text-sm font-semibold tracking-wider text-emerald-950 backdrop-blur-sm">
              STAY INFORMED!
            </p>}
            <h2 className="text-[clamp(2.75rem,6vw,6.5rem)] font-semibold uppercase leading-[.8] tracking-[-.065em] [font-stretch:condensed]">
              {isMarkets ? "Markets" : <>Information is <span className="text-emerald-700"> Money</span></>}
            </h2>
            <p className={cn("type-body-copy mt-4 max-w-3xl", isMarkets ? "text-muted-foreground" : "text-slate-700")}>
              {isMarkets ? "Click to explore East Africa forestry goods and services" : "The sector changes FAST! Stay ahead and subscribe for updates before they even happen!"}
            </p>
          </div>

          <div
            className={`transition-all delay-300 duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
          </div>
        </div>
      </div>
    </BentoTilt>
    {isMarkets && <details className="px-6 text-xs text-muted-foreground">
      <summary className="cursor-pointer py-2">Photo credits</summary>
      <ul className="space-y-1 pb-2">
        {marketPixels.map((pixel) => {
          const image = informationCardImages[pixel.image];
          return <li key={pixel.color}>{pixel.name}: <a href={image.source} target="_blank" rel="noreferrer" className="underline">{image.credit}</a> / {image.license}</li>;
        })}
      </ul>
    </details>}
    </>
  );
}

export default SeedlingsBanner;
