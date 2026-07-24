"use client";

import { useState, useEffect } from "react";

import { BentoTilt } from "@/components/ui/bento-tilt";

function SeedlingsBanner() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <BentoTilt>
      <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-emerald-100 via-emerald-200 to-aquamarine-100 p-8 text-slate-900 shadow-xl"
           onClick={() => {
              document.getElementById("new-arrivals-section")?.scrollIntoView({ behavior: "smooth" });
            }}>
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
            <p className="mb-2 inline-block rounded-full bg-white/60 px-3 py-1 text-sm font-semibold tracking-wider text-emerald-800 backdrop-blur-sm">
              JUST RELEASED
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              New Seedling <span className="text-emerald-700"> Varieties Launch</span>
            </h1>
            <p className="mt-3 text-sm text-slate-700 md:text-base">
              High-performance planting stock from South Africa now available for different sites.
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
