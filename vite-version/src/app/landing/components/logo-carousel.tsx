"use client"

import { Card } from "@/components/ui/card"

const companies = [
  { name: "UTGA", src: "/UTGA.png" },
  { name: "KEFRI", src: "/KEFRI.png" },
  { name: "Hoffman", src: "/Hoffman.png" },
  { name: "Gatsby Africa", src: "/Gatsby-Africa.png" },
  { name: "CMA Kenya", src: "/CMA_KE.png" },
  { name: "CrossBoundary", src: "/Crossboundary.png" },
] as const

function Logo({ src, name, size = 28 }: { src: string; name: string; size?: number }) {
  return (
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="object-contain"
      loading="lazy"
      draggable={false}
    />
  )
}

export function LogoCarousel() {
  return (
    <section className="pb-12 sm:pb-16 lg:pb-20 pt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground mb-8">
            Trusted by leading regional forestry and investment experts
          </p>

          <div className="relative">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden">
              <div className="flex animate-logo-scroll space-x-8 sm:space-x-12">
                {[...companies, ...companies].map((company, index) => (
                  <Card
                    key={`${company.name}-${index}`}
                    className="flex-shrink-0 flex items-center justify-center h-16 w-40
                               opacity-60 hover:opacity-100 transition-opacity duration-300
                               border-0 shadow-none bg-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <Logo src={company.src} name={company.name} size={28} />
                      <span className="text-foreground text-lg font-semibold whitespace-nowrap">
                        {company.name}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
