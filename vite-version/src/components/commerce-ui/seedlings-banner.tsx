"use client";

import { useState, useEffect } from "react";

import { BentoTilt } from "@/components/ui/bento-tilt";

function SeedlingsBanner() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BentoTilt>
      <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-emerald-100 via-emerald-200 to-aquamarine-100 p-8 text-slate-900 shadow-xl"
           onClick={() => {
              document.getElementById("new-arrivals-section")?.scrollIntoView({ behavior: "smooth" });
            }}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-32 w-32 animate-pulse rounded-full bg-white opacity-100"></div>
          <div className="absolute top-5 right-10 h-12 w-12 rounded-full bg-emerald-200 opacity-40"></div>
          <div className="absolute -right-8 -bottom-8 h-32 w-32 animate-pulse rounded-full bg-green-400 opacity-100"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0">
          <div
            className={`transition-all duration-700 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <p className="mb-2 inline-block rounded-full bg-white/60 px-3 py-1 text-sm font-semibold tracking-wider text-emerald-800 backdrop-blur-sm">
              JUST RELEASED
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              New Varieties <span className="text-emerald-700">Launch</span>
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