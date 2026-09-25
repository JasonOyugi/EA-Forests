"use client";

import { useState, useEffect } from "react";

import { BentoTilt } from "@/components/ui/bento-tilt";
import { cn } from "@/lib/utils";

interface SeedlingsBannerProps {
  /** Extra classes merged onto the banner surface, e.g. "rounded-none" for an edge-to-edge layout. */
  className?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

function SeedlingsBanner({ className, onVisibilityChange }: SeedlingsBannerProps) {
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
    <BentoTilt>
      <div className={cn("relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-emerald-100 via-emerald-200 to-aquamarine-100 p-8 text-slate-900 shadow-xl", className)}
           role="link"
           tabIndex={0}
           onClick={goToFooter}
           onKeyDown={(event) => { if (event.key === "Enter") goToFooter(); }}>
        <button
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
        </button>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-32 w-32 animate-pulse rounded-full bg-white opacity-100"></div>
          <div className="absolute top-5 right-10 h-12 w-12 rounded-full bg-emerald-200 opacity-40"></div>
          <div className="absolute -right-8 -bottom-8 h-32 w-32 animate-pulse rounded-full bg-green-400 opacity-100"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-between space-y-6 pr-8 md:flex-row md:space-y-0 md:pr-10">
          <div
            className={`transition-all duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <p className="mb-3 inline-block rounded-full bg-white/60 px-3 py-1 text-sm font-semibold tracking-wider text-emerald-950 backdrop-blur-sm">
              STAY INFORMED!
            </p>
            <h2 className="text-[clamp(2.75rem,6vw,6.5rem)] font-semibold uppercase leading-[.8] tracking-[-.065em] [font-stretch:condensed]">
              Information is <span className="text-emerald-700"> Money</span>
            </h2>
            <p className="type-body-copy mt-4 max-w-3xl text-slate-700">
              The sector changes FAST! Stay ahead and subscribe for updates before they even happen! 
            </p>
          </div>

          <div
            className={`transition-all delay-300 duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
          </div>
        </div>
      </div>
    </BentoTilt>
  );
}

export default SeedlingsBanner;
